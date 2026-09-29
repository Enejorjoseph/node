-- Paginated expense fetching for the dashboard.
--
-- Paging, ordering and the total count all run in the database so the app only
-- ever receives one page of rows. The `count(*) over ()` window is evaluated
-- across the whole filtered set before limit/offset trims it, which returns the
-- page and the total in a single round trip.

create or replace function public.get_expenses_page(
  p_page integer default 1,
  p_page_size integer default 10,
  p_start date default null,
  p_end date default null
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
  order by e.expense_date desc, e.created_at desc
  limit greatest(p_page_size, 1)
  offset (greatest(p_page, 1) - 1) * greatest(p_page_size, 1);
$$;

-- security invoker (the default) keeps the row level security policy on
-- expenses in force, so this can only ever return the caller's own rows.
revoke execute on function public.get_expenses_page(integer, integer, date, date) from anon;
grant execute on function public.get_expenses_page(integer, integer, date, date) to authenticated;

-- Matches the function's filter and sort exactly so paging never sorts in memory.
-- The created_at tiebreak keeps ordering stable for expenses sharing a date,
-- otherwise offset paging can skip and repeat rows.
create index if not exists expenses_user_id_date_created_idx
  on public.expenses (user_id, expense_date desc, created_at desc);
