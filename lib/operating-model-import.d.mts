export type ImportValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: null | {
    knowledgeState:
      | "sanitized-working-draft"
      | "validated"
      | "approved-for-pilot";
    counts: Record<string, number>;
  };
};

export const HUMAN_REVIEW_WARNING: string;

export function validateOperatingModelImport(
  document: unknown,
): ImportValidationResult;
