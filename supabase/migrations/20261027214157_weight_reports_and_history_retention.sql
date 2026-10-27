-- Weight records are private and independent of the 14-day workout retention.
alter table public.profiles add column target_weight numeric(5,2)
  check (target_weight between 30 and 300);

create table public.weight_logs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  measured_on date not null,
  weight numeric(5,2) not null check (weight between 30 and 300),
  recorded_at timestamptz not null default now(),
  primary key (user_id, measured_on)
);
alter table public.weight_logs enable row level security;
revoke all on public.weight_logs from anon, authenticated;
grant select, insert, update, delete on public.weight_logs to service_role;

-- Capture changes made through onboarding/physical metrics as well as reports.
-- Existing profile weights are not backfilled with an invented measurement date.
create function public.capture_profile_weight() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.weight is not null and new.weight between 30 and 300 then
    insert into public.weight_logs(user_id, measured_on, weight)
    values(new.id, (now() at time zone coalesce(nullif(new.streak_timezone, ''), 'UTC'))::date, new.weight)
    on conflict (user_id, measured_on) do update set weight = excluded.weight, recorded_at = now();
  end if;
  return new;
end $$;
revoke all on function public.capture_profile_weight() from public, anon, authenticated;
create trigger capture_profile_weight after update of weight on public.profiles
  for each row when (old.weight is distinct from new.weight)
  execute function public.capture_profile_weight();

-- Profile, calorie estimate and the day's measurement commit together, including
-- a repeat weigh-in with the same weight. Only the authenticated API calls this.
create function public.record_weight(p_user_id uuid, p_weight numeric, p_timezone text,
  p_target_calories integer default null) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if p_weight is null or p_weight not between 30 and 300
    or not exists(select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'Invalid weight or timezone' using errcode = '22023';
  end if;
  update public.profiles set weight = p_weight, streak_timezone = p_timezone,
    target_calories = coalesce(p_target_calories, target_calories)
    where id = p_user_id;
  if not found then raise exception 'Profile not found'; end if;
  insert into public.weight_logs(user_id, measured_on, weight)
    values(p_user_id, (now() at time zone p_timezone)::date, p_weight)
    on conflict(user_id, measured_on) do update set weight = excluded.weight, recorded_at = now();
end $$;
revoke all on function public.record_weight(uuid, numeric, text, integer) from public, anon, authenticated;
grant execute on function public.record_weight(uuid, numeric, text, integer) to service_role;

-- Storage objects must be removed via the Storage API, not by deleting metadata.
-- Keep only a path until the API worker confirms its removal.
create table public.expired_workout_photos (
  path text primary key,
  queued_at timestamptz not null default now()
);
create index expired_workout_photos_queued_idx on public.expired_workout_photos(queued_at);
alter table public.expired_workout_photos enable row level security;
revoke all on public.expired_workout_photos from anon, authenticated;
grant select, delete on public.expired_workout_photos to service_role;

create index workout_logs_retention_date_idx on public.workout_logs(date);
create function public.prune_workout_history() returns bigint
language plpgsql security invoker set search_path = '' as $$
declare removed bigint;
begin
  insert into public.expired_workout_photos(path)
    select distinct photo_path from public.workout_logs
    where date < (now() at time zone 'UTC') - interval '14 days' and photo_path is not null
    on conflict(path) do nothing;
  delete from public.exercise_logs where workout_log_id in (
    select id from public.workout_logs where date < (now() at time zone 'UTC') - interval '14 days');
  delete from public.workout_logs where date < (now() at time zone 'UTC') - interval '14 days';
  get diagnostics removed = row_count;
  return removed;
end $$;
revoke all on function public.prune_workout_history() from public, anon, authenticated, service_role;

create or replace function public.get_last_exercise_performance(p_user_id uuid, p_exercise_ids text[])
returns table (exercise_id text, last_date timestamp, sets jsonb, best_weight numeric, best_reps integer, best_one_rm numeric)
language sql security definer set search_path = '' as $$
  with latest as (
    select distinct on (e.exercise_id) e.exercise_id, w.id as log_id, w.date
    from public.exercise_logs e join public.workout_logs w on w.id = e.workout_log_id
    where w.date >= (now() at time zone 'UTC') - interval '14 days' and w.user_id = p_user_id and e.exercise_id = any(p_exercise_ids) and e.kind in ('normal', 'failure')
    order by e.exercise_id, w.date desc, w.id desc
  ), best as (
    select e.exercise_id, max(e.weight) best_weight, max(e.reps) best_reps,
      max(round(case
        when e.reps = 1 then e.weight
        when least(e.reps, 30) <= 8 then e.weight * 36 / (37 - least(e.reps, 30))
        when least(e.reps, 30) <= 10 then
          (e.weight * 36 / (37 - least(e.reps, 30))) * (1 - (least(e.reps, 30) - 8)::numeric / 2)
          + (e.weight * (1 + least(e.reps, 30)::numeric / 30)) * ((least(e.reps, 30) - 8)::numeric / 2)
        else e.weight * (1 + least(e.reps, 30)::numeric / 30)
      end, 1)) best_one_rm
    from public.exercise_logs e join public.workout_logs w on w.id = e.workout_log_id
    where w.date >= (now() at time zone 'UTC') - interval '14 days' and w.user_id = p_user_id and e.exercise_id = any(p_exercise_ids) and e.kind in ('normal', 'failure')
    group by e.exercise_id
  )
  select l.exercise_id, l.date,
    (select jsonb_agg(jsonb_build_object('setIndex', e.set_index, 'weight', e.weight, 'reps', e.reps) order by e.set_index)
     from public.exercise_logs e where e.workout_log_id = l.log_id and e.exercise_id = l.exercise_id and e.kind in ('normal', 'failure')),
    b.best_weight, b.best_reps, b.best_one_rm
  from latest l join best b using (exercise_id);
$$;
revoke execute on function public.get_last_exercise_performance(uuid, text[]) from public, anon, authenticated;
grant execute on function public.get_last_exercise_performance(uuid, text[]) to service_role;


-- Two recent working sessions per exercise for deterministic deload advice.
create or replace function public.get_recent_exercise_sessions(p_user_id uuid, p_exercise_ids text[])
returns table (exercise_id text, session_date timestamp, sets jsonb)
language sql security definer set search_path = '' as $$
  with sessions as (
    select e.exercise_id, w.id as log_id, w.date,
      jsonb_agg(jsonb_build_object('setIndex', e.set_index, 'weight', e.weight, 'reps', e.reps)
        order by e.set_index) as working_sets
    from public.exercise_logs e
    join public.workout_logs w on w.id = e.workout_log_id
    where w.date >= (now() at time zone 'UTC') - interval '14 days' and w.user_id = p_user_id
      and e.exercise_id = any(p_exercise_ids)
      and e.kind in ('normal', 'failure')
    group by e.exercise_id, w.id, w.date
  ), ranked as (
    select sessions.*,
      row_number() over (partition by sessions.exercise_id order by sessions.date desc, sessions.log_id desc) as position
    from sessions
  )
  select ranked.exercise_id, ranked.date, ranked.working_sets
  from ranked where ranked.position <= 2
  order by ranked.exercise_id, ranked.position;
$$;
revoke execute on function public.get_recent_exercise_sessions(uuid, text[]) from public, anon, authenticated;
grant execute on function public.get_recent_exercise_sessions(uuid, text[]) to service_role;

-- CRON_SETUP: run independently of mobile sessions and API uptime.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('rankingup-workout-retention', '0 * * * *',
  'select public.prune_workout_history()');
