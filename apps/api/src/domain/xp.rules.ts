import { normalizeLabel } from './normalize';

const XP_RULES: Record<string, number> = {
  chest: 15,
  lats: 15,
  'middle back': 15,
  'lower back': 15,
  quadriceps: 15,
  hamstrings: 15,
  glutes: 15,
  pecho: 15,
  'pecho superior': 15,
  'espalda (dorsales)': 15,
  'espalda media': 15,
  cuadriceps: 15,
  isquiosurales: 15,
  gluteos: 15,
  biceps: 10,
  triceps: 10,
  shoulders: 10,
  traps: 10,
  calves: 10,
  abdominals: 10,
  hombros: 10,
  pantorrillas: 10,
  abdominales: 10,
};

export const getXpForMuscle = (muscle: string): number =>
  XP_RULES[normalizeLabel(muscle)] ?? 5;

export const calculateWorkoutXp = (muscles: string[]): number =>
  muscles.reduce((total, muscle) => total + getXpForMuscle(muscle), 0);
