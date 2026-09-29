-- Accounts (profiles) table plus helpers for the profile management page.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  date_of_birth date,
  created_at timestamptz not null default now()
);

-- Keep a profile row in sync whenever a new auth user is created.
create or replace function public.sync_profile_on_signup()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, date_of_birth)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    case
      when new.raw_user_meta_data ->> 'date_of_birth' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      then (new.raw_user_meta_data ->> 'date_of_birth')::date
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.sync_profile_on_signup();

-- Backfill profiles for accounts that already exist.
insert into public.profiles (id, email, name, date_of_birth)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'name', ''),
  case
    when u.raw_user_meta_data ->> 'date_of_birth' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    then (u.raw_user_meta_data ->> 'date_of_birth')::date
    else null
  end
from auth.users u
on conflict (id) do nothing;

alter table public.profiles enable row level security;

create policy "Anyone signed in can list accounts"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Permanently delete an account (auth user) by id.
-- Cascades to expenses and the profiles row.
create or replace function public.delete_account(target uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  delete from auth.users where id = target;
end;
$$;

grant execute on function public.delete_account(uuid) to authenticated;