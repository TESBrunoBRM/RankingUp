import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Weight history and workout retention in PostgreSQL', () => {
  let db: PGlite;
  const user = '11111111-1111-4111-8111-111111111111';
  const other = '22222222-2222-4222-8222-222222222222';
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create table public.profiles(id uuid primary key, weight numeric, streak_timezone text,
        target_calories integer, xp integer default 0);
      create table public.workout_logs(id uuid primary key, user_id uuid references public.profiles(id),
        date timestamp, photo_path text);
      create table public.exercise_logs(id uuid primary key default gen_random_uuid(),
        workout_log_id uuid references public.workout_logs(id), exercise_id text,
        weight numeric, reps integer, set_index smallint, kind text);
      create table public.workout_log_likes(workout_log_id uuid references public.workout_logs(id) on delete cascade);
      grant select,update on public.profiles to service_role;
    `);
    const migration = readFileSync(resolve(__dirname, '../../../../supabase/migrations/20261027214157_weight_reports_and_history_retention.sql'), 'utf8');
    // pg_cron is hosted by Supabase; PGlite tests all SQL up to its setup block.
    await db.exec(migration.split('-- CRON_SETUP:')[0]);
    await db.query<Record<string, unknown>>('insert into public.profiles(id,weight,xp) values($1,75,900),($2,85,200)', [user, other]);
  }, 30000);
  afterAll(async () => { await db?.close(); });
  beforeEach(async () => {
    await db.exec('truncate public.weight_logs, public.exercise_logs, public.workout_log_likes, public.workout_logs, public.expired_workout_photos');
  });
  const record = (weight: number, zone = 'America/Santiago') =>
    db.query<Record<string, unknown>>('select public.record_weight($1,$2,$3,2300)', [user, weight, zone]);

  it('atomically records a local date and updates profile and calories, even when weight is unchanged', async () => {
    await record(75);
    await record(75);
    const rows = (await db.query<{ weight: number; measured_on: string }>(
      `select weight,measured_on::text from public.weight_logs where user_id=$1
        and measured_on=(now() at time zone 'America/Santiago')::date`, [user])).rows;
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].weight)).toBe(75);
    expect((await db.query<Record<string, unknown>>('select target_calories from public.profiles where id=$1', [user])).rows[0].target_calories).toBe(2300);
  });
  it('updates the same day without accumulating duplicates', async () => {
    await record(74.5); await record(74.8);
    const rows = (await db.query<Record<string, unknown>>('select weight from public.weight_logs where user_id=$1', [user])).rows;
    expect(rows).toHaveLength(1); expect(Number(rows[0].weight)).toBe(74.8);
    expect(Number((await db.query<Record<string, unknown>>('select weight from public.profiles where id=$1', [other])).rows[0].weight)).toBe(85);
  });
  it('captures profile metric changes but does not create an invented historical baseline', async () => {
    expect((await db.query<Record<string, unknown>>('select * from public.weight_logs')).rows).toHaveLength(0);
    await db.query<Record<string, unknown>>('update public.profiles set weight=76 where id=$1', [user]);
    expect((await db.query<Record<string, unknown>>('select * from public.weight_logs')).rows).toHaveLength(1);
  });
  it('rejects invalid weight/timezone without partial profile updates', async () => {
    await record(75);
    await expect(record(15)).rejects.toThrow();
    await expect(record(80, 'invalid/zone')).rejects.toThrow();
    expect(Number((await db.query<Record<string, unknown>>('select weight from public.profiles where id=$1', [user])).rows[0].weight)).toBe(75);
  });
  it('denies direct client access to private weights and privileged functions', async () => {
    await record(75);
    await db.exec('set role authenticated');
    await expect(db.query<Record<string, unknown>>('select * from public.weight_logs')).rejects.toThrow(/permission denied/);
    await expect(record(75)).rejects.toThrow(/permission denied/);
    await expect(db.query<Record<string, unknown>>('select public.prune_workout_history()')).rejects.toThrow(/permission denied/);
    await db.exec('reset role');
  });
  it('allows the backend role to write through the invoker function', async () => {
    await db.exec('set role service_role');
    try { await record(77); } finally { await db.exec('reset role'); }
    expect(Number((await db.query<Record<string, unknown>>('select weight from public.weight_logs')).rows[0].weight)).toBe(77);
  });
  it('deletes only expired training details and queues photos while preserving XP and weight history', async () => {
    await record(75);
    await db.query<Record<string, unknown>>(`insert into public.workout_logs(id,user_id,date,photo_path) values
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',$1,(now() at time zone 'UTC')-interval '15 days','old/photo.jpg'),
      ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',$1,(now() at time zone 'UTC')-interval '13 days','new/photo.jpg')`, [user]);
    await db.exec(`insert into public.exercise_logs(workout_log_id,exercise_id,weight,reps,set_index,kind)
      select id,'squat',40,10,1,'normal' from public.workout_logs;
      insert into public.workout_log_likes select id from public.workout_logs;`);
    expect(Number((await db.query<Record<string, unknown>>('select public.prune_workout_history() as count')).rows[0].count)).toBe(1);
    expect((await db.query<Record<string, unknown>>('select * from public.workout_logs')).rows).toHaveLength(1);
    expect((await db.query<Record<string, unknown>>('select * from public.exercise_logs')).rows).toHaveLength(1);
    expect((await db.query<Record<string, unknown>>('select * from public.workout_log_likes')).rows).toHaveLength(1);
    expect((await db.query<Record<string, unknown>>('select path from public.expired_workout_photos')).rows).toEqual([{ path: 'old/photo.jpg' }]);
    expect((await db.query<Record<string, unknown>>('select * from public.weight_logs')).rows).toHaveLength(1);
    expect((await db.query<Record<string, unknown>>('select xp from public.profiles where id=$1', [user])).rows[0].xp).toBe(900);
    expect(Number((await db.query<Record<string, unknown>>('select public.prune_workout_history() as count')).rows[0].count)).toBe(0);
  });
  it('excludes expired sets from performance/progression even before the cleanup job runs', async () => {
    await db.query<Record<string, unknown>>(`insert into public.workout_logs(id,user_id,date) values
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',$1,(now() at time zone 'UTC')-interval '15 days'),
      ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',$1,(now() at time zone 'UTC')-interval '1 day')`, [user]);
    await db.exec(`insert into public.exercise_logs(workout_log_id,exercise_id,weight,reps,set_index,kind) values
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','squat',100,5,1,'normal'),
      ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','squat',40,5,1,'normal')`);
    const performance = (await db.query<Record<string, unknown>>('select * from public.get_last_exercise_performance($1,$2)', [user, ['squat']])).rows;
    expect(Number(performance[0].best_weight)).toBe(40);
    expect((await db.query<Record<string, unknown>>('select * from public.get_recent_exercise_sessions($1,$2)', [user, ['squat']])).rows).toHaveLength(1);
  });
});
