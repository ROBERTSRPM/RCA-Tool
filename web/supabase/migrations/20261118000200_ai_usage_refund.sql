-- AI usage: calls that fail on our side (outage, timeout, unusable answer) do not use up the daily allowance.
-- Plain SQL, safe to run more than once.
--
-- Every call still counts toward the burst limit (abuse protection). A failed call is marked
-- "refunded" and no longer counts toward the daily limit. To stop the refund being used to dodge
-- the daily limit, a user can refund at most 5 calls per rolling 24 hours, and only calls from the last 5 minutes.

alter table public.ai_usage add column if not exists refunded boolean not null default false;

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
  v_id bigint;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  delete from public.ai_usage where user_id = v_uid and created_at < now() - interval '2 days';

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

  -- Daily: refunded calls do not count.
  select count(*), min(created_at) into v_day_count, v_oldest_day
    from public.ai_usage
    where user_id = v_uid and not refunded and created_at > now() - interval '24 hours';
  if v_day_count >= v_daily then
    return jsonb_build_object(
      'ok', false, 'reason', 'daily',
      'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_oldest_day + interval '24 hours' - now()))))
    );
  end if;

  insert into public.ai_usage (user_id, feature) values (v_uid, left(coalesce(p_feature, 'unknown'), 40))
    returning id into v_id;
  return jsonb_build_object('ok', true, 'remaining_today', v_daily - v_day_count - 1, 'usage_id', v_id);
end;
$$;

create or replace function public.ai_refund(p_id bigint)
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
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  select count(*) into v_refunds from public.ai_usage
    where user_id = v_uid and refunded and created_at > now() - interval '24 hours';
  if v_refunds >= 5 then
    return false;
  end if;
  update public.ai_usage set refunded = true
    where id = p_id and user_id = v_uid and not refunded and created_at > now() - interval '5 minutes';
  get diagnostics v_done = row_count;
  return v_done > 0;
end;
$$;

revoke all on function public.ai_consume(text, int, int) from public, anon;
grant execute on function public.ai_consume(text, int, int) to authenticated;
revoke all on function public.ai_refund(bigint) from public, anon;
grant execute on function public.ai_refund(bigint) to authenticated;
