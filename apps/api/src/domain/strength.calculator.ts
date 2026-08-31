import type { ExerciseHistoryLog, GenderType } from './domain.types';
import { normalizeLabel } from './normalize';

export type StrengthLevelName =
  | 'sin-clasificar'
  | 'principiante'
  | 'novato'
  | 'intermedio'
  | 'avanzado'
  | 'elite';

interface StrengthStandard {
  exerciseName: string;
  sourceUrl: string;
  aliases: string[];
  hombre: [number, number, number, number, number];
  mujer: [number, number, number, number, number];
}

export interface ExerciseStrengthLevel {
  exerciseId: string;
  exerciseName: string;
  level: StrengthLevelName;
  estimatedOneRepMax: number;
  bodyweightRatio: number;
  bestWeight: number;
  bestReps: number;
  nextLevel: StrengthLevelName | null;
  nextLevelOneRepMax: number | null;
  sourceUrl: string;
}

const LEVELS: Exclude<StrengthLevelName, 'sin-clasificar'>[] = [
  'principiante',
  'novato',
  'intermedio',
  'avanzado',
  'elite',
];

// Bodyweight-ratio standards published by Strength Level. Rankings are an
// approximation because their exact calculator also models age and bodyweight curves.
const STANDARDS: StrengthStandard[] = [
  {
    exerciseName: 'Press de Banca',
    sourceUrl: 'https://strengthlevel.com/strength-standards/bench-press/kg',
    aliases: ['press de banca', 'bench press', 'barbell bench press', 'smith bench press'],
    hombre: [0.5, 1, 1.25, 1.5, 2],
    mujer: [0.3, 0.5, 0.75, 1.1, 1.45],
  },
  {
    exerciseName: 'Sentadilla Libre',
    sourceUrl: 'https://strengthlevel.com/strength-standards/squat/kg',
    aliases: ['sentadilla libre', 'sentadilla', 'squat', 'barbell full squat', 'barbell high bar squat', 'barbell low bar squat', 'smith full squat'],
    hombre: [0.75, 1.25, 1.75, 2.25, 2.75],
    mujer: [0.5, 0.75, 1.25, 1.75, 2.25],
  },
  {
    exerciseName: 'Peso Muerto Rumano',
    sourceUrl: 'https://strengthlevel.com/strength-standards/romanian-deadlift/kg',
    aliases: ['peso muerto rumano', 'romanian deadlift', 'rdl', 'barbell romanian deadlift', 'dumbbell romanian deadlift'],
    hombre: [0.75, 1, 1.5, 2, 2.75],
    mujer: [0.5, 0.75, 1, 1.5, 2],
  },
  {
    exerciseName: 'Press Militar',
    sourceUrl: 'https://strengthlevel.com/strength-standards/military-press/kg',
    aliases: ['press militar', 'military press', 'shoulder press', 'barbell seated overhead press', 'barbell standing close grip military press', 'barbell standing wide military press', 'smith standing military press', 'lever military press'],
    hombre: [0.4, 0.55, 0.8, 1.05, 1.3],
    mujer: [0.25, 0.35, 0.5, 0.7, 0.9],
  },
  {
    exerciseName: 'Remo con Barra',
    sourceUrl: 'https://strengthlevel.com/strength-standards/bent-over-row/kg',
    aliases: ['remo con barra', 'bent over row', 'barbell row', 'barbell bent over row', 'barbell pendlay row', 'smith bent over row'],
    hombre: [0.5, 0.75, 1, 1.5, 1.75],
    mujer: [0.3, 0.45, 0.7, 0.95, 1.25],
  },
  {
    exerciseName: 'Jalon al Pecho',
    sourceUrl: 'https://strengthlevel.com/strength-standards/lat-pulldown/kg',
    aliases: ['jalon al pecho', 'lat pulldown', 'cable pulldown', 'lever front pulldown', 'cable lat pulldown full range of motion'],
    hombre: [0.5, 0.75, 1, 1.5, 1.75],
    mujer: [0.35, 0.5, 0.75, 0.95, 1.25],
  },
];

const findStandard = (exerciseId: string): StrengthStandard | undefined => {
  const normalized = normalizeLabel(exerciseId);
  return STANDARDS.find((standard) =>
    standard.aliases.some((alias) => normalized === normalizeLabel(alias)),
  );
};

export const estimateOneRepMax = (weight: number, reps: number): number => {
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isInteger(reps) || reps <= 0) return 0;
  const boundedReps = Math.min(reps, 30);
  if (boundedReps === 1) return weight;

  const brzycki = weight * (36 / (37 - boundedReps));
  const epley = weight * (1 + (boundedReps / 30));

  if (boundedReps < 8) return Number(brzycki.toFixed(1));
  if (boundedReps > 10) return Number(epley.toFixed(1));

  const epleyWeight = (boundedReps - 8) / 2;
  return Number(((brzycki * (1 - epleyWeight)) + (epley * epleyWeight)).toFixed(1));
};

export const calculateExerciseStrength = (
  history: ExerciseHistoryLog[],
  bodyweight: number | null,
  gender: GenderType | null,
): ExerciseStrengthLevel[] => {
  if (!bodyweight || bodyweight <= 0 || !gender) return [];

  const bestByExercise = new Map<string, ExerciseHistoryLog & { oneRepMax: number }>();
  for (const log of history) {
    const standard = findStandard(log.exercise_id);
    if (!standard) continue;

    const oneRepMax = estimateOneRepMax(Number(log.weight), Number(log.reps));
    if (oneRepMax <= 0) continue;
    const key = standard.exerciseName;
    const current = bestByExercise.get(key);
    if (!current || oneRepMax > current.oneRepMax) {
      bestByExercise.set(key, { ...log, oneRepMax });
    }
  }

  return Array.from(bestByExercise.entries()).map(([exerciseName, best]) => {
    const standard = STANDARDS.find((item) => item.exerciseName === exerciseName)!;
    const thresholds = standard[gender];
    const ratio = best.oneRepMax / bodyweight;
    let level: StrengthLevelName = 'sin-clasificar';
    let levelIndex = -1;

    thresholds.forEach((threshold, index) => {
      if (ratio >= threshold) {
        level = LEVELS[index];
        levelIndex = index;
      }
    });

    const nextIndex = levelIndex + 1;
    const nextLevel = nextIndex < LEVELS.length ? LEVELS[nextIndex] : null;
    const nextLevelOneRepMax = nextIndex < thresholds.length
      ? Number((thresholds[nextIndex] * bodyweight).toFixed(1))
      : null;

    return {
      exerciseId: best.exercise_id,
      exerciseName,
      level,
      estimatedOneRepMax: best.oneRepMax,
      bodyweightRatio: Number(ratio.toFixed(2)),
      bestWeight: Number(best.weight),
      bestReps: Number(best.reps),
      nextLevel,
      nextLevelOneRepMax,
      sourceUrl: standard.sourceUrl,
    };
  }).sort((a, b) => b.estimatedOneRepMax - a.estimatedOneRepMax);
};

