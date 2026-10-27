import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateWorkoutPlan } from '../domain/workout-plan.generator';

describe('Atomic workout planning in PostgreSQL', () => {
  let db: PGlite;
  const user = '11111111-1111-4111-8111-111111111111';
  const other = '22222222-2222-4222-8222-222222222222';
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create type public.week_day as enum ('MON','TUE','WED','THU','FRI','SAT','SUN');
      create table public.profiles(id uuid primary key);
      create table public.workouts(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
        name text not null, description text, scheduled_day public.week_day, created_at timestamptz default now());
      create table public.workout_exercises(id uuid primary key default gen_random_uuid(),
        workout_id uuid not null references public.workouts(id), exercise_id text not null,
        sets integer not null, reps integer not null, rest_seconds integer not null default 90, "order" integer not null);
      grant select,insert on public.workouts,public.workout_exercises to service_role;`);
    await db.query('insert into public.profiles(id) values($1),($2)', [user, other]);
    await db.exec(readFileSync(resolve(__dirname, '../../../../supabase/migrations/20261027221645_atomic_workout_plan.sql'), 'utf8'));
  }, 30000);
  beforeEach(async () => { await db.exec('truncate public.workout_exercises,public.workouts'); });
  afterAll(async () => { await db?.close(); });
  const days = () => generateWorkoutPlan({ equipment: 'Gimnasio Comercial', trainingGoal: 'strength', primaryMuscles: ['Pecho'],
    secondaryMuscles: [], duration: 60, days: 3 }).workouts.map(day => ({ ...day, description: 'Objetivo: Fuerza' }));
  const save = (workouts: unknown, owner = user) => db.query<{ plan: Array<{ user_id: string; scheduled_day: string; exercises: Array<{ reps: number; rest_seconds: number; order: number }> }> }>(
    'select public.save_workout_plan($1,$2) as plan', [owner, JSON.stringify(workouts)]);
  const count = async (table: string) => Number((await db.query<{ count: number }>(`select count(*) as count from public.${table}`)).rows[0].count);

  it('stores the full plan for its caller with goal-specific rests and enum dates', async () => {
    await db.exec('set role service_role');
    let result;
    try { result = await save(days()); } finally { await db.exec('reset role'); }
    const plan = result.rows[0].plan;
    expect(plan).toHaveLength(3);
    expect(plan.map(day => day.scheduled_day)).toEqual(['MON', 'WED', 'FRI']);
    for (const day of plan) expect(day.user_id).toBe(user);
    expect(plan[0].exercises[0]).toMatchObject({ reps: 5, rest_seconds: 180, order: 0 });
    expect(await count('workouts')).toBe(3);
    expect(await count('workout_exercises')).toBe(plan.reduce((sum, day) => sum + day.exercises.length, 0));
  });
  it('rolls back earlier days and sets when a later exercise fails', async () => {
    const input = days(); input[1].exercises[0].reps = -1;
    await expect(save(input)).rejects.toThrow(/prescription/);
    expect(await count('workouts')).toBe(0); expect(await count('workout_exercises')).toBe(0);
  });
  it('rolls back when a later enum/date cannot be converted', async () => {
    const input = days(); input[2].scheduled_day = 'INVALID' as never;
    await expect(save(input)).rejects.toThrow();
    expect(await count('workouts')).toBe(0); expect(await count('workout_exercises')).toBe(0);
  });
  it('rejects duplicated days or exercises without partial records', async () => {
    const input = days(); input[1].scheduled_day = input[0].scheduled_day;
    await expect(save(input)).rejects.toThrow(/Duplicate/);
    const repeated = days(); repeated[0].exercises.push(repeated[0].exercises[0]);
    await expect(save(repeated)).rejects.toThrow(/Duplicate/);
    expect(await count('workouts')).toBe(0);
  });
  it.each(['anon', 'authenticated'])('denies %s direct access to the write function', async role => {
    await db.exec(`set role ${role}`);
    try { await expect(save(days(), other)).rejects.toThrow(/permission denied/); }
    finally { await db.exec('reset role'); }
    expect(await count('workouts')).toBe(0);
  });
});
