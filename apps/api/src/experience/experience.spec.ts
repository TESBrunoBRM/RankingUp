import { ValidationPipe } from '@nestjs/common';
import { ExperienceController } from './experience.controller';
import { ExperienceService } from './experience.service';
import { EXPERIENCE_VERSION, SaveExperienceDto } from './experience.dto';
import { SupabaseService } from '../supabase/supabase.service';

const valid = {
  features: ['training'], safetyVersion: EXPERIENCE_VERSION,
  safetyAcknowledged: true, dataAccuracyAcknowledged: true, guideCompleted: true,
};

describe('experience validation and persistence', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  const validate = (body: unknown) => pipe.transform(body, { type: 'body', metatype: SaveExperienceDto });

  it.each([
    { features: [] }, { features: ['unknown'] }, { features: ['training', 'training'] },
    { features: 'training' }, { safetyVersion: 'old' }, { safetyAcknowledged: false },
    { dataAccuracyAcknowledged: false }, { guideCompleted: false },
    { safetyAcknowledged: 'true' }, { guideCompleted: undefined }, { user_id: 'someone-else' },
  ])('rejects an incomplete, stale or forged confirmation: %j', async override => {
    await expect(validate({ ...valid, ...override })).rejects.toThrow();
  });

  it.each([['training'], ['nutrition'], ['community'], ['training', 'nutrition', 'community']])('allows explicit feature choices: %j', async (...features) => {
    await expect(validate({ ...valid, features })).resolves.toBeInstanceOf(SaveExperienceDto);
  });

  const record = { features: ['training'], safety_version: EXPERIENCE_VERSION, acknowledged_at: '2026-10-23T12:00:00Z', guide_completed_at: '2026-10-23T12:00:00Z' };
  let query: Record<string, jest.Mock>;
  let client: { from: jest.Mock };
  let service: ExperienceService;
  beforeEach(() => {
    query = {
      select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: record, error: null }),
      single: jest.fn().mockResolvedValue({ data: record, error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }), upsert: jest.fn().mockReturnThis(),
    };
    client = { from: jest.fn().mockReturnValue(query) };
    service = new ExperienceService({ serviceClient: client } as unknown as SupabaseService);
  });

  it('reads only the signed-in account and returns no default features for a new account', async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(service.get('signed-in')).resolves.toBeNull();
    expect(query.eq).toHaveBeenCalledWith('user_id', 'signed-in');
  });

  it('does not fail open when persistence is unavailable', async () => {
    const error = new Error('database unavailable');
    query.maybeSingle.mockResolvedValue({ data: null, error });
    await expect(service.get('signed-in')).rejects.toThrow(error);
    query.insert.mockResolvedValue({ error });
    await expect(service.save('signed-in', valid as SaveExperienceDto)).rejects.toThrow(error);
    expect(query.upsert).not.toHaveBeenCalled();
  });

  it('stores choices and a server timestamp and preserves previous receipts', async () => {
    const result = await service.save('signed-in', valid as SaveExperienceDto);
    expect(client.from.mock.calls.map(call => call[0])).toEqual(['experience_acceptances', 'user_experiences']);
    expect(query.insert).toHaveBeenCalledWith({ user_id: 'signed-in', features: ['training'], safety_version: EXPERIENCE_VERSION, acknowledged_at: expect.any(String) });
    expect(query.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'signed-in', features: ['training'], guide_completed_at: expect.any(String) }), { onConflict: 'user_id' });
    expect(result.features).toEqual(['training']);
    expect(result.safetyVersion).toBe(EXPERIENCE_VERSION);
  });

  it('reports a preference save failure rather than claiming completion', async () => {
    query.single.mockResolvedValue({ data: null, error: new Error('write failed') });
    await expect(service.save('signed-in', valid as SaveExperienceDto)).rejects.toThrow('write failed');
  });

  it('takes account identity from authentication for both endpoints', async () => {
    const experience = { get: jest.fn(), save: jest.fn() };
    const controller = new ExperienceController(experience as unknown as ExperienceService);
    const user = { id: 'signed-in', email: null, role: null };
    await controller.get(user);
    await controller.save(user, valid as SaveExperienceDto);
    expect(experience.get).toHaveBeenCalledWith('signed-in');
    expect(experience.save).toHaveBeenCalledWith('signed-in', valid);
  });
});
