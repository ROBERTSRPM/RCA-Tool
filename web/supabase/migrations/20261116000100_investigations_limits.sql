-- F-01: limit how much one account can store.
--   (a) a single investigation row may hold at most 5 MB of data;
--   (b) one user may hold at most 500 investigations.
-- Plain SQL, safe to run more than once. Review, then apply (SQL editor or `supabase db push`).
--
-- The app mirrors both limits and shows friendly messages (see web/lib/store/supabase.ts):
--   the size constraint name must stay "investigations_data_size_check" and the
--   trigger message must keep the text "Investigation limit reached".
--
-- NOTE: ADD CONSTRAINT checks existing rows. If a row is already over 5 MB the
-- statement fails and nothing changes; find it with
--   select id, user_id, octet_length(data::text) from public.investigations
--   where octet_length(data::text) > 5 * 1024 * 1024;
-- and shrink or delete it, then re-run.

-- (a) row size: 5 MB = 5242880 bytes of the jsonb's text form.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'investigations_data_size_check'
      and conrelid = 'public.investigations'::regclass
  ) then
    alter table public.investigations
      add constraint investigations_data_size_check
      check (octet_length(data::text) <= 5242880);
  end if;
end $$;

-- (b) row count per user: 500.
create or replace function public.enforce_investigation_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  max_rows constant integer := 500;
  current_rows integer;
begin
  -- An upsert onto a row the user already has is an update, not a new investigation.
  if exists (
    select 1 from public.investigations
    where id = new.id and user_id = new.user_id
  ) then
    return new;
  end if;

  select count(*) into current_rows
  from public.investigations
  where user_id = new.user_id;

  if current_rows >= max_rows then
    raise exception 'Investigation limit reached: an account can hold at most % investigations. Delete some you no longer need.', max_rows
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists investigations_limit on public.investigations;
create trigger investigations_limit
  before insert on public.investigations
  for each row execute function public.enforce_investigation_limit();

comment on function public.enforce_investigation_limit() is
  'F-01: rejects an insert when the user already has 500 investigations. Two simultaneous inserts at 499 could both pass; that is acceptable for an abuse limit.';
