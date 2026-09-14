import { estimateOneRepMax } from './strength.calculator';
import { calculateWorkoutXp, MAX_SESSION_XP } from './xp.rules';

export type SetKind = 'normal' | 'warmup' | 'drop' | 'failure';
export interface SessionSet {
  exerciseId: string;
  weight: number;
  reps: number;
  kind?: SetKind;
  setIndex?: number;
}

export interface PersonalRecord {
  exerciseId: string;
  previous: number;
  current: number;
}

export const countsForProgress = (kind: SetKind = 'normal'): boolean => kind === 'normal' || kind === 'failure';

export const calculateVolume = (sets: SessionSet[]): number =>
  Number(sets.filter((set) => countsForProgress(set.kind))
    .reduce((total, set) => total + set.weight * set.reps, 0).toFixed(2));

export const detectPersonalRecords = (sets: SessionSet[], previousBests: Map<string, number>): PersonalRecord[] => {
  const bestInSession = new Map<string, number>();
  for (const set of sets) {
    if (!countsForProgress(set.kind)) continue;
    const current = estimateOneRepMax(set.weight, set.reps);
    if (current > (bestInSession.get(set.exerciseId) ?? 0)) bestInSession.set(set.exerciseId, current);
  }
  return [...bestInSession].flatMap(([exerciseId, current]) => {
    const previous = previousBests.get(exerciseId) ?? 0;
    return previous > 0 && current > previous ? [{ exerciseId, previous, current }] : [];
  });
};

export const calculateSessionXp = (sets: SessionSet[], muscles: string[], records: PersonalRecord[]): number => {
  const qualifyingMuscles = muscles.filter((_, index) => countsForProgress(sets[index].kind));
  return Math.min(MAX_SESSION_XP, calculateWorkoutXp(qualifyingMuscles) + Math.min(30, records.length * 10));
};
