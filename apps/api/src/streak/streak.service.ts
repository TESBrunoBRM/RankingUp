import { Injectable, NotFoundException } from '@nestjs/common';
import { getLocalDate, getRecentDates, getVisibleStreak } from '../domain/streak.rules';
import { SupabaseRepository } from '../supabase/supabase.repository';

@Injectable()
export class StreakService {
  constructor(private readonly repository: SupabaseRepository) {}

  async checkIn(userId: string, timeZone: string) {
    const localDate = getLocalDate(timeZone);
    const result = await this.repository.recordActivityDay(userId, localDate);
    await this.repository.updateStreakTimezone(userId, timeZone);
    return {
      currentStreak: result.current_streak,
      longestStreak: result.longest_streak,
      isNewDay: result.is_new_day,
    };
  }

  async getStreak(userId: string, timeZone: string) {
    const today = getLocalDate(timeZone);
    const dates = getRecentDates(today);
    const [profile, activeDates] = await Promise.all([
      this.repository.getProfile(userId),
      this.repository.getActivityDays(userId, dates[0]),
    ]);
    if (!profile) throw new NotFoundException('Perfil no encontrado.');
    const active = new Set(activeDates);
    return {
      current: getVisibleStreak(profile.current_streak, profile.last_activity_date, today),
      longest: profile.longest_streak ?? 0,
      lastActivityDate: profile.last_activity_date ?? null,
      days: dates.map((date) => ({ date, active: active.has(date) })),
    };
  }
}
