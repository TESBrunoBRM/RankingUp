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
  // Vocabulario `target` del dataset de ejercicios (en ingles).
  pectorals: 15,
  'upper back': 15,
  quads: 15,
  spine: 15,
  abs: 10,
  delts: 10,
  forearms: 10,
  'cardiovascular system': 10,
  adductors: 10,
  abductors: 10,
};

export const getXpForMuscle = (muscle: string): number =>
  XP_RULES[normalizeLabel(muscle)] ?? 5;

/**
 * Techo de XP por sesion registrada. El DTO ya limita el numero de series, pero
 * el XP se suma por serie: sin este tope, ampliar `@ArrayMaxSize` el dia de
 * manana volveria a abrir la puerta a inflar el ranking con una sola peticion.
 */
export const MAX_SESSION_XP = 300;

export const calculateWorkoutXp = (muscles: string[]): number =>
  Math.min(
    muscles.reduce((total, muscle) => total + getXpForMuscle(muscle), 0),
    MAX_SESSION_XP,
  );
