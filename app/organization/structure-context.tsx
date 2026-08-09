import type { OrganizationStructureData } from "@/lib/organization-structure-data.mjs";

import { InfoIcon } from "../ui/icons";
import { Alert, Badge, Card } from "../ui/primitives";
import { formatOperatingModelTimestamp } from "../workspace-shell";

export function StructureContext({
  compact = false,
  data,
}: {
  compact?: boolean;
  data: OrganizationStructureData;
}) {
  return (
    <Card className={compact ? "p-4" : "p-4 sm:p-5"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
            <InfoIcon className="size-3.5" />
            Imported structure snapshot
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={data.snapshot.isPartial ? "warning" : "info"}>
              {data.snapshot.basisLabel}
            </Badge>
            {data.snapshot.currentForPilotUseAt ? (
              <Badge tone="neutral">Current workspace basis</Badge>
            ) : null}
          </div>
        </div>
        <dl className="text-xs leading-5 text-[var(--text-secondary)]">
          <div>
            <dt className="inline text-[var(--text-tertiary)]">Source evidence as of </dt>
            <dd className="inline">
              {formatOperatingModelTimestamp(data.snapshot.sourceAsOf)} UTC
            </dd>
          </div>
          <div>
            <dt className="inline text-[var(--text-tertiary)]">Imported </dt>
            <dd className="inline">
              {formatOperatingModelTimestamp(data.snapshot.importedAt)} UTC
            </dd>
          </div>
        </dl>
      </div>
      {!compact ? (
        <p className="mt-4 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[var(--text-secondary)]">
          Source evidence does not by itself establish organizational truth.
          Reporting relationships describe structure; they do not assign
          Process ownership.
        </p>
      ) : null}
    </Card>
  );
}

export function VacancyEvidenceNotice({
  data,
}: {
  data: OrganizationStructureData;
}) {
  if (data.snapshot.vacancyEvidenceComplete) {
    return (
      <Alert tone="info">
        Vacancy evidence is complete for the scope of this fictional snapshot.
        Positions labelled vacant have no current occupant or temporary
        structural coverage in that reviewed basis.
      </Alert>
    );
  }

  return (
    <Alert tone="warning">
      Vacancy evidence is not complete for this snapshot. A Position without a
      current Assignment is shown as occupancy not established—not vacant.
    </Alert>
  );
}
