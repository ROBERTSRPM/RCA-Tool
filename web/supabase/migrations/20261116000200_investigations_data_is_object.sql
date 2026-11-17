-- F-07: the data column must be a JSON object (not an array, string, number or null).
-- The app also reads rows tolerantly, but this stops structurally wrong rows being written.
-- Plain SQL, safe to run more than once.
--
-- NOTE: ADD CONSTRAINT checks existing rows; if any row is not an object the statement
-- fails and nothing changes. Find them with
--   select id, user_id, jsonb_typeof(data) from public.investigations
--   where jsonb_typeof(data) is distinct from 'object';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'investigations_data_is_object_check'
      and conrelid = 'public.investigations'::regclass
  ) then
    alter table public.investigations
      add constraint investigations_data_is_object_check
      check (jsonb_typeof(data) = 'object');
  end if;
end $$;
