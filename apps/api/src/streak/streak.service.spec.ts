import { BadRequestException } from '@nestjs/common';
import { StreakService } from './streak.service';
import { SupabaseRepository } from '../supabase/supabase.repository';

describe('StreakService', () => {
  const repository = {
    recordActivityDay: jest.fn(),
    updateStreakTimezone: jest.fn(),
    getProfile: jest.fn(),
    getActivityDays: jest.fn(),
  };
  const service = new StreakService(repository as unknown as SupabaseRepository);

  beforeEach(() => jest.clearAllMocks());

  it('sends only the server-derived date to the atomic RPC', async () => {
    repository.recordActivityDay.mockResolvedValue({ current_streak: 2, longest_streak: 4, is_new_day: true });
    const result = await service.checkIn('u1', 'America/Santiago');
    expect(result).toEqual({ currentStreak: 2, longestStreak: 4, isNewDay: true });
    expect(repository.recordActivityDay).toHaveBeenCalledWith('u1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    expect(repository.updateStreakTimezone).toHaveBeenCalledWith('u1', 'America/Santiago');
  });

  it('does not call the repository for an invalid timezone', async () => {
    await expect(service.checkIn('u1', 'Fake/Zone')).rejects.toThrow(BadRequestException);
    expect(repository.recordActivityDay).not.toHaveBeenCalled();
  });

  it('handles two simultaneous requests through the same RPC contract', async () => {
    repository.recordActivityDay
      .mockResolvedValueOnce({ current_streak: 3, longest_streak: 3, is_new_day: true })
      .mockResolvedValueOnce({ current_streak: 3, longest_streak: 3, is_new_day: false });
    const results = await Promise.all([
      service.checkIn('u1', 'America/Santiago'),
      service.checkIn('u1', 'America/Santiago'),
    ]);
    expect(results.map((result) => result.currentStreak)).toEqual([3, 3]);
    expect(results.filter((result) => result.isNewDay)).toHaveLength(1);
  });
});
