"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function StructureEditingDisclosure({ children, label, editAnchor }: {
  children: ReactNode;
  label: string;
  editAnchor?: string;
}) {
  const disclosure = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    let frame: number | undefined;
    function revealLinkedEditor() {
      const anchor = window.location.hash.slice(1);
      if (anchor !== "structure-administration" && (!editAnchor || anchor !== editAnchor)) return;
      const target = document.getElementById(anchor);
      if (!target || !disclosure.current?.contains(target)) return;
      disclosure.current.open = true;
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        target.scrollIntoView({ block: "start" });
        const focusTarget = target.querySelector<HTMLElement>("summary") ?? disclosure.current?.querySelector<HTMLElement>("summary");
        focusTarget?.focus({ preventScroll: true });
      });
    }
    revealLinkedEditor();
    window.addEventListener("hashchange", revealLinkedEditor);
    return () => {
      window.removeEventListener("hashchange", revealLinkedEditor);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [editAnchor]);

  return <details className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 sm:px-5" ref={disclosure}>
    <summary className="cursor-pointer py-4 text-sm font-semibold text-[var(--workspace-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-focus-ring)]">{label}</summary>
    {children}
  </details>;
}
