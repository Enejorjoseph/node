-- Let the dashboard search box match the category as well as the title.
--
-- Typing "food" should surface every Food expense, not only the ones that
-- happen to have "food" in the title, and the summary cards are derived from a
-- separate query that has to agree with this one.
--
-- The signature is identical to 0004, so create or replace swaps the body in
-- place: the old version is dropped and recreated under the same identity, and
-- no overload is left behind to make the PostgREST call ambiguous.
--
-- Note this is a leading-wildcard ilike, so it cannot use the btree index from
-- 0003. That is fine at per-user scale; if the list ever grows large, a pg_trgm
-- index on title and category is the fix.

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

-- create or replace leaves privileges alone, so reasserting these is a no-op
-- that keeps the file safe to run on its own.
revoke execute on function public.get_expenses_page(integer, integer, date, date, text, text[], numeric, numeric) from anon;
grant execute on function public.get_expenses_page(integer, integer, date, date, text, text[], numeric, numeric) to authenticated;
