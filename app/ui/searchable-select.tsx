"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type SelectHTMLAttributes } from "react";

import { Input, RequiredMark } from "./primitives";

type Option = { value: string; label: string };
type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children" | "multiple" | "value" | "defaultValue"> & {
  label: string;
  options: Option[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyContent?: ReactNode;
  value?: string;
  defaultValue?: string;
};

function normalized(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function SearchableSelect({ label, options, placeholder, searchPlaceholder = "Search by name, job title, or Unit", emptyContent, value, defaultValue = "", onChange, disabled, required, id, className, ...props }: Props) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const statusId = `${selectId}-matches`;
  const selectRef = useRef<HTMLSelectElement>(null);
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState(defaultValue);
  const selectedValue = value ?? chosen;
  const selected = options.find((option) => option.value === selectedValue);
  const words = normalized(query).split(/\s+/).filter(Boolean);
  const matches = options.filter((option) => words.every((word) => normalized(option.label).includes(word)));
  const retained = selected && !matches.some((option) => option.value === selected.value) ? selected : null;

  // React form actions and native reset must reset this field just like a regular select.
  useEffect(() => {
    const form = selectRef.current?.form;
    const reset = (event: Event) => {
      // Native reset happens after this event. Restore the controlled DOM value even
      // when resetting to unchanged state (React may otherwise skip the render).
      // A timer (not a microtask) runs after the browser's reset default action.
      setTimeout(() => {
        if (event.defaultPrevented || !selectRef.current) return;
        setQuery("");
        if (value === undefined) setChosen(defaultValue);
        const resetValue = value ?? defaultValue;
        selectRef.current.value = options.some((option) => option.value === resetValue) ? resetValue : "";
      }, 0);
    };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [defaultValue, value, options]);

  return (
    <div className="grid gap-2">
      <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor={selectId}>{label}{required ? <RequiredMark /> : null}</label>
      <Input
        aria-label={`Search ${label}`}
        aria-controls={selectId}
        aria-describedby={statusId}
        autoComplete="off"
        disabled={disabled}
        onChange={(event) => { event.stopPropagation(); setQuery(event.target.value); }}
        onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) event.preventDefault(); }}
        placeholder={searchPlaceholder}
        type="search"
        value={query}
      />
      <select
        {...props}
        aria-describedby={[statusId, props["aria-describedby"]].filter(Boolean).join(" ")}
        className={`h-10 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-3 focus:ring-[var(--focus-soft)] disabled:opacity-50 ${className ?? ""}`}
        disabled={disabled}
        id={selectId}
        onChange={(event) => { if (value === undefined) setChosen(event.target.value); onChange?.(event); }}
        ref={selectRef}
        required={required}
        value={selected?.value ?? ""}
      >
        <option value="">{placeholder}</option>
        {retained ? <option value={retained.value}>{retained.label} (current selection)</option> : null}
        {matches.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <p aria-live="polite" className="text-xs text-[var(--text-tertiary)]" id={statusId}>
        {matches.length ? `${matches.length} ${words.length ? "matching " : ""}${matches.length === 1 ? "choice" : "choices"}` : "No matches. Try another name, title, or Unit."}{retained ? " Your current selection is unchanged." : ""}
      </p>
      {matches.length === 0 ? emptyContent : null}
    </div>
  );
}
