import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Deleting routine templates and saving fractional food calories in PostgreSQL', () => {
  let db: PGlite;
  const owner = '11111111-1111-4111-8111-111111111111';
  const workout = '22222222-2222-4222-8222-222222222222';
  const log = '33333333-3333-4333-8333-333333333333';
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role authenticated;
      create table profiles(id uuid primary key, xp integer);
      create table workouts(id uuid primary key, user_id uuid references profiles(id));
      create table workout_exercises(id integer primary key, workout_id uuid references workouts(id) on delete cascade);
      create table workout_logs(id uuid primary key, user_id uuid references profiles(id), workout_id uuid,
        name text, xp_awarded integer, constraint workout_logs_workout_id_fkey foreign key(workout_id) references workouts(id));
      create table exercise_logs(id integer primary key, workout_log_id uuid references workout_logs(id), reps integer);
      create table food_logs(id integer primary key, user_id uuid references profiles(id), calories integer);
      alter table workouts enable row level security;
      create policy owner_delete on workouts for all to authenticated
        using (user_id = current_setting('request.jwt.claim.sub', true)::uuid)
        with check (user_id = current_setting('request.jwt.claim.sub', true)::uuid);
      grant select,delete on workouts to authenticated;
    `);
    await db.query('insert into profiles values ($1,900)', [owner]);
    await db.query('insert into workouts values ($1,$2)', [workout, owner]);
    await db.query('insert into workout_exercises values (1,$1)', [workout]);
    await db.query('insert into workout_logs values ($1,$2,$3,\'Día 1\',120)', [log, owner, workout]);
    await db.query('insert into exercise_logs values (1,$1,12)', [log]);
    // Reproduce both production failures before applying the fix.
    await expect(db.query('delete from workouts where id=$1', [workout])).rejects.toThrow(/foreign key/);
    await expect(db.query('insert into food_logs values (1,$1,$2)', [owner, '282.5'])).rejects.toThrow(/integer/);
    await db.exec(readFileSync(resolve(__dirname, '../../../../supabase/migrations/20261105203203_fix_workout_deletion_and_decimal_food_calories.sql'), 'utf8'));
  }, 30000);
  afterAll(async () => { await db?.close(); });

  it('preserves ownership checks and detaches history when the owner deletes a routine', async () => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub='44444444-4444-4444-8444-444444444444'`);
    expect((await db.query('delete from workouts where id=$1 returning id', [workout])).rows).toHaveLength(0);
    await db.exec(`set request.jwt.claim.sub='${owner}'`);
    try { expect((await db.query('delete from workouts where id=$1 returning id', [workout])).rows).toHaveLength(1); }
    finally { await db.exec('reset role'); }
    expect((await db.query('select workout_id,name,xp_awarded from workout_logs')).rows).toEqual([{ workout_id: null, name: 'Día 1', xp_awarded: 120 }]);
    expect((await db.query('select reps from exercise_logs')).rows).toEqual([{ reps: 12 }]);
    expect((await db.query('select xp from profiles')).rows).toEqual([{ xp: 900 }]);
    expect((await db.query('select * from workout_exercises')).rows).toHaveLength(0);
  });

  it.each([282.5, 141.3, 52])('stores %s kcal without an integer conversion error', async calories => {
    const result = await db.query<{ calories: string }>('insert into food_logs values (1,$1,$2) returning calories', [owner, calories]);
    expect(Number(result.rows[0].calories)).toBe(calories);
    await db.exec('delete from food_logs where id=1');
  });
});
