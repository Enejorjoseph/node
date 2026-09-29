import Link from "next/link";
import { activeFilters, EXPENSE_CATEGORIES, type ExpenseFilters } from "@/lib/expenses";

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

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <label htmlFor="q" className={labelStyles}>
            Search title or category
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filters.search}
            placeholder="e.g. groceries or food"
            className={inputStyles}
          />
        </div>

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
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1.4fr]">
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

          <div className="flex items-center gap-2 sm:justify-end">
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
    </form>
  );
}
