"use client";

import { useEffect } from "react";

import { FlowIcon } from "./ui/icons";
import { Button, Card } from "./ui/primitives";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[operating-model] unavailable", {
      digest: error.digest ?? "none",
    });
  }, [error.digest]);

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--canvas)] px-5 text-[var(--text)]">
      <Card className="w-full max-w-md p-7 text-center sm:p-8">
        <div className="mx-auto grid size-10 place-items-center rounded-[10px] bg-[var(--accent)] text-white">
          <FlowIcon className="size-5" />
        </div>
        <p className="mt-5 text-xs font-medium text-[var(--text-tertiary)]">
          Read-only workspace
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[var(--text)]">
          The operating model is unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Lotura could not load this organization safely. No database changes
          were attempted. Try the read again in a moment.
        </p>
        <Button
          className="mt-6"
          onClick={() => reset()}
          type="button"
          variant="primary"
        >
          Try again
        </Button>
      </Card>
    </main>
  );
}
