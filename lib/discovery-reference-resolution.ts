import "server-only";

import { neon } from "@neondatabase/serverless";

export type DiscoveryReferenceResolutionInput = {
  disposition: "confirmed" | "rejected" | "unresolved";
  kind: string;
  organizationUnitStableKey: string | null;
  personStableKey: string | null;
  positionStableKey: string | null;
  processFamilyStableKey: string | null;
  processStableKey: string | null;
  roleStableKey: string | null;
  sourceFingerprint: string;
  systemStableKey: string | null;
};

export type DiscoveryReferenceResolution = {
  organizationUnitId: number | null;
  organizationUnitStableKey: string | null;
  personId: number | null;
  personStableKey: string | null;
  positionId: number | null;
  positionStableKey: string | null;
  processFamilyId: number | null;
  processFamilyStableKey: string | null;
  processId: number | null;
  processStableKey: string | null;
  roleId: number | null;
  roleStableKey: string | null;
  sourceFingerprint: string;
  systemId: number | null;
  systemStableKey: string | null;
};

type ResolutionRow = {
  organization_unit_id: number | null;
  organization_unit_stable_key: string | null;
  person_id: number | null;
  person_stable_key: string | null;
  position_id: number | null;
  position_stable_key: string | null;
  process_family_id: number | null;
  process_family_stable_key: string | null;
  process_id: number | null;
  process_stable_key: string | null;
  role_id: number | null;
  role_stable_key: string | null;
  source_fingerprint: string;
  system_id: number | null;
  system_stable_key: string | null;
};

export async function resolveDiscoveryReferenceTargets(
  organizationId: number,
  decisions: DiscoveryReferenceResolutionInput[],
): Promise<DiscoveryReferenceResolution[]> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");
  const sql = neon(databaseUrl, {
    isolationLevel: "RepeatableRead",
    readOnly: true,
  });
  const rows = await sql.query(
    `with input as materialized (
       select * from jsonb_to_recordset($2::jsonb) as item(
         disposition text, kind text, "sourceFingerprint" varchar(64),
         "organizationUnitStableKey" uuid, "roleStableKey" uuid,
         "personStableKey" uuid, "positionStableKey" uuid,
         "systemStableKey" uuid, "processStableKey" uuid,
         "processFamilyStableKey" uuid
       )
     )
     select input."sourceFingerprint" as source_fingerprint,
       unit.id as organization_unit_id, unit.stable_key::text as organization_unit_stable_key,
       matched_role.id as role_id, matched_role.stable_key::text as role_stable_key,
       matched_person.id as person_id, matched_person.stable_key::text as person_stable_key,
       matched_position.id as position_id, matched_position.stable_key::text as position_stable_key,
       matched_system.id as system_id, matched_system.stable_key::text as system_stable_key,
       matched_process.id as process_id, matched_process.stable_key::text as process_stable_key,
       family.id as process_family_id, family.stable_key::text as process_family_stable_key
     from input
     left join organization_units unit
       on unit.organization_id = $1::integer and unit.stable_key = input."organizationUnitStableKey"
      and unit.status = 'active'
     left join roles matched_role
       on matched_role.organization_id = $1::integer and matched_role.stable_key = input."roleStableKey"
      and matched_role.status = 'active'
     left join people matched_person
       on matched_person.organization_id = $1::integer and matched_person.stable_key = input."personStableKey"
      and matched_person.status = 'active'
     left join positions matched_position
       on matched_position.organization_id = $1::integer and matched_position.stable_key = input."positionStableKey"
      and matched_position.status = 'active'
     left join position_assignments assignment
       on assignment.organization_id = $1::integer
      and assignment.person_id = matched_person.id
      and assignment.position_id = matched_position.id and assignment.status = 'active'
     left join role_mandates matched_mandate
       on matched_mandate.organization_id = $1::integer
      and matched_mandate.position_id = matched_position.id
      and matched_mandate.role_id = matched_role.id
      and matched_mandate.status = 'active'
     left join systems matched_system
       on matched_system.organization_id = $1::integer and matched_system.stable_key = input."systemStableKey"
      and matched_system.status = 'active'
     left join processes matched_process
       on matched_process.organization_id = $1::integer and matched_process.stable_key = input."processStableKey"
     left join process_families family
       on family.organization_id = $1::integer and family.stable_key = input."processFamilyStableKey"
      and family.status = 'active'
     where case
       when input.disposition in ('rejected', 'unresolved') then
         unit.id is null and matched_role.id is null and matched_person.id is null
         and matched_position.id is null and matched_system.id is null
         and matched_process.id is null and family.id is null
       when input.disposition = 'confirmed' and input.kind = 'organization_unit' then unit.id is not null
       when input.disposition = 'confirmed' and input.kind = 'operational_role' then matched_role.id is not null
       when input.disposition = 'confirmed' and input.kind = 'person_capacity' then
         matched_person.id is not null and matched_position.id is not null and assignment.id is not null
         and (input."roleStableKey" is null or (matched_role.id is not null and matched_mandate.id is not null))
       when input.disposition = 'confirmed' and input.kind = 'system' then matched_system.id is not null
       when input.disposition = 'confirmed' and input.kind = 'process' then matched_process.id is not null
       when input.disposition = 'confirmed' and input.kind = 'process_family' then family.id is not null
       else false
     end`,
    [organizationId, JSON.stringify(decisions)],
  ) as ResolutionRow[];
  return rows.map((row) => ({
    organizationUnitId: row.organization_unit_id,
    organizationUnitStableKey: row.organization_unit_stable_key,
    personId: row.person_id,
    personStableKey: row.person_stable_key,
    positionId: row.position_id,
    positionStableKey: row.position_stable_key,
    processFamilyId: row.process_family_id,
    processFamilyStableKey: row.process_family_stable_key,
    processId: row.process_id,
    processStableKey: row.process_stable_key,
    roleId: row.role_id,
    roleStableKey: row.role_stable_key,
    sourceFingerprint: row.source_fingerprint,
    systemId: row.system_id,
    systemStableKey: row.system_stable_key,
  }));
}
