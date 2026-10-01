export type PositionWorkInput = {
  positionId: string;
  requestId: string;
  workDescription: string;
  involvement: "perform" | "oversee" | "support" | "backup" | "mixed" | "unsure";
  epistemicState: "known" | "assumed" | "needs_validation";
};
export const POSITION_WORK_SCOPE_PREFIX: string;
export const POSITION_WORK_DESCRIPTION_PROMPT: string;
export const POSITION_WORK_PROMPT_POLICY_VERSION: string;
export function positionWorkInvolvementLabel(value: string): string | null;
export function validatePositionWorkInput(input: unknown): PositionWorkInput | null;
export function buildPositionWorkScope(input: { title: string; unitName: string | null }): string;
export function isPositionWorkDiscovery(context: unknown): boolean;
export function positionWorkAnalystInstructions(context: unknown): string;
