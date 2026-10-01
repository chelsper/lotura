export const POSITION_WORK_SCOPE_PREFIX = "Work discovery for a job title.";
export const POSITION_WORK_DESCRIPTION_PROMPT = "What work does this job involve?";
export const POSITION_WORK_PROMPT_POLICY_VERSION = "lad-069-position-work-v1";

const INVOLVEMENT = Object.freeze({
  perform: "Performs the work",
  oversee: "Oversees the work",
  support: "Supports someone else doing the work",
  backup: "Provides backup when needed",
  mixed: "A mix of these — needs clarification",
  unsure: "Not sure yet — needs clarification",
});
const STATES = new Set(["known", "assumed", "needs_validation"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function positionWorkInvolvementLabel(value) {
  return Object.hasOwn(INVOLVEMENT, value) ? INVOLVEMENT[value] : null;
}

export function validatePositionWorkInput(input) {
  if (!input || typeof input !== "object") return null;
  const { positionId, requestId, involvement, epistemicState } = input;
  const workDescription = typeof input.workDescription === "string" ? input.workDescription.trim() : "";
  if (typeof positionId !== "string" || !UUID.test(positionId)
    || typeof requestId !== "string" || !UUID.test(requestId)
    || typeof involvement !== "string" || !positionWorkInvolvementLabel(involvement)
    || !STATES.has(epistemicState)
    || workDescription.length < 3 || workDescription.length > 4000) return null;
  return { positionId, requestId, workDescription, involvement, epistemicState };
}

export function buildPositionWorkScope({ title, unitName }) {
  // A readable source snapshot, not a new Position/Role relationship. Do not
  // include occupants, reporting lines, coverage or the organizational catalog.
  return `${POSITION_WORK_SCOPE_PREFIX}\nJob title: ${title.slice(0, 255)}\nOrganization Unit: ${unitName ? unitName.slice(0, 255) : "Not recorded"}\nExplore the work described by the participant: possible responsibilities, related processes, and what remains unclear. The participant's description is interview evidence, not a confirmed assignment or Process ownership.`;
}

export function isPositionWorkDiscovery(context) {
  return context?.sessionKind === "inquiry"
    && typeof context?.scopeStatement === "string"
    && context.scopeStatement.startsWith(`${POSITION_WORK_SCOPE_PREFIX}\n`);
}

export function positionWorkAnalystInstructions(context) {
  if (!isPositionWorkDiscovery(context)) return "";
  return `\n\nThis conversation starts from a job title (Position), not an established Process. The participant has already described the work and their understanding of how the job participates. Do not ask them to choose a subject or repeat that description. Help distinguish performing, overseeing, supporting and providing backup; if they chose a mix or are unsure, clarify one concrete example. Overseeing work is not evidence of Process ownership, and a Position or Person is not an Operational Role.
Summarize possible responsibility areas as short, plain-language phrases in clear, explicitly attributed to the participant. Use narrative to explain how the work fits together in 2–3 short sentences. Keep an ongoing responsibility separate from a Process (work with a start, an outcome and steps). Do not turn a list of duties into an invented sequence, or demand Process boundaries for every duty. Use the supplied process-shaped fields only where the evidence supports them; leave unsupported fields null or empty. Name related processes in the narrative only as possibilities, not newly created or matched records. Put uncertainties in needsValidation or openQuestions. Ask one useful question about the work already described. Do not infer responsibility, coverage, authority or ownership from a job title, reporting line or stated involvement. Nothing in this conversation assigns or creates a Role or Process; human review and the existing authoring workflow are required.`;
}
