import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { resolveExerciseMuscle } from '../domain/exercise-catalog';
import { generateWorkoutPlan } from '../domain/workout-plan.generator';
import { calculateWorkoutXp } from '../domain/xp.rules';
import { SupabaseRepository } from '../supabase/supabase.repository';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { LogWorkoutSessionDto } from './dto/log-workout-session.dto';

@Injectable()
export class WorkoutsService {
  constructor(private readonly repository: SupabaseRepository) {}

  async logSession(userId: string, dto: LogWorkoutSessionDto) {
    if (dto.sets.length === 0) {
      throw new BadRequestException('Debes registrar al menos una serie completada.');
    }

    const workout = await this.repository.getWorkoutForUser(dto.workoutId, userId);
    if (!workout) {
      throw new NotFoundException('Rutina no encontrada para este usuario.');
    }

    const muscles = dto.sets.map((set) => resolveExerciseMuscle(set.exerciseId));
    const gainedXp = calculateWorkoutXp(muscles);
    const workoutLog = await this.repository.createWorkoutLog(userId, dto.workoutId);

    await this.repository.insertExerciseLogs(
      workoutLog.id,
      dto.sets.map((set) => ({
        exercise_id: set.exerciseId,
        weight: set.weight,
        reps: set.reps,
      })),
    );

    const profile = await this.repository.getProfile(userId);
    const totalXp = (profile?.xp ?? 0) + gainedXp;
    await this.repository.updateProfileXp(userId, totalXp);

    return {
      workoutLogId: workoutLog.id,
      gainedXp,
      totalXp,
    };
  }

  async generatePlan(userId: string, dto: GeneratePlanDto) {
    const plan = generateWorkoutPlan(dto);
    const persistedWorkouts = [];

    for (const workout of plan.workouts) {
      const savedWorkout = await this.repository.createWorkout({
        user_id: userId,
        name: workout.name,
        description: `${plan.routineName} - ${plan.description}`,
        scheduled_day: workout.scheduled_day,
      });

      const exercises = [];
      for (const [order, exercise] of workout.exercises.entries()) {
        exercises.push(await this.repository.addWorkoutExercise({
          workout_id: savedWorkout.id,
          exercise_id: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          order,
        }));
      }

      persistedWorkouts.push({ ...savedWorkout, exercises });
    }

    return {
      routineName: plan.routineName,
      description: plan.description,
      workouts: persistedWorkouts,
    };
  }
}
