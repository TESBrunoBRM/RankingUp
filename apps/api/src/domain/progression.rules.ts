import { normalizeLabel } from './normalize';

export interface PreviousSet { weight: number; reps: number }
export interface ProgressionSuggestion { weight: number; reps: number; reason: string }

export const suggestProgression = (
  previousSets: PreviousSet[] | null,
  targetSets: number,
  targetReps: number,
  muscle: string,
  priorSets: PreviousSet[] | null = null,
): ProgressionSuggestion | null => {
  if (!previousSets || targetSets < 1 || targetReps < 1) return null;
  const missedTarget = (sets: PreviousSet[]) => sets.length >= targetSets
    && sets.slice(0, targetSets).some((set) => set.weight > 0 && set.reps < targetReps);
  if (priorSets && missedTarget(previousSets) && missedTarget(priorSets)) {
    const lastWeight = Math.max(...previousSets.slice(0, targetSets).map((set) => set.weight));
    const weight = Math.max(2.5, Math.round(lastWeight * 0.9 / 2.5) * 2.5);
    return { weight, reps: targetReps, reason: 'Fallaste el objetivo dos sesiones seguidas. Reduce 10 % y vuelve a progresar.' };
  }
  if (previousSets.length < targetSets) return null;
  const completed = previousSets.slice(0, targetSets);
  if (completed.some((set) => set.reps < targetReps || set.weight <= 0)) return null;
  const normalized = normalizeLabel(muscle);
  const lowerBody = ['cuadriceps', 'quadriceps', 'quads', 'isquiosurales', 'hamstrings', 'gluteos', 'glutes', 'pantorrillas', 'calves']
    .includes(normalized);
  const increment = lowerBody ? 5 : 2.5;
  const weight = Math.max(...completed.map((set) => Number(set.weight))) + increment;
  return { weight, reps: targetReps, reason: `Completaste ${targetSets} series objetivo la ultima vez. Sube ${increment} kg.` };
};
