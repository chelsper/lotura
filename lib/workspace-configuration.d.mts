export type WorkspaceLogo =
  | {
      kind: "monogram";
      text: string;
      accessibleLabel: string;
    }
  | {
      kind: "lotura-mark";
      text: "L";
      accessibleLabel: "Lotura mark";
    }
  | {
      kind: "image";
      src: string;
      accessibleLabel: string;
    };

export type WorkspaceAccent = {
  readonly base: string;
  readonly hover: string;
  readonly subtle: string;
  readonly border: string;
  readonly foreground: string;
  readonly focus: string;
};

export type WorkspaceAppearance = {
  displayName: string;
  scopeLabel: string | null;
  logo: WorkspaceLogo;
  accent: WorkspaceAccent;
};

export type WorkspaceKnowledgeStateId =
  | "sanitized-working-draft"
  | "validated"
  | "approved-for-pilot";

export type WorkspaceKnowledgeState = {
  id: WorkspaceKnowledgeStateId;
  label: string;
  description: string;
  tone: "warning" | "informational" | "success";
};

export type WorkspaceConfiguration = {
  appearance: WorkspaceAppearance;
  knowledgeState: WorkspaceKnowledgeState | null;
};

export type WorkspaceConfigurationOverrides = {
  displayName?: string;
  scopeLabel?: string;
  knowledgeState?: WorkspaceKnowledgeStateId;
  logoUrl?: string;
  logoMonogram?: string;
  accent?: string;
};

export const LOTURA_DEFAULT_ACCENT: WorkspaceAccent;
export const KNOWLEDGE_STATES: Readonly<
  Record<
    WorkspaceKnowledgeStateId,
    Omit<WorkspaceKnowledgeState, "id">
  >
>;

export function contrastRatio(left: string, right: string): number;
export function hasAccessibleContrast(
  foreground: string,
  background: string,
  minimumRatio?: number,
): boolean;
export function accessibleForeground(background: string): string;
export function resolveWorkspaceConfiguration(input: {
  organizationName: string;
  overrides?: WorkspaceConfigurationOverrides;
}): WorkspaceConfiguration;
