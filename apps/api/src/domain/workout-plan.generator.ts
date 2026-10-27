import type { WeekDay } from './domain.types';
import { normalizeLabel } from './normalize';

export interface GeneratedWorkoutExercise {
  name: string;
  sets: number;
  reps: number;
  rest_seconds: number;
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
  trainingGoal: TrainingGoal;
  assessment: PlanAssessment;
}

export type TrainingGoal = 'balanced' | 'strength' | 'hypertrophy';
export interface WorkoutPlanInput {
  equipment: string; primaryMuscles: string[]; secondaryMuscles: string[];
  duration: number; days: number; trainingGoal?: TrainingGoal;
}
export interface PlanAssessment {
  estimatedMinutesByDay: number[];
  muscles: Array<{ muscle: string; directSets: number; indirectSets: number; sessions: number }>;
  warnings: string[];
  decisions: Array<{ day: string; exercise: string; reason: string }>;
}

const GOAL_LABELS: Record<TrainingGoal, string> = { balanced: 'Equilibrado', strength: 'Fuerza', hypertrophy: 'Hipertrofia' };

const SCHEDULE: WeekDay[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEK_SCHEDULES: WeekDay[][] = [[], ['MON'], ['MON', 'THU'], ['MON', 'WED', 'FRI'],
  ['MON', 'TUE', 'THU', 'FRI'], ['MON', 'TUE', 'WED', 'FRI', 'SAT'], SCHEDULE];

const MUSCLE_LABELS = {
  pecho: 'Pecho', espalda: 'Espalda', hombros: 'Hombros', biceps: 'Bíceps', triceps: 'Tríceps',
  cuadriceps: 'Cuádriceps', isquiosurales: 'Isquiosurales', gluteos: 'Glúteos', pantorrillas: 'Pantorrillas', abdomen: 'Abdomen',
} as const;
type Muscle = keyof typeof MUSCLE_LABELS;
type Category = 'push' | 'pull' | 'lower' | 'core';
type DayRole = 'upper' | 'lower' | 'push' | 'pull' | 'mixed';
type Equipment = 'dumbbell' | 'barbell' | 'bench' | 'cable' | 'machine' | 'pullup' | 'band';

const EQUIPMENT_PROFILES: Record<string, Equipment[]> = {
  'casa (sin equipo)': [],
  casa: [],
  'casa (mancuernas/bandas)': [], // Older clients did not distinguish which was available.
  'casa (mancuernas)': ['dumbbell'],
  'casa (bandas)': ['band'],
  'calistenia (parque)': ['pullup'],
  'gimnasio pequeno': ['dumbbell', 'barbell', 'bench', 'pullup'],
  'gimnasio comercial': ['dumbbell', 'barbell', 'bench', 'cable', 'machine', 'pullup'],
  gimnasio: ['dumbbell', 'barbell', 'bench', 'cable', 'machine', 'pullup'],
};

const LOWER: Muscle[] = ['cuadriceps', 'isquiosurales', 'gluteos', 'pantorrillas'];
const PUSH: Muscle[] = ['pecho', 'hombros', 'triceps'];
const PULL: Muscle[] = ['espalda', 'biceps'];
const ALL_MUSCLES = Object.keys(MUSCLE_LABELS) as Muscle[];

interface PlannerExercise {
  name: string;
  category: Category;
  target: Muscle;
  secondary: Muscle[];
  requires: Equipment[];
}

// Explicit coverage prevents unrelated fallback exercises from standing in for a
// requested muscle (e.g. a squat is not a calf exercise). New English names are
// exact entries in the exercise catalog, which supplies their instructions/media.
const EXERCISES: PlannerExercise[] = [
  { name: 'Press de Banca', category: 'push', target: 'pecho', secondary: ['hombros', 'triceps'], requires: ['barbell', 'bench'] },
  { name: 'Jalon al Pecho', category: 'pull', target: 'espalda', secondary: ['biceps'], requires: ['cable'] },
  { name: 'Press Inclinado con Mancuernas', category: 'push', target: 'pecho', secondary: ['hombros', 'triceps'], requires: ['dumbbell', 'bench'] },
  { name: 'Remo con Barra', category: 'pull', target: 'espalda', secondary: ['biceps'], requires: ['barbell'] },
  { name: 'Sentadilla Libre', category: 'lower', target: 'cuadriceps', secondary: ['gluteos'], requires: ['barbell'] },
  { name: 'Sentadilla Hack', category: 'lower', target: 'cuadriceps', secondary: ['gluteos'], requires: ['machine'] },
  { name: 'Zancadas', category: 'lower', target: 'gluteos', secondary: ['cuadriceps'], requires: [] },
  { name: 'Peso Muerto Rumano', category: 'lower', target: 'isquiosurales', secondary: ['gluteos'], requires: ['barbell'] },
  { name: 'Press Militar', category: 'push', target: 'hombros', secondary: ['triceps'], requires: ['barbell'] },
  { name: 'Elevaciones Laterales', category: 'push', target: 'hombros', secondary: [], requires: ['dumbbell'] },
  { name: 'Curl de Biceps', category: 'pull', target: 'biceps', secondary: [], requires: ['dumbbell'] },
  { name: 'Extension de Triceps en Polea', category: 'push', target: 'triceps', secondary: [], requires: ['cable'] },
  { name: 'Plancha', category: 'core', target: 'abdomen', secondary: [], requires: [] },
  { name: 'bodyweight standing calf raise', category: 'lower', target: 'pantorrillas', secondary: [], requires: [] },
  { name: 'donkey calf raise', category: 'lower', target: 'pantorrillas', secondary: [], requires: ['bench'] },
  { name: 'dumbbell standing calf raise', category: 'lower', target: 'pantorrillas', secondary: [], requires: ['dumbbell'] },
  { name: 'push-up', category: 'push', target: 'pecho', secondary: ['hombros', 'triceps'], requires: [] },
  { name: 'dumbbell fly', category: 'push', target: 'pecho', secondary: [], requires: ['dumbbell', 'bench'] },
  { name: 'dumbbell bench press', category: 'push', target: 'pecho', secondary: ['hombros', 'triceps'], requires: ['dumbbell', 'bench'] },
  { name: 'crunch (hands overhead)', category: 'core', target: 'abdomen', secondary: [], requires: [] },
  { name: 'Sentadilla sin equipo', category: 'lower', target: 'cuadriceps', secondary: ['gluteos'], requires: [] },
  { name: 'Puente con pasos de talones', category: 'lower', target: 'isquiosurales', secondary: ['gluteos'], requires: [] },
  { name: 'Ángeles invertidos en el suelo', category: 'pull', target: 'espalda', secondary: [], requires: [] },
  { name: 'Curl de bíceps con autorresistencia', category: 'pull', target: 'biceps', secondary: [], requires: [] },
  { name: 'Flexiones pica', category: 'push', target: 'hombros', secondary: ['triceps'], requires: [] },
  { name: 'Peso muerto rumano con mancuernas', category: 'lower', target: 'isquiosurales', secondary: ['gluteos'], requires: ['dumbbell'] },
  { name: 'Remo con mancuernas de pie', category: 'pull', target: 'espalda', secondary: ['biceps'], requires: ['dumbbell'] },
  { name: 'Remo con banda bajo los pies', category: 'pull', target: 'espalda', secondary: ['biceps'], requires: ['band'] },
  { name: 'Curl de bíceps con banda', category: 'pull', target: 'biceps', secondary: [], requires: ['band'] },
  { name: 'Dominadas en parque', category: 'pull', target: 'espalda', secondary: ['biceps'], requires: ['pullup'] },
  { name: 'Press inclinado en poleas', category: 'push', target: 'pecho', secondary: ['hombros', 'triceps'], requires: ['cable', 'bench'] },
  { name: 'Pec deck', category: 'push', target: 'pecho', secondary: [], requires: ['machine'] },
  { name: 'Prensa de piernas', category: 'lower', target: 'cuadriceps', secondary: ['gluteos'], requires: ['machine'] },
  { name: 'Curl femoral en máquina', category: 'lower', target: 'isquiosurales', secondary: [], requires: ['machine'] },
  { name: 'Remo en polea sentado', category: 'pull', target: 'espalda', secondary: ['biceps'], requires: ['cable'] },
  { name: 'Hip thrust con barra', category: 'lower', target: 'gluteos', secondary: ['isquiosurales'], requires: ['barbell', 'bench'] },
];

const STRENGTH_LIFTS = new Set(['Press de Banca', 'Sentadilla Libre', 'Remo con Barra', 'Peso Muerto Rumano', 'Press Militar']);
const HYPERTROPHY_PREFERENCE: Record<string, number> = {
  'Press inclinado en poleas': 1.6, 'Pec deck': 1.5, 'Press Inclinado con Mancuernas': 1.4,
  'Sentadilla Hack': 1.35, 'Prensa de piernas': 1.3, 'Curl femoral en máquina': 1.4,
  'Remo en polea sentado': 1.4, 'Hip thrust con barra': 1.4,
};
const isCompound = (exercise: PlannerExercise) => exercise.category !== 'core' && exercise.secondary.length > 0;
const preference = (exercise: PlannerExercise, goal: TrainingGoal): number => {
  if (goal === 'strength') return STRENGTH_LIFTS.has(exercise.name) ? 2 : isCompound(exercise)
    ? exercise.requires.some(item => ['barbell', 'dumbbell', 'machine', 'cable'].includes(item)) ? 1.5 : 1.1 : 1;
  if (goal === 'hypertrophy') return HYPERTROPHY_PREFERENCE[exercise.name] ?? 1;
  return 1;
};
const prescription = (exercise: PlannerExercise, goal: TrainingGoal, index: number, duration: number): GeneratedWorkoutExercise => {
  const compound = isCompound(exercise);
  const loadable = exercise.requires.some(item => ['dumbbell', 'barbell', 'cable', 'machine'].includes(item));
  if (goal === 'strength') return { name: exercise.name, sets: compound ? 3 : 2,
    reps: compound && loadable ? 5 : compound ? 8 : 10,
    rest_seconds: compound && loadable ? 180 : compound ? 120 : 90 };
  if (goal === 'hypertrophy') return { name: exercise.name, sets: 3, reps: compound ? 10 : 12,
    rest_seconds: compound ? 120 : 75 };
  return { name: exercise.name, sets: index === 0 ? 4 : 3, reps: duration >= 60 ? 10 : 12, rest_seconds: 90 };
};
const orderSession = (session: PlannerExercise[], goal: TrainingGoal) => goal === 'balanced' ? [...session]
  : [...session].sort((a, b) => Number(isCompound(b)) - Number(isCompound(a)) || preference(b, goal) - preference(a, goal));
// Planning estimate, not a measured workout duration: 5 min preparation,
// 4 sec per repetition, prescribed inter-set rests and 1 min setup per exercise.
const estimateSeconds = (exercises: GeneratedWorkoutExercise[]) => 300 + exercises.reduce((sum, exercise) =>
  sum + exercise.sets * exercise.reps * 4 * (['Zancadas', 'Curl de bíceps con autorresistencia'].includes(exercise.name) ? 2 : 1)
    + Math.max(0, exercise.sets - 1) * exercise.rest_seconds + 60, 0);

export class WorkoutPlanValidationError extends Error {}

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

const getDayRoles = (muscles: Muscle[], days: number, goal: TrainingGoal): DayRole[] => {
  const lower = muscles.some(muscle => LOWER.includes(muscle));
  const upper = muscles.some(muscle => PUSH.includes(muscle) || PULL.includes(muscle));
  if (!lower || !upper) return Array<DayRole>(days).fill(lower ? 'lower' : 'upper');
  if (goal === 'strength' && days <= 3) return Array<DayRole>(days).fill('mixed');
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
  trainingGoal = 'balanced',
}: WorkoutPlanInput): GeneratedWorkoutPlan => {
  if (!Object.prototype.hasOwnProperty.call(GOAL_LABELS, trainingGoal)) {
    throw new WorkoutPlanInputError('Objetivo de entrenamiento no reconocido. Elige fuerza, hipertrofia o equilibrado.');
  }
  const primary = normalizeMuscles(primaryMuscles);
  const focus = [...new Set([...primary, ...normalizeMuscles(secondaryMuscles)])];
  if (!focus.length || !Number.isInteger(days) || days < 1 || days > SCHEDULE.length || !Number.isFinite(duration) || duration < 10 || duration > 180) {
    throw new WorkoutPlanInputError('Selecciona grupos musculares, entre 1 y 6 días y una duración de 10 a 180 minutos.');
  }
  const selectedDays = days;
  const exercisesPerDay = duration >= 165 ? 8 : duration >= 135 ? 7 : duration >= 105 ? 6 : duration >= 75 ? 5 : duration >= 45 ? 4 : 3;
  const roles = getDayRoles(focus, selectedDays, trainingGoal);
  const sessions: PlannerExercise[][] = roles.map(() => []);
  const available = EQUIPMENT_PROFILES[normalizeLabel(equipment)];
  if (!Object.prototype.hasOwnProperty.call(EQUIPMENT_PROFILES, normalizeLabel(equipment))) {
    throw new WorkoutPlanInputError('Tipo de entrenamiento no reconocido. Selecciona una opción de equipo disponible.');
  }
  const candidates = EXERCISES.filter(exercise => exercise.requires.every(item => available.includes(item))
    // Timed holds need a duration-aware session contract; use dynamic core work
    // for the new goal prescriptions instead of labelling seconds as repetitions.
    && (trainingGoal === 'balanced' || exercise.name !== 'Plancha')
    && coveredBy(exercise).some(muscle => focus.includes(muscle)));
  const coverage = new Map<Muscle, number>(focus.map(muscle => [muscle, 0]));
  const uncovered = new Set(focus);
  const required: PlannerExercise[] = [];
  const usage = new Map<string, number>();
  const priority = (muscle: Muscle) => primary.includes(muscle) ? 2 : 1;
  // Strength keeps practice of the main movements; novelty must not outweigh
  // specificity after the first session of the week.
  const usagePenalty = (exercise: PlannerExercise) => 1 + (usage.get(exercise.name) ?? 0) * (trainingGoal === 'strength' ? 0.25 : 1);
  const prescribeSession = (session: PlannerExercise[]) => orderSession(session, trainingGoal)
    .map((exercise, index) => prescription(exercise, trainingGoal, index, duration));
  const canAdd = (day: number, exercise: PlannerExercise) => {
    if (sessions[day].length >= exercisesPerDay) return false;
    // Avoid filling a focused day with many near-equivalent presses or flys.
    if (trainingGoal !== 'balanced') {
      const equivalents = sessions[day].filter(item => item.target === exercise.target && isCompound(item) === isCompound(exercise));
      if (equivalents.length >= (isCompound(exercise) ? 2 : 1)) return false;
    }
    return estimateSeconds(prescribeSession([...sessions[day], exercise])) <= duration * 60;
  };
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
        ? priority(muscle) * (muscle === exercise.target ? 1 : 0.6) : 0), 0) * preference(exercise, trainingGoal),
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
    const day = sessions.map((session, index) => ({ index, length: session.length, seconds: estimateSeconds(prescribeSession(session)) }))
      .filter(day => canAdd(day.index, exercise) && fitsDay(exercise, roles[day.index]))
      .sort((a, b) => a.seconds - b.seconds)[0];
    if (!day) throw capacityError();
    add(day.index, exercise);
  }

  // Balance additional work across the requested groups; never fill a chest or
  // leg plan with unrelated exercises merely to reach an arbitrary count.
  for (const [day, session] of sessions.entries()) {
    while (session.length < exercisesPerDay) {
      const ranked = candidates.filter(exercise => fitsDay(exercise, roles[day]) && !session.includes(exercise) && canAdd(day, exercise))
        .map(exercise => ({ exercise, score: coveredBy(exercise).reduce((sum, muscle) => sum + (coverage.has(muscle)
          ? priority(muscle) * (muscle === exercise.target ? 1 : 0.6) / (1 + coverage.get(muscle)!) : 0), 0)
          * preference(exercise, trainingGoal) / usagePenalty(exercise) }))
        .sort((a, b) => b.score - a.score);
      if (!ranked.length) break;
      add(day, ranked[0].exercise);
    }
  }
  if (sessions.some(session => !session.length) || [...coverage.values()].some(count => count === 0)) throw capacityError();

  const workouts = sessions.map((session, index) => ({
    name: `Día ${index + 1}: ${DAY_LABELS[roles[index]]}`,
    scheduled_day: WEEK_SCHEDULES[days][index],
    exercises: prescribeSession(session),
  }));
  const muscleVolumes = focus.map(muscle => {
    let directSets = 0; let indirectSets = 0; let count = 0;
    for (const day of workouts) {
      let trained = false;
      for (const item of day.exercises) {
        const exercise = EXERCISES.find(candidate => candidate.name === item.name)!;
        if (exercise.target === muscle) { directSets += item.sets; trained = true; }
        else if (exercise.secondary.includes(muscle)) { indirectSets += item.sets; trained = true; }
      }
      if (trained) count++;
    }
    return { muscle: MUSCLE_LABELS[muscle], directSets, indirectSets, sessions: count };
  });
  const warnings: string[] = [];
  if (trainingGoal === 'strength' && !available.some(item => ['barbell', 'dumbbell', 'machine', 'cable'].includes(item))) {
    warnings.push('Con este equipo, la dificultad depende de las variantes y la resistencia disponible; no se puede garantizar un trabajo con cargas altas.');
  }
  if (trainingGoal === 'hypertrophy' && muscleVolumes.some(item => primary.some(muscle => MUSCLE_LABELS[muscle] === item.muscle) && item.directSets < 10)) {
    warnings.push('Algunos grupos prioritarios reciben menos de 10 series directas semanales. El trabajo indirecto se registra aparte; revisa días y tiempo si necesitas más volumen.');
  }
  if (muscleVolumes.some(item => item.sessions < 2)) warnings.push('Algunos grupos se trabajan una sola vez por semana. Aumentar los días o ajustar la selección permite repartir más la frecuencia.');
  const dayNumber: Record<WeekDay, number> = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };
  if (focus.some(muscle => {
    const trained = new Set(workouts.filter(day => day.exercises.some(item => coveredBy(EXERCISES.find(exercise => exercise.name === item.name)!).includes(muscle))).map(day => dayNumber[day.scheduled_day]));
    return [...trained].some(day => trained.has((day + 1) % 7));
  })) warnings.push('Hay grupos que se repiten en días consecutivos. Revisa la recuperación y la distribución antes de aumentar la carga.');
  const plan: GeneratedWorkoutPlan = {
    routineName: 'Plan RankingUp',
    description: `Plan semanal orientativo para ${equipment}. Objetivo: ${GOAL_LABELS[trainingGoal]}. Grupos incluidos: ${focus.map(muscle => MUSCLE_LABELS[muscle]).join(', ')}. ${available.length === 0 ? 'Solo suelo y peso corporal, sin barras, bancos ni máquinas. El trabajo de espalda y bíceps tiene menor capacidad de carga sin equipo.' : ''} ${warnings.join(' ')}`.trim(),
    workouts,
    trainingGoal,
    assessment: {
      estimatedMinutesByDay: workouts.map(day => Math.ceil(estimateSeconds(day.exercises) / 6) / 10),
      muscles: muscleVolumes, warnings,
      decisions: workouts.flatMap(day => day.exercises.map(item => {
        const exercise = EXERCISES.find(candidate => candidate.name === item.name)!;
        return { day: day.name, exercise: item.name, reason: trainingGoal === 'strength'
          ? isCompound(exercise) ? 'Movimiento compuesto priorizado para fuerza, con descansos amplios.' : 'Accesorio para completar el trabajo muscular solicitado.'
          : trainingGoal === 'hypertrophy' ? isCompound(exercise) ? 'Movimiento compuesto para acumular trabajo del grupo seleccionado.' : 'Trabajo específico para complementar el volumen del grupo seleccionado.'
          : 'Ejercicio compatible con el equipo y la selección muscular.' };
      })),
    },
  };
  const violations = inspectWorkoutPlan(plan, { equipment, primaryMuscles, secondaryMuscles, duration, days, trainingGoal });
  if (violations.length) throw new WorkoutPlanValidationError(`El plan no superó la validación: ${violations.join('; ')}`);
  return plan;
};

/** Re-evaluate actual output before persistence, rather than trusting the selection loop. */
export function inspectWorkoutPlan(plan: GeneratedWorkoutPlan, input: WorkoutPlanInput): string[] {
  const violations: string[] = [];
  const available = EQUIPMENT_PROFILES[normalizeLabel(input.equipment)];
  if (!Array.isArray(available)) return ['Equipo desconocido'];
  if (plan.workouts.length !== input.days) violations.push('Número de días incorrecto');
  if (plan.trainingGoal !== (input.trainingGoal ?? 'balanced')) violations.push('Objetivo incorrecto');
  if (new Set(plan.workouts.map(day => day.scheduled_day)).size !== plan.workouts.length) violations.push('Días duplicados');
  const coverage = new Set<Muscle>();
  for (const day of plan.workouts) {
    if (!day.exercises.length) violations.push('Sesión vacía');
    if (new Set(day.exercises.map(item => item.name)).size !== day.exercises.length) violations.push('Ejercicios duplicados');
    if (estimateSeconds(day.exercises) > input.duration * 60) violations.push('Tiempo excedido');
    let accessorySeen = false;
    for (const item of day.exercises) {
      const metadata = EXERCISES.find(exercise => exercise.name === item.name);
      if (!metadata) { violations.push('Ejercicio sin ficha'); continue; }
      if (!metadata.requires.every(equipment => available.includes(equipment))) violations.push('Equipo incompatible');
      if (!Number.isInteger(item.sets) || item.sets < 1 || item.sets > 5 || !Number.isInteger(item.reps)
        || item.reps < 3 || item.reps > 20 || !Number.isInteger(item.rest_seconds)
        || item.rest_seconds < 45 || item.rest_seconds > 300) violations.push('Prescripción fuera de límites');
      const loadable = metadata.requires.some(equipment => ['barbell', 'dumbbell', 'machine', 'cable'].includes(equipment));
      if (plan.trainingGoal === 'strength' && isCompound(metadata) && loadable
        && (item.reps > 6 || item.rest_seconds < 150)) violations.push('Prescripción incompatible con fuerza');
      if (plan.trainingGoal === 'hypertrophy' && (item.reps < 8 || item.rest_seconds < 60)) violations.push('Prescripción incompatible con hipertrofia');
      if (plan.trainingGoal !== 'balanced') {
        if (!isCompound(metadata)) accessorySeen = true;
        else if (accessorySeen) violations.push('Compuesto después de accesorios');
      }
      coveredBy(metadata).forEach(muscle => coverage.add(muscle));
    }
  }
  for (const muscle of normalizeMuscles([...input.primaryMuscles, ...input.secondaryMuscles])) {
    if (!coverage.has(muscle)) violations.push(`Grupo omitido: ${MUSCLE_LABELS[muscle]}`);
  }
  return [...new Set(violations)];
}
