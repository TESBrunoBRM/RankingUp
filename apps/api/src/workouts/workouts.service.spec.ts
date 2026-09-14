import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SupabaseRepository } from '../supabase/supabase.repository';
import { WorkoutsService } from './workouts.service';

const repositoryMock = {
  getExerciseTargetsByNames: jest.fn().mockResolvedValue(new Map()),
  getWorkoutForUser: jest.fn(),
  getLastExercisePerformance: jest.fn(),
  getRecentExerciseSessions: jest.fn(),
  completeWorkoutSession: jest.fn(),
  getWorkoutSessionPreview: jest.fn(),
  getWorkoutHistory: jest.fn(),
  getWorkoutHistoryDetail: jest.fn(),
  getExerciseProgress: jest.fn(),
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
    repositoryMock.getWorkoutSessionPreview.mockResolvedValue([
      { exercise_id: 'Press de Banca' }, { exercise_id: 'Curl de Biceps' },
    ]);
    repositoryMock.getRecentExerciseSessions.mockResolvedValue([]);
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

  it('persists logs and XP in one transaction', async () => {
    repositoryMock.getWorkoutForUser.mockResolvedValue({ id: 'w1', user_id: 'u1', name: 'Push' });
    repositoryMock.getLastExercisePerformance.mockResolvedValue([]);
    repositoryMock.completeWorkoutSession.mockResolvedValue({ workoutLogId: 'wl1', totalXp: 125 });

    const result = await service.logSession('u1', {
      workoutId: 'w1',
      sets: [
        { exerciseId: 'Press de Banca', weight: 80, reps: 10 },
        { exerciseId: 'Curl de Biceps', weight: 15, reps: 12 },
      ],
    });

    expect(repositoryMock.completeWorkoutSession).toHaveBeenCalledTimes(1);
    expect(repositoryMock.completeWorkoutSession).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'u1', workoutId: 'w1', xp: 25, totalVolume: 980,
      sets: [
        { exercise_id: 'Press de Banca', weight: 80, reps: 10, set_index: 1, kind: 'normal', is_pr: false },
        { exercise_id: 'Curl de Biceps', weight: 15, reps: 12, set_index: 1, kind: 'normal', is_pr: false },
      ],
    }));
    expect(result).toEqual({ workoutLogId: 'wl1', gainedXp: 25, totalXp: 125,
      durationSeconds: 0, totalVolume: 980, setsCompleted: 2, personalRecords: [] });
  });

  it('rejects an exercise not scheduled in the workout', async () => {
    repositoryMock.getWorkoutForUser.mockResolvedValue({ id: 'w1', user_id: 'u1', name: 'Push' });
    await expect(service.logSession('u1', { workoutId: 'w1', sets: [
      { exerciseId: 'Sentadilla Libre', weight: 100, reps: 10 },
    ] })).rejects.toThrow(BadRequestException);
    expect(repositoryMock.completeWorkoutSession).not.toHaveBeenCalled();
  });

  it('excludes warmup from XP and volume', async () => {
    repositoryMock.getWorkoutForUser.mockResolvedValue({ id: 'w1', user_id: 'u1', name: 'Push' });
    repositoryMock.getLastExercisePerformance.mockResolvedValue([]);
    repositoryMock.completeWorkoutSession.mockResolvedValue({ workoutLogId: 'wl1', totalXp: 110 });
    await service.logSession('u1', { workoutId: 'w1', sets: [
      { exerciseId: 'Press de Banca', weight: 40, reps: 10, kind: 'warmup' },
      { exerciseId: 'Curl de Biceps', weight: 20, reps: 10 },
    ] });
    expect(repositoryMock.completeWorkoutSession).toHaveBeenCalledWith(expect.objectContaining({ xp: 10, totalVolume: 200 }));
  });

  it('rejects a start time in the future', async () => {
    repositoryMock.getWorkoutForUser.mockResolvedValue({ id: 'w1', user_id: 'u1', name: 'Push' });
    await expect(service.logSession('u1', { workoutId: 'w1', sets: [
      { exerciseId: 'Press de Banca', weight: 80, reps: 10 },
    ], startedAt: new Date(Date.now() + 180_000).toISOString() })).rejects.toThrow(BadRequestException);
    expect(repositoryMock.completeWorkoutSession).not.toHaveBeenCalled();
  });

  it('includes a deload suggestion after two missed sessions', async () => {
    repositoryMock.getWorkoutForUser.mockResolvedValue({ id: 'w1', user_id: 'u1', name: 'Push' });
    repositoryMock.getWorkoutSessionPreview.mockResolvedValue([
      { id: 'we1', exercise_id: 'Press de Banca', sets: 2, reps: 8, rest_seconds: 90 },
    ]);
    const latestSets = [{ setIndex: 1, weight: 80, reps: 8 }, { setIndex: 2, weight: 80, reps: 6 }];
    repositoryMock.getLastExercisePerformance.mockResolvedValue([
      { exercise_id: 'Press de Banca', sets: latestSets, best_weight: 80, best_reps: 8, best_one_rm: 90 },
    ]);
    repositoryMock.getRecentExerciseSessions.mockResolvedValue([
      { exercise_id: 'Press de Banca', sets: latestSets },
      { exercise_id: 'Press de Banca', sets: [{ setIndex: 1, weight: 80, reps: 7 }, { setIndex: 2, weight: 80, reps: 8 }] },
    ]);
    const preview = await service.getSessionPreview('u1', 'w1');
    expect(preview.exercises[0].suggestion).toEqual(expect.objectContaining({ weight: 72.5, reps: 8 }));
  });
});
