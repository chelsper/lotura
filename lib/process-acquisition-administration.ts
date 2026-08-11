import "server-only";

import { neon } from "@neondatabase/serverless";

import { requireWorkspaceAccess } from "./authentication";
import { resolveProcessAcquisitionConfiguration } from "./process-acquisition-policy.mjs";

export type DraftProcessMutationResult =
  | { ok: true; message: string; processId: string }
  | {
      ok: false;
      code: "conflict" | "invalid" | "not_found" | "unavailable";
      message: string;
    };

type CreateDraftProcessInput = {
  name: string;
  ownerConfirmed: boolean;
  ownerRoleKey?: string | null;
  purpose?: string | null;
};

function roleIdFromKey(value: string | null | undefined) {
  if (!value) return null;
  const match = /^role:([1-9][0-9]*)$/.exec(value);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) ? id : null;
}

export async function createDraftProcess(
  input: CreateDraftProcessInput,
): Promise<DraftProcessMutationResult> {
  const runtimeAccess = await requireWorkspaceAccess();
  const configuration = resolveProcessAcquisitionConfiguration(
    process.env,
    runtimeAccess,
  );
  if (!configuration.enabled) {
    return {
      ok: false,
      code: "unavailable",
      message: "Process Acquisition is not enabled for this workspace.",
    };
  }

  const name = input.name.trim();
  const purpose = input.purpose?.trim() || null;
  if (name.length < 1 || name.length > 255) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter a Process name between 1 and 255 characters.",
    };
  }
  if (purpose && purpose.length > 5000) {
    return {
      ok: false,
      code: "invalid",
      message: "Keep the initial purpose to 5,000 characters or fewer.",
    };
  }

  const ownerRoleId = roleIdFromKey(input.ownerRoleKey);
  if (input.ownerRoleKey && !ownerRoleId) {
    return {
      ok: false,
      code: "invalid",
      message: "Select a valid Operational Role or leave ownership unassigned.",
    };
  }
  if (ownerRoleId && !input.ownerConfirmed) {
    return {
      ok: false,
      code: "invalid",
      message: "Confirm the intended Owner Role explicitly before creating the Draft.",
    };
  }

  const sql = neon(configuration.databaseUrl, {
    isolationLevel: "Serializable",
    readOnly: false,
  });

  try {
    const rows = await sql.query(
      `with selected_role as (
         select id
         from roles
         where organization_id = $1
           and id = $2::integer
           and status = 'active'
       ), duplicate_process as (
         select id
         from processes
         where organization_id = $1
           and lower(btrim(name)) = lower($3)
         limit 1
       ), inserted as (
         insert into processes (
           organization_id, name, purpose, owner_role_id, status
         )
         select
           $1,
           $3,
           $4,
           case when $2::integer is null then null else (select id from selected_role) end,
           'draft'
         where not exists (select 1 from duplicate_process)
           and ($2::integer is null or exists (select 1 from selected_role))
         returning id
       )
       select
         (select count(*)::int from selected_role) as role_count,
         (select count(*)::int from duplicate_process) as duplicate_count,
         (select id from inserted) as process_id`,
      [configuration.organizationId, ownerRoleId, name, purpose],
    );

    const row = rows[0];
    if (!row) {
      return {
        ok: false,
        code: "unavailable",
        message: "Lotura could not create the Draft Process safely.",
      };
    }
    if (Number(row.duplicate_count) > 0) {
      return {
        ok: false,
        code: "conflict",
        message: "A Process with this name already exists in the Organization.",
      };
    }
    if (ownerRoleId && Number(row.role_count) !== 1) {
      return {
        ok: false,
        code: "not_found",
        message: "The selected active Operational Role was not found in this Organization.",
      };
    }
    const processId = Number(row.process_id);
    if (!Number.isSafeInteger(processId) || processId < 1) {
      return {
        ok: false,
        code: "unavailable",
        message: "Lotura could not verify the new Draft Process.",
      };
    }

    return {
      ok: true,
      message: "Draft Process created. It has not been approved or activated.",
      processId: `process:${processId}`,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Lotura could not create the Draft Process safely. No partial change was retained.",
    };
  }
}
