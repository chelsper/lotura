import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("LAD-070 authorizes an incomplete human-established Draft without manufacturing authority", async () => {
  const decision = await read("ARCHITECTURE_DECISIONS.md");
  const start = decision.indexOf("### LAD-070");
  assert.notEqual(start, -1);
  const record = decision.slice(start);
  assert.match(record, /Status:\*\* Accepted — implementation authorized/);
  assert.match(record, /Use what I have/);
  assert.match(record, /shared working baseline/);
  assert.match(record, /Draft\s+status does not mean approved, complete, or institutional truth/);
  assert.match(record, /AI synthesis may prefill these fields, but every field remains editable/);
  assert.match(record, /source Knowledge Outcome key is preserved in history/);
  assert.match(record, /retry cannot create a\s+second Process from the same review/i);
  assert.match(record, /Policy remains a recognized but unresolved/);
  assert.match(record, /conflicts with\s+and supersedes no accepted decision/);
});

test("migration 0033 expands classification and only the exact paused-to-review transition", async () => {
  const migration = await read("drizzle/0033_minimum_viable_process_baseline.sql");
  assert.match(migration, /ADD VALUE 'possible_new_process_family'/);
  assert.match(migration, /ADD VALUE 'possible_policy'/);
  assert.match(migration, /possible_new_process_family[\s\S]*possible_policy[\s\S]*additional_validation_required/);
  assert.match(migration, /OLD\.status = 'paused'[\s\S]*NEW\.status = 'in_progress'/);
  assert.match(migration, /NEW\.status = 'ready_for_review'[\s\S]*NEW\.current_question_key = 'review'/);
  assert.match(migration, /closed discovery inquiry sessions cannot be changed/);
  assert.match(migration, /identity and source context are immutable/);
  assert.match(migration, /revision must advance by exactly one/);
  assert.doesNotMatch(migration, /CREATE TABLE/i);
  assert.doesNotMatch(migration, /ALTER TABLE "(?:processes|process_steps|process_families|process_family_memberships)"/i);
  assert.doesNotMatch(migration, /\bGRANT\b/i);
  assert.doesNotMatch(migration, /(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE) "?(?:processes|process_steps|process_families|process_family_memberships|operating_model_changes)"?/i);
});

test("the inquiry review distinguishes Process, Family, and Policy before any canonical write", async () => {
  const [model, form, outcomePage] = await Promise.all([
    read("lib/discovery-inquiry-review-model.mjs"),
    read("app/studio/discovery/discovery-inquiry-review-form.tsx"),
    read("app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/outcomes/[reviewId]/page.tsx"),
  ]);
  assert.match(model, /This may be a new Process/);
  assert.match(model, /This may be a new Process Family/);
  assert.match(model, /This may be a Policy or governing document/);
  assert.match(form, /DISCOVERY_INQUIRY_REVIEW_OUTCOME_KINDS\.map/);
  assert.match(outcomePage, /Keep this as governing guidance—not a parent Process/);
  assert.match(outcomePage, /has not forced[\s\S]*Policy into the Process hierarchy/);
  assert.match(outcomePage, /Review Process Families/);
});

test("an in-progress or paused Analyst interview can stop with useful evidence", async () => {
  const [administration, page, interview] = await Promise.all([
    read("lib/discovery-inquiry-analyst-administration.ts"),
    read("app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/page.tsx"),
    read("app/studio/discovery/discovery-analyst-interview.tsx"),
  ]);
  const finish = administration.slice(
    administration.indexOf("export async function finishInquiryDiscoveryAnalyst"),
  );
  assert.match(finish, /status in \('in_progress', 'paused'\)/);
  assert.match(finish, /exists \(select 1 from discovery_inquiry_observations/);
  assert.match(finish, /Unanswered questions remain preserved/);
  assert.match(page, /Use what I have/);
  assert.match(page, /Unanswered questions will\s+remain visible for later strengthening/);
  assert.match(interview, /Skip for now/);
  assert.match(interview, /Finish & review/);
});

test("baseline creation reauthorizes and validates the immutable latest human review", async () => {
  const administration = await read("lib/discovery-process-baseline-administration.ts");
  assert.match(administration, /await requireWorkspaceAccess\(\)/);
  assert.match(administration, /resolveOperatingModelAuthoringConfiguration/);
  assert.match(administration, /loadDiscoveryInquiryReview\([\s\S]*input\.reviewId/);
  assert.match(administration, /latestReview\.id !== review\.id/);
  assert.match(administration, /outcome\.kind === "possible_new_process"/);
  assert.match(administration, /organization_id = \$1/g);
  assert.match(administration, /status = 'active'/g);
  assert.match(administration, /ownerConfirmed/);
  assert.match(administration, /familyConfirmed/);
  assert.doesNotMatch(administration, /input\.organizationId|input\.actorIdentifier|input\.databaseUrl/);
});

test("one serializable transaction creates the Draft, Steps, optional Family link, and exact history", async () => {
  const administration = await read("lib/discovery-process-baseline-administration.ts");
  assert.match(administration, /isolationLevel: "Serializable"/g);
  assert.match(administration, /sql\.transaction/);
  assert.match(administration, /insert into processes/);
  assert.match(administration, /'draft'/);
  assert.match(administration, /insert into process_steps/);
  assert.match(administration, /update process_families family[\s\S]*from selected_family selected cross join inserted_process process/);
  assert.match(administration, /insert into process_family_memberships/);
  assert.match(administration, /'create_draft'/);
  assert.match(administration, /'create_step'/);
  assert.match(administration, /'add_process_family_membership'/);
  assert.match(administration, /sourceInquiryReviewStableKey/);
  assert.match(administration, /baselineKind', 'minimum_viable'/);
  assert.match(administration, /duplicate_source/);
  assert.match(administration, /No partial change was retained/);
  assert.match(administration, /insert into processes \([\s\S]*?'draft'/);
  assert.doesNotMatch(administration, /(?:update|delete from) operating_model_changes/i);
  assert.doesNotMatch(administration, /openai|provider|credential/i);
});

test("the baseline UX presents accomplishment, honest draft state, and optional strengthening", async () => {
  const [form, outcomePage, processPage, documentation] = await Promise.all([
    read("app/studio/discovery/discovery-process-baseline-form.tsx"),
    read("app/studio/discovery/inquiries/[inquiryId]/interviews/[sessionId]/outcomes/[reviewId]/page.tsx"),
    read("app/studio/processes/[processId]/page.tsx"),
    read("docs/MINIMUM_VIABLE_PROCESS_BASELINE_ALPHA.md"),
  ]);
  assert.match(outcomePage, /Enough for a working baseline/);
  assert.match(outcomePage, /Turn what you learned into something useful now/);
  assert.match(form, /Create shared working baseline/);
  assert.match(form, /one per line/);
  assert.match(form, /not an approved or complete Process/);
  assert.match(form, /keep[\s\S]*unanswered and Needs validation items/);
  assert.match(processPage, /You created a shared working baseline/);
  assert.match(processPage, /Strengthen with Lotura/);
  assert.match(documentation, /Migration `0033` requires no new application-role grant/);
  assert.match(documentation, /No application deployment[\s\S]*should precede the JU\s+migration/);
});

test("the latest synthesis reader stays session- and tenant-scoped without changing stored history", async () => {
  const data = await read("lib/discovery-analyst-data.ts");
  assert.match(data, /export async function loadLatestDiscoveryAnalystTurn/);
  assert.match(data, /eq\(discoveryAssistanceRun\.organizationId, organizationId\)/);
  assert.match(data, /sessionStableKey/);
  assert.match(data, /eq\(discoveryAssistanceRun\.analystTurn, true\)/);
  assert.match(data, /orderBy\(desc\(discoveryAssistanceRun\.createdAt\)/);
  assert.doesNotMatch(data, /\.update\(|\.insert\(|\.delete\(/);
});
