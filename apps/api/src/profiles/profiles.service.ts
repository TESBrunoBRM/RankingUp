import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { calculateTargetCalories, assertManualTargetCalories } from '../domain/profile.calculator';
import {
  calculateMinigameXp,
  MINIGAME_DAILY_REWARD_LIMIT,
  MINIGAME_MAX_REPS_PER_SECOND,
  MINIGAME_REQUIRED_REPS,
} from '../domain/minigame.rules';
import { calculateExerciseStrength, type ExerciseStrengthLevel, type StrengthLevelName } from '../domain/strength.calculator';
import type { ProfileRecord } from '../domain/domain.types';
import { SupabaseRepository } from '../supabase/supabase.repository';
import type { CalculateCalorieTargetDto } from './dto/calculate-calorie-target.dto';
import type { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import type { UpdateProfileMetricsDto } from './dto/update-profile-metrics.dto';
import type { UpdateSocialProfileDto } from './dto/update-social-profile.dto';
import type { RewardMinigameDto } from './dto/reward-minigame.dto';

const MINIGAME_NAME = 'push_ups';

class TooManyRequestsException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

const LEVEL_SCORE: Record<StrengthLevelName, number> = {
  'sin-clasificar': 0,
  principiante: 1,
  novato: 2,
  intermedio: 3,
  avanzado: 4,
  elite: 5,
};

const toPublicProfile = (profile: ProfileRecord) => ({
  id: profile.id,
  name: profile.name ?? 'Atleta RankingUp',
  username: profile.username ?? `atleta_${profile.id.slice(0, 8)}`,
  bio: profile.bio ?? '',
  xp: profile.xp ?? 0,
  isPublic: profile.is_public !== false,
  createdAt: profile.created_at ?? null,
});

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
      age: dto.age,
      gender: dto.gender,
    });

    return { profile, targetCalories };
  }

  async updateMetrics(userId: string, dto: UpdateProfileMetricsDto) {
    const storedProfile = await this.repository.getProfile(userId);
    if (!storedProfile) throw new NotFoundException('Perfil no encontrado.');

    const age = dto.age ?? storedProfile.age;
    const gender = dto.gender ?? storedProfile.gender;
    const goal = dto.goal ?? storedProfile.goal;
    let targetCalories = dto.targetCalories;

    try {
      if (age && gender && goal) {
        targetCalories = calculateTargetCalories({ weight: dto.weight, height: dto.height, age, gender, goal });
      } else if (targetCalories !== undefined) {
        assertManualTargetCalories(targetCalories);
      }
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Objetivo calorico invalido.');
    }

    const profile = await this.repository.updateProfileMetrics(userId, {
      weight: dto.weight,
      height: dto.height,
      goal,
      target_calories: targetCalories,
      age: age ?? undefined,
      gender: gender ?? undefined,
    });

    return {
      profile,
      targetCalories: profile.target_calories ?? targetCalories ?? null,
    };
  }

  calculateCalorieTarget(dto: CalculateCalorieTargetDto) {
    return { targetCalories: calculateTargetCalories(dto) };
  }

  async getOwnProfile(userId: string) {
    return this.buildProfileResponse(userId, userId, true);
  }

  async updateSocialProfile(userId: string, dto: UpdateSocialProfileDto) {
    const normalizedUsername = dto.username.trim().toLowerCase();
    const existing = await this.repository.findProfileByUsername(normalizedUsername);
    if (existing && existing.id !== userId) throw new ConflictException('Ese nombre de usuario ya esta ocupado.');

    await this.repository.updateSocialProfile(userId, {
      name: dto.name.trim(),
      username: normalizedUsername,
      bio: dto.bio?.trim() ?? '',
      is_public: dto.isPublic ?? true,
    });
    return this.getOwnProfile(userId);
  }

  async searchProfiles(userId: string, rawQuery: string) {
    const query = rawQuery.trim().replace(/[%_,().]/g, '');
    if (query.length < 2) throw new BadRequestException('Escribe al menos 2 caracteres.');
    const [profiles, followingIds] = await Promise.all([
      this.repository.searchProfiles(query, userId),
      this.repository.getFollowingIds(userId),
    ]);
    const following = new Set(followingIds);
    return profiles.map((profile) => ({ ...toPublicProfile(profile), isFollowing: following.has(profile.id) }));
  }

  async getPublicProfile(userId: string, profileId: string) {
    return this.buildProfileResponse(userId, profileId, userId === profileId);
  }

  async followProfile(userId: string, profileId: string) {
    if (userId === profileId) throw new BadRequestException('No puedes seguir tu propio perfil.');
    await this.assertVisibleProfile(profileId);
    await this.repository.followProfile(userId, profileId);
    return { following: true };
  }

  async unfollowProfile(userId: string, profileId: string) {
    await this.repository.unfollowProfile(userId, profileId);
    return { following: false };
  }

  async compareProfiles(userId: string, profileId: string) {
    const [viewer, other] = await Promise.all([
      this.getStrengthProfile(userId),
      this.getStrengthProfile(profileId),
    ]);
    if (!other.profile || other.profile.is_public === false) throw new ForbiddenException('Este perfil no esta disponible.');

    const viewerMap = new Map(viewer.strengths.map((strength) => [strength.exerciseName, strength]));
    const otherMap = new Map(other.strengths.map((strength) => [strength.exerciseName, strength]));
    const names = Array.from(new Set([...viewerMap.keys(), ...otherMap.keys()]));

    return {
      viewer: toPublicProfile(viewer.profile),
      other: toPublicProfile(other.profile),
      exercises: names.map((exerciseName) => {
        const userStrength = viewerMap.get(exerciseName) ?? null;
        const otherStrength = otherMap.get(exerciseName) ?? null;
        const userScore = userStrength ? LEVEL_SCORE[userStrength.level] : 0;
        const otherScore = otherStrength ? LEVEL_SCORE[otherStrength.level] : 0;
        const winner = userScore === otherScore
          ? 'tie'
          : userScore > otherScore ? 'viewer' : 'other';
        return { exerciseName, viewer: userStrength, other: otherStrength, winner };
      }),
    };
  }

  private async assertVisibleProfile(profileId: string): Promise<ProfileRecord> {
    const profile = await this.repository.getProfile(profileId);
    if (!profile) throw new NotFoundException('Perfil no encontrado.');
    if (profile.is_public === false) throw new ForbiddenException('Este perfil es privado.');
    return profile;
  }

  private async getStrengthProfile(profileId: string): Promise<{ profile: ProfileRecord; strengths: ExerciseStrengthLevel[] }> {
    const [profile, history] = await Promise.all([
      this.repository.getProfile(profileId),
      this.repository.getExerciseHistory(profileId),
    ]);
    if (!profile) throw new NotFoundException('Perfil no encontrado.');
    return {
      profile,
      strengths: calculateExerciseStrength(history, profile.weight, profile.gender ?? null),
    };
  }

  private async buildProfileResponse(viewerId: string, profileId: string, includePrivate: boolean) {
    const [strengthProfile, counts, workoutCount, isFollowing] = await Promise.all([
      this.getStrengthProfile(profileId),
      this.repository.getFollowCounts(profileId),
      this.repository.getWorkoutCount(profileId),
      viewerId === profileId ? Promise.resolve(false) : this.repository.isFollowing(viewerId, profileId),
    ]);
    const { profile, strengths } = strengthProfile;
    if (!includePrivate && profile.is_public === false) throw new ForbiddenException('Este perfil es privado.');

    return {
      profile: {
        ...toPublicProfile(profile),
        ...(includePrivate ? {
          weight: profile.weight,
          height: profile.height,
          age: profile.age ?? null,
          gender: profile.gender ?? null,
          goal: profile.goal ?? null,
          targetCalories: profile.target_calories ?? null,
        } : {}),
      },
      stats: { ...counts, workouts: workoutCount },
      strengths,
      isFollowing,
      isOwnProfile: viewerId === profileId,
    };
  }

  async rewardMinigameXp(userId: string, dto: RewardMinigameDto) {
    const { reps, durationSeconds } = dto;
    const outcome = dto.outcome ?? 'completed';

    if (!Number.isInteger(reps) || reps < 1 || reps > MINIGAME_REQUIRED_REPS) {
      throw new BadRequestException('Cantidad de flexiones invalida.');
    }
    if (outcome === 'completed' && reps !== MINIGAME_REQUIRED_REPS) {
      throw new BadRequestException(`Debes completar ${MINIGAME_REQUIRED_REPS} flexiones para declarar victoria.`);
    }
    if (outcome === 'retired' && reps >= MINIGAME_REQUIRED_REPS) {
      throw new BadRequestException('Una partida de 100 flexiones se registra como completada.');
    }
    if (outcome === 'retired' && durationSeconds === undefined) {
      throw new BadRequestException('La duracion es obligatoria al retirarte.');
    }
    if (durationSeconds !== undefined && (!Number.isInteger(durationSeconds)
      || durationSeconds < 3 || durationSeconds > 3600
      || reps / durationSeconds > MINIGAME_MAX_REPS_PER_SECOND)) {
      throw new BadRequestException('El ritmo reportado no es posible.');
    }

    const gainedXp = calculateMinigameXp(reps);

    if (gainedXp === 0) {
      await this.repository.insertMinigameSession({ user_id: userId, game: MINIGAME_NAME, reps, xp_awarded: 0 });
      const [profile, rewardsToday] = await Promise.all([
        this.repository.getProfile(userId),
        this.repository.countRewardedMinigameSessionsSince(
          userId,
          new Date(Date.now() - 24 * 60 * 60 * 1000),
          MINIGAME_NAME,
        ),
      ]);
      if (!profile) throw new NotFoundException('Perfil no encontrado.');
      return {
        gainedXp: 0,
        totalXp: profile.xp ?? 0,
        remainingRewardsToday: Math.max(0, MINIGAME_DAILY_REWARD_LIMIT - rewardsToday),
      };
    }

    // El cliente puede repetir la peticion en bucle, y hacerlo en paralelo.
    // Contar aqui y escribir despues dejaba una ventana por la que N peticiones
    // concurrentes pasaban todas el tope: ahora contar, registrar la sesion y
    // sumar el XP ocurren en una sola transaccion dentro de la BD.
    const { granted, totalXp, rewardsToday } = await this.repository.awardMinigameXp({
      userId,
      game: MINIGAME_NAME,
      reps,
      xp: gainedXp,
      dailyLimit: MINIGAME_DAILY_REWARD_LIMIT,
    });

    if (!granted) {
      throw new TooManyRequestsException(
        `Ya alcanzaste el maximo de ${MINIGAME_DAILY_REWARD_LIMIT} recompensas de minijuego en 24 horas.`
      );
    }

    return {
      gainedXp,
      totalXp,
      remainingRewardsToday: Math.max(0, MINIGAME_DAILY_REWARD_LIMIT - rewardsToday),
    };
  }
}
