"use client";

import { useState, useTransition } from "react";
import { generateSummary } from "@/app/actions/summary";
import type { ExpenseSummary, SummaryConfidence } from "@/lib/ai/summary";

const confidenceStyles: Record<SummaryConfidence, string> = {
  high: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  medium: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  low: "border-slate-600 bg-slate-800 text-slate-300",
};

/**
 * Attribution for generated text, shown both on the card and on the output
 * itself. Generous contrast because it carries meaning beyond decoration: the
 * numbers are calculated, the wording is not.
 */
const aiLabelStyles =
  "rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

const skeletonStyles =
  "rounded bg-slate-200 motion-safe:animate-pulse dark:bg-slate-800";

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
    />
  );
}

/** Placeholder for the first generation, where there is nothing to dim yet. */
function SummarySkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
        <Spinner />
        <p className="text-sm font-semibold">Writing your summary...</p>
      </div>
      <div aria-hidden="true" className="mt-4 space-y-2.5">
        <div className={`h-3 w-full ${skeletonStyles}`} />
        <div className={`h-3 w-11/12 ${skeletonStyles}`} />
        <div className={`h-3 w-4/5 ${skeletonStyles}`} />
        <div className={`h-3 w-2/3 ${skeletonStyles}`} />
      </div>
    </div>
  );
}

export function ExpenseSummaryCard() {
  // The last good summary is kept separately from the error so a failed
  // regeneration leaves usable output on screen instead of blanking the card.
  const [summary, setSummary] = useState<{
    month: string;
    summary: ExpenseSummary;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    // Clear the previous failure up front so a retry shows the loading state
    // alone rather than a stale error beside it.
    setError(null);

    startTransition(async () => {
      const result = await generateSummary();

      if (result.status === "success") {
        setSummary({ month: result.month, summary: result.summary });
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
              Monthly summary
            </p>
            <span className={aiLabelStyles}>AI generated</span>
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-white">
            Your spending in plain language
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
            A short read on the whole calendar month, based only on your recorded
            expenses.
          </p>
        </div>

        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"
        >
          {pending ? "Writing..." : summary ? "Regenerate" : "Generate summary"}
        </button>
      </div>

      <div aria-live="polite" aria-busy={pending} className="mt-6 space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 dark:border-rose-400/20 dark:bg-rose-500/10"
          >
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
              {summary
                ? "Could not update the summary"
                : "No summary to show"}
            </p>
            <p className="mt-1 text-sm leading-6 text-rose-600 dark:text-rose-400">
              {error}
            </p>
            <button
              type="button"
              onClick={run}
              disabled={pending}
              className="mt-3 rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-50 dark:border-rose-400/40 dark:text-rose-300 dark:hover:bg-rose-500/20"
            >
              Try again
            </button>
          </div>
        )}

        {pending && !summary && <SummarySkeleton />}

        {summary && (
          <div
            className={
              pending
                ? "space-y-4 opacity-50 transition-opacity"
                : "space-y-4 transition-opacity"
            }
          >
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {summary.month}
                </p>
                <span className={aiLabelStyles}>AI generated</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
                {summary.summary.summary}
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Area worth reviewing
                </p>
                <p className="mt-1.5 text-sm font-semibold text-slate-950 dark:text-white">
                  {summary.summary.improvement_area ?? "None identified"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {summary.summary.improvement_reason}
                </p>
              </div>
              <span
                className={`w-fit shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${confidenceStyles[summary.summary.confidence]}`}
              >
                {summary.summary.confidence} confidence
              </span>
            </div>

            <p className="text-xs leading-5 text-slate-400 dark:text-slate-500">
              The figures are calculated from your records. This wording was written
              by an AI model and may be wrong, so check it before acting on it.
            </p>

            {pending && (
              <p className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Spinner />
                Rewriting the summary...
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}