-- Search and filter support for the dashboard expense list.
--
-- Adds a title search plus category, date range and amount range filters to
-- get_expenses_page. Every condition is optional: with no filters applied this
-- behaves exactly like the previous version (current calendar month, all rows).
--
-- The new parameters are ANDed with the existing user and month scoping, and the
-- count(*) over () window still reflects the filtered set, so the page count
-- matches what the user is actually looking at.

-- Required: create or replace cannot change a function's signature, it would
-- leave the old four-argument version behind as a separate overload and make
-- the PostgREST call ambiguous.
drop function if exists public.get_expenses_page(integer, integer, date, date);

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
    )
    and (p_categories is null or e.category = any (p_categories))
    and (p_min_amount is null or e.amount >= p_min_amount)
    and (p_max_amount is null or e.amount <= p_max_amount)
  order by e.expense_date desc, e.created_at desc
  limit greatest(p_page_size, 1)
  offset (greatest(p_page, 1) - 1) * greatest(p_page_size, 1);
$$;

-- security invoker (the default) keeps the row level security policy in force.
revoke execute on function public.get_expenses_page(integer, integer, date, date, text, text[], numeric, numeric) from anon;
grant execute on function public.get_expenses_page(integer, integer, date, date, text, text[], numeric, numeric) to authenticated;
