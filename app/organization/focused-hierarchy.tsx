import Link from "next/link";

import type {
  OrganizationPosition,
  OrganizationPositionSummary,
  StructureRelationship,
} from "@/lib/organization-structure-data.mjs";

import { ArrowIcon, OrganizationIcon } from "../ui/icons";
import { Badge, Card, cn } from "../ui/primitives";

function positionHref(id: string) {
  return `/organization/positions/${encodeURIComponent(id)}`;
}

function PositionNode({
  emphasized = false,
  position,
  relationship,
}: {
  emphasized?: boolean;
  position: OrganizationPositionSummary;
  relationship?: StructureRelationship;
}) {
  return (
    <Link
      className={cn(
        "group block rounded-[12px] border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]",
        emphasized
          ? "border-[var(--workspace-accent-border)] bg-[var(--workspace-accent-subtle)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]",
      )}
      href={positionHref(position.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-5 text-[var(--text)]">
            {position.title}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
            {position.unit?.name ?? "No Organization Unit recorded"}
          </p>
        </div>
        <ArrowIcon className="mt-0.5 size-3.5 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
      </div>
      {relationship?.isCrossUnit ? (
        <Badge className="mt-2" tone="info">
          Cross-Unit
        </Badge>
      ) : null}
    </Link>
  );
}

export function FocusedHierarchy({
  position,
}: {
  position: OrganizationPosition;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--border)] p-4 sm:p-5">
        <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
          <OrganizationIcon className="size-3.5" />
          Focused hierarchy
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-[-0.025em] text-[var(--text)]">
          Local reporting context
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          Follow this reporting branch one Position at a time. Reporting
          relationships do not assign Process ownership.
        </p>
      </div>

      <div className="p-4 sm:p-5">
        {position.managerChain.length > 0 ? (
          <div>
            <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
              Manager chain
            </p>
            <div className="mt-2 grid gap-2 lg:grid-cols-2">
              {position.managerChain.map((manager) => (
                <PositionNode key={manager.id} position={manager} />
              ))}
            </div>
            <div className="mx-5 h-5 w-px bg-[var(--border-strong)]" />
          </div>
        ) : (
          <p className="mb-3 text-xs text-[var(--text-tertiary)]">
            No primary manager Position is recorded for this snapshot.
          </p>
        )}

        <PositionNode emphasized position={position} />

        {position.directReports.length > 0 ? (
          <div>
            <div className="mx-5 h-5 w-px bg-[var(--border-strong)]" />
            <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
              Direct-report Positions
            </p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {position.directReports.map((relationship) => (
                <PositionNode
                  key={relationship.id}
                  position={relationship.position}
                  relationship={relationship}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-[var(--text-tertiary)]">
            No direct-report Positions are recorded.
          </p>
        )}

        {position.peers.length > 0 ? (
          <details className="group mt-5 border-t border-[var(--border)] pt-4">
            <summary className="cursor-pointer list-none text-xs font-medium text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]">
              Show {position.peers.length} immediate {position.peers.length === 1 ? "peer" : "peers"}
            </summary>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {position.peers.map((peer) => (
                <PositionNode key={peer.id} position={peer} />
              ))}
            </div>
          </details>
        ) : null}

        {position.additionalManagers.length > 0 ||
        position.additionalReports.length > 0 ? (
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
              Additional reporting context
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {[...position.additionalManagers, ...position.additionalReports].map(
                (relationship) => (
                  <div key={relationship.id}>
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <Badge>{relationship.typeLabel}</Badge>
                      {relationship.isCrossUnit ? (
                        <Badge tone="info">Cross-Unit</Badge>
                      ) : null}
                    </div>
                    <PositionNode
                      position={relationship.position}
                      relationship={relationship}
                    />
                    {relationship.reason ? (
                      <p className="mt-1.5 text-[11px] leading-4 text-[var(--text-tertiary)]">
                        {relationship.reason}
                      </p>
                    ) : null}
                  </div>
                ),
              )}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
