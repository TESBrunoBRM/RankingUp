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

const EXERCISES_BY_MUSCLE: Record<string, string[]> = {
  pecho: ['Press de Banca', 'Press Inclinado con Mancuernas', 'Elevaciones Laterales'],
  espalda: ['Jalon al Pecho', 'Remo con Barra', 'Peso Muerto Rumano'],
  hombros: ['Press Militar', 'Elevaciones Laterales', 'Remo con Barra'],
  biceps: ['Curl de Biceps', 'Jalon al Pecho', 'Remo con Barra'],
  triceps: ['Extension de Triceps en Polea', 'Press de Banca', 'Press Militar'],
  cuadriceps: ['Sentadilla Libre', 'Sentadilla Hack', 'Zancadas'],
  isquiosurales: ['Peso Muerto Rumano', 'Sentadilla Libre', 'Zancadas'],
  gluteos: ['Zancadas', 'Peso Muerto Rumano', 'Sentadilla Libre'],
  pantorrillas: ['Sentadilla Libre', 'Zancadas', 'Plancha'],
  abdomen: ['Plancha', 'Sentadilla Libre', 'Remo con Barra'],
};

const FALLBACK_EXERCISES = [...new Set(Object.values(EXERCISES_BY_MUSCLE).flat())];

const toTitle = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

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
  const focus = [...primaryMuscles, ...secondaryMuscles].map(normalizeLabel).filter(Boolean);
  const selectedDays = Math.max(1, Math.min(days, SCHEDULE.length));
  const exercisesPerDay = duration >= 75 ? 5 : duration >= 45 ? 4 : 3;

  const workouts = Array.from({ length: selectedDays }).map((_, index) => {
    const mainMuscle = focus[index % focus.length] || 'pecho';
    const secondaryMuscle = focus[(index + 1) % focus.length] || 'espalda';
    const pool = [
      ...(EXERCISES_BY_MUSCLE[mainMuscle] ?? EXERCISES_BY_MUSCLE.pecho),
      ...(EXERCISES_BY_MUSCLE[secondaryMuscle] ?? EXERCISES_BY_MUSCLE.espalda),
      ...FALLBACK_EXERCISES,
    ];
    const uniqueExercises = [...new Set(pool)].slice(0, exercisesPerDay);

    return {
      name: `Dia ${index + 1}: ${toTitle(mainMuscle)} + ${toTitle(secondaryMuscle)}`,
      scheduled_day: SCHEDULE[index],
      exercises: uniqueExercises.map((name, exerciseIndex) => ({
        name,
        sets: exerciseIndex === 0 ? 4 : 3,
        reps: duration >= 60 ? 10 : 12,
      })),
    };
  });

  return {
    routineName: 'Plan RankingUp',
    description: `Rutina generada por backend para ${equipment}.`,
    workouts,
  };
};
