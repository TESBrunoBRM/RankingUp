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

    // exercise_id guarda el nombre del ejercicio. Los 14 destacados se resuelven
    // en memoria; el resto viene del catalogo en base de datos.
    const unresolved = dto.sets
      .filter((set) => resolveExerciseMuscle(set.exerciseId) === 'default')
      .map((set) => set.exerciseId);
    const catalogMuscles = await this.repository.getExerciseTargetsByNames([...new Set(unresolved)]);

    const muscles = dto.sets.map((set) => {
      const legacyMuscle = resolveExerciseMuscle(set.exerciseId);
      if (legacyMuscle !== 'default') return legacyMuscle;
      return catalogMuscles.get(set.exerciseId.toLowerCase()) ?? 'default';
    });
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

    // Incremento atomico en la BD: dos sesiones concurrentes suman las dos.
    const totalXp = await this.repository.incrementProfileXp(userId, gainedXp);

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
