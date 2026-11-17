-- F-05: lets a signed-in user delete their own account ("Delete my account" on /app/account,
-- which calls supabase.rpc('delete_own_account')).
-- Plain SQL, safe to run more than once.
--
-- SECURITY DEFINER runs as the function owner (needed to delete from auth.users); it can only
-- ever delete the caller, because the id comes from auth.uid() and no argument is accepted.
-- search_path is fixed to empty and every object is schema-qualified, so a user cannot shadow
-- tables or functions. Only role authenticated may execute it.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Explicit, in case the foreign key on investigations.user_id is not ON DELETE CASCADE.
  delete from public.investigations where user_id = caller;

  -- Removes the login; sessions and refresh tokens for the user cascade away with it.
  delete from auth.users where id = caller;
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;

comment on function public.delete_own_account() is
  'F-05: deletes the calling user (auth.users row and, by cascade, their data). Authenticated only.';
