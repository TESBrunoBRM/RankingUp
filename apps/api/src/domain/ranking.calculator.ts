import type {
  BodyPartRank,
  BodySlug,
  ExerciseHistoryLog,
  ProfileRecord,
  RankProgress,
  RankRecord,
} from './domain.types';
import { getExerciseByName } from './exercise-catalog';
import { normalizeLabel } from './normalize';

export const getRankColor = (name: string): string => {
  const normalizedName = normalizeLabel(name);
  if (normalizedName.includes('hierro')) return '#A0A0A0';
  if (normalizedName.includes('bronce')) return '#CD7F32';
  if (normalizedName.includes('plata')) return '#E5E4E2';
  if (normalizedName.includes('oro')) return '#FFD700';
  if (normalizedName.includes('platino')) return '#1E90FF';
  if (normalizedName.includes('diamante')) return '#B9F2FF';
  return '#CCFF00';
};

export const calculateRankProgress = (xp: number, ranks: RankRecord[]): RankProgress => {
  const fallbackRank: RankRecord = { id: 0, name: 'Sin rango', min_xp: 0, max_xp: null };
  const currentRank = ranks.find((rank) => xp >= rank.min_xp && (rank.max_xp === null || xp <= rank.max_xp)) ?? ranks[0] ?? fallbackRank;
  const progressMin = currentRank.min_xp;
  const progressMax = currentRank.max_xp ?? progressMin + 1;
  const isMaxLevel = currentRank.max_xp === null;
  const range = isMaxLevel ? 1 : progressMax - progressMin;
  const progressPercent = isMaxLevel ? 100 : Math.min(100, Math.max(0, ((xp - progressMin) / range) * 100));

  return {
    currentRank: { ...currentRank, color: getRankColor(currentRank.name) },
    progressMin,
    progressMax,
    progressPercent,
    isMaxLevel,
    nextLevelXp: isMaxLevel ? null : Math.max(0, progressMax - xp + 1),
  };
};

export const mapMuscleToSlug = (muscle: string): BodySlug | null => {
  const normalizedMuscle = normalizeLabel(muscle);
  if (normalizedMuscle.includes('pecho') || normalizedMuscle === 'chest') return 'chest';
  if (normalizedMuscle.includes('hombro') || normalizedMuscle === 'shoulders') return 'deltoids';
  if (normalizedMuscle.includes('bic') || normalizedMuscle === 'biceps') return 'biceps';
  if (normalizedMuscle.includes('tric') || normalizedMuscle === 'triceps') return 'triceps';
  if (normalizedMuscle.includes('baja') || normalizedMuscle === 'lower back' || normalizedMuscle.includes('lumbar')) return 'lower-back';
  if (normalizedMuscle.includes('espalda') || ['lats', 'upper back', 'middle back'].includes(normalizedMuscle)) return 'upper-back';
  if (normalizedMuscle.includes('cuadriceps') || normalizedMuscle === 'quadriceps') return 'quadriceps';
  if (normalizedMuscle.includes('isquio') || normalizedMuscle === 'hamstrings') return 'hamstring';
  if (normalizedMuscle.includes('gluteo') || normalizedMuscle === 'glutes') return 'gluteal';
  if (normalizedMuscle.includes('pantorrilla') || normalizedMuscle === 'calves') return 'calves';
  if (normalizedMuscle.includes('abdomen') || normalizedMuscle.includes('abdom') || normalizedMuscle === 'abdominals') return 'abs';
  if (normalizedMuscle.includes('trape') || normalizedMuscle === 'traps') return 'trapezius';
  return null;
};

const targetForSlug = (slug: BodySlug): number => {
  if (['chest', 'upper-back', 'hamstring', 'gluteal'].includes(slug)) return 1.5;
  if (slug === 'quadriceps') return 1.8;
  if (slug === 'lower-back') return 2.0;
  if (slug === 'deltoids') return 0.8;
  if (['biceps', 'triceps', 'abs'].includes(slug)) return 0.5;
  return 1.0;
};

export const calculateMuscleData = (
  profile: ProfileRecord | null,
  ranks: RankRecord[],
  history: ExerciseHistoryLog[],
): BodyPartRank[] => {
  const userWeight = profile?.weight && profile.weight > 0 ? profile.weight : 75;
  const maxRelativeBySlug = new Map<BodySlug, number>();

  for (const log of history) {
    const exercise = getExerciseByName(log.exercise_id);
    const slug = exercise ? mapMuscleToSlug(exercise.muscle) : null;
    if (!slug) continue;

    const liftedWeight = log.weight && log.weight > 0 ? log.weight : userWeight * 0.2;
    const reps = log.reps || 1;
    const estimatedOneRepMax = liftedWeight * (36 / (37 - reps));
    const relativeOneRepMax = estimatedOneRepMax / userWeight;
    const previous = maxRelativeBySlug.get(slug) ?? 0;
    if (relativeOneRepMax > previous) {
      maxRelativeBySlug.set(slug, relativeOneRepMax);
    }
  }

  return [...maxRelativeBySlug.entries()].map(([slug, relativeOneRepMax]) => {
    const score = relativeOneRepMax / targetForSlug(slug);
    let rankIndex = 0;
    if (score >= 1.2) rankIndex = 5;
    else if (score >= 1.0) rankIndex = 4;
    else if (score >= 0.8) rankIndex = 3;
    else if (score >= 0.6) rankIndex = 2;
    else if (score >= 0.4) rankIndex = 1;

    const boundedIndex = Math.min(rankIndex, Math.max(0, ranks.length - 1));
    const rank = ranks[boundedIndex];
    return {
      slug,
      intensity: 1,
      color: getRankColor(rank?.name ?? 'Hierro'),
    };
  });
};
