-- Accounts are private. A signed in user may only read their own profile row,
-- and may only delete their own account.

drop policy if exists "Anyone signed in can list accounts" on public.profiles;

create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Permanently delete an account (auth user) by id.
-- Cascades to expenses and the profiles row.
-- Only the owner of the account is allowed to delete it.
create or replace function public.delete_account(target uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if target is distinct from auth.uid() then
    raise exception 'You can only delete your own account';
  end if;

  delete from auth.users where id = target;
end;
$$;

revoke execute on function public.delete_account(uuid) from anon;
grant execute on function public.delete_account(uuid) to authenticated;
