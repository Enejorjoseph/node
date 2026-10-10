-- Hide expenses from the dashboard without deleting them.
--
-- A dismissed expense keeps its row in the database but drops out of the
-- dashboard list, the summary cards and the AI summary until the user turns on
-- "Include dismissed" and restores it. Nothing is ever removed by dismissing,
-- so the worst a misclick costs is one toggle.
--
-- The signature grows by one parameter, so the eight-argument version has to be
-- dropped first: create or replace cannot change a signature, and leaving the
-- old one behind would make the PostgREST call ambiguous.

alter table public.expenses
  add column if not exists dismissed boolean not null default false;

drop function if exists public.get_expenses_page(integer, integer, date, date, text, text[], numeric, numeric);

create or replace function public.get_expenses_page(
  p_page integer default 1,
  p_page_size integer default 10,
  p_start date default null,
  p_end date default null,
  p_search text default null,
  p_categories text[] default null,
  p_min_amount numeric default null,
  p_max_amount numeric default null,
  p_show_dismissed boolean default false
)
returns table (
  id uuid,
  title text,
  amount numeric,
  category text,
  expense_date date,
  created_at timestamptz,
  total_count bigint
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
    e.id,
    e.title,
    e.amount,
    e.category,
    e.expense_date,
    e.created_at,
    count(*) over () as total_count
  from public.expenses e
  cross join bounds b
  where e.user_id = auth.uid()
    and e.expense_date between b.start_date and b.end_date
    and (coalesce(p_show_dismissed, false) or e.dismissed = false)
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

-- security invoker (the default) keeps the row level security policy in force.
revoke execute on function public.get_expenses_page(integer, integer, date, date, text, text[], numeric, numeric, boolean) from anon;
grant execute on function public.get_expenses_page(integer, integer, date, date, text, text[], numeric, numeric, boolean) to authenticated;
