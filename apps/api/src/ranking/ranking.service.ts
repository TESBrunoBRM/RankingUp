import { Injectable } from '@nestjs/common';
import { calculateMuscleData, calculateRankProgress } from '../domain/ranking.calculator';
import { SupabaseRepository } from '../supabase/supabase.repository';

@Injectable()
export class RankingService {
  constructor(private readonly repository: SupabaseRepository) {}

  async getRanking(userId: string) {
    const [profile, ranks, leaderboard, history] = await Promise.all([
      this.repository.getProfile(userId),
      this.repository.getRanks(),
      this.repository.getLeaderboard(),
      this.repository.getExerciseHistory(userId),
    ]);
    const xp = profile?.xp ?? 0;

    return {
      profile,
      xp,
      ranks,
      leaderboard,
      history,
      muscleData: calculateMuscleData(profile, ranks, history),
      progress: calculateRankProgress(xp, ranks),
    };
  }
}
