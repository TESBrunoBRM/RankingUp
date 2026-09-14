alter table public.workout_logs
  add column if not exists started_at timestamptz,
  add column if not exists finished_at timestamptz,
  add column if not exists duration_seconds integer check (duration_seconds is null or duration_seconds between 0 and 86400),
  add column if not exists total_volume numeric(10,2) not null default 0,
  add column if not exists xp_awarded integer not null default 0,
  add column if not exists name text,
  add column if not exists client_session_id text;

create index if not exists workout_logs_user_date_idx on public.workout_logs (user_id, date desc);
create unique index if not exists workout_logs_client_session_idx on public.workout_logs (user_id, client_session_id) where client_session_id is not null;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'set_kind' and typnamespace = 'public'::regnamespace) then
    create type public.set_kind as enum ('normal', 'warmup', 'drop', 'failure');
  end if;
end $$;

alter table public.exercise_logs
  add column if not exists set_index smallint not null default 1,
  add column if not exists kind public.set_kind not null default 'normal',
  add column if not exists is_pr boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

create index if not exists exercise_logs_exercise_log_idx on public.exercise_logs (exercise_id, workout_log_id);

alter table public.workout_exercises
  add column if not exists rest_seconds smallint not null default 90 check (rest_seconds between 0 and 600);

create or replace function public.get_last_exercise_performance(p_user_id uuid, p_exercise_ids text[])
returns table (exercise_id text, last_date timestamp, sets jsonb, best_weight numeric, best_reps integer, best_one_rm numeric)
language sql security definer set search_path = '' as $$
  with latest as (
    select distinct on (e.exercise_id) e.exercise_id, w.id as log_id, w.date
    from public.exercise_logs e join public.workout_logs w on w.id = e.workout_log_id
    where w.user_id = p_user_id and e.exercise_id = any(p_exercise_ids) and e.kind in ('normal', 'failure')
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
    where w.user_id = p_user_id and e.exercise_id = any(p_exercise_ids) and e.kind in ('normal', 'failure')
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

-- Insercion de la sesion, series y XP en una sola transaccion.
create or replace function public.complete_workout_session(
  p_user_id uuid, p_workout_id uuid, p_started_at timestamptz,
  p_duration_seconds integer, p_name text, p_total_volume numeric,
  p_xp integer, p_sets jsonb, p_client_session_id text
)
returns table (workout_log_id uuid, total_xp integer)
language plpgsql security definer set search_path = '' as $$
declare v_log_id uuid; v_total integer;
begin
  if p_xp < 0 or p_xp > 300 or p_duration_seconds < 0 or p_duration_seconds > 86400
     or jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) not between 1 and 60
     or length(coalesce(p_client_session_id, '')) > 80 then
    raise exception 'Invalid workout session';
  end if;
  perform 1 from public.profiles where id = p_user_id for update;
  if not found or not exists (select 1 from public.workouts where id = p_workout_id and user_id = p_user_id) then
    raise exception 'Workout does not belong to user';
  end if;
  if p_client_session_id is not null then
    select id into v_log_id from public.workout_logs
    where user_id = p_user_id and client_session_id = p_client_session_id;
    if found then
      select coalesce(xp, 0) into v_total from public.profiles where id = p_user_id;
      return query select v_log_id, v_total;
      return;
    end if;
  end if;
  insert into public.workout_logs (user_id, workout_id, date, started_at, finished_at, duration_seconds, name, total_volume, xp_awarded, client_session_id)
  values (p_user_id, p_workout_id, now() at time zone 'UTC', p_started_at, now(), p_duration_seconds, p_name, p_total_volume, p_xp, p_client_session_id)
  returning id into v_log_id;
  insert into public.exercise_logs (workout_log_id, exercise_id, weight, reps, set_index, kind, is_pr)
  select v_log_id, s.exercise_id, s.weight, s.reps, s.set_index, s.kind::public.set_kind, s.is_pr
  from jsonb_to_recordset(p_sets) as s(exercise_id text, weight numeric, reps integer, set_index smallint, kind text, is_pr boolean);
  update public.profiles set xp = coalesce(xp, 0) + p_xp where id = p_user_id returning xp into v_total;
  return query select v_log_id, v_total;
end; $$;
revoke execute on function public.complete_workout_session(uuid, uuid, timestamptz, integer, text, numeric, integer, jsonb, text) from public, anon, authenticated;
grant execute on function public.complete_workout_session(uuid, uuid, timestamptz, integer, text, numeric, integer, jsonb, text) to service_role;
