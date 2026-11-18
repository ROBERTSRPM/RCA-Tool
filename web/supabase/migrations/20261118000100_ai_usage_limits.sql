-- AI usage limits: one row per AI call, counted per user, with a daily and a burst limit.
-- Plain SQL, safe to run more than once.
--
-- The app calls public.ai_consume() from its server routes with the signed-in user's token.
-- The function counts the user's calls in the last 24 hours and the last 60 seconds under a
-- per-user lock, and records the call only if both limits allow it. Users cannot write the
-- table directly (no insert/update/delete policy or grant); they can read their own rows.

create table if not exists public.ai_usage (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  feature     text not null check (char_length(feature) <= 40),
  created_at  timestamptz not null default now()
);

create index if not exists ai_usage_user_created_idx
  on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;

create or replace function public.ai_consume(p_feature text, p_daily int, p_burst int)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_daily int := least(1000, greatest(1, coalesce(p_daily, 30)));
  v_burst int := least(60, greatest(1, coalesce(p_burst, 5)));
  v_day_count int;
  v_burst_count int;
  v_oldest_day timestamptz;
  v_oldest_burst timestamptz;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- One call at a time per user, so two parallel requests cannot both slip under a limit.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  -- Keep the table small: only the last 2 days matter.
  delete from public.ai_usage where user_id = v_uid and created_at < now() - interval '2 days';

  select count(*), min(created_at) into v_burst_count, v_oldest_burst
    from public.ai_usage
    where user_id = v_uid and created_at > now() - interval '60 seconds';
  if v_burst_count >= v_burst then
    return jsonb_build_object(
      'ok', false, 'reason', 'burst',
      'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_oldest_burst + interval '60 seconds' - now()))))
    );
  end if;

  select count(*), min(created_at) into v_day_count, v_oldest_day
    from public.ai_usage
    where user_id = v_uid and created_at > now() - interval '24 hours';
  if v_day_count >= v_daily then
    return jsonb_build_object(
      'ok', false, 'reason', 'daily',
      'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_oldest_day + interval '24 hours' - now()))))
    );
  end if;

  insert into public.ai_usage (user_id, feature) values (v_uid, left(coalesce(p_feature, 'unknown'), 40));
  return jsonb_build_object('ok', true, 'remaining_today', v_daily - v_day_count - 1);
end;
$$;

revoke all on function public.ai_consume(text, int, int) from public, anon;
grant execute on function public.ai_consume(text, int, int) to authenticated;
