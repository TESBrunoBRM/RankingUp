import { Injectable } from '@nestjs/common';
import { SupabaseRepository } from '../supabase/supabase.repository';
import { getLocalDate, getVisibleStreak } from '../domain/streak.rules';

@Injectable()
export class DashboardService {
  constructor(private readonly repository: SupabaseRepository) {}

  async getDashboard(userId: string) {
    const [profile, workouts] = await Promise.all([
      this.repository.getProfile(userId),
      this.repository.getWorkouts(userId),
    ]);

    return {
      profile,
      workouts,
      streak: {
        current: getVisibleStreak(
          profile?.current_streak,
          profile?.last_activity_date,
          getLocalDate(profile?.streak_timezone || 'Etc/UTC'),
        ),
        longest: profile?.longest_streak ?? 0,
        lastActivityDate: profile?.last_activity_date ?? null,
      },
      requiresOnboarding: Boolean(profile && (!profile.weight || !profile.height || !profile.goal || !profile.target_calories)),
    };
  }
}
