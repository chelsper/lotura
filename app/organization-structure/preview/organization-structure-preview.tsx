"use client";

import type { CSSProperties, ChangeEvent } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";

import {
  buildOrganizationStructurePreview,
  detectOrganizationStructureColumnMapping,
  MAX_ORGANIZATION_STRUCTURE_FILE_BYTES,
  organizationStructureColumnDefinitions,
  OrganizationStructurePreviewError,
} from "@/lib/organization-structure-preview.mjs";
import type {
  OrganizationStructureCell,
  OrganizationStructureColumnId,
  OrganizationStructureColumnMapping,
  OrganizationStructureIssue,
  OrganizationStructurePreview,
  OrganizationStructureRecord,
} from "@/lib/organization-structure-preview.mjs";
import type { WorkspaceConfiguration } from "@/lib/workspace-configuration.mjs";

import {
  ArrowIcon,
  ChevronIcon,
  FlowIcon,
  LayersIcon,
} from "../../ui/icons";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  FieldLabel,
  Input,
  SearchField,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHeadCell,
  TableHeader,
  TableRow,
  cn,
} from "../../ui/primitives";

type WorkbookSheet = {
  data: OrganizationStructureCell[][];
  sheet: string;
};

type PreviewTab =
  | "overview"
  | "browse"
  | "departments"
  | "reporting"
  | "vacancies"
  | "issues";

const previewTabs: Array<{ id: PreviewTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "browse", label: "Browse" },
  { id: "departments", label: "Departments" },
  { id: "reporting", label: "Reporting" },
  { id: "vacancies", label: "Vacancies" },
  { id: "issues", label: "Review issues" },
];

const maximumRenderedRows = 100;

function fileSizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function safePreviewError(error: unknown) {
  if (error instanceof OrganizationStructurePreviewError) return error.message;
  if (error instanceof Error && error.name === "InvalidInputError") {
    return "Lotura could not read this file as an .xlsx workbook. Legacy .xls files must first be saved as .xlsx.";
  }
  return "Lotura could not read this workbook. Confirm that it is a valid .xlsx file and try again.";
}

function PreviewWorkspaceIdentity({
  configuration,
}: {
  configuration: WorkspaceConfiguration;
}) {
  const { appearance } = configuration;

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-label={appearance.logo.accessibleLabel}
        className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[var(--workspace-accent)] text-[11px] font-semibold text-[var(--workspace-accent-foreground)]"
        role="img"
      >
        {appearance.logo.kind === "image" ? (
          // The generic workspace resolver permits only validated HTTPS assets.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="size-7 object-contain"
            referrerPolicy="no-referrer"
            src={appearance.logo.src}
          />
        ) : (
          appearance.logo.text
        )}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
          {appearance.scopeLabel ?? "Workspace"}
        </p>
        <p className="truncate text-sm font-medium text-[var(--text)]">
          {appearance.displayName}
        </p>
      </div>
    </div>
  );
}

function UploadStep({
  busy,
  configuration,
  file,
  onFileChange,
  onOrganizationNameChange,
  onReview,
  onSourceAsOfChange,
  organizationName,
  sourceAsOf,
}: {
  busy: boolean;
  configuration: WorkspaceConfiguration;
  file: File | null;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOrganizationNameChange: (value: string) => void;
  onReview: () => void;
  onSourceAsOfChange: (value: string) => void;
  organizationName: string;
  sourceAsOf: string;
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-3xl">
        <p className="flex items-center gap-2 text-xs font-medium text-[var(--text-tertiary)]">
          <LayersIcon className="size-3.5" />
          Organization structure
        </p>
        <h1 className="mt-3 text-[34px] font-semibold leading-tight tracking-[-0.05em] text-[var(--text)] sm:text-[44px]">
          Review what the source says before importing anything.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--text-secondary)]">
          A workbook is evidence about the organization—not approved
          organizational truth. Lotura helps you inspect its people, Positions,
          departments, reporting relationships, and unresolved questions first.
        </p>
      </header>

      <Alert className="mt-7" tone="info">
        <p className="font-medium">Private, local review</p>
        <p className="mt-0.5 text-xs leading-5 opacity-90">
          The workbook is read in this browser and held only in memory. No file,
          row, or decision is sent to Lotura, written to a database, or retained
          after refresh.
        </p>
      </Alert>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold tracking-[-0.015em] text-[var(--text)]">
            Choose the evidence to review
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            The preview accepts one .xlsx workbook up to 10 MB. Nothing is
            imported from this screen.
          </p>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)]">
          <div>
            <label className="block">
              <FieldLabel>Organization structure workbook</FieldLabel>
              <span className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-[14px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)] px-5 py-7 text-center transition-colors hover:border-[var(--workspace-accent-border)] hover:bg-[var(--workspace-accent-subtle)] focus-within:ring-2 focus-within:ring-[var(--workspace-focus-ring)]">
                <LayersIcon className="size-6 text-[var(--workspace-accent)]" />
                <span className="mt-3 text-sm font-medium text-[var(--text)]">
                  {file ? file.name : "Choose an .xlsx workbook"}
                </span>
                <span className="mt-1 text-xs text-[var(--text-secondary)]">
                  {file
                    ? `${fileSizeLabel(file.size)} · select again to replace`
                    : "The file stays in this browser"}
                </span>
                <input
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  onChange={onFileChange}
                  type="file"
                />
              </span>
            </label>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <FieldLabel>Organization display name</FieldLabel>
                <Input
                  onChange={(event) => onOrganizationNameChange(event.target.value)}
                  placeholder={configuration.appearance.displayName}
                  value={organizationName}
                />
              </label>
              <label>
                <FieldLabel>Source as-of date</FieldLabel>
                <Input
                  onChange={(event) => onSourceAsOfChange(event.target.value)}
                  type="date"
                  value={sourceAsOf}
                />
                <span className="mt-1.5 block text-[11px] leading-4 text-[var(--text-tertiary)]">
                  Leave blank if the source date is unknown. File dates are not
                  treated as organizational truth.
                </span>
              </label>
            </div>
          </div>

          <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:p-5">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">
              What happens next
            </p>
            <ol className="mt-4 space-y-4">
              {[
                ["1", "Interpret columns", "Confirm what each source column means."],
                ["2", "Preview structure", "Browse local reporting context instead of one giant chart."],
                ["3", "Preserve questions", "Review duplicates, unresolved managers, and missing context."],
              ].map(([number, title, description]) => (
                <li className="flex gap-3" key={number}>
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[11px] font-medium text-[var(--text-secondary)]">
                    {number}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-[var(--text)]">
                      {title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-[var(--text-secondary)]">
                      {description}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <Button
              className="mt-6 w-full"
              disabled={!file || busy}
              onClick={onReview}
              variant="primary"
            >
              {busy ? "Reading workbook…" : "Review workbook"}
              <ArrowIcon className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
    </main>
  );
}

function ColumnMappingStep({
  error,
  headers,
  mapping,
  onApply,
  onBack,
  onMappingChange,
  onSheetChange,
  selectedSheet,
  sheets,
}: {
  error: string | null;
  headers: string[];
  mapping: OrganizationStructureColumnMapping;
  onApply: () => void;
  onBack: () => void;
  onMappingChange: (id: OrganizationStructureColumnId, value: number | null) => void;
  onSheetChange: (sheetName: string) => void;
  selectedSheet: string;
  sheets: WorkbookSheet[];
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-3xl">
        <p className="text-xs font-medium text-[var(--text-tertiary)]">
          Organization structure · Column review
        </p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.045em] text-[var(--text)] sm:text-[38px]">
          Confirm how Lotura should read this source.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Column names vary across organizations. This mapping affects only the
          local preview and creates no Position, Person, User, or Operational Role.
        </p>
      </header>

      {error ? (
        <Alert className="mt-6" tone="error">
          {error}
        </Alert>
      ) : null}

      <Card className="mt-6 overflow-hidden">
        {sheets.length > 1 ? (
          <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <label className="block max-w-sm">
              <FieldLabel>Worksheet to review</FieldLabel>
              <Select
                onChange={(event) => onSheetChange(event.target.value)}
                value={selectedSheet}
              >
                {sheets.map((sheet) => (
                  <option key={sheet.sheet} value={sheet.sheet}>
                    {sheet.sheet}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        ) : null}

        <div className="divide-y divide-[var(--border)]">
          {organizationStructureColumnDefinitions.map((definition) => (
            <div
              className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(240px,0.65fr)] sm:items-center sm:px-6"
              key={definition.id}
            >
              <div>
                <p className="text-sm font-medium text-[var(--text)]">
                  {definition.label}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">
                  {definition.description}
                </p>
              </div>
              <Select
                aria-label={`${definition.label} source column`}
                onChange={(event) =>
                  onMappingChange(
                    definition.id,
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                  )
                }
                value={mapping[definition.id] ?? ""}
              >
                <option value="">Not provided</option>
                {headers.map((header, index) => (
                  <option key={`${header}-${index}`} value={index}>
                    {header || `Column ${index + 1}`}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <Button onClick={onBack} variant="ghost">
            Choose another workbook
          </Button>
          <Button onClick={onApply} variant="primary">
            Build local preview
            <ArrowIcon className="size-4" />
          </Button>
        </div>
      </Card>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0 px-4 py-3.5">
      <dt className="text-[11px] text-[var(--text-tertiary)]">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums tracking-[-0.03em] text-[var(--text)]">
        {value}
      </dd>
    </div>
  );
}

function RecordIdentity({ record }: { record: OrganizationStructureRecord }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-[var(--text)]">
        {record.personName || "Person not supplied"}
      </p>
      <p className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
        {record.positionTitle || "Position title not supplied"}
      </p>
    </div>
  );
}

function OverviewTab({
  onOpenIssue,
  preview,
}: {
  onOpenIssue: (issue: OrganizationStructureIssue) => void;
  preview: OrganizationStructurePreview;
}) {
  const reviewIssues = preview.issues.filter((issue) => issue.tone === "review");

  return (
    <div className="space-y-6">
      <dl className="grid overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] sm:grid-cols-2 lg:grid-cols-4 [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-[var(--border)] sm:[&>*]:border-b-0 sm:[&>*:not(:nth-child(2n))]:border-r lg:[&>*:not(:last-child)]:border-r">
        <Stat label="Source records" value={preview.stats.recordCount} />
        <Stat label="Organization units" value={preview.stats.organizationUnits} />
        <Stat label="Resolved reporting relationships" value={preview.stats.resolvedRelationships} />
        <Stat label="Review categories" value={reviewIssues.length} />
      </dl>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <p className="text-xs font-medium text-[var(--workspace-accent)]">
            What this source can show
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-[var(--text)]">
            A reviewable picture of reported structure
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm leading-6 text-[var(--text-secondary)]">
            <li>Source-provided Person names and Position titles</li>
            <li>Department or unit groupings exactly as supplied</li>
            <li>Reporting relationships Lotura can resolve from this workbook</li>
            <li>Missing, duplicate, ambiguous, and conflicting evidence</li>
          </ul>
        </Card>

        <Card className="p-5 sm:p-6">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">
            What this source cannot approve
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-[var(--text)]">
            Organizational truth still requires review
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm leading-6 text-[var(--text-secondary)]">
            <li>A title does not create a durable Operational Role</li>
            <li>A reporting line does not establish Process ownership</li>
            <li>A named Person does not establish Lotura User access</li>
            <li>Missing rows cannot prove that no vacancies exist</li>
          </ul>
        </Card>
      </div>

      <section aria-labelledby="review-questions">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">
              Discovery through documentation
            </p>
            <h2
              className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[var(--text)]"
              id="review-questions"
            >
              Questions this source surfaced
            </h2>
          </div>
          <Badge tone="evidence-review">Review recommended</Badge>
        </div>
        {preview.issues.length ? (
          <div className="mt-4 overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
            {preview.issues.map((item) => (
              <button
                className="flex w-full items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--workspace-focus-ring)] sm:px-5"
                key={item.kind}
                onClick={() => onOpenIssue(item)}
                type="button"
              >
                <span>
                  <span className="block text-sm font-medium text-[var(--text)]">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-[var(--text-secondary)]">
                    {item.description}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-sm tabular-nums text-[var(--text-secondary)]">
                    {item.count}
                  </span>
                  <ChevronIcon className="size-3.5 text-[var(--text-tertiary)]" />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState className="mt-4" title="No review questions were detected">
            This means only that the mapped source passed the current deterministic
            checks. It does not establish approval or completeness.
          </EmptyState>
        )}
      </section>
    </div>
  );
}

function LocalHierarchyPanel({
  preview,
  record,
}: {
  preview: OrganizationStructurePreview;
  record: OrganizationStructureRecord | null;
}) {
  if (!record) {
    return (
      <EmptyState title="Select a source record">
        Review one Person and Position in local reporting context.
      </EmptyState>
    );
  }

  const recordsByKey = new Map(preview.records.map((item) => [item.key, item]));
  const manager = record.managerRecordKey
    ? recordsByKey.get(record.managerRecordKey) ?? null
    : null;
  const directReports = preview.relationships
    .filter((relationship) => relationship.managerRecordKey === record.key)
    .map((relationship) => recordsByKey.get(relationship.recordKey))
    .filter((item): item is OrganizationStructureRecord => Boolean(item));

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--border)] p-5">
        <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
          Local hierarchy · Source row {record.sourceRow}
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--text)]">
          {record.personName || record.positionTitle || "Unidentified record"}
        </h2>
        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-[var(--text-tertiary)]">Person</dt>
            <dd className="mt-1 text-[var(--text-secondary)]">
              {record.personName || "Not supplied"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--text-tertiary)]">Position title</dt>
            <dd className="mt-1 text-[var(--text-secondary)]">
              {record.positionTitle || "Not supplied"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--text-tertiary)]">Organization unit</dt>
            <dd className="mt-1 text-[var(--text-secondary)]">
              {record.organizationUnit || "Not supplied"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--text-tertiary)]">Location</dt>
            <dd className="mt-1 text-[var(--text-secondary)]">
              {record.location || "Not supplied"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
            Reports to — source evidence
          </p>
          <div className="mt-2 rounded-xl bg-[var(--surface-subtle)] p-3">
            {manager ? (
              <RecordIdentity record={manager} />
            ) : (
              <p className="text-xs leading-5 text-[var(--text-secondary)]">
                {record.reportsToName
                  ? `${record.reportsToName} · ${record.managerResolution}`
                  : "Blank — may be a hierarchy root or missing information"}
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
            Direct reports — {directReports.length} resolved
          </p>
          {directReports.length ? (
            <div className="mt-2 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
              {directReports.slice(0, 20).map((directReport) => (
                <div className="px-3 py-2.5" key={directReport.key}>
                  <RecordIdentity record={directReport} />
                </div>
              ))}
              {directReports.length > 20 ? (
                <p className="px-3 py-2 text-xs text-[var(--text-tertiary)]">
                  {directReports.length - 20} more not shown in this local view
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              No direct reports resolve from this source.
            </p>
          )}
        </div>

        <Alert tone="info">
          Position title and reporting context do not create an Operational Role,
          RoleMandate, RoleCoverage, or Process owner.
        </Alert>
      </div>
    </Card>
  );
}

function BrowseTab({ preview }: { preview: OrganizationStructurePreview }) {
  const [search, setSearch] = useState("");
  const [unit, setUnit] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(
    preview.records[0]?.key ?? null,
  );
  const normalizedSearch = search.trim().toLocaleLowerCase("en-US");
  const filtered = preview.records.filter((record) => {
    const matchesSearch = !normalizedSearch ||
      [
        record.personName,
        record.positionTitle,
        record.organizationUnit,
        record.reportsToName,
      ].some((value) => value.toLocaleLowerCase("en-US").includes(normalizedSearch));
    const matchesUnit = !unit || record.organizationUnit === unit;
    return matchesSearch && matchesUnit;
  });
  const selected = preview.records.find((record) => record.key === selectedKey) ?? null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.7fr)]">
      <Card className="overflow-hidden">
        <div className="grid gap-3 border-b border-[var(--border)] p-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <SearchField
            label="Search source records"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people, titles, units, or managers"
            value={search}
          />
          <Select
            aria-label="Filter by organization unit"
            onChange={(event) => setUnit(event.target.value)}
            value={unit}
          >
            <option value="">All organization units</option>
            {preview.units.map((item) => (
              <option key={item.key} value={item.name}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-2.5 text-[11px] text-[var(--text-tertiary)]">
          <span>{filtered.length} matching source records</span>
          {filtered.length > maximumRenderedRows ? (
            <span>Showing first {maximumRenderedRows}</span>
          ) : null}
        </div>
        <Table>
          <TableHeader>
            <tr>
              <TableHeadCell>Person and Position</TableHeadCell>
              <TableHeadCell>Organization unit</TableHeadCell>
              <TableHeadCell>Reports to</TableHeadCell>
              <TableHeadCell className="text-right">Row</TableHeadCell>
            </tr>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, maximumRenderedRows).map((record) => (
              <TableRow
                className={selectedKey === record.key ? "bg-[var(--workspace-accent-subtle)]" : undefined}
                key={record.key}
              >
                <TableCell>
                  <button
                    className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
                    onClick={() => setSelectedKey(record.key)}
                    type="button"
                  >
                    <RecordIdentity record={record} />
                  </button>
                </TableCell>
                <TableCell>{record.organizationUnit || "Not supplied"}</TableCell>
                <TableCell>{record.reportsToName || "Blank"}</TableCell>
                <TableCell className="text-right tabular-nums text-[var(--text-tertiary)]">
                  {record.sourceRow}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!filtered.length ? (
          <EmptyState className="m-4" title="No source records match">
            Change the search or organization-unit filter.
          </EmptyState>
        ) : null}
      </Card>
      <LocalHierarchyPanel preview={preview} record={selected} />
    </div>
  );
}

function DepartmentsTab({ preview }: { preview: OrganizationStructurePreview }) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase("en-US");
  const filtered = preview.units.filter((unit) =>
    unit.name.toLocaleLowerCase("en-US").includes(normalizedSearch),
  );

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--border)] p-4 sm:flex sm:items-end sm:justify-between sm:gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">
            Source-provided groupings
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--text)]">
            Departments and organization units
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            These values are displayed as supplied. Person reporting does not
            automatically create a parent department hierarchy.
          </p>
        </div>
        <SearchField
          className="mt-4 sm:mt-0 sm:w-72"
          label="Search organization units"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search departments"
          value={search}
        />
      </div>
      <Table>
        <TableHeader>
          <tr>
            <TableHeadCell>Organization unit</TableHeadCell>
            <TableHeadCell className="text-right">Records</TableHeadCell>
            <TableHeadCell className="text-right">Managers in source</TableHeadCell>
            <TableHeadCell className="text-right">Cross-unit reporting links</TableHeadCell>
            <TableHeadCell className="text-right">Root or unknown</TableHeadCell>
          </tr>
        </TableHeader>
        <TableBody>
          {filtered.slice(0, 250).map((unit) => (
            <TableRow key={unit.key}>
              <TableCell className="font-medium text-[var(--text)]">{unit.name}</TableCell>
              <TableCell className="text-right tabular-nums">{unit.recordCount}</TableCell>
              <TableCell className="text-right tabular-nums">{unit.managerRecords}</TableCell>
              <TableCell className="text-right tabular-nums">{unit.crossUnitConnections}</TableCell>
              <TableCell className="text-right tabular-nums">{unit.rootOrUnknownRecords}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function ReportingTab({ preview }: { preview: OrganizationStructurePreview }) {
  const reportingProvided = preview.columns.mapping.reportsToName !== null;
  const leadership = [...preview.records]
    .filter((record) => record.derivedDirectReports > 0)
    .sort(
      (left, right) =>
        right.derivedDirectReports - left.derivedDirectReports ||
        left.personName.localeCompare(right.personName),
    );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] p-4 sm:p-5">
          <p className="text-xs font-medium text-[var(--text-tertiary)]">
            Leadership view
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--text)]">
            Documented reporting span
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            Sorted by resolved direct reports. This describes source connectivity,
            not workload, performance, authority, importance, or risk.
          </p>
        </div>
        <Table>
          <TableHeader>
            <tr>
              <TableHeadCell>Person and Position</TableHeadCell>
              <TableHeadCell>Organization unit</TableHeadCell>
              <TableHeadCell className="text-right">Resolved direct reports</TableHeadCell>
            </tr>
          </TableHeader>
          <TableBody>
            {leadership.slice(0, 50).map((record) => (
              <TableRow key={record.key}>
                <TableCell><RecordIdentity record={record} /></TableCell>
                <TableCell>{record.organizationUnit || "Not supplied"}</TableCell>
                <TableCell className="text-right font-medium tabular-nums text-[var(--text)]">
                  {record.derivedDirectReports}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
            Resolved hierarchy
          </p>
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="text-xs text-[var(--text-secondary)]">Maximum depth</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--text)]">
                {preview.stats.maximumDepth ?? "Unknown"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-secondary)]">Median depth</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--text)]">
                {preview.stats.medianDepth ?? "Unknown"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-secondary)]">Root or unknown records</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--text)]">
                {preview.stats.rootOrUnknownRecords}
              </dd>
            </div>
          </dl>
        </Card>
        <Alert tone="info">
          {reportingProvided
            ? "A blank or unresolved manager may be a legitimate root or missing information. The preview preserves that uncertainty."
            : "The source does not provide a Reports to column, so hierarchy depth and reporting relationships cannot be determined."}
        </Alert>
      </div>
    </div>
  );
}

function VacanciesTab({ preview }: { preview: OrganizationStructurePreview }) {
  const possible = preview.records.filter((record) => record.possibleVacancy);

  return (
    <div className="space-y-5">
      <Alert tone={possible.length ? "warning" : "info"}>
        <p className="font-medium">
          {possible.length ? "Possible vacancies need review" : "Vacancies cannot be established from this source"}
        </p>
        <p className="mt-0.5 text-xs leading-5 opacity-90">
          {preview.vacancyAssessment.message}
        </p>
      </Alert>
      {possible.length ? (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <tr>
                <TableHeadCell>Position title</TableHeadCell>
                <TableHeadCell>Organization unit</TableHeadCell>
                <TableHeadCell>Reports to</TableHeadCell>
                <TableHeadCell className="text-right">Source row</TableHeadCell>
              </tr>
            </TableHeader>
            <TableBody>
              {possible.slice(0, maximumRenderedRows).map((record) => (
                <TableRow key={record.key}>
                  <TableCell className="font-medium text-[var(--text)]">
                    {record.positionTitle}
                  </TableCell>
                  <TableCell>{record.organizationUnit || "Not supplied"}</TableCell>
                  <TableCell>{record.reportsToName || "Blank"}</TableCell>
                  <TableCell className="text-right tabular-nums">{record.sourceRow}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--text)]">
            What would make vacancy review reliable?
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            An authoritative Position roster must include stable Position
            identifiers, lifecycle status, and unoccupied seats. A workbook that
            lists only people cannot prove that every durable Position is filled.
          </p>
        </Card>
      )}
    </div>
  );
}

function IssuesTab({
  initialIssueKind,
  preview,
}: {
  initialIssueKind: string | null;
  preview: OrganizationStructurePreview;
}) {
  const [selectedKind, setSelectedKind] = useState(
    initialIssueKind ?? preview.issues[0]?.kind ?? "",
  );
  const selected = preview.issues.find((issue) => issue.kind === selectedKind) ?? preview.issues[0] ?? null;
  const recordsByKey = new Map(preview.records.map((record) => [record.key, record]));
  const issueRecords = selected
    ? selected.recordKeys
        .map((key) => recordsByKey.get(key))
        .filter((record): record is OrganizationStructureRecord => Boolean(record))
    : [];

  if (!selected) {
    return (
      <EmptyState title="No deterministic issues were detected">
        This does not establish approval, completeness, or organizational truth.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="h-fit overflow-hidden">
        {preview.issues.map((issue) => (
          <button
            className={cn(
              "flex w-full items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 text-left text-sm last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--workspace-focus-ring)]",
              selected.kind === issue.kind
                ? "bg-[var(--workspace-accent-subtle)] text-[var(--workspace-accent)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]",
            )}
            key={issue.kind}
            onClick={() => setSelectedKind(issue.kind)}
            type="button"
          >
            <span>{issue.title}</span>
            <span className="tabular-nums">{issue.count}</span>
          </button>
        ))}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={selected.tone === "review" ? "evidence-review" : "neutral"}>
              {selected.tone === "review" ? "Review recommended" : "Source question"}
            </Badge>
            <span className="text-xs text-[var(--text-tertiary)]">
              {selected.count} source {selected.count === 1 ? "record" : "records"}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.025em] text-[var(--text)]">
            {selected.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {selected.description}
          </p>
        </div>
        {issueRecords.length ? (
          <Table>
            <TableHeader>
              <tr>
                <TableHeadCell>Person and Position</TableHeadCell>
                <TableHeadCell>Reports to</TableHeadCell>
                <TableHeadCell>Organization unit</TableHeadCell>
                <TableHeadCell className="text-right">Row</TableHeadCell>
              </tr>
            </TableHeader>
            <TableBody>
              {issueRecords.slice(0, maximumRenderedRows).map((record) => (
                <TableRow key={record.key}>
                  <TableCell><RecordIdentity record={record} /></TableCell>
                  <TableCell>{record.reportsToName || "Blank"}</TableCell>
                  <TableCell>{record.organizationUnit || "Not supplied"}</TableCell>
                  <TableCell className="text-right tabular-nums">{record.sourceRow}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </Card>
    </div>
  );
}

function PreviewStep({
  onChangeColumns,
  onReset,
  preview,
}: {
  onChangeColumns: () => void;
  onReset: () => void;
  preview: OrganizationStructurePreview;
}) {
  const [activeTab, setActiveTab] = useState<PreviewTab>("overview");
  const [initialIssueKind, setInitialIssueKind] = useState<string | null>(null);

  const openIssue = (issue: OrganizationStructureIssue) => {
    setInitialIssueKind(issue.kind);
    setActiveTab("issues");
  };

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
      <header className="border-b border-[var(--border)] pb-6">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="warning">Working draft evidence</Badge>
              <Badge tone="info">Local preview</Badge>
              <Badge tone="neutral">Nothing imported</Badge>
            </div>
            <h1 className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.045em] text-[var(--text)] sm:text-[38px]">
              {preview.source.organizationName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Review whether this evidence resembles the organization. Preserve
              uncertainty now; establish approved structure later.
            </p>
            <p className="mt-3 text-xs text-[var(--text-tertiary)]">
              {preview.source.fileName} · {preview.source.sheetName} · Source as of {preview.source.sourceAsOf || "unknown"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onChangeColumns} variant="secondary">
              Review columns
            </Button>
            <Button onClick={onReset} variant="ghost">
              Choose another workbook
            </Button>
          </div>
        </div>
      </header>

      <Alert className="mt-5" tone="info">
        <p className="font-medium">Document reality first. Improve it second.</p>
        <p className="mt-0.5 text-xs leading-5 opacity-90">
          The workbook remains evidence. This preview creates no Person, Position,
          Operational Role, RoleMandate, RoleCoverage, or reporting relationship.
        </p>
      </Alert>

      <nav aria-label="Organization structure preview" className="mt-6 flex gap-1 overflow-x-auto border-b border-[var(--border)]">
        {previewTabs.map((tab) => (
          <button
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]",
              activeTab === tab.id
                ? "border-[var(--workspace-accent)] text-[var(--workspace-accent)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]",
            )}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
            {tab.id === "issues" && preview.issues.length ? (
              <span className="ml-2 rounded-full bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[10px] tabular-nums">
                {preview.issues.length}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {activeTab === "overview" ? <OverviewTab onOpenIssue={openIssue} preview={preview} /> : null}
        {activeTab === "browse" ? <BrowseTab preview={preview} /> : null}
        {activeTab === "departments" ? <DepartmentsTab preview={preview} /> : null}
        {activeTab === "reporting" ? <ReportingTab preview={preview} /> : null}
        {activeTab === "vacancies" ? <VacanciesTab preview={preview} /> : null}
        {activeTab === "issues" ? <IssuesTab initialIssueKind={initialIssueKind} preview={preview} /> : null}
      </div>
    </main>
  );
}

export function OrganizationStructurePreviewExperience({
  configuration,
}: {
  configuration: WorkspaceConfiguration;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [organizationName, setOrganizationName] = useState(
    configuration.appearance.displayName === "Organization"
      ? ""
      : configuration.appearance.displayName,
  );
  const [sourceAsOf, setSourceAsOf] = useState("");
  const [sheets, setSheets] = useState<WorkbookSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [mapping, setMapping] = useState<OrganizationStructureColumnMapping | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [preview, setPreview] = useState<OrganizationStructurePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSheetData = useMemo(
    () => sheets.find((sheet) => sheet.sheet === selectedSheet) ?? null,
    [selectedSheet, sheets],
  );

  const style = {
    "--workspace-accent": configuration.appearance.accent.base,
    "--workspace-accent-hover": configuration.appearance.accent.hover,
    "--workspace-accent-subtle": configuration.appearance.accent.subtle,
    "--workspace-accent-border": configuration.appearance.accent.border,
    "--workspace-accent-foreground": configuration.appearance.accent.foreground,
    "--workspace-focus-ring": configuration.appearance.accent.focus,
  } as CSSProperties;

  const reset = () => {
    setFile(null);
    setSheets([]);
    setSelectedSheet("");
    setMapping(null);
    setShowMapping(false);
    setPreview(null);
    setError(null);
  };

  const createPreview = (
    sheet: WorkbookSheet,
    nextMapping: OrganizationStructureColumnMapping,
  ) => {
    const built = buildOrganizationStructurePreview({
      fileName: file?.name ?? "Organization structure.xlsx",
      mapping: nextMapping,
      organizationName:
        organizationName.trim() ||
        (configuration.appearance.displayName === "Organization"
          ? "Organization structure preview"
          : configuration.appearance.displayName),
      rows: sheet.data,
      sheetName: sheet.sheet,
      sourceAsOf,
    });
    setPreview(built);
    setShowMapping(false);
    setError(null);
  };

  const reviewWorkbook = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      if (!/\.xlsx$/i.test(file.name)) {
        throw new OrganizationStructurePreviewError(
          "unsupported-file",
          "Choose a workbook saved in the .xlsx format.",
        );
      }
      if (file.size > MAX_ORGANIZATION_STRUCTURE_FILE_BYTES) {
        throw new OrganizationStructurePreviewError(
          "file-too-large",
          "Choose an .xlsx workbook no larger than 10 MB.",
        );
      }

      const { default: readWorkbook } = await import("read-excel-file/browser");
      const parsed = await readWorkbook(file);
      const nextSheets = parsed.map((sheet) => ({
        data: sheet.data as OrganizationStructureCell[][],
        sheet: sheet.sheet,
      }));
      if (!nextSheets.length) {
        throw new OrganizationStructurePreviewError(
          "empty-workbook",
          "The workbook does not contain a readable worksheet.",
        );
      }

      const firstSheet = nextSheets[0];
      const detected = detectOrganizationStructureColumnMapping(firstSheet.data[0] ?? []);
      setSheets(nextSheets);
      setSelectedSheet(firstSheet.sheet);
      setMapping(detected.mapping);

      if (
        detected.conflicts.length ||
        (detected.mapping.personName === null &&
          detected.mapping.positionTitle === null)
      ) {
        setShowMapping(true);
      } else {
        createPreview(firstSheet, detected.mapping);
      }
    } catch (caught) {
      setError(safePreviewError(caught));
    } finally {
      setBusy(false);
    }
  };

  const changeSheet = (sheetName: string) => {
    const sheet = sheets.find((item) => item.sheet === sheetName);
    if (!sheet) return;
    const detected = detectOrganizationStructureColumnMapping(sheet.data[0] ?? []);
    setSelectedSheet(sheetName);
    setMapping(detected.mapping);
    setPreview(null);
    setShowMapping(true);
    setError(null);
  };

  const applyMapping = () => {
    if (!selectedSheetData || !mapping) return;
    try {
      createPreview(selectedSheetData, mapping);
    } catch (caught) {
      setError(safePreviewError(caught));
    }
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)]" style={style}>
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-5">
            <Link
              className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]"
              href="/"
            >
              <span className="grid size-8 place-items-center rounded-[9px] bg-[var(--workspace-accent)] text-[var(--workspace-accent-foreground)]">
                <FlowIcon className="size-4" />
              </span>
              <span className="hidden text-[17px] font-semibold tracking-[-0.035em] sm:inline">
                Lotura
              </span>
            </Link>
            <span className="hidden h-5 w-px bg-[var(--border)] sm:block" />
            <PreviewWorkspaceIdentity configuration={configuration} />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Badge tone="info">Local review</Badge>
            <Link
              className="hidden text-xs font-medium text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text)] hover:underline sm:block"
              href="/overview"
            >
              Back to workspace
            </Link>
          </div>
        </div>
      </header>

      {error && !showMapping ? (
        <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      {showMapping && selectedSheetData && mapping ? (
        <ColumnMappingStep
          error={error}
          headers={selectedSheetData.data[0]?.map((cell) => String(cell ?? "").trim()) ?? []}
          mapping={mapping}
          onApply={applyMapping}
          onBack={reset}
          onMappingChange={(id, value) =>
            setMapping((current) => current ? { ...current, [id]: value } : current)
          }
          onSheetChange={changeSheet}
          selectedSheet={selectedSheet}
          sheets={sheets}
        />
      ) : preview ? (
        <PreviewStep
          onChangeColumns={() => {
            setShowMapping(true);
            setError(null);
          }}
          onReset={reset}
          preview={preview}
        />
      ) : (
        <UploadStep
          busy={busy}
          configuration={configuration}
          file={file}
          onFileChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setError(null);
          }}
          onOrganizationNameChange={setOrganizationName}
          onReview={reviewWorkbook}
          onSourceAsOfChange={setSourceAsOf}
          organizationName={organizationName}
          sourceAsOf={sourceAsOf}
        />
      )}

      <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-center text-[11px] leading-5 text-[var(--text-tertiary)] sm:px-6">
        Explore only — this preview sends nothing, stores nothing, and imports nothing.
      </footer>
    </div>
  );
}
