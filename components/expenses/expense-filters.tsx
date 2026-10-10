"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { setAllExpensesDismissed } from "@/app/actions/expenses";
import {
  activeFilters,
  EXPENSE_CATEGORIES,
  type ExpenseFilters,
} from "@/lib/expenses";

const inputStyles =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/20";

const labelStyles =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400";

const chipBase =
  "rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300";

export function ExpenseFiltersForm({
  filters,
  isFiltered,
}: {
  filters: ExpenseFilters;
  isFiltered: boolean;
}) {
  const chips = activeFilters(filters);
  const [open, setOpen] = useState(false);
  const [hideOpen, setHideOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function setAllDismissed(value: boolean) {
    const data = new FormData();
    data.set("dismissed", value ? "1" : "0");

    startTransition(async () => {
      await setAllExpensesDismissed(data);
    });
  }

  // The search itself gets a chip of its own, so only the rest belong on the
  // Filters button.
  const filterCount = chips.filter((chip) => chip.key !== "search").length;

  return (
    <form
      method="get"
      action="/dashboard"
      className="border-b border-slate-800 px-5 py-5 sm:px-6"
    >
      {chips.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Active
          </span>
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={chip.href}
              scroll={false}
              aria-label={`Remove filter: ${chip.label}`}
              className="group inline-flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-200 transition-colors hover:border-rose-400/40 hover:bg-rose-500/15 hover:text-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              {chip.label}
              <span
                aria-hidden="true"
                className="text-indigo-300 transition-colors group-hover:text-rose-300"
              >
                &times;
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="q" className={labelStyles}>
            Search title or category
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filters.search}
            placeholder="e.g. groceries or food"
            className={`${inputStyles} pr-11`}
          />
          <button
            type="submit"
            aria-label="Search expenses"
            className="absolute bottom-0 right-0 flex h-9 w-11 items-center justify-center rounded-r-xl text-slate-400 transition-colors hover:text-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-4 w-4"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
        </div>

        <div className="sm:w-72">
          <span aria-hidden="true" className={labelStyles}>
            More
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !open;
                setOpen(next);
                if (next) setHideOpen(false);
              }}
              aria-expanded={open}
              aria-controls="expense-filters-panel"
              className={`inline-flex flex-1 items-center justify-between gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                open || filterCount > 0
                  ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-200"
                  : "border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                Filters
                {filterCount > 0 && (
                  <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {filterCount}
                  </span>
                )}
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !hideOpen;
                setHideOpen(next);
                if (next) setOpen(false);
              }}
              aria-expanded={hideOpen}
              aria-controls="hide-expenses-panel"
              className={`inline-flex flex-1 items-center justify-between gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                hideOpen
                  ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-200"
                  : "border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span>Hide</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className={`h-4 w-4 transition-transform ${hideOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown twin of the filters panel: same toggle button, same panel
          styling, expanded in flow so it is never clipped by the card. */}
      <div
        id="hide-expenses-panel"
        hidden={!hideOpen}
        className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
      >
        <p className={labelStyles}>Hide expenses</p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setHideOpen(false);
              setAllDismissed(true);
            }}
            className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"
          >
            <span>Hide all expenses</span>
            <span aria-hidden="true" className="text-xs text-amber-300/70">
              {pending ? "Working..." : "All months →"}
            </span>
          </button>

          {filters.showDismissed && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setHideOpen(false);
                setAllDismissed(false);
              }}
              className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-semibold text-indigo-200 transition-colors hover:bg-indigo-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"
            >
              <span>Restore all expenses</span>
              <span aria-hidden="true" className="text-xs text-indigo-300/70">
                {pending ? "Working..." : "All months →"}
              </span>
            </button>
          )}
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          Hiding takes every expense off the dashboard. Nothing is deleted —
          turn on <span className="text-slate-400">Include dismissed</span> in
          Filters to bring them back.
        </p>
      </div>

      {/* Always rendered so an applied filter is kept when the panel is
          collapsed and the search is submitted again. */}
      <div
        id="expense-filters-panel"
        hidden={!open}
        className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="from" className={labelStyles}>
              From date
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={filters.from}
              className={inputStyles}
            />
          </div>

          <div>
            <label htmlFor="to" className={labelStyles}>
              To date
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={filters.to}
              className={inputStyles}
            />
          </div>
        </div>

        <fieldset className="mt-4">
          <legend className={labelStyles}>Amount (₦)</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              aria-label="Minimum amount"
              name="min"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              defaultValue={filters.min}
              placeholder="Min"
              className={inputStyles}
            />
            <input
              aria-label="Maximum amount"
              name="max"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              defaultValue={filters.max}
              placeholder="Max"
              className={inputStyles}
            />
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className={labelStyles}>Categories</legend>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map((category) => {
              const checked = filters.categories.includes(category);

              return (
                <label
                  key={category}
                  className={`${chipBase} ${
                    checked
                      ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-200"
                      : "border-slate-700 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="category"
                    value={category}
                    defaultChecked={checked}
                    className="sr-only"
                  />
                  {category}
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className={labelStyles}>Visibility</legend>
          <label
            className={`${chipBase} ${
              filters.showDismissed
                ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-200"
                : "border-slate-700 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <input
              type="checkbox"
              name="show_dismissed"
              value="1"
              defaultChecked={filters.showDismissed}
              className="sr-only"
            />
            Include dismissed
          </label>
        </fieldset>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            Apply filters
          </button>
          {isFiltered && (
            <a
              href="/dashboard"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Clear
            </a>
          )}
        </div>
      </div>
    </form>
  );
}
