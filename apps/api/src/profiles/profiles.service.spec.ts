import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseRepository } from '../supabase/supabase.repository';
import { ProfilesService } from './profiles.service';

describe('ProfilesService', () => {
  const repositoryMock = {
    updateProfileMetrics: jest.fn(),
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
    });
    expect(result.targetCalories).toBe(2672);
  });

  it('updates manual metrics when target calories are valid', async () => {
    repositoryMock.updateProfileMetrics.mockResolvedValue({
      id: 'u1',
      weight: 80,
      height: 180,
      goal: 'subir',
      target_calories: 3000,
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
    });
    expect(result.targetCalories).toBe(3000);
  });

  it('rejects unsafe manual calorie targets', async () => {
    await expect(service.updateMetrics('u1', {
      weight: 80,
      height: 180,
      goal: 'subir',
      targetCalories: 799,
    })).rejects.toThrow(BadRequestException);
    expect(repositoryMock.updateProfileMetrics).not.toHaveBeenCalled();
  });
});
