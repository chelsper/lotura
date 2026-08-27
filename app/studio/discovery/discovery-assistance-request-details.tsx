import type { DiscoveryAssistanceRunRecord } from "@/lib/discovery-assistance-data";

function formatDuration(durationMs: number) {
  if (durationMs < 1_000) return `${durationMs} ms`;
  return `${(durationMs / 1_000).toFixed(1)} seconds`;
}

function formatEstimatedCost(microusd: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 6,
    minimumFractionDigits: 4,
    style: "currency",
  }).format(microusd / 1_000_000);
}

export function DiscoveryAssistanceRequestDetails({
  assistance,
}: {
  assistance: DiscoveryAssistanceRunRecord;
}) {
  if (assistance.providerKey !== "openai") return null;

  return (
    <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
        AI request details
      </summary>
      {assistance.requestMetadata ? (
        <div className="mt-4">
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-[var(--text-tertiary)]">Status</dt>
              <dd className="mt-1 font-medium text-[var(--text)]">Completed</dd>
            </div>
            <div>
              <dt className="text-[var(--text-tertiary)]">Model</dt>
              <dd className="mt-1 font-medium text-[var(--text)]">
                {assistance.modelIdentifier}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-tertiary)]">Request time</dt>
              <dd className="mt-1 font-medium text-[var(--text)]">
                {formatDuration(assistance.requestMetadata.durationMs)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-tertiary)]">Tokens used</dt>
              <dd className="mt-1 font-medium text-[var(--text)]">
                {assistance.requestMetadata.totalTokens.toLocaleString("en-US")}
              </dd>
              <dd className="mt-1 text-xs text-[var(--text-tertiary)]">
                {assistance.requestMetadata.inputTokens.toLocaleString("en-US")} in · {assistance.requestMetadata.outputTokens.toLocaleString("en-US")} out
                {assistance.requestMetadata.cachedInputTokens > 0
                  ? ` · ${assistance.requestMetadata.cachedInputTokens.toLocaleString("en-US")} cached`
                  : ""}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-tertiary)]">Estimated cost</dt>
              <dd className="mt-1 font-medium text-[var(--text)]">
                {formatEstimatedCost(
                  assistance.requestMetadata.estimatedCostMicrousd,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-tertiary)]">Provider project</dt>
              <dd className="mt-1 break-all font-medium text-[var(--text)]">
                {assistance.requestMetadata.providerProjectIdentifier}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-[var(--text-tertiary)]">
            Cost is an estimate using the model rate recorded when the request ran. Provider billing is the final source. Prompts and answers are not copied into these request details.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Request details were not preserved for this earlier pilot run.
        </p>
      )}
    </details>
  );
}
