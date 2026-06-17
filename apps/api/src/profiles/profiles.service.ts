import { BadRequestException, Injectable } from '@nestjs/common';
import { calculateTargetCalories, assertManualTargetCalories } from '../domain/profile.calculator';
import { SupabaseRepository } from '../supabase/supabase.repository';
import type { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import type { UpdateProfileMetricsDto } from './dto/update-profile-metrics.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly repository: SupabaseRepository) {}

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    const targetCalories = calculateTargetCalories(dto);
    const profile = await this.repository.updateProfileMetrics(userId, {
      weight: dto.weight,
      height: dto.height,
      goal: dto.goal,
      target_calories: targetCalories,
    });

    return { profile, targetCalories };
  }

  async updateMetrics(userId: string, dto: UpdateProfileMetricsDto) {
    try {
      if (dto.targetCalories !== undefined) assertManualTargetCalories(dto.targetCalories);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Objetivo calorico invalido.');
    }

    const profile = await this.repository.updateProfileMetrics(userId, {
      weight: dto.weight,
      height: dto.height,
      goal: dto.goal,
      target_calories: dto.targetCalories,
    });

    return {
      profile,
      targetCalories: profile.target_calories ?? dto.targetCalories ?? null,
    };
  }

  async rewardMinigameXp(userId: string) {
    const profile = await this.repository.getProfile(userId);
    const currentXp = profile?.xp ?? 0;
    const gainedXp = 50;
    const totalXp = currentXp + gainedXp;
    await this.repository.updateProfileXp(userId, totalXp);
    return { gainedXp, totalXp };
  }
}
