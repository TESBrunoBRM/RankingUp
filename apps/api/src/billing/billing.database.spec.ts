import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Monthly credits in PostgreSQL', () => {
  let db: PGlite;
  const user = '11111111-1111-4111-8111-111111111111';
  const other = '22222222-2222-4222-8222-222222222222';
  const challenge = '33333333-3333-4333-8333-333333333333';
  async function call<T>(sql: string, args: unknown[] = []): Promise<T> {
    return (await db.query<{ value: T }>(sql, args)).rows[0].value;
  }
  const status = (environment = 'test') =>
    call<{ remaining: number | null; plan: string; period: string }>(
      'select public.billing_credit_status($1,$2) as value',
      [user, environment],
    );
  const reserve = (id: string, fingerprint = id, environment = 'test') =>
    call<{ status: string; response?: unknown }>(
      'select public.billing_reserve_credit($1,$2,$3,$4) as value',
      [user, id, fingerprint, environment],
    );
  const finish = (id: string, success: boolean) =>
    db.query('select public.billing_finish_credit($1,$2,$3,$4)', [user, id, success, { ok: true }]);
  async function reward(transaction = 'ad-transaction-1', owner = user) {
    return call<boolean>('select public.billing_reward_credit($1,$2,$3,$4) as value', [
      owner,
      challenge,
      transaction,
      'test',
    ]);
  }
  async function createChallenge() {
    const current = await status();
    await db.query('insert into public.ai_reward_challenges(id,user_id,period) values($1,$2,$3)', [
      challenge,
      user,
      current.period,
    ]);
  }
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(
      'create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key);',
    );
    await db.query('insert into auth.users(id) values($1),($2)', [user, other]);
    await db.exec(
      readFileSync(
        resolve(__dirname, '../../../../supabase/migrations/20261025195626_monetization.sql'),
        'utf8',
      ),
    );
  }, 30000);
  beforeEach(async () => {
    await db.exec('truncate public.billing_accounts cascade');
  });
  afterAll(async () => {
    await db?.close();
  });

  it('shares exactly three uses across planning and nutrition', async () => {
    expect((await status()).remaining).toBe(3);
    for (const id of ['planning-1', 'nutrition-2', 'planning-3']) {
      expect((await reserve(id)).status).toBe('reserved');
      await finish(id, true);
    }
    expect((await status()).remaining).toBe(0);
    expect((await reserve('nutrition-4')).status).toBe('exhausted');
  });
  it('admits only three concurrent reservations', async () => {
    const result = await Promise.all(Array.from({ length: 12 }, (_, i) => reserve(`request-${i}`)));
    expect(result.filter((row) => row.status === 'reserved')).toHaveLength(3);
    expect((await status()).remaining).toBe(0);
  });
  it('refunds a failed operation only once', async () => {
    await reserve('request-failed');
    await finish('request-failed', false);
    await finish('request-failed', false);
    expect((await status()).remaining).toBe(3);
    expect((await reserve('request-failed')).status).toBe('failed');
  });
  it('returns successful requests without charging again and rejects changed payloads', async () => {
    await reserve('request-cached');
    await finish('request-cached', true);
    expect(await reserve('request-cached')).toEqual({ status: 'cached', response: { ok: true } });
    expect((await reserve('request-cached', 'different')).status).toBe('conflict');
    expect((await status()).remaining).toBe(2);
  });
  it('does not repeat a request whose response is still pending', async () => {
    await reserve('request-pending');
    expect((await reserve('request-pending')).status).toBe('pending');
    expect((await status()).remaining).toBe(2);
  });
  it('adds one verified reward once, capped at three available uses', async () => {
    await reserve('request-for-ad');
    await finish('request-for-ad', true);
    await createChallenge();
    expect(await reward()).toBe(true);
    expect(await reward()).toBe(true);
    expect((await status()).remaining).toBe(3);
    expect(await reward('different-transaction')).toBe(false);
  });
  it('does not reward an unknown, expired or differently owned challenge', async () => {
    await reserve('request-for-ad');
    await createChallenge();
    expect(await reward('wrong-owner', other)).toBe(false);
    await db.query(
      "update public.ai_reward_challenges set expires_at = now() - interval '1 minute'",
    );
    expect(await reward()).toBe(false);
    expect((await status()).remaining).toBe(2);
  });
  it('cannot reuse a transaction on another ad challenge', async () => {
    await reserve('request-for-ad');
    await createChallenge();
    await reward();
    await reserve('request-another');
    await db.query('update public.ai_reward_challenges set id = $1', [
      '44444444-4444-4444-8444-444444444444',
    ]);
    await createChallenge();
    expect(await reward()).toBe(false);
    expect((await status()).remaining).toBe(2);
  });
  it('keeps refunds and ad rewards from exceeding the balance cap', async () => {
    await reserve('request-for-ad');
    await createChallenge();
    await reward();
    await finish('request-for-ad', false);
    expect((await status()).remaining).toBe(3);
  });
  it('lets verified Pro use AI without consuming its free balance', async () => {
    await status();
    await db.query("select public.billing_sync_pro($1, now() + interval '1 day', now(), 'test')", [
      user,
    ]);
    for (let i = 0; i < 8; i++) {
      await reserve(`pro-request-${i}`);
      await finish(`pro-request-${i}`, true);
    }
    expect((await status()).remaining).toBeNull();
    await db.query("update public.billing_accounts set pro_until = now() - interval '1 second'");
    expect((await status()).remaining).toBe(3);
  });
  it('isolates test entitlements from live access', async () => {
    await status();
    await db.query("select public.billing_sync_pro($1, now() + interval '1 day', now(), 'test')", [
      user,
    ]);
    expect((await status('test')).plan).toBe('pro');
    expect((await status('live')).plan).toBe('free');
  });
  it('ignores an outdated provider verification', async () => {
    await status();
    await db.query("select public.billing_sync_pro($1, now() + interval '1 day', now(), 'test')", [
      user,
    ]);
    await db.query("select public.billing_sync_pro($1, null, now() - interval '1 hour', 'test')", [
      user,
    ]);
    expect((await status()).plan).toBe('pro');
  });
  it('starts a new month without carrying over the old balance', async () => {
    const current = await status();
    await db.query(
      "update public.ai_monthly_credits set period = ($1::date - interval '1 month')::date, balance = 0",
      [current.period],
    );
    expect((await status()).remaining).toBe(3);
  });
  it('keeps all credit tables and RPCs inaccessible to client roles', async () => {
    await status();
    await db.exec('set role authenticated');
    try {
      await expect(db.query('select * from public.billing_accounts')).rejects.toMatchObject({
        code: '42501',
      });
      await expect(
        db.query('select public.billing_credit_status($1)', [user]),
      ).rejects.toMatchObject({ code: '42501' });
      await expect(
        db.query("select public.billing_sync_pro($1, now(), now(), 'live')", [user]),
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await db.exec('reset role');
    }
  });
});
