import type {
  ButtonHTMLAttributes,
  DetailedHTMLProps,
  DialogHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

import { ChevronIcon, InfoIcon, SearchIcon } from "./icons";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "icon";

export function Button({
  className,
  size = "md",
  variant = "secondary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "border-transparent bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
    secondary:
      "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)]",
    ghost:
      "border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
    destructive:
      "border-[var(--error-border)] bg-[var(--error-subtle)] text-[var(--error)] hover:bg-[var(--error-subtle-hover)]",
  };
  const sizes: Record<ButtonSize, string> = {
    sm: "h-8 rounded-lg px-3 text-xs",
    md: "h-10 rounded-[10px] px-3.5 text-sm",
    icon: "size-9 rounded-[10px]",
  };

  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 border font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
        focusRing,
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--focus-soft)]",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 pr-9 text-sm text-[var(--text)] outline-none transition hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--focus-soft)]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronIcon className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 rotate-90 text-[var(--text-tertiary)]" />
    </span>
  );
}

export function FieldLabel({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "mb-1.5 block text-xs font-medium text-[var(--text-secondary)]",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function SearchField({
  className,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">{label}</span>
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
      <Input className="pl-9" type="search" {...props} />
    </label>
  );
}

type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "evidence-direct"
  | "evidence-indirect"
  | "evidence-review";

export function Badge({
  children,
  className,
  dot = false,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  dot?: boolean;
  tone?: BadgeTone;
}) {
  const tones: Record<BadgeTone, string> = {
    neutral:
      "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]",
    accent:
      "border-[var(--accent-border)] bg-[var(--accent-subtle)] text-[var(--accent)]",
    success:
      "border-[var(--success-border)] bg-[var(--success-subtle)] text-[var(--success)]",
    warning:
      "border-[var(--warning-border)] bg-[var(--warning-subtle)] text-[var(--warning)]",
    error:
      "border-[var(--error-border)] bg-[var(--error-subtle)] text-[var(--error)]",
    info: "border-[var(--info-border)] bg-[var(--info-subtle)] text-[var(--info)]",
    "evidence-direct":
      "border-[var(--evidence-direct-border)] bg-[var(--evidence-direct-subtle)] text-[var(--evidence-direct)]",
    "evidence-indirect":
      "border-[var(--evidence-indirect-border)] bg-[var(--evidence-indirect-subtle)] text-[var(--evidence-indirect)]",
    "evidence-review":
      "border-[var(--evidence-review-border)] bg-[var(--evidence-review-subtle)] text-[var(--evidence-review)]",
  };

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export function Chip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 text-xs text-[var(--text-secondary)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Alert({
  children,
  className,
  tone = "info",
}: {
  children: ReactNode;
  className?: string;
  tone?: "success" | "warning" | "error" | "info";
}) {
  const tones = {
    success:
      "border-[var(--success-border)] bg-[var(--success-subtle)] text-[var(--success)]",
    warning:
      "border-[var(--warning-border)] bg-[var(--warning-subtle)] text-[var(--warning)]",
    error:
      "border-[var(--error-border)] bg-[var(--error-subtle)] text-[var(--error)]",
    info: "border-[var(--info-border)] bg-[var(--info-subtle)] text-[var(--info)]",
  } as const;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-5",
        tones[tone],
        className,
      )}
      role="alert"
    >
      <InfoIcon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function Card({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-[var(--border)] bg-[var(--surface)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidePanel({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <aside
      className={cn(
        "rounded-[14px] border border-[var(--border)] bg-[var(--surface-subtle)]",
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

export function ExpandableSection({
  children,
  className,
  count,
  defaultOpen = false,
  description,
  eyebrow,
  title,
}: {
  children: ReactNode;
  className?: string;
  count?: string;
  defaultOpen?: boolean;
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <details
      className={cn(
        "group rounded-[14px] border border-[var(--border)] bg-[var(--surface)]",
        className,
      )}
      open={defaultOpen}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-4 rounded-[14px] px-4 py-4 transition-colors hover:bg-[var(--surface-subtle)] sm:px-5",
          focusRing,
        )}
      >
        <span className="min-w-0">
          {eyebrow ? (
            <span className="block text-[11px] font-medium text-[var(--text-tertiary)]">
              {eyebrow}
            </span>
          ) : null}
          <span className="mt-0.5 block text-base font-semibold tracking-[-0.015em] text-[var(--text)]">
            {title}
          </span>
          {description ? (
            <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
              {description}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {count ? (
            <span className="text-xs text-[var(--text-tertiary)]">{count}</span>
          ) : null}
          <span className="grid size-7 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]">
            <ChevronIcon className="size-3.5 rotate-90 transition-transform group-open:-rotate-90" />
          </span>
        </span>
      </summary>
      <div className="border-t border-[var(--border)] px-4 py-5 sm:px-5">
        {children}
      </div>
    </details>
  );
}

export function Dialog({
  children,
  className,
  description,
  onClose,
  open,
  title,
  ...props
}: DetailedHTMLProps<DialogHTMLAttributes<HTMLDialogElement>, HTMLDialogElement> & {
  description?: string;
  onClose?: () => void;
  title: string;
}) {
  return (
    <dialog
      aria-describedby={description ? "lotura-dialog-description" : undefined}
      aria-labelledby="lotura-dialog-title"
      className={cn(
        "m-auto w-[min(92vw,520px)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--text)] shadow-[var(--shadow-float)] backdrop:bg-black/20",
        className,
      )}
      onCancel={onClose}
      open={open}
      {...props}
    >
      <header className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="text-lg font-semibold" id="lotura-dialog-title">
          {title}
        </h2>
        {description ? (
          <p
            className="mt-1 text-sm leading-6 text-[var(--text-secondary)]"
            id="lotura-dialog-description"
          >
            {description}
          </p>
        ) : null}
      </header>
      <div className="p-5">{children}</div>
    </dialog>
  );
}

export function Table({
  children,
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn("w-full border-collapse text-left text-sm", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "border-b border-[var(--border)] text-xs text-[var(--text-tertiary)]",
        className,
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--surface-subtle)]",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHeadCell({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("px-3 py-2.5 font-medium", className)} {...props}>
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-3 py-3 text-[var(--text-secondary)]", className)} {...props}>
      {children}
    </td>
  );
}

export function EmptyState({
  children,
  className,
  title,
}: {
  children?: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-dashed border-[var(--border-strong)] px-5 py-10 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-[var(--text)]">{title}</p>
      {children ? (
        <div className="mx-auto mt-1 max-w-md text-xs leading-5 text-[var(--text-secondary)]">
          {children}
        </div>
      ) : null}
    </div>
  );
}
