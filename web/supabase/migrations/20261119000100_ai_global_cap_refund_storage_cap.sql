-- Pre-launch hardening (security audit v1: V-01, V-02, V-03, V-05).
-- Plain SQL, safe to run more than once.
--
--  1. Global daily AI cap across all users (ai_consume gets p_global, default 300 calls per rolling 24 h).
--  2. ai_refund only works with the secret ticket issued by ai_consume, once, within 5 minutes.
--     The ticket is never readable by users (column-level grants), so a user cannot refund a call
--     that the server really made. The old one-argument ai_refund(bigint) is removed.
--  3. Per-user storage cap: investigations + assets together may hold at most 50 MB of data.
--  4. Revoke TRUNCATE, REFERENCES and TRIGGER from anon and authenticated on every public table.
--
-- The app expects: the "Storage limit reached" text in the trigger message and reason "global"
-- in the ai_consume answer (web/lib/ai/limits.ts, web/lib/store/*.ts).

-- ---------------------------------------------------------------- AI usage

alter table public.ai_usage add column if not exists refund_secret uuid not null default gen_random_uuid();

create index if not exists ai_usage_created_idx on public.ai_usage (created_at desc);

-- Users may read their own usage rows, but not the refund ticket.
revoke all on public.ai_usage from anon, authenticated;
grant select (id, user_id, feature, created_at, refunded) on public.ai_usage to authenticated;

drop function if exists public.ai_refund(bigint);

create or replace function public.ai_consume(p_feature text, p_daily int, p_burst int, p_global int default 300)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_daily int := least(1000, greatest(1, coalesce(p_daily, 30)));
  v_burst int := least(60, greatest(1, coalesce(p_burst, 5)));
  v_global int := least(1000000, greatest(1, coalesce(p_global, 300)));
  v_day_count int;
  v_burst_count int;
  v_global_count int;
  v_oldest_day timestamptz;
  v_oldest_burst timestamptz;
  v_oldest_global timestamptz;
  v_id bigint;
  v_secret uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- One call at a time overall (the global count) and per user (the user's counts).
  perform pg_advisory_xact_lock(hashtextextended('ai_global', 0));
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  -- Keep the table small: only the last 2 days matter.
  delete from public.ai_usage where created_at < now() - interval '2 days';

  -- Burst: every call counts, refunded or not.
  select count(*), min(created_at) into v_burst_count, v_oldest_burst
    from public.ai_usage
    where user_id = v_uid and created_at > now() - interval '60 seconds';
  if v_burst_count >= v_burst then
    return jsonb_build_object(
      'ok', false, 'reason', 'burst',
      'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_oldest_burst + interval '60 seconds' - now()))))
    );
  end if;

  -- Daily per user: refunded calls do not count.
  select count(*), min(created_at) into v_day_count, v_oldest_day
    from public.ai_usage
    where user_id = v_uid and not refunded and created_at > now() - interval '24 hours';
  if v_day_count >= v_daily then
    return jsonb_build_object(
      'ok', false, 'reason', 'daily',
      'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_oldest_day + interval '24 hours' - now()))))
    );
  end if;

  -- Daily across all users (spending cap).
  select count(*), min(created_at) into v_global_count, v_oldest_global
    from public.ai_usage
    where not refunded and created_at > now() - interval '24 hours';
  if v_global_count >= v_global then
    return jsonb_build_object(
      'ok', false, 'reason', 'global',
      'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_oldest_global + interval '24 hours' - now()))))
    );
  end if;

  insert into public.ai_usage (user_id, feature) values (v_uid, left(coalesce(p_feature, 'unknown'), 40))
    returning id, refund_secret into v_id, v_secret;
  return jsonb_build_object(
    'ok', true, 'remaining_today', v_daily - v_day_count - 1, 'usage_id', v_id, 'refund_ticket', v_secret
  );
end;
$$;

-- The old three-argument form stays as a thin wrapper so a running older build keeps working.
create or replace function public.ai_consume(p_feature text, p_daily int, p_burst int)
returns jsonb
language sql
security definer
set search_path = ''
as $$ select public.ai_consume(p_feature, p_daily, p_burst, 300) $$;

create or replace function public.ai_refund(p_id bigint, p_ticket uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_refunds int;
  v_done int;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_ticket is null then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  select count(*) into v_refunds from public.ai_usage
    where user_id = v_uid and refunded and created_at > now() - interval '24 hours';
  if v_refunds >= 5 then
    return false;
  end if;
  update public.ai_usage set refunded = true
    where id = p_id and user_id = v_uid and refund_secret = p_ticket
      and not refunded and created_at > now() - interval '5 minutes';
  get diagnostics v_done = row_count;
  return v_done > 0;
end;
$$;

revoke all on function public.ai_consume(text, int, int, int) from public, anon;
grant execute on function public.ai_consume(text, int, int, int) to authenticated;
revoke all on function public.ai_consume(text, int, int) from public, anon;
grant execute on function public.ai_consume(text, int, int) to authenticated;
revoke all on function public.ai_refund(bigint, uuid) from public, anon;
grant execute on function public.ai_refund(bigint, uuid) to authenticated;

-- ---------------------------------------------------------------- storage cap

create or replace function public.enforce_storage_cap()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  cap constant bigint := 52428800; -- 50 MB of stored JSON text per account
  v_new bigint := octet_length(new.data::text);
  v_other bigint;
begin
  -- A write that does not grow the row can never push the account over the cap.
  if tg_op = 'UPDATE' and v_new <= octet_length(old.data::text) then
    return new;
  end if;

  select
    coalesce((select sum(octet_length(i.data::text)) from public.investigations i
              where i.user_id = new.user_id and not (tg_table_name = 'investigations' and i.id = new.id)), 0)
    + coalesce((select sum(octet_length(a.data::text)) from public.assets a
              where a.user_id = new.user_id and not (tg_table_name = 'assets' and a.id = new.id)), 0)
  into v_other;

  if v_other + v_new > cap then
    raise exception 'Storage limit reached: an account can hold at most 50 MB of investigations and assets. Delete some you no longer need.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists investigations_storage_cap on public.investigations;
create trigger investigations_storage_cap
  before insert or update on public.investigations
  for each row execute function public.enforce_storage_cap();

drop trigger if exists assets_storage_cap on public.assets;
create trigger assets_storage_cap
  before insert or update on public.assets
  for each row execute function public.enforce_storage_cap();

-- ---------------------------------------------------------------- privileges

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;
