drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select to public
  using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to public
  using ((select auth.uid()) = id);

drop policy if exists "Users manage own workouts" on public.workouts;
create policy "Users manage own workouts"
  on public.workouts for all to public
  using ((select auth.uid()) = user_id);

drop policy if exists "Users manage own logs" on public.workout_logs;
create policy "Users manage own logs"
  on public.workout_logs for all to public
  using ((select auth.uid()) = user_id);

drop policy if exists "Users manage own exercise logs" on public.exercise_logs;
create policy "Users manage own exercise logs"
  on public.exercise_logs for all to public
  using (
    exists (
      select 1
      from public.workout_logs
      where workout_logs.id = exercise_logs.workout_log_id
        and workout_logs.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage own goals" on public.goals;
create policy "Users manage own goals"
  on public.goals for all to public
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own food logs" on public.food_logs;
create policy "Users can insert their own food logs"
  on public.food_logs for insert to public
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own food logs" on public.food_logs;
create policy "Users can view their own food logs"
  on public.food_logs for select to public
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own food logs" on public.food_logs;
create policy "Users can update their own food logs"
  on public.food_logs for update to public
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own food logs" on public.food_logs;
create policy "Users can delete their own food logs"
  on public.food_logs for delete to public
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own workout exercises" on public.workout_exercises;
create policy "Users can manage their own workout exercises"
  on public.workout_exercises for all to authenticated
  using (
    workout_id in (
      select workouts.id
      from public.workouts
      where workouts.user_id = (select auth.uid())
    )
  )
  with check (
    workout_id in (
      select workouts.id
      from public.workouts
      where workouts.user_id = (select auth.uid())
    )
  );
