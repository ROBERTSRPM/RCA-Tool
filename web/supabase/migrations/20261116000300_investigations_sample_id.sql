-- F-09: stop id squatting. An id that starts with 'sample-' is reserved for the account's
-- own seeded sample, which the app names 'sample-' || <user uuid>. Nobody can now create
-- 'sample-<someone else's uuid>' to block that user's first-login seeding.
-- Plain SQL, safe to run more than once.
--
-- NOTE: ADD CONSTRAINT checks existing rows. Rows named sample-... that do not match the
-- owner's uuid would make it fail; list them with
--   select id, user_id from public.investigations
--   where id like 'sample-%' and id <> 'sample-' || user_id::text;
-- (the legacy shared id 'sample-p101' would show up here; rename or delete such rows first).
--
-- Not covered here: the id is still a global primary key, so an "id exists" response is
-- still possible for other ids. Moving to a (user_id, id) key is a larger change.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'investigations_sample_id_check'
      and conrelid = 'public.investigations'::regclass
  ) then
    alter table public.investigations
      add constraint investigations_sample_id_check
      check (id not like 'sample-%' or id = 'sample-' || user_id::text);
  end if;
end $$;
