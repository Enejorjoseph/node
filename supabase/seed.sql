-- Seed sample expenses for testing dashboard pagination.
-- Run in the Supabase SQL Editor.
--
-- Produces:
--   * 150 expenses dated inside the current calendar month
--   * 3 expenses dated in the previous month, which the dashboard deliberately
--     ignores (get_expenses_page defaults to the current month). These exist so
--     you can confirm the month filter really excludes them.
--
-- The function orders by expense_date desc, created_at desc. With 150 rows spread
-- across roughly 28 days, many expenses share a date, so this also exercises the
-- created_at tiebreaker that stops offset paging from repeating or skipping rows.

do $$
declare
  v_user uuid;
  v_count integer := 150;   -- change this to seed a different amount
  v_categories text[] := array[
    'Food', 'Transport', 'Rent', 'Utilities', 'Health',
    'Education', 'Entertainment', 'Shopping', 'Other'
  ];
  v_titles text[] := array[
    'Groceries', 'Bolt ride', 'Monthly rent', 'Electricity bill', 'Pharmacy run',
    'Course fee', 'Cinema tickets', 'New sneakers', 'Misc spend', 'Fuel top-up',
    'Water bill', 'Dentist visit', 'Textbooks', 'Concert ticket', 'Jacket',
    'Market run', 'Bus pass', 'Gym membership', 'Bank charge', 'Phone credit'
  ];
  v_month_start date;
begin
  -- Targets the most recently created account. With several accounts, run
  -- select id, email from auth.users; and set v_user explicitly.
  select id into v_user
  from auth.users
  order by created_at desc
  limit 1;

  if v_user is null then
    raise exception 'No users found. Sign up through the app first.';
  end if;

  -- Clear previous seed rows so this stays re-runnable.
  delete from public.expenses
  where user_id = v_user
    and title like '[seed]%';

  v_month_start := date_trunc('month', current_date)::date;

  insert into public.expenses (user_id, title, amount, category, expense_date)
  select
    v_user,
    '[seed] ' || v_titles[((n - 1) % array_length(v_titles, 1)) + 1] || ' ' || n,
    round((500 + random() * 24500)::numeric, 2),
    v_categories[((n - 1) % array_length(v_categories, 1)) + 1],
    -- Capped at today so nothing is dated in the future.
    least(current_date::date, v_month_start + ((n - 1) % 28))
  from generate_series(1, v_count) as g(n);

  -- Previous month, deliberately outside the dashboard's range.
  insert into public.expenses (user_id, title, amount, category, expense_date)
  select
    v_user,
    '[seed-old] ' || v_titles[((n - 1) % array_length(v_titles, 1)) + 1] || ' ' || n,
    round((500 + random() * 24500)::numeric, 2),
    v_categories[((n - 1) % array_length(v_categories, 1)) + 1],
    (v_month_start - 10)::date
  from generate_series(1, 3) as g(n);

  raise notice 'Seeded % expenses for user %', v_count, v_user;
end $$;

-- Verification: 150 in the current month (what the dashboard shows, 15 pages),
-- plus 3 older rows that must stay hidden.
select
  count(*) filter (where expense_date >= date_trunc('month', current_date)::date) as current_month,
  count(*) filter (where expense_date <  date_trunc('month', current_date)::date) as previous_month
from public.expenses;

-- To remove them later:
-- delete from public.expenses where title like '[seed]%';
