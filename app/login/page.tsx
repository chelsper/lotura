import type { CSSProperties } from "react";

import { safeReturnPath } from "@/lib/authentication-policy.mjs";
import { resolveWorkspaceConfiguration } from "@/lib/workspace-configuration.mjs";
import { resolveWorkspaceConfigurationOverrides } from "@/lib/workspace-configuration-policy.mjs";

function loginAppearanceStyle(accent: {
  base: string;
  foreground: string;
  focus: string;
}) {
  return {
    "--workspace-accent": accent.base,
    "--workspace-accent-foreground": accent.foreground,
    "--workspace-focus-ring": accent.focus,
  } as CSSProperties;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    returnTo?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const rawReturnTo = Array.isArray(query.returnTo)
    ? query.returnTo[0]
    : query.returnTo;
  const returnTo = safeReturnPath(rawReturnTo);
  const error = Array.isArray(query.error) ? query.error[0] : query.error;
  const overrides = resolveWorkspaceConfigurationOverrides(process.env);
  const configuration = resolveWorkspaceConfiguration({
    organizationName: overrides.displayName ?? "Private workspace",
    overrides,
  });

  return (
    <main
      className="grid min-h-screen place-items-center bg-[var(--canvas)] px-4 py-10 text-[var(--text)]"
      style={loginAppearanceStyle(configuration.appearance.accent)}
    >
      <section className="w-full max-w-[420px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span
            aria-label={configuration.appearance.logo.accessibleLabel}
            className="grid size-9 place-items-center rounded-[10px] bg-[var(--workspace-accent)] text-xs font-semibold text-[var(--workspace-accent-foreground)]"
            role="img"
          >
            {configuration.appearance.logo.kind === "image" ? (
              // Configuration accepts an approved HTTPS asset host at runtime.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="size-8 object-contain"
                referrerPolicy="no-referrer"
                src={configuration.appearance.logo.src}
              />
            ) : (
              configuration.appearance.logo.text
            )}
          </span>
          <div>
            <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
              {configuration.appearance.scopeLabel ?? "Private workspace"}
            </p>
            <p className="text-sm font-medium text-[var(--text)]">
              {configuration.appearance.displayName}
            </p>
          </div>
        </div>

        <h1 className="mt-8 text-2xl font-semibold tracking-[-0.035em]">
          Sign in to Lotura
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          This workspace is private. Use the temporary pilot administrator
          credential supplied through the approved access process.
        </p>

        {configuration.knowledgeState ? (
          <p className="mt-4 text-xs font-medium text-[var(--text-secondary)]">
            Snapshot: {configuration.knowledgeState.label}
          </p>
        ) : null}

        {error === "invalid" ? (
          <p
            className="mt-5 rounded-xl border border-[var(--error-border)] bg-[var(--error-subtle)] px-3 py-2.5 text-sm text-[var(--error)]"
            role="alert"
          >
            The identifier or password was not accepted.
          </p>
        ) : null}

        <form action="/auth/login" className="mt-6 space-y-4" method="post">
          <input name="returnTo" type="hidden" value={returnTo} />
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Administrator identifier
            </span>
            <input
              autoComplete="username"
              className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none transition focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--workspace-focus-ring)]/15"
              maxLength={128}
              name="identifier"
              required
              type="text"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Password
            </span>
            <input
              autoComplete="current-password"
              className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none transition focus:border-[var(--workspace-accent)] focus:ring-3 focus:ring-[var(--workspace-focus-ring)]/15"
              maxLength={1024}
              name="password"
              required
              type="password"
            />
          </label>
          <button
            className="inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[var(--workspace-accent)] px-4 text-sm font-medium text-[var(--workspace-accent-foreground)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)] focus-visible:ring-offset-2"
            type="submit"
          >
            Sign in
          </button>
        </form>

        <p className="mt-6 text-[11px] leading-5 text-[var(--text-tertiary)]">
          Temporary pilot access. This authentication method is designed to be
          replaced by an approved identity provider without changing the
          operating model.
        </p>
      </section>
    </main>
  );
}
