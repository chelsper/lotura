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
  logo: WorkspaceLogo;
  accent: WorkspaceAccent;
};

export type WorkspaceConfiguration = {
  appearance: WorkspaceAppearance;
};

export const LOTURA_DEFAULT_ACCENT: WorkspaceAccent;

export function contrastRatio(left: string, right: string): number;
export function hasAccessibleContrast(
  foreground: string,
  background: string,
  minimumRatio?: number,
): boolean;
export function accessibleForeground(background: string): string;
export function resolveWorkspaceConfiguration(input: {
  organizationName: string;
}): WorkspaceConfiguration;
