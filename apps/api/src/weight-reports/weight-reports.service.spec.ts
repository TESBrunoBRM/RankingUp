import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { SupabaseService } from '../supabase/supabase.service';
import { WeightReportsService } from './weight-reports.service';
import { RecordWeightDto, WeightTargetDto } from './weight-reports.dto';

describe('WeightReportsService', () => {
  const user = 'authenticated-user';
  let service: WeightReportsService;
  let from: jest.Mock;
  let rpc: jest.Mock;
  const builders: Array<Record<string, jest.Mock>> = [];
  let results: Array<{ data: unknown; error: unknown }>;
  beforeEach(() => {
    builders.length = 0;
    results = [];
    from = jest.fn(() => {
      const result = results.shift() ?? { data: [], error: null };
      const query: Record<string, jest.Mock> = {};
      for (const name of ['select', 'eq', 'order', 'limit', 'lt', 'lte', 'gte', 'maybeSingle', 'update']) query[name] = jest.fn(() => query);
      query.then = jest.fn((resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve));
      builders.push(query);
      return query;
    });
    rpc = jest.fn().mockResolvedValue({ error: null });
    service = new WeightReportsService({ serviceClient: { from, rpc } } as unknown as SupabaseService);
  });
  const entry = (date: string, weight: number) => ({ measured_on: date, weight, recorded_at: `${date}T12:00:00Z` });
  const reportResults = (items: unknown[] = [], latest: unknown[] = [], baseline: unknown[] = []) => {
    results.push({ data: items, error: null }, { data: { weight: 75, target_weight: 70, goal: 'bajar' }, error: null }, { data: latest, error: null });
    if (latest.length) results.push({ data: baseline, error: null });
  };
  it('keeps an empty history without inventing a weekly change', async () => {
    reportResults();
    const report = await service.getReport(user);
    expect(report).toMatchObject({ currentWeight: 75, targetWeight: 70, latest: null, weeklyChange: null, items: [], nextCursor: null });
    for (const query of builders) expect(query.eq).toHaveBeenCalledWith(query === builders[1] ? 'id' : 'user_id', user);
  });
  it('computes a dated weekly comparison and keeps all history queries scoped to the caller', async () => {
    reportResults([entry('2026-10-27', 75)], [entry('2026-10-27', 75)], [entry('2026-10-20', 76.2)]);
    const report = await service.getReport(user);
    expect(report.weeklyChange).toBe(-1.2);
    expect(report.comparisonDate).toBe('2026-10-20');
    expect(builders[3].eq).toHaveBeenCalledWith('user_id', user);
    expect(builders[3].lte).toHaveBeenCalledWith('measured_on', '2026-10-20');
    expect(builders[3].gte).toHaveBeenCalledWith('measured_on', '2026-10-13');
  });
  it('does not label a missing or stale baseline as zero change', async () => {
    reportResults([], [entry('2026-10-27', 75)]);
    expect((await service.getReport(user)).weeklyChange).toBeNull();
  });
  it('paginates without changing the current weight and applies the exclusive cursor', async () => {
    const items = Array.from({ length: 31 }, (_, i) => entry(new Date(Date.UTC(2026, 8, 30 - i)).toISOString().slice(0, 10), 76));
    reportResults(items);
    const report = await service.getReport(user, '2026-10-01');
    expect(report.items).toHaveLength(30);
    expect(report.nextCursor).toBe(items[29].measured_on);
    expect(builders[0].lt).toHaveBeenCalledWith('measured_on', '2026-10-01');
    expect(report.currentWeight).toBe(75);
  });
  it('rejects impossible dates and missing targets before any write', async () => {
    await expect(service.getReport(user, '2026-02-31')).rejects.toThrow(BadRequestException);
    await expect(service.setTarget(user, undefined)).rejects.toThrow(BadRequestException);
    expect(from).not.toHaveBeenCalled();
  });
  it('records only for the caller, calculating calories from existing profile metrics', async () => {
    results.push({ data: { weight: 80, height: 175, age: 30, gender: 'hombre', goal: 'mantener' }, error: null });
    reportResults();
    await service.record(user, { weight: 75, timeZone: 'America/Santiago' });
    expect(rpc).toHaveBeenCalledWith('record_weight', expect.objectContaining({ p_user_id: user, p_weight: 75, p_timezone: 'America/Santiago', p_target_calories: expect.any(Number) }));
  });
  it('does not overwrite the calorie target for profiles without nutrition metrics', async () => {
    results.push({ data: { weight: 80, height: null }, error: null }); reportResults();
    await service.record(user, { weight: 75, timeZone: 'UTC' });
    expect(rpc).toHaveBeenCalledWith('record_weight', expect.objectContaining({ p_target_calories: null }));
  });
  it.each(['subir', 'mantener', 'bajar'])('recalculates from each new weigh-in while keeping the %s goal', async goal => {
    for (const weight of [60, 62]) {
      results.push({ data: { weight: 60, height: 175, age: 30, gender: 'hombre', goal }, error: null });
      reportResults();
      await service.record(user, { weight, timeZone: 'America/Santiago' });
    }
    const first = rpc.mock.calls[0][1];
    const next = rpc.mock.calls[1][1];
    expect(first.p_weight).toBe(60); expect(next.p_weight).toBe(62);
    expect(next.p_target_calories - first.p_target_calories).toBe(31);
  });
  it('rejects invalid timezones before querying', async () => {
    await expect(service.record(user, { weight: 75, timeZone: 'unknown/zone' })).rejects.toThrow(BadRequestException);
    expect(from).not.toHaveBeenCalled();
  });
  it('clears the target only for the caller', async () => {
    results.push({ data: { id: user }, error: null }); reportResults();
    await service.setTarget(user, null);
    expect(builders[0].update).toHaveBeenCalledWith({ target_weight: null });
    expect(builders[0].eq).toHaveBeenCalledWith('id', user);
  });
  it.each([null, '75', 0, 301, 75.123])('rejects invalid weight %s at the API boundary', async weight => {
    const dto = Object.assign(new RecordWeightDto(), { weight, timeZone: 'UTC' });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });
  it('allows clearing a goal but rejects nonnumeric goal values', async () => {
    expect(await validate(Object.assign(new WeightTargetDto(), { targetWeight: null }))).toHaveLength(0);
    expect((await validate(Object.assign(new WeightTargetDto(), { targetWeight: '75' }))).length).toBeGreaterThan(0);
  });
});
