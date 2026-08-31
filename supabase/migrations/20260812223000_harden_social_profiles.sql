create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, username, xp)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), 'Atleta RankingUp'),
    'atleta_' || left(replace(new.id::text, '-', ''), 12),
    0
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop policy if exists "Backend only profile follows" on public.profile_follows;
create policy "Backend only profile follows"
  on public.profile_follows
  for all
  to anon, authenticated
  using (false)
  with check (false);

create index if not exists exercise_logs_workout_log_id_idx
  on public.exercise_logs (workout_log_id);

create index if not exists food_logs_user_id_idx
  on public.food_logs (user_id);

create index if not exists goals_user_id_idx
  on public.goals (user_id);

create index if not exists workout_exercises_workout_id_idx
  on public.workout_exercises (workout_id);

create index if not exists workout_logs_user_id_idx
  on public.workout_logs (user_id);

create index if not exists workout_logs_workout_id_idx
  on public.workout_logs (workout_id);

create index if not exists workouts_user_id_idx
  on public.workouts (user_id);
