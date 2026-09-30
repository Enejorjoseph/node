# Replica prompt: URL-driven search + pagination over a Postgres RPC

Paste everything below this line into opencode in a repo that already has a
Next.js app, Supabase auth, and an `expenses` table. It is written to be
self-contained: it specifies the exact stack, naming, data flow, SQL, and every
edge case, so the result matches a known-good implementation rather than
something approximate.

---

Build search, filtering, and pagination for a dashboard expense list. Paging and
filtering happen **in the database**; all UI state lives in the **URL query
string**. No client-side filtering, no client-side paging, no debounce, no
`useSearchParams`, no context store, no Zustand/Redux.

## Stack and conventions

Follow whatever is already in the repo, but the reference used these:

- Next.js 16 (App Router), React 19, TypeScript 5
- **In Next 16 `searchParams` is a `Promise`** — `const params = await searchParams`
- Page props use the generated helper type: `PageProps<"/dashboard">`
- Tailwind CSS v4, `@/*` path alias mapping to the repo root
- Supabase: `@supabase/supabase-js` + `@supabase/ssr`
- `createClient()` from `lib/supabase/server.ts` is async — `await createClient()`

## Domain

```ts
export const EXPENSE_CATEGORIES = [
  "Food", "Transport", "Rent", "Utilities", "Health",
  "Education", "Entertainment", "Shopping", "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  expense_date: string;   // ISO "YYYY-MM-DD" string, never a Date
};

export const EXPENSES_PER_PAGE = 10;
```

## URL parameter contract — use these exact names

| Param | Meaning | Notes |
|---|---|---|
| `q` | search term | matches title **or** category |
| `page` | 1-based page number | default 1 |
| `from` / `to` | inclusive date bounds | `YYYY-MM-DD` |
| `min` / `max` | inclusive amount bounds | decimal |
| `category` | repeatable | e.g. `?category=Food&category=Transport` |

It is `page` / `page_size` at **every** layer — not `limit`/`offset`, not
`perPage`. Offset is computed inside SQL and never appears in the app.

### `lib/expenses.ts` — all parsing lives here, pure and testable

```ts
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

export function pageCount(total: number, perPage = EXPENSES_PER_PAGE): number {
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
```

`parseFilters(params)` must **silently discard anything malformed** rather than
throw or surface an error:

- every scalar goes through a `single()` helper: take `value[0]` if it's an
  array, `?? ""`, then `.trim()`
- `from` / `to` are kept only if `/^\d{4}-\d{2}-\d{2}$/` matches, else `""`
- `category` is normalized to an array (wrap a single string, or `[]` if absent)
  and filtered against the `EXPENSE_CATEGORIES` whitelist via a
  `value is string` type predicate
- `isFiltered(filters)` returns true if any of the six fields is non-default
- `parseAmount(value)` returns `null` for `""` and for non-finite input — `null`
  matters, because it's what makes Postgres omit the bound entirely instead of
  comparing against zero

### The filter-query / page-query split — this is the load-bearing detail

Two separate functions, and the pairing is what keeps search intact when paging:

- `filterQuery(filters)` → serialises active filters **without `page`**
- `pageHref(query, page)` → `new URLSearchParams(query)`, then `.set("page", …)`

If `filterQuery` ever included `page`, a GET-form submit or a chip click would
strand the user on page 7 of a new result set. Add a comment saying so.

`serializeFilters` uses `params.set` for scalars and `params.append` for
categories (which is why `category` can repeat).

### Filter chips

`activeFilters(filters): FilterChip[]` returns **one chip per active filter**,
each linking to the same search with *only that one filter removed*, so the
user never has to retype the filters they want to keep. Each chip's `href` also
omits `page`, and collapses to bare `/dashboard` when nothing is left.

Exact labels:

- search → `"${filters.search}"` (wrapped in literal double quotes)
- category → the category name
- `from` → `From ${filters.from}`
- `to` → `To ${filters.to}`
- `min` → `Min ₦${filters.min}` (use `\u20a6` for the naira sign)
- `max` → `Max ₦${filters.max}`

Stable `key`s: `"search"`, `` `category:${category}` ``, `"from"`, `"to"`,
`"min"`, `"max"`.

### Search: two different escaping strategies, on purpose

The RPC takes a **raw string** and does its own `ilike` in SQL. A *separate*
stats query goes through PostgREST's `.or()` grammar, which needs a wildcard
pattern and has **no escape sequence** for `[ , . " ( ) : * \ ]`. So:

```ts
const reservedPatternChars = /[,."():*\\]/g;

/** Wildcard pattern for an or() filter, matching anywhere in the value. */
export function searchPattern(term: string): string {
  return `*${term.replace(reservedPatternChars, " ")}*`;
}
```

Those characters become **spaces, not quotes** — a term with a comma still
matches on the words either side of it, and the filter can never fail to parse.
Comment this reasoning in the code.

## SQL: one RPC that returns the page *and* the total

Create `public.get_expenses_page`. One round trip returns the rows and the
grand total, so the app never issues a separate `count`.

```sql
create or replace function public.get_expenses_page(
  p_page integer default 1,
  p_page_size integer default 10,
  p_start date default null,
  p_end date default null,
  p_search text default null,
  p_categories text[] default null,
  p_min_amount numeric default null,
  p_max_amount numeric default null
)
returns table (
  id uuid, title text, amount numeric, category text,
  expense_date date, created_at timestamptz, total_count bigint
)
language sql
stable
set search_path = public
as $$
  with bounds as (
    select
      coalesce(p_start, date_trunc('month', current_date)::date) as start_date,
      coalesce(
        p_end,
        (date_trunc('month', current_date) + interval '1 month - 1 day')::date
      ) as end_date
  )
  select
    e.id, e.title, e.amount, e.category, e.expense_date, e.created_at,
    count(*) over () as total_count
  from public.expenses e
  cross join bounds b
  where e.user_id = auth.uid()
    and e.expense_date between b.start_date and b.end_date
    and (
      nullif(btrim(p_search), '') is null
      or e.title ilike '%' || btrim(p_search) || '%'
      or e.category ilike '%' || btrim(p_search) || '%'
    )
    and (p_categories is null or e.category = any (p_categories))
    and (p_min_amount is null or e.amount >= p_min_amount)
    and (p_max_amount is null or e.amount <= p_max_amount)
  order by e.expense_date desc, e.created_at desc
  limit greatest(p_page_size, 1)
  offset (greatest(p_page, 1) - 1) * greatest(p_page_size, 1);
$$;

revoke execute on function public.get_expenses_page(integer, integer, date, date, text, text[], numeric, numeric) from anon;
grant  execute on function public.get_expenses_page(integer, integer, date, date, text, text[], numeric, numeric) to authenticated;
```

Points that must not be "simplified":

- **`count(*) over ()` is a window function**, so it's evaluated across the whole
  filtered set *before* `limit`/`offset` trims it. A plain `count(*)` would be
  wrong here.
- `security invoker` is the default — don't add `security definer`. RLS on
  `expenses` stays in force, so the function can only ever return the caller's
  own rows. Note that in a comment.
- `greatest(...)` on both `p_page` and `p_page_size` defends against a zero or
  negative size, which would otherwise make `offset` negative and error.
- **Default date range is the current calendar month**, computed in SQL via
  `date_trunc('month', current_date)` — not in JS. Blank `p_start`/`p_end` must
  therefore be passed as `null`, never `""`.
- `btrim` + `nullif(..., '') is null` is what makes a whitespace-only search a
  no-op rather than a search for `"  "`.
- `order by expense_date desc, created_at desc` — the `created_at` tiebreak is
  **not** cosmetic. Without a total order, offset paging will skip and repeat
  rows that share a date.
- Index to match the filter and sort exactly, so paging never sorts in memory:
  ```sql
  create index if not exists expenses_user_id_date_created_idx
    on public.expenses (user_id, expense_date desc, created_at desc);
  ```

**Migration ordering trap:** if the function already exists with fewer
parameters, `create or replace` cannot change a signature — it leaves the old
version as a separate overload and makes the PostgREST call ambiguous. The
migration that changes arity must start with:

```sql
drop function if exists public.get_expenses_page(integer, integer, date, date);
```

Ship the filters as separate, ordered migration files and say in the comments
which one changes the signature.

## `app/dashboard/page.tsx` — the orchestrator

An **async Server Component**. Order of operations:

1. `await createClient()`, then `await supabase.auth.getUser()`;
   `redirect("/login")` on error or missing user.
2. `const params = await searchParams` → `page = parsePage(params.page)`,
   `filters = parseFilters(params)`, `hasFilters = isFiltered(filters)`,
   `query = filterQuery(filters)`, `minAmount`/`maxAmount` via `parseAmount`.
3. **Stats query** — a plain `.from("expenses").select(...).eq("user_id", user.id)`
   that applies the **identical** filter set as the RPC, including a matching
   `.or(\`title.ilike.${pattern},category.ilike.${pattern}\`)` when searching.
   Compute totals, per-category breakdown (sorted desc), and top category from
   it. Comment *why* the filters must match: otherwise the summary cards would
   report a month total while the table below shows a filtered subset, and the
   two would disagree. When filters are active, the UI copy must say the totals
   reflect the filters.
4. **Page query** — `supabase.rpc("get_expenses_page", { p_page: page,
   p_page_size: EXPENSES_PER_PAGE, p_start: filters.from || null, p_end:
   filters.to || null, p_search: filters.search || null, p_categories:
   filters.categories.length > 0 ? filters.categories : null, p_min_amount:
   minAmount, p_max_amount: maxAmount })`.
5. Map the rows defensively — Supabase returns `unknown`/loose types here, so
   `String(row.id)`, `Number(row.amount)`, etc., and type the raw row as
   `{ id: unknown; title: unknown; amount: unknown; category: unknown;
   expense_date: unknown; total_count: unknown }`.
6. `const totalExpenses = Number(rows[0]?.total_count ?? 0)` — the total rides
   along on every row, and **a page past the end returns no rows and therefore
   no count**, which is exactly why an empty page has to be treated as a
   redirect rather than an empty state.
7. **Clamp out-of-range pages, but only when the query succeeded:**
   ```ts
   if (!pageError && page > totalPages) {
     const clamped = new URLSearchParams(query);
     clamped.set("page", String(totalPages));
     redirect(`/dashboard?${clamped.toString()}`);
   }
   ```
   The `!pageError` guard is essential: clamping on a failed query would make
   a database error masquerade as a bad page number and hide the real problem.
8. If `pageError`, render a distinct error state naming `get_expenses_page`
   and telling the user to run the pending files in `supabase/migrations/` in
   order. Don't silently render "no expenses".

## `components/expenses/expense-filters.tsx` — plain GET form, no JS

`<form method="get" action="/dashboard">` with **uncontrolled** inputs
(`defaultValue` / `defaultChecked`). Submitting navigates. That's why there is
no debounce — a GET form can't debounce, and that's fine; searching requires an
explicit "Apply filters" submit. Don't add `useState`, `router.replace`, or a
submit button that would be needed only because JS exists.

Layout:
- Active-filter chips row (only when `chips.length > 0`), each a `next/link` with
  `scroll={false}` and `aria-label={`Remove filter: ${chip.label}`}`
- `lg:grid-cols-[1.4fr_1fr_1fr]`: search input (`type="search"`, `name="q"`,
  placeholder "e.g. groceries or food"), `from` date, `to` date
- Amount `fieldset` with `min`/`max` number inputs (`inputMode="decimal"`,
  `min="0"`, `step="0.01"`, `aria-label` since they have no visible labels)
  next to the buttons
- Submit button "Apply filters", plus a "Clear" `<a href="/dashboard">` that
  only renders when `isFiltered`
- Categories `fieldset`: the whitelist as toggle-chip `<label>`s, each wrapping
  a `className="sr-only"` `type="checkbox" name="category"`. The chip styling
  must reflect `defaultChecked` — checked chips are indigo, unchecked are
  slate — and the label's border/background changes accordingly. Wrap a chip
  in a `<label>` so clicking anywhere toggles it.

The form is rendered in **both** the populated and the empty states, so
filtering is always reachable.

## `components/expenses/pagination.tsx`

- Return `null` entirely when `totalPages <= 1` — don't render a lone "1".
- Range label: `Showing {first}–{last} of {totalItems} {totalItems === 1 ? "entry" : "entries"}`,
  with `first = (page - 1) * perPage + 1` and `last = Math.min(page * perPage, totalItems)`.
- `pageItems(current, total)` returns `(number | "gap")[]`: always include `1`,
  `total`, and `current-1 … current+1` (clamped to range), sort ascending, then
  insert `"gap"` wherever the difference between neighbours exceeds 1. Render
  gaps as an `aria-hidden` `…`.
- All links use `pageHref(query, n)` and `scroll={false}`; `rel="prev"` /
  `rel="next"` on Previous/Next.
- **The current page is a `<span aria-current="page">`, not a link.**
- At the bounds, Previous/Next render as `<span aria-disabled="true">` rather
  than being absent, so the control doesn't shift width between pages.
- Put the range label and the controls in a flex row that stacks on mobile,
  with a top border separating it from the list.

## `components/expenses/expense-list.tsx`

A `"use client"` component — **only** because each row holds `useState` for
edit/delete UI. All search and pagination props arrive from the server.

Three render branches, in this order:
1. no rows **and** `totalExpenses > 0` → "Nothing on this page." / "Go back to
   an earlier page to see your expenses." (an out-of-range page that the
   redirect didn't catch)
2. no rows and no filters → "No expenses yet this month." / "Add your first
   expense above."
3. no rows and filters → "No expenses match your filters." / "Try widening the
   date range or clearing a filter."

Both empty branches still render `ExpenseFiltersForm` above the message.

Each row: category initial avatar (first letter, per-category colour map with an
`Other` fallback), truncated title, category pill, `formatShortDate`, bold
`formatNaira(amount)`, and Edit / Delete buttons. Editing swaps the row's `<li>`
contents for the edit form.

## Formatting helpers (same file)

```ts
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN", maximumFractionDigits: 2,
  }).format(amount);
}

export function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;          // don't render "Invalid Date"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
```

Build dates with an explicit `T00:00:00` so a bare `YYYY-MM-DD` isn't parsed as
UTC and can display as the previous day west of Greenwich. Guard the invalid
case. `toLocalISODate()` composes dates from local `getFullYear`/`getMonth`/
`getDate` for the same reason.

## `app/actions/expenses.ts`

Server actions for create/update/delete, each ending with
`revalidatePath("/dashboard")`.

**Flag this as a known limitation, don't silently fix or silently ship it:**
`revalidatePath` without a query string drops the query string, so a mutation
resets the user to page 1 with filters cleared. If you improve on it, capture
the current query string in the action and pass it to `revalidatePath`, and
comment why — but don't change it if the surrounding code doesn't support it.

## Seed data for manual verification

`supabase/seed.sql` inserts 150 rows dated inside the current month plus 3 rows
dated in a prior month. The prior-month rows must **not** appear, since the
default range is the current calendar month. 150 rows at 10 per page is exactly
15 pages, which is enough to exercise the gap-collapsing page numbers and the
Previous/Next disabled states. Note the count is filter-scoped, not
calendar-scoped: with a filter applied, the "transactions" figure reflects the
filter, not the month.

## Deliverables and constraints

- Add type tests or unit tests for `parsePage`, `pageCount`, `parseFilters`,
  `parseAmount`, `searchPattern`, and `pageItems` if the repo has a test runner
  configured. If it doesn't, don't add one — but call that out rather than
  leaving the logic untested and unmentioned.
- Run the repo's existing `lint` and `typecheck` scripts and fix anything that
  fails.
- No comments explaining *what* the code does. Comments explain *why* a
  non-obvious decision was made — the `created_at` tiebreak, the `!pageError`
  clamp guard, the two escaping strategies, PostgREST's missing escape syntax,
  the `filterQuery`/`page` split, `security invoker`. The reference
  implementation is roughly 20% comment density, concentrated in exactly those
  spots.
- Do not add fuzzy matching, typo tolerance, a search index, result ranking,
  `pg_trgm`, `useDeferredValue`, or `useTransition`. Leading-wildcard `ilike`
  can't use the btree index; that's acceptable at per-user scale. Mention the
  `pg_trgm` option in a comment, then stop.
