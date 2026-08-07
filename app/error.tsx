"use client";

import { useEffect } from "react";

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
    <main className="grid min-h-screen place-items-center bg-[#f4f6f2] px-5 text-[#18362f]">
      <section className="w-full max-w-lg rounded-[28px] border border-[#dfe4dc] bg-white p-8 text-center shadow-[0_24px_80px_rgba(37,57,50,0.08)]">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e9f0ec] text-xl font-semibold text-[#22594d]">
          L
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#71857d]">
          Read-only workspace
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[#143b33]">
          The operating model is unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#63776f]">
          Lotura could not load this organization safely. No database changes
          were attempted. Try the read again in a moment.
        </p>
        <button
          className="mt-6 rounded-xl bg-[#18483e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#20584c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215c50] focus-visible:ring-offset-2"
          onClick={() => reset()}
          type="button"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
