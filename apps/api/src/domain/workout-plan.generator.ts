import type { WeekDay } from './domain.types';
import { normalizeLabel } from './normalize';

export interface GeneratedWorkoutExercise {
  name: string;
  sets: number;
  reps: number;
}

export interface GeneratedWorkoutDay {
  name: string;
  scheduled_day: WeekDay;
  exercises: GeneratedWorkoutExercise[];
}

export interface GeneratedWorkoutPlan {
  routineName: string;
  description: string;
  workouts: GeneratedWorkoutDay[];
}

const SCHEDULE: WeekDay[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const MUSCLE_LABELS = {
  pecho: 'Pecho', espalda: 'Espalda', hombros: 'Hombros', biceps: 'Bíceps', triceps: 'Tríceps',
  cuadriceps: 'Cuádriceps', isquiosurales: 'Isquiosurales', gluteos: 'Glúteos', pantorrillas: 'Pantorrillas', abdomen: 'Abdomen',
} as const;
type Muscle = keyof typeof MUSCLE_LABELS;
type Category = 'push' | 'pull' | 'lower' | 'core';
type DayRole = 'upper' | 'lower' | 'push' | 'pull' | 'mixed';

const LOWER: Muscle[] = ['cuadriceps', 'isquiosurales', 'gluteos', 'pantorrillas'];
const PUSH: Muscle[] = ['pecho', 'hombros', 'triceps'];
const PULL: Muscle[] = ['espalda', 'biceps'];
const ALL_MUSCLES = Object.keys(MUSCLE_LABELS) as Muscle[];

interface PlannerExercise {
  name: string;
  category: Category;
  target: Muscle;
  secondary: Muscle[];
}

// Explicit coverage prevents unrelated fallback exercises from standing in for a
// requested muscle (e.g. a squat is not a calf exercise). New English names are
// exact entries in the exercise catalog, which supplies their instructions/media.
const EXERCISES: PlannerExercise[] = [
  { name: 'Press de Banca', category: 'push', target: 'pecho', secondary: ['hombros', 'triceps'] },
  { name: 'Jalon al Pecho', category: 'pull', target: 'espalda', secondary: ['biceps'] },
  { name: 'Press Inclinado con Mancuernas', category: 'push', target: 'pecho', secondary: ['hombros', 'triceps'] },
  { name: 'Remo con Barra', category: 'pull', target: 'espalda', secondary: ['biceps'] },
  { name: 'Sentadilla Libre', category: 'lower', target: 'cuadriceps', secondary: ['gluteos'] },
  { name: 'Sentadilla Hack', category: 'lower', target: 'cuadriceps', secondary: ['gluteos'] },
  { name: 'Zancadas', category: 'lower', target: 'gluteos', secondary: ['cuadriceps'] },
  { name: 'Peso Muerto Rumano', category: 'lower', target: 'isquiosurales', secondary: ['gluteos'] },
  { name: 'Press Militar', category: 'push', target: 'hombros', secondary: ['triceps'] },
  { name: 'Elevaciones Laterales', category: 'push', target: 'hombros', secondary: [] },
  { name: 'Curl de Biceps', category: 'pull', target: 'biceps', secondary: [] },
  { name: 'Extension de Triceps en Polea', category: 'push', target: 'triceps', secondary: [] },
  { name: 'Plancha', category: 'core', target: 'abdomen', secondary: [] },
  { name: 'bodyweight standing calf raise', category: 'lower', target: 'pantorrillas', secondary: [] },
  { name: 'donkey calf raise', category: 'lower', target: 'pantorrillas', secondary: [] },
  { name: 'dumbbell standing calf raise', category: 'lower', target: 'pantorrillas', secondary: [] },
  { name: 'push-up', category: 'push', target: 'pecho', secondary: ['hombros', 'triceps'] },
  { name: 'dumbbell fly', category: 'push', target: 'pecho', secondary: [] },
  { name: 'dumbbell bench press', category: 'push', target: 'pecho', secondary: ['hombros', 'triceps'] },
  { name: 'crunch (hands overhead)', category: 'core', target: 'abdomen', secondary: [] },
];

export class WorkoutPlanInputError extends Error {}

const normalizeMuscles = (labels: string[]): Muscle[] => {
  const muscles = labels.flatMap(label => {
    const normalized = normalizeLabel(label).replace(/[-_]/g, ' ');
    if (['cuerpo completo', 'completa', 'completo', 'full body', 'fullbody'].includes(normalized)) return ALL_MUSCLES;
    if (['pierna', 'piernas', 'tren inferior'].includes(normalized)) return LOWER;
    if (ALL_MUSCLES.includes(normalized as Muscle)) return [normalized as Muscle];
    throw new WorkoutPlanInputError(`Grupo muscular no reconocido: ${label}. Selecciona los grupos disponibles.`);
  });
  return [...new Set(muscles)];
};

const coveredBy = (exercise: PlannerExercise): Muscle[] => [exercise.target, ...exercise.secondary];
const fitsDay = (exercise: PlannerExercise, role: DayRole): boolean => {
  if (role === 'mixed' || exercise.category === 'core') return true;
  if (role === 'upper') return exercise.category === 'push' || exercise.category === 'pull';
  return exercise.category === role;
};

const getDayRoles = (muscles: Muscle[], days: number): DayRole[] => {
  const lower = muscles.some(muscle => LOWER.includes(muscle));
  const upper = muscles.some(muscle => PUSH.includes(muscle) || PULL.includes(muscle));
  if (!lower || !upper) return Array<DayRole>(days).fill(lower ? 'lower' : 'upper');
  if (days === 1) return ['mixed'];
  const pushPull = muscles.some(muscle => PUSH.includes(muscle)) && muscles.some(muscle => PULL.includes(muscle));
  if (days === 3 && pushPull) return ['push', 'pull', 'lower'];
  if (days === 5 && pushPull) return ['push', 'pull', 'lower', 'upper', 'lower'];
  if (days === 6 && pushPull) return ['push', 'pull', 'lower', 'push', 'pull', 'lower'];
  return Array.from({ length: days }, (_, index) => index % 2 ? 'lower' : 'upper');
};

const DAY_LABELS: Record<DayRole, string> = {
  upper: 'Tren superior', lower: 'Piernas', push: 'Empuje', pull: 'Tirón', mixed: 'Tren superior + piernas',
};

export const generateWorkoutPlan = ({
  equipment,
  primaryMuscles,
  secondaryMuscles,
  duration,
  days,
}: {
  equipment: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  duration: number;
  days: number;
}): GeneratedWorkoutPlan => {
  const primary = normalizeMuscles(primaryMuscles);
  const focus = [...new Set([...primary, ...normalizeMuscles(secondaryMuscles)])];
  if (!focus.length || !Number.isInteger(days) || days < 1 || days > SCHEDULE.length || !Number.isFinite(duration) || duration < 10 || duration > 180) {
    throw new WorkoutPlanInputError('Selecciona grupos musculares, entre 1 y 6 días y una duración de 10 a 180 minutos.');
  }
  const selectedDays = days;
  const exercisesPerDay = duration >= 165 ? 8 : duration >= 135 ? 7 : duration >= 105 ? 6 : duration >= 75 ? 5 : duration >= 45 ? 4 : 3;
  const roles = getDayRoles(focus, selectedDays);
  const sessions: PlannerExercise[][] = roles.map(() => []);
  const candidates = EXERCISES.filter(exercise => coveredBy(exercise).some(muscle => focus.includes(muscle)));
  const coverage = new Map<Muscle, number>(focus.map(muscle => [muscle, 0]));
  const uncovered = new Set(focus);
  const required: PlannerExercise[] = [];
  const usage = new Map<string, number>();
  const priority = (muscle: Muscle) => primary.includes(muscle) ? 2 : 1;
  const add = (day: number, exercise: PlannerExercise) => {
    sessions[day].push(exercise);
    usage.set(exercise.name, (usage.get(exercise.name) ?? 0) + 1);
    for (const muscle of coveredBy(exercise)) {
      if (coverage.has(muscle)) coverage.set(muscle, coverage.get(muscle)! + 1);
    }
  };
  const capacityError = () => new WorkoutPlanInputError('No caben todos los grupos seleccionados. Aumenta los días o la duración, o reduce la selección muscular.');

  // Reserve coverage for the entire week BEFORE filling spare exercise slots.
  // Primary and secondary selections must both be present, regardless of order.
  while (uncovered.size) {
    const ranked = candidates.map(exercise => ({
      exercise,
      score: coveredBy(exercise).reduce((sum, muscle) => sum + (uncovered.has(muscle)
        ? priority(muscle) * (muscle === exercise.target ? 1 : 0.6) : 0), 0),
    })).filter(candidate => candidate.score > 0)
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    if (!best || required.length >= selectedDays * exercisesPerDay) throw capacityError();
    required.push(best.exercise);
    for (const muscle of coveredBy(best.exercise)) uncovered.delete(muscle);
  }

  // Place exercises tied to a particular split before flexible core exercises,
  // so a high-priority plank cannot consume the last slot of the leg session.
  required.sort((a, b) => Number(a.category === 'core') - Number(b.category === 'core'));
  for (const exercise of required) {
    const day = sessions.map((session, index) => ({ index, length: session.length }))
      .filter(day => day.length < exercisesPerDay && fitsDay(exercise, roles[day.index]))
      .sort((a, b) => a.length - b.length)[0];
    if (!day) throw capacityError();
    add(day.index, exercise);
  }

  // Balance additional work across the requested groups; never fill a chest or
  // leg plan with unrelated exercises merely to reach an arbitrary count.
  for (const [day, session] of sessions.entries()) {
    while (session.length < exercisesPerDay) {
      const ranked = candidates.filter(exercise => fitsDay(exercise, roles[day]) && !session.includes(exercise))
        .map(exercise => ({ exercise, score: coveredBy(exercise).reduce((sum, muscle) => sum + (coverage.has(muscle)
          ? priority(muscle) * (muscle === exercise.target ? 1 : 0.6) / (1 + coverage.get(muscle)!) : 0), 0)
          / (1 + (usage.get(exercise.name) ?? 0)) }))
        .sort((a, b) => b.score - a.score);
      if (!ranked.length) break;
      add(day, ranked[0].exercise);
    }
  }
  if (sessions.some(session => !session.length) || [...coverage.values()].some(count => count === 0)) throw capacityError();

  const workouts = sessions.map((session, index) => ({
    name: `Día ${index + 1}: ${DAY_LABELS[roles[index]]}`,
    scheduled_day: SCHEDULE[index],
    exercises: session.map((exercise, exerciseIndex) => ({
      name: exercise.name,
      sets: exerciseIndex === 0 ? 4 : 3,
      reps: duration >= 60 ? 10 : 12,
    })),
  }));

  return {
    routineName: 'Plan RankingUp',
    description: `Plan semanal orientativo para ${equipment}. Grupos incluidos: ${focus.map(muscle => MUSCLE_LABELS[muscle]).join(', ')}.`,
    workouts,
  };
};
