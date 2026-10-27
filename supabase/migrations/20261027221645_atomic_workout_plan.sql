-- Persist the whole generated week atomically. A failed exercise or day must
-- never leave partially-created routines. Only the API may call this function.
create function public.save_workout_plan(p_user_id uuid, p_workouts jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_day jsonb; v_item jsonb;
  v_workout public.workouts%rowtype;
  v_exercise public.workout_exercises%rowtype;
  v_result jsonb := '[]'::jsonb;
  v_exercises jsonb;
  v_order integer;
begin
  if p_user_id is null or p_workouts is null or jsonb_typeof(p_workouts) <> 'array' then
    raise exception 'Invalid workout plan' using errcode = '22023';
  end if;
  if jsonb_array_length(p_workouts) not between 1 and 6 then
    raise exception 'Invalid workout day count' using errcode = '22023';
  end if;
  if (select count(distinct day->>'scheduled_day') from jsonb_array_elements(p_workouts) day) <> jsonb_array_length(p_workouts) then
    raise exception 'Duplicate or missing scheduled days' using errcode = '22023';
  end if;
  for v_day in select value from jsonb_array_elements(p_workouts) loop
    if jsonb_typeof(v_day->'exercises') is distinct from 'array' then
      raise exception 'Invalid exercise list' using errcode = '22023';
    end if;
    if jsonb_array_length(v_day->'exercises') not between 1 and 8 then
      raise exception 'Invalid exercise count' using errcode = '22023';
    end if;
    if (select count(distinct item->>'name') from jsonb_array_elements(v_day->'exercises') item) <> jsonb_array_length(v_day->'exercises') then
      raise exception 'Duplicate or missing exercises' using errcode = '22023';
    end if;
    -- Populate row types to support the existing scheduled-day column type,
    -- whether the installation uses text or a PostgreSQL enum.
    select * into v_workout from jsonb_populate_record(null::public.workouts,
      jsonb_build_object('user_id', p_user_id, 'name', v_day->>'name',
        'description', v_day->>'description', 'scheduled_day', v_day->>'scheduled_day'));
    if coalesce(length(btrim(v_workout.name)), 0) not between 1 and 150
      or coalesce(length(v_workout.description), 0) > 5000 then
      raise exception 'Invalid workout metadata' using errcode = '22023';
    end if;
    if v_workout.scheduled_day::text not in ('MON','TUE','WED','THU','FRI','SAT','SUN') then
      raise exception 'Invalid scheduled day' using errcode = '22023';
    end if;
    insert into public.workouts(user_id, name, description, scheduled_day)
      values(p_user_id, v_workout.name, v_workout.description, v_workout.scheduled_day)
      returning * into v_workout;
    v_exercises := '[]'::jsonb;
    v_order := 0;
    for v_item in select value from jsonb_array_elements(v_day->'exercises') loop
      select * into v_exercise from jsonb_populate_record(null::public.workout_exercises,
        jsonb_build_object('exercise_id', v_item->>'name', 'sets', v_item->'sets',
          'reps', v_item->'reps', 'rest_seconds', v_item->'rest_seconds'));
      if coalesce(length(btrim(v_exercise.exercise_id)), 0) not between 1 and 150
        or v_exercise.sets is null or v_exercise.sets not between 1 and 5
        or v_exercise.reps is null or v_exercise.reps not between 3 and 20
        or v_exercise.rest_seconds is null or v_exercise.rest_seconds not between 45 and 300 then
        raise exception 'Invalid exercise prescription' using errcode = '22023';
      end if;
      insert into public.workout_exercises(workout_id, exercise_id, sets, reps, "order", rest_seconds)
        values(v_workout.id, v_exercise.exercise_id, v_exercise.sets, v_exercise.reps, v_order, v_exercise.rest_seconds)
        returning * into v_exercise;
      v_exercises := v_exercises || jsonb_build_array(to_jsonb(v_exercise));
      v_order := v_order + 1;
    end loop;
    v_result := v_result || jsonb_build_array(to_jsonb(v_workout) || jsonb_build_object('exercises', v_exercises));
  end loop;
  return v_result;
end $$;
revoke all on function public.save_workout_plan(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_workout_plan(uuid, jsonb) to service_role;
