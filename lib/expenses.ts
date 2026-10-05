export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Rent",
  "Utilities",
  "Health",
  "Education",
  "Entertainment",
  "Shopping",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Single source of truth so the formatter and the AI payload cannot drift. */
export const CURRENCY = "NGN";

export type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  expense_date: string;
};

export type CategoryTotal = {
  category: string;
  total: number;
};

export const EXPENSES_PER_PAGE = 10;

export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

export function pageCount(
  total: number,
  perPage: number = EXPENSES_PER_PAGE
): number {
  return Math.max(1, Math.ceil(total / perPage));
}

export type ExpenseFilters = {
  search: string;
  categories: string[];
  from: string;
  to: string;
  min: string;
  max: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim();
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Reads filters out of the query string, discarding anything malformed. */
export function parseFilters(params: SearchParams): ExpenseFilters {
  const categories = (Array.isArray(params.category)
    ? params.category
    : params.category
      ? [params.category]
      : []
  ).filter((value): value is string => EXPENSE_CATEGORIES.includes(value as never));

  const from = single(params.from);
  const to = single(params.to);

  return {
    search: single(params.q),
    categories,
    from: isIsoDate(from) ? from : "",
    to: isIsoDate(to) ? to : "",
    min: single(params.min),
    max: single(params.max),
  };
}

export function isFiltered(filters: ExpenseFilters): boolean {
  return (
    filters.search !== "" ||
    filters.categories.length > 0 ||
    filters.from !== "" ||
    filters.to !== "" ||
    filters.min !== "" ||
    filters.max !== ""
  );
}

/** Optional numeric bound, or null when blank so Postgres treats it as no bound. */
export function parseAmount(value: string): number | null {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function serializeFilters(filters: ExpenseFilters): string {
  const params = new URLSearchParams();

  if (filters.search) params.set("q", filters.search);
  for (const category of filters.categories) params.append("category", category);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.min) params.set("min", filters.min);
  if (filters.max) params.set("max", filters.max);

  return params.toString();
}

/**
 * Serialises the active filters, without `page`, so pagination links keep the
 * current search instead of dropping back to an unfiltered list.
 */
export function filterQuery(filters: ExpenseFilters): string {
  return serializeFilters(filters);
}

export type FilterChip = {
  key: string;
  label: string;
  /** The same search with only this filter dropped, and no page to keep. */
  href: string;
};

/**
 * One entry per active filter, so each can be dismissed on its own instead of
 * making the user retype the filters they want to keep.
 */
export function activeFilters(filters: ExpenseFilters): FilterChip[] {
  const href = (next: ExpenseFilters) => {
    const query = serializeFilters(next);
    return query ? `/dashboard?${query}` : "/dashboard";
  };

  const chips: FilterChip[] = [];

  if (filters.search) {
    chips.push({
      key: "search",
      label: `"${filters.search}"`,
      href: href({ ...filters, search: "" }),
    });
  }

  for (const category of filters.categories) {
    chips.push({
      key: `category:${category}`,
      label: category,
      href: href({
        ...filters,
        categories: filters.categories.filter((value) => value !== category),
      }),
    });
  }

  if (filters.from) {
    chips.push({
      key: "from",
      label: `From ${filters.from}`,
      href: href({ ...filters, from: "" }),
    });
  }

  if (filters.to) {
    chips.push({
      key: "to",
      label: `To ${filters.to}`,
      href: href({ ...filters, to: "" }),
    });
  }

  if (filters.min) {
    chips.push({
      key: "min",
      label: `Min \u20a6${filters.min}`,
      href: href({ ...filters, min: "" }),
    });
  }

  if (filters.max) {
    chips.push({
      key: "max",
      label: `Max \u20a6${filters.max}`,
      href: href({ ...filters, max: "" }),
    });
  }

  return chips;
}

/**
 * PostgREST's or() grammar treats these as syntax with no escape sequence, so
 * they are swapped for spaces rather than quoted: a term containing a comma
 * still matches on the words either side of it, and the filter can never fail
 * to parse.
 */
const reservedPatternChars = /[,."():*\\]/g;

/** Wildcard pattern for an or() filter, matching anywhere in the value. */
export function searchPattern(term: string): string {
  return `*${term.replace(reservedPatternChars, " ")}*`;
}

export function toLocalISODate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Inclusive ISO bounds for a calendar month, `offset` months away from `from`.
 * Going through the Date constructor normalises the rollover, so January at
 * -1 is December of the previous year rather than month zero.
 */
export function monthRangeFor(
  offset = 0,
  from: Date = new Date()
): { startOfMonth: string; endOfMonth: string } {
  const start = new Date(from.getFullYear(), from.getMonth() + offset, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return {
    startOfMonth: toLocalISODate(start),
    endOfMonth: toLocalISODate(end),
  };
}

export function monthLabelFor(offset = 0, from: Date = new Date()): string {
  return new Date(from.getFullYear(), from.getMonth() + offset, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );
}

export function monthRange(): { startOfMonth: string; endOfMonth: string } {
  return monthRangeFor(0);
}

export function monthLabel(): string {
  return monthLabelFor(0);
}

/** One category's share of a month's spending, as sent to the summariser. */
export type CategoryShare = {
  name: string;
  amount: number;
  percentage: number;
};

/**
 * Pre-calculated figures for one month. The model never sees raw expenses, so
 * this is the only thing it can draw a conclusion from, which is what keeps the
 * summary from inventing rows that were never recorded.
 */
export type MonthStats = {
  month: string;
  currency: string;
  total_spending: number;
  transaction_count: number;
  previous_month: string;
  previous_month_total: number | null;
  change_percentage: number | null;
  categories: CategoryShare[];
  highest_category: CategoryShare | null;
  lowest_category: CategoryShare | null;
};

export type SpendingRow = { amount: number; category: string };

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function categoryBreakdown(rows: SpendingRow[]): CategoryShare[] {
  const totals = new Map<string, number>();
  let grand = 0;

  for (const row of rows) {
    grand += row.amount;
    totals.set(row.category, (totals.get(row.category) ?? 0) + row.amount);
  }

  return Array.from(totals, ([name, amount]) => ({
    name,
    amount: round(amount, 2),
    percentage: grand > 0 ? round((amount / grand) * 100, 1) : 0,
  })).sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

/**
 * Builds the stats payload for the month `offset` months from `from`.
 *
 * `previous_month_total` stays null when last month had no rows at all: a zero
 * would read as "spending fell to nothing" and invite a comparison the user
 * never asked for. The same applies to a percentage off a zero base.
 */
export function buildMonthStats({
  current,
  previous,
  offset = 0,
  from = new Date(),
}: {
  current: SpendingRow[];
  previous?: SpendingRow[];
  offset?: number;
  from?: Date;
}): MonthStats {
  const total = round(
    current.reduce((sum, row) => sum + row.amount, 0),
    2
  );
  const categories = categoryBreakdown(current);

  const previousTotal =
    previous && previous.length > 0
      ? round(
          previous.reduce((sum, row) => sum + row.amount, 0),
          2
        )
      : null;

  return {
    month: monthLabelFor(offset, from),
    currency: CURRENCY,
    total_spending: total,
    transaction_count: current.length,
    previous_month: monthLabelFor(offset - 1, from),
    previous_month_total: previousTotal,
    change_percentage:
      previousTotal && previousTotal > 0
        ? round(((total - previousTotal) / previousTotal) * 100, 1)
        : null,
    categories,
    highest_category: categories[0] ?? null,
    lowest_category: categories[categories.length - 1] ?? null,
  };
}
