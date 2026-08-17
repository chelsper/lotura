import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "@neondatabase/serverless";

import { requireWorkspaceAccess } from "./authentication";
import type { DiscoveryMappingAction } from "./discovery-mapping-model.mjs";
import { fingerprintDocumentedProcessSnapshot } from "./discovery-mapping-administration";
import {
  buildProcessVersionSnapshot,
  fingerprintProcessVersionSnapshot,
  type ProcessVersionSnapshotInput,
} from "./process-version-snapshot.mjs";
import { resolveProcessApplicationConfiguration } from "./process-application-policy.mjs";

type ChangeKind = "correction" | "organizational_change";

export type ProcessApplicationMutationResult =
  | {
      applicationId: string;
      message: string;
      ok: true;
      sessionId: string;
      versionSequence: number;
    }
  | {
      code: "conflict" | "invalid" | "not_found" | "unavailable";
      message: string;
      ok: false;
    };

type DatabaseRow = QueryResultRow & Record<string, unknown>;

type ApplicationContext = {
  documentedFingerprint: string;
  mappingId: number;
  mappingRevision: number;
  mappingStableKey: string;
  processId: number;
  processStableKey: string;
  reviewId: number;
  reviewStableKey: string;
};

type ApprovedItem = {
  action: DiscoveryMappingAction;
  beforeState: Record<string, unknown>;
  decisionId: number;
  decisionStableKey: string;
  itemId: string;
  itemRevisionId: number;
  itemRevisionStableKey: string;
  exceptionStableKey: string | null;
  processStepStableKey: string | null;
  proposedState: Record<string, unknown>;
  relatedProcessStableKey: string | null;
  responsibleRoleStableKey: string | null;
  systemStableKey: string | null;
};

type AppliedItem = ApprovedItem & {
  afterState: Record<string, unknown>;
  applicationSequence: number;
  appliedBeforeState: Record<string, unknown>;
  changeKind: ChangeKind;
};

type VersionRow = {
  id: number;
  stableKey: string;
  versionSequence: number;
};

const CHANGE_KINDS = new Set<ChangeKind>([
  "correction",
  "organizational_change",
]);

const ACTION_RANK: Record<DiscoveryMappingAction, number> = {
  update_process_purpose: 10,
  change_process_owner: 20,
  revise_process_step: 30,
  change_step_responsibility: 40,
  add_process_step: 50,
  link_existing_system: 60,
  revise_process_exception: 70,
  add_process_exception: 80,
  add_process_dependency: 90,
  preserve_unresolved: 100,
};

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.length) {
    throw new Error(`Missing reviewed ${label}.`);
  }
  return value;
}

function requiredInteger(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`Missing reviewed ${label}.`);
  }
  return parsed;
}

function applicationOrder(left: ApprovedItem, right: ApprovedItem) {
  const rank = ACTION_RANK[left.action] - ACTION_RANK[right.action];
  if (rank !== 0) return rank;
  if (left.action === "add_process_step" && right.action === "add_process_step") {
    const leftPosition = Number(left.proposedState.position);
    const rightPosition = Number(right.proposedState.position);
    return leftPosition - rightPosition || left.itemId.localeCompare(right.itemId);
  }
  return left.itemId.localeCompare(right.itemId);
}

function logProcessApplicationFailure(operation: string, error: unknown) {
  const details = typeof error === "object" && error !== null
    ? error as Record<string, unknown>
    : {};
  const safeValue = (value: unknown) =>
    typeof value === "string" && value.length > 0 ? value : undefined;
  console.error("[process-application] database operation failed", {
    code: safeValue(details.code),
    constraint: safeValue(details.constraint),
    operation,
    routine: safeValue(details.routine),
    table: safeValue(details.table),
  });
}

async function applicationAccess() {
  const runtimeAccess = await requireWorkspaceAccess();
  const configuration = resolveProcessApplicationConfiguration(
    process.env,
    runtimeAccess,
  );
  if (!configuration.enabled) return null;
  return configuration;
}

async function loadApplicationContext(
  client: PoolClient,
  organizationId: number,
  sessionId: string,
): Promise<ApplicationContext | null> {
  const result = await client.query<DatabaseRow>(
    `select review.id as review_id, review.stable_key as review_stable_key,
       review.mapping_id, review.mapping_stable_key, review.mapping_revision,
       review.documented_process_fingerprint, review.process_id,
       review.process_stable_key
     from operating_model_proposal_reviews review
     join discovery_proposal_mappings mapping
       on mapping.id = review.mapping_id
      and mapping.organization_id = review.organization_id
      and mapping.stable_key = review.mapping_stable_key
     join discovery_proposals proposal
       on proposal.id = review.proposal_id
      and proposal.organization_id = review.organization_id
      and proposal.stable_key = review.proposal_stable_key
     join processes process
       on process.id = review.process_id
      and process.organization_id = review.organization_id
      and process.stable_key = review.process_stable_key
     where review.organization_id = $1
       and review.session_stable_key = $2::uuid
       and review.status <> 'in_review'
       and mapping.status = 'ready_for_proposal_review'
       and mapping.revision = review.mapping_revision
       and proposal.status = 'ready_for_review'
       and proposal.documented_process_fingerprint = review.documented_process_fingerprint
       and not exists (
         select 1 from operating_model_proposal_applications application
         where application.review_id = review.id
       )
     for update of review, mapping, process`,
    [organizationId, sessionId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    documentedFingerprint: String(row.documented_process_fingerprint),
    mappingId: Number(row.mapping_id),
    mappingRevision: Number(row.mapping_revision),
    mappingStableKey: String(row.mapping_stable_key),
    processId: Number(row.process_id),
    processStableKey: String(row.process_stable_key),
    reviewId: Number(row.review_id),
    reviewStableKey: String(row.review_stable_key),
  };
}

async function loadApprovedItems(
  client: PoolClient,
  context: ApplicationContext,
  organizationId: number,
) {
  const result = await client.query<DatabaseRow>(
    `with current_items as (
       select distinct on (item.item_stable_key)
         item.id, item.stable_key, item.item_stable_key, item.item_sequence,
         item.state, item.action, item.before_state, item.proposed_state,
         item.process_step_stable_key, item.responsible_role_stable_key,
         item.system_stable_key, item.exception_stable_key,
         item.related_process_stable_key
       from discovery_mapping_items item
       where item.organization_id = $1
         and item.mapping_id = $2
         and item.mapping_stable_key = $3::uuid
       order by item.item_stable_key, item.item_sequence desc
     ), current_decisions as (
       select distinct on (decision.item_stable_key)
         decision.id, decision.stable_key, decision.item_stable_key,
         decision.item_revision_id, decision.item_revision_stable_key,
         decision.disposition
       from operating_model_proposal_review_decisions decision
       where decision.organization_id = $1
         and decision.review_id = $4
         and decision.review_stable_key = $5::uuid
       order by decision.item_stable_key, decision.decision_sequence desc
     )
     select item.id as item_revision_id,
       item.stable_key as item_revision_stable_key,
       item.item_stable_key, item.action, item.before_state,
       item.proposed_state, decision.id as decision_id,
       decision.stable_key as decision_stable_key,
       item.process_step_stable_key, item.responsible_role_stable_key,
       item.system_stable_key, item.exception_stable_key,
       item.related_process_stable_key
     from current_items item
     join current_decisions decision
       on decision.item_stable_key = item.item_stable_key
      and decision.item_revision_id = item.id
      and decision.item_revision_stable_key = item.stable_key
     where item.state = 'active'
       and item.action <> 'preserve_unresolved'
       and decision.disposition = 'approve'`,
    [
      organizationId,
      context.mappingId,
      context.mappingStableKey,
      context.reviewId,
      context.reviewStableKey,
    ],
  );
  return result.rows.map((row): ApprovedItem => ({
    action: row.action as DiscoveryMappingAction,
    beforeState: asRecord(row.before_state),
    decisionId: Number(row.decision_id),
    decisionStableKey: String(row.decision_stable_key),
    exceptionStableKey: asNullableString(row.exception_stable_key),
    itemId: String(row.item_stable_key),
    itemRevisionId: Number(row.item_revision_id),
    itemRevisionStableKey: String(row.item_revision_stable_key),
    processStepStableKey: asNullableString(row.process_step_stable_key),
    proposedState: asRecord(row.proposed_state),
    relatedProcessStableKey: asNullableString(row.related_process_stable_key),
    responsibleRoleStableKey: asNullableString(
      row.responsible_role_stable_key,
    ),
    systemStableKey: asNullableString(row.system_stable_key),
  })).sort(applicationOrder);
}

async function loadProcessSnapshots(
  client: PoolClient,
  organizationId: number,
  processId: number,
) {
  const processResult = await client.query<DatabaseRow>(
    `select process.id, process.stable_key, process.name, process.purpose,
       process.status, owner.id as owner_role_id,
       owner.stable_key as owner_role_stable_key, owner.name as owner_role_name
     from processes process
     left join roles owner
       on owner.id = process.owner_role_id
      and owner.organization_id = process.organization_id
     where process.organization_id = $1 and process.id = $2
     for update of process`,
    [organizationId, processId],
  );
  const processRow = processResult.rows[0];
  if (!processRow) throw new Error("The Process no longer exists.");

  const stepsResult = await client.query<DatabaseRow>(
    `select step.id, step.stable_key, step.position, step.title,
       step.instructions, responsible.id as responsible_role_id,
       responsible.stable_key as responsible_role_stable_key,
       responsible.name as responsible_role_name
     from process_steps step
     left join roles responsible
       on responsible.id = step.responsible_role_id
      and responsible.organization_id = step.organization_id
     where step.organization_id = $1 and step.process_id = $2
     order by step.position, step.id
     for update of step`,
    [organizationId, processId],
  );
  const systemsResult = await client.query<DatabaseRow>(
    `select system.id, system.stable_key, system.name,
       system.description, system.system_type, system.status, link.usage
     from process_systems link
     join systems system
       on system.id = link.system_id
      and system.organization_id = link.organization_id
     where link.organization_id = $1 and link.process_id = $2
     order by system.id
     for share of system`,
    [organizationId, processId],
  );
  const exceptionsResult = await client.query<DatabaseRow>(
    `select exception.id, exception.stable_key, exception.name,
       exception.condition, exception.response, exception.status,
       step.id as step_id, step.stable_key as step_stable_key,
       step.title as step_title, owner.id as owner_role_id,
       owner.stable_key as owner_role_stable_key,
       owner.name as owner_role_name
     from exceptions exception
     left join process_steps step
       on step.id = exception.process_step_id
      and step.organization_id = exception.organization_id
     left join roles owner
       on owner.id = exception.owner_role_id
      and owner.organization_id = exception.organization_id
     where exception.organization_id = $1 and exception.process_id = $2
     order by exception.id
     for update of exception`,
    [organizationId, processId],
  );
  const dependenciesResult = await client.query<DatabaseRow>(
    `select dependency.id, dependency.stable_key,
       dependency.source_process_id, dependency.target_process_id,
       dependency.dependency_type, dependency.description,
       source.stable_key as source_stable_key, source.name as source_name,
       target.stable_key as target_stable_key, target.name as target_name
     from process_dependencies dependency
     join processes source
       on source.id = dependency.source_process_id
      and source.organization_id = dependency.organization_id
     join processes target
       on target.id = dependency.target_process_id
      and target.organization_id = dependency.organization_id
     where dependency.organization_id = $1
       and (dependency.source_process_id = $2 or dependency.target_process_id = $2)
     order by dependency.source_process_id, dependency.target_process_id,
       dependency.dependency_type, dependency.id
     for update of dependency`,
    [organizationId, processId],
  );

  const roleReference = (row: DatabaseRow, prefix: string) =>
    row[`${prefix}_role_id`]
      ? {
          id: `role:${row[`${prefix}_role_id`]}`,
          name: String(row[`${prefix}_role_name`]),
        }
      : null;
  const legacySnapshot = {
    dependencies: {
      downstream: dependenciesResult.rows
        .filter((row) => Number(row.source_process_id) === processId)
        .map((row) => ({
          description: asNullableString(row.description),
          processId: `process:${row.target_process_id}`,
          processName: String(row.target_name),
          type: row.dependency_type,
        })),
      upstream: dependenciesResult.rows
        .filter((row) => Number(row.target_process_id) === processId)
        .map((row) => ({
          description: asNullableString(row.description),
          processId: `process:${row.source_process_id}`,
          processName: String(row.source_name),
          type: row.dependency_type,
        })),
    },
    exceptions: exceptionsResult.rows.map((row) => ({
      condition: row.condition,
      id: `exception:${row.id}`,
      name: row.name,
      ownerRole: roleReference(row, "owner"),
      response: row.response,
      status: row.status,
      stepId: row.step_id ? `step:${row.step_id}` : null,
      stepTitle: asNullableString(row.step_title),
    })),
    process: {
      id: `process:${processRow.id}`,
      name: processRow.name,
      ownerRole: roleReference(processRow, "owner"),
      purpose: asNullableString(processRow.purpose),
      status: processRow.status,
    },
    steps: stepsResult.rows.map((row) => ({
      id: `step:${row.id}`,
      instructions: row.instructions,
      position: Number(row.position),
      responsibleRole: roleReference(row, "responsible"),
      title: row.title,
    })),
    systems: systemsResult.rows.map((row) => ({
      description: asNullableString(row.description),
      id: `system:${row.id}`,
      name: row.name,
      status: row.status,
      type: row.system_type,
      usage: row.usage,
    })),
  };

  const versionInput: ProcessVersionSnapshotInput = {
    dependencies: dependenciesResult.rows.map((row) => ({
      dependencyType: row.dependency_type as ProcessVersionSnapshotInput["dependencies"][number]["dependencyType"],
      description: asNullableString(row.description),
      direction: Number(row.source_process_id) === processId
        ? "downstream"
        : "upstream",
      sourceProcessName: String(row.source_name),
      sourceProcessStableKey: String(row.source_stable_key),
      stableKey: String(row.stable_key),
      targetProcessName: String(row.target_name),
      targetProcessStableKey: String(row.target_stable_key),
    })),
    exceptions: exceptionsResult.rows.map((row) => ({
      condition: String(row.condition),
      name: String(row.name),
      ownerRoleName: asNullableString(row.owner_role_name),
      ownerRoleStableKey: asNullableString(row.owner_role_stable_key),
      processStepStableKey: asNullableString(row.step_stable_key),
      processStepTitle: asNullableString(row.step_title),
      response: String(row.response),
      stableKey: String(row.stable_key),
      status: row.status as "active" | "inactive",
    })),
    process: {
      name: String(processRow.name),
      ownerRoleName: asNullableString(processRow.owner_role_name),
      ownerRoleStableKey: asNullableString(processRow.owner_role_stable_key),
      purpose: asNullableString(processRow.purpose),
      stableKey: String(processRow.stable_key),
      status: processRow.status as "draft" | "active" | "archived",
    },
    steps: stepsResult.rows.map((row) => ({
      instructions: String(row.instructions),
      position: Number(row.position),
      responsibleRoleName: asNullableString(row.responsible_role_name),
      responsibleRoleStableKey: asNullableString(
        row.responsible_role_stable_key,
      ),
      stableKey: String(row.stable_key),
      title: String(row.title),
    })),
    systems: systemsResult.rows.map((row) => ({
      description: asNullableString(row.description),
      name: String(row.name),
      stableKey: String(row.stable_key),
      status: row.status as "active" | "inactive",
      type: row.system_type as ProcessVersionSnapshotInput["systems"][number]["type"],
      usage: String(row.usage),
    })),
  };

  return {
    legacyFingerprint: fingerprintDocumentedProcessSnapshot(legacySnapshot),
    processRow,
    versionSnapshot: buildProcessVersionSnapshot(versionInput),
  };
}

type HistoryTarget = {
  action:
    | "update_definition"
    | "change_owner"
    | "create_step"
    | "reorder_steps"
    | "update_step"
    | "change_step_responsibility"
    | "link_system"
    | "create_exception"
    | "update_exception"
    | "create_dependency";
  entityType:
    | "process"
    | "process_step"
    | "process_system"
    | "exception"
    | "process_dependency";
  exceptionId?: number;
  exceptionStableKey?: string;
  processDependencyId?: number;
  processDependencyStableKey?: string;
  processStepId?: number;
  processStepStableKey?: string;
  systemId?: number;
  systemStableKey?: string;
  targetReference: string;
};

async function appendHistory(
  client: PoolClient,
  input: {
    actorIdentifier: string;
    afterState: Record<string, unknown>;
    beforeState: Record<string, unknown>;
    changeKind: ChangeKind;
    effectiveAt: Date;
    organizationId: number;
    processId: number;
    processStableKey: string;
    reason: string;
    target: HistoryTarget;
  },
) {
  const result = await client.query(
    `insert into operating_model_changes (
       organization_id, process_id, process_stable_key,
       process_step_id, process_step_stable_key,
       system_id, system_stable_key, exception_id, exception_stable_key,
       process_dependency_id, process_dependency_stable_key,
       entity_type, target_reference, change_kind, change_action,
       before_state, after_state, reason, effective_at, actor_identifier
     ) values (
       $1, $2, $3::uuid, $4, $5::uuid, $6, $7::uuid, $8, $9::uuid,
       $10, $11::uuid, $12::operating_model_change_entity_type, $13,
       $14::operating_model_change_kind, $15::operating_model_change_action,
       $16::jsonb, $17::jsonb, $18, $19::timestamptz, $20
     ) returning id`,
    [
      input.organizationId,
      input.processId,
      input.processStableKey,
      input.target.processStepId ?? null,
      input.target.processStepStableKey ?? null,
      input.target.systemId ?? null,
      input.target.systemStableKey ?? null,
      input.target.exceptionId ?? null,
      input.target.exceptionStableKey ?? null,
      input.target.processDependencyId ?? null,
      input.target.processDependencyStableKey ?? null,
      input.target.entityType,
      input.target.targetReference,
      input.changeKind,
      input.target.action,
      JSON.stringify(input.beforeState),
      JSON.stringify(input.afterState),
      input.reason,
      input.effectiveAt.toISOString(),
      input.actorIdentifier,
    ],
  );
  if (result.rowCount !== 1) throw new Error("History insertion failed.");
}

async function activeRole(
  client: PoolClient,
  organizationId: number,
  stableKey: string | null,
) {
  if (!stableKey) return null;
  const result = await client.query<DatabaseRow>(
    `select id, stable_key, name from roles
     where organization_id = $1 and stable_key = $2::uuid and status = 'active'
     for share`,
    [organizationId, stableKey],
  );
  if (result.rows.length !== 1) {
    throw new Error("The reviewed active Operational Role is no longer available.");
  }
  return result.rows[0];
}

async function applyApprovedItem(
  client: PoolClient,
  item: ApprovedItem,
  metadata: {
    actorIdentifier: string;
    changeKind: ChangeKind;
    effectiveAt: Date;
    organizationId: number;
    processId: number;
    processStableKey: string;
    reason: string;
    stepPositionOffset: number;
  },
): Promise<{ afterState: Record<string, unknown>; beforeState: Record<string, unknown> }> {
  const common = {
    ...metadata,
    afterState: {} as Record<string, unknown>,
    beforeState: {} as Record<string, unknown>,
  };

  if (item.action === "update_process_purpose") {
    const purpose = requiredString(item.proposedState.purpose, "Process purpose");
    const result = await client.query<DatabaseRow>(
      `update processes set purpose = $4
       where organization_id = $1 and id = $2 and stable_key = $3::uuid
         and purpose is distinct from $4
       returning purpose`,
      [metadata.organizationId, metadata.processId, metadata.processStableKey, purpose],
    );
    if (result.rows.length !== 1) throw new Error("The reviewed Process purpose is no longer applicable.");
    const beforeState = { purpose: asNullableString(item.beforeState.purpose) };
    const afterState = { purpose };
    await appendHistory(client, {
      ...common,
      afterState,
      beforeState,
      target: {
        action: "update_definition",
        entityType: "process",
        targetReference: `process:${metadata.processStableKey}`,
      },
    });
    return { afterState, beforeState };
  }

  if (item.action === "change_process_owner") {
    const ownerStableKey = asNullableString(item.proposedState.ownerRoleStableKey);
    const owner = await activeRole(client, metadata.organizationId, ownerStableKey);
    const currentResult = await client.query<DatabaseRow>(
      `select process.status, current_role.stable_key as role_stable_key,
         current_role.name as role_name
       from processes process
       left join roles current_role
         on current_role.id = process.owner_role_id
        and current_role.organization_id = process.organization_id
       where process.organization_id = $1 and process.id = $2
         and process.stable_key = $3::uuid
       for update of process`,
      [metadata.organizationId, metadata.processId, metadata.processStableKey],
    );
    const current = currentResult.rows[0];
    if (!current || (!owner && current.status !== "draft")) {
      throw new Error("Owner Role clearing is allowed only while a Process is a working draft.");
    }
    const ownerId = owner ? Number(owner.id) : null;
    const update = await client.query(
      `update processes set owner_role_id = $4
       where organization_id = $1 and id = $2 and stable_key = $3::uuid
         and owner_role_id is distinct from $4
       returning id`,
      [metadata.organizationId, metadata.processId, metadata.processStableKey, ownerId],
    );
    if (update.rowCount !== 1) throw new Error("The reviewed Owner Role change is no longer applicable.");
    const beforeState = {
      ownerRoleName: asNullableString(current.role_name),
      ownerRoleStableKey: asNullableString(current.role_stable_key),
    };
    const afterState = {
      ownerRoleName: owner ? String(owner.name) : null,
      ownerRoleStableKey: owner ? String(owner.stable_key) : null,
    };
    await appendHistory(client, {
      ...common,
      afterState,
      beforeState,
      target: {
        action: "change_owner",
        entityType: "process",
        targetReference: `process:${metadata.processStableKey}`,
      },
    });
    return { afterState, beforeState };
  }

  if (item.action === "revise_process_step") {
    const stepStableKey = requiredString(item.processStepStableKey, "Step identity");
    const title = requiredString(item.proposedState.title, "Step title");
    const instructions = requiredString(
      item.proposedState.instructions,
      "Step instructions",
    );
    const result = await client.query<DatabaseRow>(
      `update process_steps set title = $4, instructions = $5,
         updated_at = date_trunc('milliseconds', transaction_timestamp())
       where organization_id = $1 and process_id = $2 and stable_key = $3::uuid
         and (title is distinct from $4 or instructions is distinct from $5)
       returning id, stable_key, title, instructions`,
      [metadata.organizationId, metadata.processId, stepStableKey, title, instructions],
    );
    const step = result.rows[0];
    if (!step) throw new Error("The reviewed Step wording is no longer applicable.");
    const beforeState = {
      instructions: asNullableString(item.beforeState.instructions),
      title: asNullableString(item.beforeState.title),
    };
    const afterState = { instructions, title };
    await appendHistory(client, {
      ...common,
      afterState,
      beforeState,
      target: {
        action: "update_step",
        entityType: "process_step",
        processStepId: Number(step.id),
        processStepStableKey: String(step.stable_key),
        targetReference: `process_step:${step.stable_key}`,
      },
    });
    return { afterState, beforeState };
  }

  if (item.action === "change_step_responsibility") {
    const stepStableKey = requiredString(item.processStepStableKey, "Step identity");
    const roleStableKey = asNullableString(
      item.proposedState.responsibleRoleStableKey,
    );
    const responsibleRole = await activeRole(
      client,
      metadata.organizationId,
      roleStableKey,
    );
    const currentResult = await client.query<DatabaseRow>(
      `select step.id, step.stable_key, current_role.stable_key as role_stable_key,
         current_role.name as role_name
       from process_steps step
       left join roles current_role
         on current_role.id = step.responsible_role_id
        and current_role.organization_id = step.organization_id
       where step.organization_id = $1 and step.process_id = $2
         and step.stable_key = $3::uuid
       for update of step`,
      [metadata.organizationId, metadata.processId, stepStableKey],
    );
    const current = currentResult.rows[0];
    if (!current) throw new Error("The reviewed Step no longer exists.");
    const roleId = responsibleRole ? Number(responsibleRole.id) : null;
    const update = await client.query(
      `update process_steps set responsible_role_id = $4,
         updated_at = date_trunc('milliseconds', transaction_timestamp())
       where organization_id = $1 and process_id = $2 and stable_key = $3::uuid
         and responsible_role_id is distinct from $4
       returning id`,
      [metadata.organizationId, metadata.processId, stepStableKey, roleId],
    );
    if (update.rowCount !== 1) throw new Error("The reviewed Step responsibility is no longer applicable.");
    const beforeState = {
      responsibleRoleName: asNullableString(current.role_name),
      responsibleRoleStableKey: asNullableString(current.role_stable_key),
    };
    const afterState = {
      responsibleRoleName: responsibleRole ? String(responsibleRole.name) : null,
      responsibleRoleStableKey: responsibleRole
        ? String(responsibleRole.stable_key)
        : null,
    };
    await appendHistory(client, {
      ...common,
      afterState,
      beforeState,
      target: {
        action: "change_step_responsibility",
        entityType: "process_step",
        processStepId: Number(current.id),
        processStepStableKey: String(current.stable_key),
        targetReference: `process_step:${current.stable_key}`,
      },
    });
    return { afterState, beforeState };
  }

  if (item.action === "add_process_step") {
    const title = requiredString(item.proposedState.title, "new Step title");
    const instructions = requiredString(
      item.proposedState.instructions,
      "new Step instructions",
    );
    const requestedPosition = requiredInteger(
      item.proposedState.position,
      "Step position",
    );
    const position = requestedPosition + metadata.stepPositionOffset;
    const roleStableKey = asNullableString(
      item.proposedState.responsibleRoleStableKey,
    );
    const responsibleRole = await activeRole(
      client,
      metadata.organizationId,
      roleStableKey,
    );
    const countResult = await client.query<DatabaseRow>(
      `select count(*)::integer as step_count from process_steps
       where organization_id = $1 and process_id = $2`,
      [metadata.organizationId, metadata.processId],
    );
    const stepCount = Number(countResult.rows[0]?.step_count ?? 0);
    if (position > stepCount + 1) {
      throw new Error("The reviewed Step position is no longer valid.");
    }
    const shiftedResult = await client.query<DatabaseRow>(
      `select id, stable_key, position from process_steps
       where organization_id = $1 and process_id = $2 and position >= $3
       order by position desc, stable_key desc
       for update`,
      [metadata.organizationId, metadata.processId, position],
    );
    const shiftedStates: Array<{
      afterPosition: number;
      beforePosition: number;
      stableKey: string;
    }> = [];
    for (const shifted of shiftedResult.rows) {
      const beforePosition = Number(shifted.position);
      const afterPosition = beforePosition + 1;
      const update = await client.query(
        `update process_steps set position = $4,
           updated_at = date_trunc('milliseconds', transaction_timestamp())
         where organization_id = $1 and process_id = $2 and id = $3`,
        [metadata.organizationId, metadata.processId, Number(shifted.id), afterPosition],
      );
      if (update.rowCount !== 1) throw new Error("A Step reorder failed.");
      const beforeState = { position: beforePosition };
      const afterState = { position: afterPosition };
      await appendHistory(client, {
        ...common,
        afterState,
        beforeState,
        target: {
          action: "reorder_steps",
          entityType: "process_step",
          processStepId: Number(shifted.id),
          processStepStableKey: String(shifted.stable_key),
          targetReference: `process_step:${shifted.stable_key}`,
        },
      });
      shiftedStates.push({
        afterPosition,
        beforePosition,
        stableKey: String(shifted.stable_key),
      });
    }
    const insertedResult = await client.query<DatabaseRow>(
      `insert into process_steps (
         organization_id, process_id, position, title, instructions,
         responsible_role_id
       ) values ($1, $2, $3, $4, $5, $6)
       returning id, stable_key`,
      [
        metadata.organizationId,
        metadata.processId,
        position,
        title,
        instructions,
        responsibleRole ? Number(responsibleRole.id) : null,
      ],
    );
    const step = insertedResult.rows[0];
    if (!step) throw new Error("The reviewed Step could not be added.");
    const beforeState = { exists: false, requestedPosition };
    const afterState = {
      instructions,
      position,
      responsibleRoleName: responsibleRole ? String(responsibleRole.name) : null,
      responsibleRoleStableKey: responsibleRole
        ? String(responsibleRole.stable_key)
        : null,
      shiftedSteps: shiftedStates,
      stableKey: String(step.stable_key),
      title,
    };
    await appendHistory(client, {
      ...common,
      afterState,
      beforeState: {},
      target: {
        action: "create_step",
        entityType: "process_step",
        processStepId: Number(step.id),
        processStepStableKey: String(step.stable_key),
        targetReference: `process_step:${step.stable_key}`,
      },
    });
    return { afterState, beforeState };
  }

  if (item.action === "link_existing_system") {
    const systemStableKey = requiredString(
      item.systemStableKey,
      "System identity",
    );
    const usage = requiredString(item.proposedState.usage, "System usage");
    const systemResult = await client.query<DatabaseRow>(
      `select id, stable_key, name from systems
       where organization_id = $1 and stable_key = $2::uuid
         and status = 'active'
       for share`,
      [metadata.organizationId, systemStableKey],
    );
    const system = systemResult.rows[0];
    if (!system) throw new Error("The reviewed active System is no longer available.");
    const insert = await client.query(
      `insert into process_systems (organization_id, process_id, system_id, usage)
       select $1, $2, $3, $4
       where not exists (
         select 1 from process_systems
         where organization_id = $1 and process_id = $2 and system_id = $3
       ) returning system_id`,
      [metadata.organizationId, metadata.processId, Number(system.id), usage],
    );
    if (insert.rowCount !== 1) throw new Error("The reviewed System is already linked or no longer applicable.");
    const beforeState = { exists: false };
    const afterState = {
      systemName: String(system.name),
      systemStableKey: String(system.stable_key),
      usage,
    };
    await appendHistory(client, {
      ...common,
      afterState,
      beforeState: {},
      target: {
        action: "link_system",
        entityType: "process_system",
        systemId: Number(system.id),
        systemStableKey: String(system.stable_key),
        targetReference: `process_system:${metadata.processStableKey}:${system.stable_key}`,
      },
    });
    return { afterState, beforeState };
  }

  if (item.action === "add_process_exception") {
    const name = requiredString(item.proposedState.name, "Exception name");
    const condition = requiredString(
      item.proposedState.condition,
      "Exception condition",
    );
    const response = requiredString(
      item.proposedState.response,
      "Exception response",
    );
    const stepStableKey = asNullableString(
      item.proposedState.processStepStableKey,
    );
    let step: DatabaseRow | null = null;
    if (stepStableKey) {
      const stepResult = await client.query<DatabaseRow>(
        `select id, stable_key, title from process_steps
         where organization_id = $1 and process_id = $2
           and stable_key = $3::uuid
         for share`,
        [metadata.organizationId, metadata.processId, stepStableKey],
      );
      step = stepResult.rows[0] ?? null;
      if (!step) throw new Error("The reviewed Exception Step is no longer available.");
    }
    const insertResult = await client.query<DatabaseRow>(
      `insert into exceptions (
         organization_id, process_id, process_step_id, name, condition,
         response, status
       ) values ($1, $2, $3, $4, $5, $6, 'active')
       returning id, stable_key`,
      [
        metadata.organizationId,
        metadata.processId,
        step ? Number(step.id) : null,
        name,
        condition,
        response,
      ],
    );
    const exception = insertResult.rows[0];
    if (!exception) throw new Error("The reviewed Exception could not be added.");
    const beforeState = { exists: false };
    const afterState = {
      condition,
      name,
      processStepStableKey: step ? String(step.stable_key) : null,
      processStepTitle: step ? String(step.title) : null,
      response,
      stableKey: String(exception.stable_key),
      status: "active",
    };
    await appendHistory(client, {
      ...common,
      afterState,
      beforeState: {},
      target: {
        action: "create_exception",
        entityType: "exception",
        exceptionId: Number(exception.id),
        exceptionStableKey: String(exception.stable_key),
        targetReference: `exception:${exception.stable_key}`,
      },
    });
    return { afterState, beforeState };
  }

  if (item.action === "revise_process_exception") {
    const exceptionStableKey = requiredString(
      item.exceptionStableKey,
      "Exception identity",
    );
    const name = requiredString(item.proposedState.name, "Exception name");
    const condition = requiredString(
      item.proposedState.condition,
      "Exception condition",
    );
    const response = requiredString(
      item.proposedState.response,
      "Exception response",
    );
    const result = await client.query<DatabaseRow>(
      `update exceptions set name = $4, condition = $5, response = $6,
         updated_at = date_trunc('milliseconds', transaction_timestamp())
       where organization_id = $1 and process_id = $2 and stable_key = $3::uuid
         and (name is distinct from $4 or condition is distinct from $5
           or response is distinct from $6)
       returning id, stable_key`,
      [
        metadata.organizationId,
        metadata.processId,
        exceptionStableKey,
        name,
        condition,
        response,
      ],
    );
    const exception = result.rows[0];
    if (!exception) throw new Error("The reviewed Exception revision is no longer applicable.");
    const beforeState = {
      condition: asNullableString(item.beforeState.condition),
      name: asNullableString(item.beforeState.name),
      response: asNullableString(item.beforeState.response),
      stableKey: exceptionStableKey,
    };
    const afterState = {
      condition,
      name,
      response,
      stableKey: exceptionStableKey,
    };
    await appendHistory(client, {
      ...common,
      afterState,
      beforeState,
      target: {
        action: "update_exception",
        entityType: "exception",
        exceptionId: Number(exception.id),
        exceptionStableKey: String(exception.stable_key),
        targetReference: `exception:${exception.stable_key}`,
      },
    });
    return { afterState, beforeState };
  }

  if (item.action === "add_process_dependency") {
    const relatedStableKey = requiredString(
      item.relatedProcessStableKey,
      "related Process identity",
    );
    const direction = requiredString(
      item.proposedState.direction,
      "dependency direction",
    );
    if (direction !== "upstream" && direction !== "downstream") {
      throw new Error("The reviewed dependency direction is invalid.");
    }
    const dependencyType = requiredString(
      item.proposedState.dependencyType,
      "dependency type",
    );
    const description = asNullableString(item.proposedState.description);
    const relatedResult = await client.query<DatabaseRow>(
      `select related.id, related.stable_key, related.name,
         current_process.name as current_process_name
       from processes related
       join processes current_process
         on current_process.organization_id = related.organization_id
        and current_process.id = $3
       where related.organization_id = $1 and related.stable_key = $2::uuid
       for share of related, current_process`,
      [metadata.organizationId, relatedStableKey, metadata.processId],
    );
    const related = relatedResult.rows[0];
    if (!related || Number(related.id) === metadata.processId) {
      throw new Error("The reviewed related Process is no longer valid.");
    }
    const sourceId = direction === "upstream"
      ? Number(related.id)
      : metadata.processId;
    const targetId = direction === "upstream"
      ? metadata.processId
      : Number(related.id);
    const insertResult = await client.query<DatabaseRow>(
      `insert into process_dependencies (
         organization_id, source_process_id, target_process_id,
         dependency_type, description
       ) select $1, $2, $3, $4::process_dependency_type, $5
       where $2 <> $3 and not exists (
         select 1 from process_dependencies
         where organization_id = $1 and source_process_id = $2
           and target_process_id = $3
           and dependency_type = $4::process_dependency_type
       ) returning id, stable_key`,
      [
        metadata.organizationId,
        sourceId,
        targetId,
        dependencyType,
        description,
      ],
    );
    const dependency = insertResult.rows[0];
    if (!dependency) throw new Error("The reviewed dependency is duplicate or no longer applicable.");
    const sourceStableKey = direction === "upstream"
      ? String(related.stable_key)
      : metadata.processStableKey;
    const sourceName = direction === "upstream"
      ? String(related.name)
      : String(related.current_process_name);
    const targetStableKey = direction === "upstream"
      ? metadata.processStableKey
      : String(related.stable_key);
    const targetName = direction === "upstream"
      ? String(related.current_process_name)
      : String(related.name);
    const beforeState = { exists: false };
    const afterState = {
      dependencyType,
      description,
      direction,
      sourceProcessName: sourceName,
      sourceProcessStableKey: sourceStableKey,
      stableKey: String(dependency.stable_key),
      targetProcessName: targetName,
      targetProcessStableKey: targetStableKey,
    };
    await appendHistory(client, {
      ...common,
      afterState,
      beforeState: {},
      target: {
        action: "create_dependency",
        entityType: "process_dependency",
        processDependencyId: Number(dependency.id),
        processDependencyStableKey: String(dependency.stable_key),
        targetReference: `process_dependency:${dependency.stable_key}`,
      },
    });
    return { afterState, beforeState };
  }

  throw new Error("The reviewed application action is not supported.");
}

function exactClassifications(
  approvedItems: ApprovedItem[],
  classifications: Record<string, string>,
) {
  const approvedIds = approvedItems.map((item) => item.itemId).sort();
  const suppliedIds = Object.keys(classifications).sort();
  if (
    approvedIds.length !== suppliedIds.length ||
    approvedIds.some((id, index) => id !== suppliedIds[index])
  ) return null;
  const result = new Map<string, ChangeKind>();
  for (const id of approvedIds) {
    const value = classifications[id] as ChangeKind;
    if (!CHANGE_KINDS.has(value)) return null;
    result.set(id, value);
  }
  return result;
}

function validEffectiveAt(value: Date) {
  const timestamp = value.getTime();
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

async function insertProcessVersion(
  client: PoolClient,
  input: {
    actorIdentifier: string;
    effectiveAt: Date | null;
    organizationId: number;
    predecessor: VersionRow | null;
    processId: number;
    processStableKey: string;
    reviewId: number | null;
    reviewStableKey: string | null;
    snapshot: Record<string, unknown>;
    versionKind: "baseline" | "approved_application";
  },
): Promise<VersionRow> {
  const fingerprint = fingerprintProcessVersionSnapshot(input.snapshot);
  const sequence = input.predecessor
    ? input.predecessor.versionSequence + 1
    : 1;
  const result = await client.query<DatabaseRow>(
    `insert into process_versions (
       organization_id, process_id, process_stable_key, version_sequence,
       predecessor_version_id, predecessor_version_stable_key, version_kind,
       documented_process_snapshot, documented_process_fingerprint,
       effective_at, recorded_by_actor, source_review_id,
       source_review_stable_key
     ) values (
       $1, $2, $3::uuid, $4, $5, $6::uuid, $7::process_version_kind,
       $8::jsonb, $9, $10::timestamptz, $11, $12, $13::uuid
     ) returning id, stable_key, version_sequence`,
    [
      input.organizationId,
      input.processId,
      input.processStableKey,
      sequence,
      input.predecessor?.id ?? null,
      input.predecessor?.stableKey ?? null,
      input.versionKind,
      JSON.stringify(input.snapshot),
      fingerprint,
      input.effectiveAt?.toISOString() ?? null,
      input.actorIdentifier,
      input.reviewId,
      input.reviewStableKey,
    ],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Process version insertion failed.");
  return {
    id: Number(row.id),
    stableKey: String(row.stable_key),
    versionSequence: Number(row.version_sequence),
  };
}

export async function applyApprovedOperatingModelProposal(input: {
  classifications: Record<string, string>;
  effectiveAt: Date;
  expectedDocumentedFingerprint: string;
  expectedReviewId: string;
  reason: string;
  sessionId: string;
}): Promise<ProcessApplicationMutationResult> {
  const reason = input.reason.trim();
  if (
    !validUuid(input.sessionId) ||
    !validUuid(input.expectedReviewId) ||
    !/^[0-9a-f]{64}$/.test(input.expectedDocumentedFingerprint) ||
    reason.length < 1 ||
    reason.length > 4000 ||
    !validEffectiveAt(input.effectiveAt)
  ) {
    return {
      code: "invalid",
      message: "Review the application reason, effective date, and change classifications.",
      ok: false,
    };
  }

  const configuration = await applicationAccess();
  if (!configuration) {
    return {
      code: "unavailable",
      message: "Process application is not enabled.",
      ok: false,
    };
  }

  const pool = new Pool({ connectionString: configuration.databaseUrl });
  let client: PoolClient | null = null;
  let began = false;
  try {
    client = await pool.connect();
    await client.query("begin isolation level serializable");
    began = true;
    await client.query(
      'set constraints "process_steps_process_id_position_unique" deferred',
    );

    const context = await loadApplicationContext(
      client,
      configuration.organizationId,
      input.sessionId,
    );
    if (
      !context ||
      context.reviewStableKey !== input.expectedReviewId ||
      context.documentedFingerprint !== input.expectedDocumentedFingerprint
    ) {
      throw Object.assign(
        new Error("The finished review is no longer eligible for application."),
        { loturaConflict: true },
      );
    }

    const approvedItems = await loadApprovedItems(
      client,
      context,
      configuration.organizationId,
    );
    if (approvedItems.length < 1) {
      throw Object.assign(
        new Error("This review has no approved operating-model changes to apply."),
        { loturaInvalid: true },
      );
    }
    const classifications = exactClassifications(
      approvedItems,
      input.classifications,
    );
    if (!classifications) {
      throw Object.assign(
        new Error("Classify every approved change before application."),
        { loturaInvalid: true },
      );
    }

    const before = await loadProcessSnapshots(
      client,
      configuration.organizationId,
      context.processId,
    );
    if (before.legacyFingerprint !== context.documentedFingerprint) {
      throw Object.assign(
        new Error("The documented Process changed after this review was prepared."),
        { loturaConflict: true },
      );
    }

    const latestResult = await client.query<DatabaseRow>(
      `select id, stable_key, version_sequence,
         documented_process_fingerprint
       from process_versions
       where organization_id = $1 and process_id = $2
         and process_stable_key = $3::uuid
       order by version_sequence desc limit 1
       for update`,
      [
        configuration.organizationId,
        context.processId,
        context.processStableKey,
      ],
    );
    const beforeFingerprint = fingerprintProcessVersionSnapshot(
      before.versionSnapshot,
    );
    let beforeVersion: VersionRow;
    const latest = latestResult.rows[0];
    if (latest) {
      if (String(latest.documented_process_fingerprint) !== beforeFingerprint) {
        throw Object.assign(
          new Error("The latest Process version does not match current documentation."),
          { loturaConflict: true },
        );
      }
      beforeVersion = {
        id: Number(latest.id),
        stableKey: String(latest.stable_key),
        versionSequence: Number(latest.version_sequence),
      };
    } else {
      beforeVersion = await insertProcessVersion(client, {
        actorIdentifier: configuration.actorIdentifier,
        effectiveAt: null,
        organizationId: configuration.organizationId,
        predecessor: null,
        processId: context.processId,
        processStableKey: context.processStableKey,
        reviewId: null,
        reviewStableKey: null,
        snapshot: before.versionSnapshot,
        versionKind: "baseline",
      });
    }

    const appliedItems: AppliedItem[] = [];
    const priorStepInsertions: number[] = [];
    for (const [index, item] of approvedItems.entries()) {
      const changeKind = classifications.get(item.itemId);
      if (!changeKind) throw new Error("Missing approved-item classification.");
      const applied = await applyApprovedItem(client, item, {
        actorIdentifier: configuration.actorIdentifier,
        changeKind,
        effectiveAt: input.effectiveAt,
        organizationId: configuration.organizationId,
        processId: context.processId,
        processStableKey: context.processStableKey,
        reason,
        stepPositionOffset: item.action === "add_process_step"
          ? priorStepInsertions.filter(
              (position) => position <= Number(item.proposedState.position),
            ).length
          : 0,
      });
      if (item.action === "add_process_step") {
        priorStepInsertions.push(Number(item.proposedState.position));
      }
      appliedItems.push({
        ...item,
        afterState: applied.afterState,
        applicationSequence: index + 1,
        appliedBeforeState: applied.beforeState,
        changeKind,
      });
    }

    const processUpdate = await client.query(
      `update processes
       set updated_at = date_trunc('milliseconds', transaction_timestamp())
       where organization_id = $1 and id = $2 and stable_key = $3::uuid
       returning id`,
      [
        configuration.organizationId,
        context.processId,
        context.processStableKey,
      ],
    );
    if (processUpdate.rowCount !== 1) throw new Error("Process revision update failed.");

    const after = await loadProcessSnapshots(
      client,
      configuration.organizationId,
      context.processId,
    );
    const afterVersion = await insertProcessVersion(client, {
      actorIdentifier: configuration.actorIdentifier,
      effectiveAt: input.effectiveAt,
      organizationId: configuration.organizationId,
      predecessor: beforeVersion,
      processId: context.processId,
      processStableKey: context.processStableKey,
      reviewId: context.reviewId,
      reviewStableKey: context.reviewStableKey,
      snapshot: after.versionSnapshot,
      versionKind: "approved_application",
    });

    const applicationResult = await client.query<DatabaseRow>(
      `insert into operating_model_proposal_applications (
         organization_id, process_id, process_stable_key, review_id,
         review_stable_key, mapping_id, mapping_stable_key, mapping_revision,
         documented_process_fingerprint, before_version_id,
         before_version_stable_key, after_version_id,
         after_version_stable_key, reason, effective_at, actor_identifier
       ) values (
         $1, $2, $3::uuid, $4, $5::uuid, $6, $7::uuid, $8, $9,
         $10, $11::uuid, $12, $13::uuid, $14, $15::timestamptz, $16
       ) returning id, stable_key`,
      [
        configuration.organizationId,
        context.processId,
        context.processStableKey,
        context.reviewId,
        context.reviewStableKey,
        context.mappingId,
        context.mappingStableKey,
        context.mappingRevision,
        context.documentedFingerprint,
        beforeVersion.id,
        beforeVersion.stableKey,
        afterVersion.id,
        afterVersion.stableKey,
        reason,
        input.effectiveAt.toISOString(),
        configuration.actorIdentifier,
      ],
    );
    const application = applicationResult.rows[0];
    if (!application) throw new Error("Proposal application ledger insertion failed.");

    for (const item of appliedItems) {
      const itemResult = await client.query(
        `insert into operating_model_proposal_application_items (
           organization_id, application_id, application_stable_key,
           review_id, review_stable_key, mapping_id, mapping_stable_key,
           review_decision_id, review_decision_stable_key, item_revision_id,
           item_revision_stable_key, item_stable_key, application_sequence,
           action, change_kind, before_state, after_state
         ) values (
           $1, $2, $3::uuid, $4, $5::uuid, $6, $7::uuid, $8, $9::uuid,
           $10, $11::uuid, $12::uuid, $13, $14::discovery_mapping_action,
           $15::operating_model_change_kind, $16::jsonb, $17::jsonb
         ) returning id`,
        [
          configuration.organizationId,
          Number(application.id),
          String(application.stable_key),
          context.reviewId,
          context.reviewStableKey,
          context.mappingId,
          context.mappingStableKey,
          item.decisionId,
          item.decisionStableKey,
          item.itemRevisionId,
          item.itemRevisionStableKey,
          item.itemId,
          item.applicationSequence,
          item.action,
          item.changeKind,
          JSON.stringify(item.appliedBeforeState),
          JSON.stringify(item.afterState),
        ],
      );
      if (itemResult.rowCount !== 1) {
        throw new Error("Proposal application item insertion failed.");
      }
    }

    await client.query("commit");
    began = false;
    return {
      applicationId: String(application.stable_key),
      message: `All approved changes were applied as Process version ${afterVersion.versionSequence}.`,
      ok: true,
      sessionId: input.sessionId,
      versionSequence: afterVersion.versionSequence,
    };
  } catch (error) {
    if (client && began) {
      try {
        await client.query("rollback");
      } catch {
        // The original bounded failure is more useful than a rollback failure.
      }
    }
    const details = typeof error === "object" && error !== null
      ? error as Record<string, unknown>
      : {};
    if (details.loturaInvalid) {
      return { code: "invalid", message: String(details.message), ok: false };
    }
    if (details.loturaConflict || details.code === "40001") {
      return {
        code: "conflict",
        message: "The review or documented Process changed. Reload before applying it.",
        ok: false,
      };
    }
    logProcessApplicationFailure("apply_review", error);
    return {
      code: "unavailable",
      message: "Lotura could not apply this review safely. No partial Process change was retained.",
      ok: false,
    };
  } finally {
    client?.release();
    await pool.end();
  }
}
