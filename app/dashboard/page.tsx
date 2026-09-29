import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/actions/auth";
import { LogoutButton } from "@/components/auth/logout-button";
import { AddExpenseForm } from "@/components/expenses/add-expense-form";
import { ExpenseList } from "@/components/expenses/expense-list";
import {
  formatNaira,
  monthLabel,
  monthRange,
  filterQuery,
  isFiltered,
  pageCount,
  parseAmount,
  parseFilters,
  parsePage,
  searchPattern,
  EXPENSES_PER_PAGE,
  type CategoryTotal,
  type Expense,
} from "@/lib/expenses";

const categoryColors = [
  "#6366f1",
  "#0ea5e9",
  "#0d9488",
  "#f59e0b",
  "#e11d48",
  "#8b5cf6",
];

// Row shape returned by the get_expenses_page function.
type ExpensePageRow = {
  id: unknown;
  title: unknown;
  amount: unknown;
  category: unknown;
  expense_date: unknown;
  total_count: unknown;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "Not provided";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function CategoryBars({ categories }: { categories: CategoryTotal[] }) {
  if (categories.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center dark:border-slate-700">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          No spending to show yet.
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Your category totals will appear here.
        </p>
      </div>
    );
  }

  const max = Math.max(...categories.map((c) => c.total), 1);

  return (
    <div className="mt-6 space-y-5">
      {categories.map(({ category, total }, index) => {
        const color = categoryColors[index % categoryColors.length];

        return (
          <div key={category}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                  {category}
                </span>
              </div>
              <span className="shrink-0 font-bold text-slate-950 dark:text-white">
                {formatNaira(total)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(4, (total / max) * 100)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const params = await searchParams;
  const page = parsePage(params.page);
  const filters = parseFilters(params);
  const hasFilters = isFiltered(filters);
  const query = filterQuery(filters);
  const minAmount = parseAmount(filters.min);
  const maxAmount = parseAmount(filters.max);

  const metadata = user.user_metadata ?? {};
  const name =
    typeof metadata.name === "string" ? metadata.name : user.email ?? "User";
  const dateOfBirth =
    typeof metadata.date_of_birth === "string"
      ? metadata.date_of_birth
      : undefined;

  const { startOfMonth, endOfMonth } = monthRange();

  // Summary figures follow the same filters as the list, otherwise the cards
  // would report a month total while the table below shows a filtered subset.
  let statsQuery = supabase
    .from("expenses")
    .select("id, title, amount, category, expense_date")
    .eq("user_id", user.id)
    .gte("expense_date", filters.from || startOfMonth)
    .lte("expense_date", filters.to || endOfMonth)
    .order("expense_date", { ascending: false });

  if (filters.search) {
    // Matches the function's own search, which covers the category as well as
    // the title, so the cards below never summarise a different set of rows.
    const pattern = searchPattern(filters.search);
    statsQuery = statsQuery.or(
      `title.ilike.${pattern},category.ilike.${pattern}`
    );
  }
  if (filters.categories.length > 0) {
    statsQuery = statsQuery.in("category", filters.categories);
  }
  if (minAmount !== null) {
    statsQuery = statsQuery.gte("amount", minAmount);
  }
  if (maxAmount !== null) {
    statsQuery = statsQuery.lte("amount", maxAmount);
  }

  const { data } = await statsQuery;

  const stats: Expense[] = (data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    amount: Number(row.amount),
    category: String(row.category),
    expense_date: String(row.expense_date),
  }));

  // Paging and filtering both run in the database. Blank bounds are passed as
  // null so Postgres keeps its own defaults (current calendar month).
  const { data: pageRows, error: pageError } = await supabase.rpc(
    "get_expenses_page",
    {
      p_page: page,
      p_page_size: EXPENSES_PER_PAGE,
      p_start: filters.from || null,
      p_end: filters.to || null,
      p_search: filters.search || null,
      p_categories: filters.categories.length > 0 ? filters.categories : null,
      p_min_amount: minAmount,
      p_max_amount: maxAmount,
    }
  );

  const rows: ExpensePageRow[] = pageRows ?? [];

  const expenses: Expense[] = rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    amount: Number(row.amount),
    category: String(row.category),
    expense_date: String(row.expense_date),
  }));

  // The total rides along on each row. A page past the end returns no rows and
  // so no count, which is why an empty page is treated as a redirect instead.
  const totalExpenses = Number(rows[0]?.total_count ?? 0);
  const totalPages = pageCount(totalExpenses, EXPENSES_PER_PAGE);

  // Never clamp on a failed query, otherwise a database error would masquerade
  // as an out-of-range page and hide the real problem.
  if (!pageError && page > totalPages) {
    const clamped = new URLSearchParams(query);
    clamped.set("page", String(totalPages));
    redirect(`/dashboard?${clamped.toString()}`);
  }

  const total = stats.reduce((sum, expense) => sum + expense.amount, 0);

  const categoryTotals = new Map<string, number>();
  for (const expense of stats) {
    categoryTotals.set(
      expense.category,
      (categoryTotals.get(expense.category) ?? 0) + expense.amount
    );
  }
  const categories: CategoryTotal[] = Array.from(categoryTotals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  const topCategory = categories[0];

  return (
    <main className="min-h-full bg-slate-950 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <aside className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
              <div className="relative flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500 text-lg font-bold text-white shadow-lg shadow-indigo-500/25">
                  ₦
                </div>
                <span className="text-sm font-semibold tracking-wide text-slate-200">
                  Personal finance
                </span>
              </div>
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
                  Dashboard
                </p>
                <h2 className="mt-4 max-w-sm text-4xl font-bold leading-tight tracking-tight">
                  Make every naira count.
                </h2>
                <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">
                  See where your money goes each month, and stay ahead of every
                  expense.
                </p>
              </div>
              <p className="relative text-sm text-slate-400">
                {monthLabel()} · {totalExpenses}{" "}
                {totalExpenses === 1 ? "transaction" : "transactions"}
              </p>
            </aside>

            <div className="p-6 sm:p-10 lg:p-12">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 lg:hidden">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/20">
                    ₦
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Personal finance
                  </span>
                </div>
                <form action={signout} className="ml-auto shrink-0">
                  <LogoutButton variant="light" />
                </form>
              </div>

              <div className="mt-10 lg:mt-16">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                    At a glance
                  </p>
                  {hasFilters && (
                    <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
                      Filtered
                    </span>
                  )}
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  Spending overview
                </h1>
                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {hasFilters
                    ? "Totals reflect the filters applied to the expense list below."
                    : `Everything you have spent in ${monthLabel()}, broken down and ready to review.`}
                </p>
              </div>

              <Link
                href="/profile"
                prefetch={false}
                className="group mt-8 flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-colors hover:border-indigo-200 hover:bg-indigo-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-indigo-400/30 dark:hover:bg-indigo-500/10"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/25">
                  {getInitials(name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                    {name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    {user.email}
                  </p>
                </div>
                <span className="ml-auto hidden shrink-0 items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 sm:inline-flex dark:text-indigo-300 dark:group-hover:text-indigo-200">
                  Manage accounts <span aria-hidden="true">→</span>
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="summary-heading"
          className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]"
        >
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-500/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                Total spent
              </p>
              <p className="mt-3 text-4xl font-bold tracking-tight">
                {formatNaira(total)}
              </p>
              <p className="mt-3 text-sm text-slate-300">
                Across {totalExpenses}{" "}
                {totalExpenses === 1 ? "transaction" : "transactions"} this
                month.
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Transactions
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                {totalExpenses}
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Recorded in {monthLabel()}
              </p>
            </article>

            <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Top category
              </p>
              {topCategory ? (
                <>
                  <p className="mt-3 truncate text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                    {topCategory.category}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {formatNaira(topCategory.total)}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-slate-300 dark:text-slate-600">
                    —
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    No category data yet
                  </p>
                </>
              )}
            </article>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
              New entry
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-white">
              Add an expense
            </h2>
            <div className="mt-6">
              <AddExpenseForm />
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
              Breakdown
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-white">
              Spending by category
            </h2>
            <CategoryBars categories={categories} />
          </article>
        </section>

        <section aria-labelledby="activity-heading">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Activity
              </p>
              <h2
                id="activity-heading"
                className="mt-1 text-xl font-bold tracking-tight text-white"
              >
                Recent expenses
              </h2>
            </div>
            <span className="w-fit rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
              {totalExpenses}{" "}
              {totalExpenses === 1 ? "entry" : "entries"}
            </span>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900">
            {pageError ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-semibold text-rose-300">
                  Couldn&apos;t load your expenses.
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                  The <code className="text-slate-300">get_expenses_page</code>{" "}
                  function is missing from the database. Run the pending files in{" "}
                  <code className="text-slate-300">supabase/migrations/</code>{" "}
                  in the Supabase SQL editor, in order:{" "}
                  <code className="text-slate-300">0003</code> then{" "}
                  <code className="text-slate-300">0004</code>.
                </p>
                <p className="mt-3 text-xs text-slate-500">{pageError.code}</p>
              </div>
            ) : (
              <ExpenseList
                expenses={expenses}
                page={page}
                totalPages={totalPages}
                totalExpenses={totalExpenses}
                perPage={EXPENSES_PER_PAGE}
                query={query}
                filters={filters}
                hasFilters={hasFilters}
              />
            )}
          </div>
        </section>

        <footer className="flex flex-col gap-1 text-center text-xs text-slate-500 sm:flex-row sm:justify-center sm:gap-2">
          <span>Date of birth: {formatDate(dateOfBirth)}</span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span>Member since {formatDate(user.created_at?.slice(0, 10))}</span>
        </footer>
      </div>
    </main>
  );
}
