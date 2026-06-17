import { Injectable } from '@nestjs/common';
import { SupabaseRepository } from '../supabase/supabase.repository';

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
      requiresOnboarding: Boolean(profile && (!profile.weight || !profile.height || !profile.goal || !profile.target_calories)),
    };
  }
}
