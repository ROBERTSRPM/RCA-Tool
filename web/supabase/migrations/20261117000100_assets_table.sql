-- Asset register: new table public.assets (one jsonb document per asset), modelled on public.investigations.
-- Plain SQL, safe to run more than once. Review, then apply (SQL editor or `supabase db push`).
--
-- Until this is applied the app keeps working: the asset register page says it is not set up,
-- investigations still save their asset tag, and "Roll this fix out" explains that it needs the register.
--
-- What the app expects (web/lib/store/assets-supabase.ts):
--   * table name "assets"; columns id text, user_id uuid, data jsonb, created_at, updated_at;
--   * size constraint named "assets_data_size_check" (the app maps it to a friendly message);
--   * the trigger message keeps the text "Asset limit reached".

create table if not exists public.assets (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists assets_user_id_created_idx
  on public.assets (user_id, created_at);

-- Row level security: a user can only see and change their own rows.
alter table public.assets enable row level security;

drop policy if exists "assets_select_own" on public.assets;
create policy "assets_select_own" on public.assets
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "assets_insert_own" on public.assets;
create policy "assets_insert_own" on public.assets
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "assets_update_own" on public.assets;
create policy "assets_update_own" on public.assets
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "assets_delete_own" on public.assets;
create policy "assets_delete_own" on public.assets
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Signed-out visitors (anon) get no access at all.
revoke all on public.assets from anon;
grant select, insert, update, delete on public.assets to authenticated;

-- (a) row size: 64 KB = 65536 bytes of the jsonb's text form.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'assets_data_size_check'
      and conrelid = 'public.assets'::regclass
  ) then
    alter table public.assets
      add constraint assets_data_size_check
      check (octet_length(data::text) <= 65536);
  end if;
end $$;

-- (b) the data column must be a JSON object (not an array, string, number or null).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'assets_data_is_object_check'
      and conrelid = 'public.assets'::regclass
  ) then
    alter table public.assets
      add constraint assets_data_is_object_check
      check (jsonb_typeof(data) = 'object');
  end if;
end $$;

-- (c) row count per user: 5,000.
create or replace function public.enforce_asset_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  max_rows constant integer := 5000;
  current_rows integer;
begin
  -- An upsert onto a row the user already has is an update, not a new asset.
  if exists (
    select 1 from public.assets
    where id = new.id and user_id = new.user_id
  ) then
    return new;
  end if;

  select count(*) into current_rows
  from public.assets
  where user_id = new.user_id;

  if current_rows >= max_rows then
    raise exception 'Asset limit reached: an account can hold at most % assets. Delete some you no longer need.', max_rows
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists assets_limit on public.assets;
create trigger assets_limit
  before insert on public.assets
  for each row execute function public.enforce_asset_limit();

comment on function public.enforce_asset_limit() is
  'Rejects an insert when the user already has 5000 assets. Two simultaneous inserts at 4999 could both pass; that is acceptable for an abuse limit. A bulk insert of many rows in one statement is checked row by row, so it stops at the limit.';

comment on table public.assets is
  'Asset register, one jsonb document per asset (tag, type, make/model, duty, criticality, site). Owned by user_id.';

-- ACCOUNT DELETION: user_id references auth.users ON DELETE CASCADE, so when
-- public.delete_own_account() (migration 20261116000400) deletes the row in auth.users, every
-- row of public.assets owned by that user is deleted by the foreign key. No change to
-- delete_own_account() is needed. (It also deletes public.investigations explicitly "in case"
-- that table's foreign key lacks the cascade; this table is created here with the cascade.)
