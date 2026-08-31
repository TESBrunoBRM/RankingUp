import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SupabaseRepository } from '../supabase/supabase.repository';
import { WorkoutsService } from './workouts.service';

const repositoryMock = {
  getExerciseTargetsByNames: jest.fn().mockResolvedValue(new Map()),
  getWorkoutForUser: jest.fn(),
  createWorkoutLog: jest.fn(),
  insertExerciseLogs: jest.fn(),
  getProfile: jest.fn(),
  updateProfileXp: jest.fn(),
  createWorkout: jest.fn(),
  addWorkoutExercise: jest.fn(),
};

describe('WorkoutsService', () => {
  let service: WorkoutsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WorkoutsService,
        { provide: SupabaseRepository, useValue: repositoryMock },
      ],
    }).compile();

    service = module.get(WorkoutsService);
    jest.clearAllMocks();
  });

  it('rejects empty set payload', async () => {
    await expect(service.logSession('u1', { workoutId: 'w1', sets: [] })).rejects.toThrow(BadRequestException);
  });

  it('rejects workout from another user', async () => {
    repositoryMock.getWorkoutForUser.mockResolvedValue(null);

    await expect(service.logSession('u1', {
      workoutId: 'w1',
      sets: [{ exerciseId: 'Press de Banca', weight: 80, reps: 10 }],
    })).rejects.toThrow(NotFoundException);
  });

  it('inserts logs and updates XP once', async () => {
    repositoryMock.getWorkoutForUser.mockResolvedValue({ id: 'w1', user_id: 'u1', name: 'Push' });
    repositoryMock.createWorkoutLog.mockResolvedValue({ id: 'wl1' });
    repositoryMock.getProfile.mockResolvedValue({ id: 'u1', xp: 100, weight: 80, height: 180 });

    const result = await service.logSession('u1', {
      workoutId: 'w1',
      sets: [
        { exerciseId: 'Press de Banca', weight: 80, reps: 10 },
        { exerciseId: 'Curl de Biceps', weight: 15, reps: 12 },
      ],
    });

    expect(repositoryMock.insertExerciseLogs).toHaveBeenCalledWith('wl1', [
      { exercise_id: 'Press de Banca', weight: 80, reps: 10 },
      { exercise_id: 'Curl de Biceps', weight: 15, reps: 12 },
    ]);
    expect(repositoryMock.updateProfileXp).toHaveBeenCalledTimes(1);
    expect(repositoryMock.updateProfileXp).toHaveBeenCalledWith('u1', 125);
    expect(result).toEqual({ workoutLogId: 'wl1', gainedXp: 25, totalXp: 125 });
  });
});
