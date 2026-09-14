import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { resolveExerciseMuscle } from '../domain/exercise-catalog';
import { generateWorkoutPlan } from '../domain/workout-plan.generator';
import { estimateOneRepMax } from '../domain/strength.calculator';
import { suggestProgression } from '../domain/progression.rules';
import { calculateSessionXp, calculateVolume, countsForProgress, detectPersonalRecords } from '../domain/session.rules';
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
    const plannedExercises = await this.repository.getWorkoutSessionPreview(dto.workoutId);
    const allowedNames = new Set(plannedExercises.map((exercise) => exercise.exercise_id));
    if (dto.sets.some((set) => !allowedNames.has(set.exerciseId))) {
      throw new BadRequestException('La serie incluye un ejercicio ajeno a esta rutina.');
    }

    const now = Date.now();
    const startedAt = dto.startedAt ? new Date(dto.startedAt).getTime() : now;
    if (!Number.isFinite(startedAt) || startedAt > now + 60_000 || startedAt < now - 86_400_000) {
      throw new BadRequestException('Hora de inicio no valida.');
    }
    const durationSeconds = dto.durationSeconds ?? Math.floor((now - startedAt) / 1000);
    if (Math.abs(durationSeconds - (now - startedAt) / 1000) > 120 && dto.startedAt) {
      throw new BadRequestException('La duracion no coincide con la hora de inicio.');
    }

    const previous = await this.repository.getLastExercisePerformance(userId, [...new Set(dto.sets.map((set) => set.exerciseId))]);
    const previousBests = new Map(previous.map((row) => [row.exercise_id, Number(row.best_one_rm)]));
    const personalRecords = detectPersonalRecords(dto.sets, previousBests);
    const recordValues = new Map(personalRecords.map((record) => [record.exerciseId, record.current]));

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
    const gainedXp = calculateSessionXp(dto.sets, muscles, personalRecords);
    const totalVolume = calculateVolume(dto.sets);
    const setCounts = new Map<string, number>();
    const persisted = await this.repository.completeWorkoutSession({
      userId, workoutId: dto.workoutId, startedAt: new Date(startedAt).toISOString(),
      durationSeconds, name: dto.name?.trim() || workout.name,
      totalVolume, xp: gainedXp, clientSessionId: dto.clientSessionId,
      sets: dto.sets.map((set) => {
        const nextIndex = (setCounts.get(set.exerciseId) ?? 0) + 1;
        setCounts.set(set.exerciseId, nextIndex);
        return {
          exercise_id: set.exerciseId,
          weight: set.weight,
          reps: set.reps,
          set_index: set.setIndex ?? nextIndex,
          kind: set.kind ?? 'normal',
          is_pr: countsForProgress(set.kind) && recordValues.get(set.exerciseId) === estimateOneRepMax(set.weight, set.reps),
        };
      }),
    });

    return {
      workoutLogId: persisted.workoutLogId,
      gainedXp,
      totalXp: persisted.totalXp,
      durationSeconds,
      totalVolume,
      setsCompleted: dto.sets.length,
      personalRecords,
    };
  }

  async getSessionPreview(userId: string, workoutId: string) {
    const workout = await this.repository.getWorkoutForUser(workoutId, userId);
    if (!workout) throw new NotFoundException('Rutina no encontrada para este usuario.');
    const exercises = await this.repository.getWorkoutSessionPreview(workoutId);
    const names = exercises.map((exercise) => exercise.exercise_id);
    const [performances, recentSessions, catalogMuscles] = await Promise.all([
      this.repository.getLastExercisePerformance(userId, names),
      this.repository.getRecentExerciseSessions(userId, names),
      this.repository.getExerciseTargetsByNames(names),
    ]);
    const previous = new Map(performances.map((item) => [item.exercise_id, item]));
    const sessionsByExercise = new Map<string, typeof recentSessions>();
    for (const session of recentSessions) {
      const sessions = sessionsByExercise.get(session.exercise_id) ?? [];
      sessions.push(session);
      sessionsByExercise.set(session.exercise_id, sessions);
    }
    return {
      workout,
      exercises: exercises.map((exercise) => {
        const lastPerformance = previous.get(exercise.exercise_id) ?? null;
        const recent = sessionsByExercise.get(exercise.exercise_id) ?? [];
        const muscle = resolveExerciseMuscle(exercise.exercise_id);
        return { ...exercise, rest_seconds: exercise.rest_seconds ?? 90,
          lastPerformance,
          suggestion: suggestProgression(lastPerformance?.sets ?? null, exercise.sets, exercise.reps,
            muscle === 'default' ? catalogMuscles.get(exercise.exercise_id.toLowerCase()) ?? muscle : muscle,
            recent[1]?.sets ?? null),
        };
      }),
    };
  }

  async getHistory(userId: string, cursor?: string) {
    if (cursor && Number.isNaN(Date.parse(cursor))) throw new BadRequestException('Cursor no valido.');
    const rows = await this.repository.getWorkoutHistory(userId, 21, cursor);
    return { items: rows.slice(0, 20), nextCursor: rows.length > 20 ? rows[19].date : null };
  }

  async getHistoryDetail(userId: string, logId: string) {
    const detail = await this.repository.getWorkoutHistoryDetail(userId, logId);
    if (!detail) throw new NotFoundException('Sesion no encontrada.');
    return detail;
  }

  async getExerciseProgress(userId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 120) throw new BadRequestException('Nombre de ejercicio no valido.');
    const rows = await this.repository.getExerciseProgress(userId, trimmed);
    const grouped = new Map<string, { bestWeight: number; estimatedOneRm: number; volume: number }>();
    for (const row of rows) {
      if (!countsForProgress(row.kind)) continue;
      const current = grouped.get(row.date) ?? { bestWeight: 0, estimatedOneRm: 0, volume: 0 };
      current.bestWeight = Math.max(current.bestWeight, Number(row.weight));
      current.estimatedOneRm = Math.max(current.estimatedOneRm, estimateOneRepMax(Number(row.weight), row.reps));
      current.volume += Number(row.weight) * row.reps;
      grouped.set(row.date, current);
    }
    return [...grouped].map(([date, metrics]) => ({ date, ...metrics }));
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
