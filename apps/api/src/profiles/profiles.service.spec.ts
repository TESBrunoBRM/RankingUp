import { BadRequestException, ConflictException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseRepository } from '../supabase/supabase.repository';
import { ProfilesService } from './profiles.service';

describe('ProfilesService', () => {
  const repositoryMock = {
    updateProfileMetrics: jest.fn(),
    getProfile: jest.fn(),
    awardMinigameXp: jest.fn(),
    findProfileByUsername: jest.fn(),
    updateSocialProfile: jest.fn(),
    getExerciseHistory: jest.fn(),
    getFollowCounts: jest.fn(),
    getWorkoutCount: jest.fn(),
    isFollowing: jest.fn(),
    searchProfiles: jest.fn(),
    getFollowingIds: jest.fn(),
    followProfile: jest.fn(),
    unfollowProfile: jest.fn(),
    countMinigameSessionsSince: jest.fn(),
    countRewardedMinigameSessionsSince: jest.fn(),
    insertMinigameSession: jest.fn(),
  };
  let service: ProfilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        { provide: SupabaseRepository, useValue: repositoryMock },
      ],
    }).compile();

    service = module.get(ProfilesService);
    jest.clearAllMocks();
  });

  it('calculates target calories and stores onboarding metrics', async () => {
    repositoryMock.updateProfileMetrics.mockResolvedValue({
      id: 'u1',
      weight: 75,
      height: 175,
      goal: 'mantener',
      target_calories: 2672,
      age: 25,
      gender: 'hombre',
      xp: 0,
    });

    const result = await service.completeOnboarding('u1', {
      weight: 75,
      height: 175,
      age: 25,
      gender: 'hombre',
      goal: 'mantener',
    });

    expect(repositoryMock.updateProfileMetrics).toHaveBeenCalledWith('u1', {
      weight: 75,
      height: 175,
      goal: 'mantener',
      target_calories: 2672,
      age: 25,
      gender: 'hombre',
    });
    expect(result.targetCalories).toBe(2672);
  });

  it('updates manual metrics when target calories are valid', async () => {
    repositoryMock.getProfile.mockResolvedValue({ id: 'u1', xp: 0, weight: 80, height: 180 });
    repositoryMock.updateProfileMetrics.mockResolvedValue({
      id: 'u1',
      weight: 80,
      height: 180,
      goal: 'subir',
      target_calories: 3000,
      age: undefined,
      gender: undefined,
      xp: 0,
    });

    const result = await service.updateMetrics('u1', {
      weight: 80,
      height: 180,
      goal: 'subir',
      targetCalories: 3000,
    });

    expect(repositoryMock.updateProfileMetrics).toHaveBeenCalledWith('u1', {
      weight: 80,
      height: 180,
      goal: 'subir',
      target_calories: 3000,
      age: undefined,
      gender: undefined,
    });
    expect(result.targetCalories).toBe(3000);
  });

  it('rejects unsafe manual calorie targets', async () => {
    repositoryMock.getProfile.mockResolvedValue({ id: 'u1', xp: 0, weight: 80, height: 180 });
    await expect(service.updateMetrics('u1', {
      weight: 80,
      height: 180,
      goal: 'subir',
      targetCalories: 799,
    })).rejects.toThrow(BadRequestException);
    expect(repositoryMock.updateProfileMetrics).not.toHaveBeenCalled();
  });

  it('recalculates calories when the goal changes and stored demographic data exists', async () => {
    repositoryMock.getProfile.mockResolvedValue({
      id: 'u1', xp: 0, weight: 80, height: 180, age: 30, gender: 'hombre', goal: 'mantener',
    });
    repositoryMock.updateProfileMetrics.mockImplementation(async (_id, input) => ({ id: 'u1', xp: 0, ...input }));

    const result = await service.updateMetrics('u1', { weight: 80, height: 180, goal: 'bajar' });

    expect(repositoryMock.updateProfileMetrics).toHaveBeenCalledWith('u1', expect.objectContaining({
      goal: 'bajar',
      age: 30,
      gender: 'hombre',
      target_calories: 2259,
    }));
    expect(result.targetCalories).toBe(2259);
  });

  it('calculates calorie previews for each goal without writing the profile', () => {
    const base = { weight: 75, height: 175, age: 25, gender: 'hombre' as const };
    expect(service.calculateCalorieTarget({ ...base, goal: 'bajar' }).targetCalories).toBe(2172);
    expect(service.calculateCalorieTarget({ ...base, goal: 'mantener' }).targetCalories).toBe(2672);
    expect(service.calculateCalorieTarget({ ...base, goal: 'subir' }).targetCalories).toBe(3172);
  });

  it('rejects duplicate usernames owned by another profile', async () => {
    repositoryMock.findProfileByUsername.mockResolvedValue({ id: 'u2', username: 'bruno', xp: 0 });

    await expect(service.updateSocialProfile('u1', {
      name: 'Bruno', username: 'bruno', bio: '', isPublic: true,
    })).rejects.toThrow(ConflictException);
    expect(repositoryMock.updateSocialProfile).not.toHaveBeenCalled();
  });

  it('compares exercise levels relative to each athlete bodyweight', async () => {
    repositoryMock.getProfile.mockImplementation(async (id: string) => id === 'u1'
      ? { id: 'u1', name: 'Uno', username: 'uno', xp: 0, weight: 80, height: 180, gender: 'hombre', is_public: true }
      : { id: 'u2', name: 'Dos', username: 'dos', xp: 0, weight: 60, height: 165, gender: 'mujer', is_public: true });
    repositoryMock.getExerciseHistory.mockImplementation(async (id: string) => id === 'u1'
      ? [{ exercise_id: 'Press de Banca', weight: 80, reps: 5 }]
      : [{ exercise_id: 'Press de Banca', weight: 50, reps: 5 }]);

    const comparison = await service.compareProfiles('u1', 'u2');

    expect(comparison.exercises[0]).toMatchObject({
      exerciseName: 'Press de Banca',
      winner: 'other',
      viewer: { level: 'novato' },
      other: { level: 'intermedio' },
    });
  });

  it('rejects following the current profile', async () => {
    await expect(service.followProfile('u1', 'u1')).rejects.toThrow(BadRequestException);
  });

  it('keeps the legacy 100-rep payload compatible', async () => {
    repositoryMock.awardMinigameXp.mockResolvedValue({
      granted: true,
      totalXp: 170,
      rewardsToday: 1,
    });

    await expect(service.rewardMinigameXp('u1', { reps: 99 })).rejects.toThrow(BadRequestException);
    // Un intento invalido no debe llegar siquiera a la transaccion.
    expect(repositoryMock.awardMinigameXp).not.toHaveBeenCalled();

    await expect(service.rewardMinigameXp('u1', { reps: 100 })).resolves.toEqual({
      gainedXp: 50,
      totalXp: 170,
      remainingRewardsToday: 4,
    });
    expect(repositoryMock.awardMinigameXp).toHaveBeenCalledTimes(1);
    expect(repositoryMock.awardMinigameXp).toHaveBeenCalledWith({
      userId: 'u1',
      game: 'push_ups',
      reps: 100,
      xp: 50,
      dailyLimit: 5,
    });
  });

  it('blocks XP farming once the daily minigame limit is reached', async () => {
    // V-02: el tope ya no se comprueba con un count() previo (evadible con
    // peticiones en paralelo), sino dentro de la misma transaccion que escribe.
    repositoryMock.awardMinigameXp.mockResolvedValue({
      granted: false,
      totalXp: 120,
      rewardsToday: 5,
    });

    await expect(service.rewardMinigameXp('u1', { reps: 100 })).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('awards proportional XP when retiring and consumes one daily reward', async () => {
    repositoryMock.awardMinigameXp.mockResolvedValue({ granted: true, totalXp: 120, rewardsToday: 2 });

    await expect(service.rewardMinigameXp('u1', {
      reps: 25, durationSeconds: 60, outcome: 'retired',
    })).resolves.toEqual({ gainedXp: 10, totalXp: 120, remainingRewardsToday: 3 });
    expect(repositoryMock.awardMinigameXp).toHaveBeenCalledWith({
      userId: 'u1', game: 'push_ups', reps: 25, xp: 10, dailyLimit: 5,
    });
  });

  it('records a sub-threshold retirement without consuming a daily reward', async () => {
    repositoryMock.getProfile.mockResolvedValue({ id: 'u1', xp: 87 });
    repositoryMock.countRewardedMinigameSessionsSince.mockResolvedValue(5);

    await expect(service.rewardMinigameXp('u1', {
      reps: 9, durationSeconds: 30, outcome: 'retired',
    })).resolves.toEqual({ gainedXp: 0, totalXp: 87, remainingRewardsToday: 0 });
    expect(repositoryMock.insertMinigameSession).toHaveBeenCalledWith({
      user_id: 'u1', game: 'push_ups', reps: 9, xp_awarded: 0,
    });
    expect(repositoryMock.awardMinigameXp).not.toHaveBeenCalled();
  });

  it('rejects impossible pace before awarding XP', async () => {
    await expect(service.rewardMinigameXp('u1', {
      reps: 50, durationSeconds: 3, outcome: 'retired',
    })).rejects.toThrow(BadRequestException);
    expect(repositoryMock.awardMinigameXp).not.toHaveBeenCalled();
  });

  it('rejects contradictory outcomes', async () => {
    await expect(service.rewardMinigameXp('u1', {
      reps: 100, durationSeconds: 90, outcome: 'retired',
    })).rejects.toThrow(BadRequestException);
    await expect(service.rewardMinigameXp('u1', {
      reps: 25, durationSeconds: 90, outcome: 'completed',
    })).rejects.toThrow(BadRequestException);
  });
});
