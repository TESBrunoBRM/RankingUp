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
    where w.user_id = p_user_id
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
