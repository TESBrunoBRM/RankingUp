-- A completed session is a snapshot with its own name, sets and XP. Deleting
-- the template must detach it, not delete the user's recent training history.
alter table public.workout_logs
  drop constraint workout_logs_workout_id_fkey,
  add constraint workout_logs_workout_id_fkey
    foreign key (workout_id) references public.workouts(id) on delete set null;

-- The nutrition calculator already produces decimals (e.g. hallulla 282.5).
-- Match the numeric macro fields rather than rejecting those API inserts.
alter table public.food_logs
  alter column calories type numeric using calories::numeric;
