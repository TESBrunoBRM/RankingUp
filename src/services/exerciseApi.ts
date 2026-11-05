import { CatalogExerciseDetail, Exercise } from '../types';
import { rankingUpApiClient } from './rankingUpApiClient';
import { catalogExerciseName, normalizeExerciseName } from '../constants/exerciseAliases';
import offlineGuides from '../../assets/data/exercise-guides.json';

const normalize = normalizeExerciseName;
const detailCache = new Map<string, Exercise>();
const findFeatured = (name: string): Exercise | undefined =>
  offlineGuides.find(exercise => normalize(exercise.name) === normalize(name));

const toExercise = (detail: CatalogExerciseDetail): Exercise => ({
  name: detail.name, type: detail.bodyPartLabel, muscle: detail.targetLabel,
  equipment: detail.equipmentLabel, difficulty: detail.muscleGroupLabel,
  instructions: detail.instructions, steps: detail.steps,
  gifUrl: detail.gifUrl ?? undefined, thumbnailUrl: detail.thumbnailUrl ?? undefined,
  attribution: detail.attribution ?? undefined,
});

// Keep the original movement's instructions/equipment. An exact alias supplies
// media only, so a catalog match cannot change a no-equipment guide.
const mergeDetails = (name: string, original?: CatalogExerciseDetail, alias?: CatalogExerciseDetail): Exercise | undefined => {
  const local = findFeatured(name);
  const base = local ?? (original ? toExercise(original) : alias ? toExercise(alias) : undefined);
  if (!base) return undefined;
  const media = alias?.gifUrl || alias?.thumbnailUrl ? alias : original;
  return { ...base, name,
    steps: local ? undefined : base.steps,
    gifUrl: media?.gifUrl ?? base.gifUrl, thumbnailUrl: media?.thumbnailUrl ?? base.thumbnailUrl,
    attribution: media?.attribution ?? base.attribution };
};

export const exerciseApi = {
  getOfflineExercise: findFeatured,
  async primeExercises(names: string[]): Promise<void> {
    const pending = [...new Set(names.map(name => name.trim()).filter(name => name && !detailCache.has(normalize(name))))];
    // The endpoint accepts at most 50 names; retain original + alias per chunk.
    for (let index = 0; index < pending.length; index += 25) {
      const chunk = pending.slice(index, index + 25);
      try {
        const details = await rankingUpApiClient.getExercisesByNames([...new Set(chunk.flatMap(name => [name, catalogExerciseName(name)]))]);
        const byName = new Map(details.map(detail => [normalize(detail.name), detail]));
        for (const name of chunk) {
          const original = byName.get(normalize(name));
          const alias = byName.get(normalize(catalogExerciseName(name)));
          const exercise = mergeDetails(name, original, alias);
          // Do not cache a miss/offline-only guide: later requests can recover.
          if (exercise && (original || alias)) detailCache.set(normalize(name), exercise);
        }
      } catch {
        // Exact offline guides remain available and later requests can retry.
      }
    }
  },

  async getExerciseByName(name: string): Promise<Exercise | undefined> {
    const key = normalize(name);
    if (detailCache.has(key)) return detailCache.get(key);
    const lookup = async (value: string) => {
      try { return await rankingUpApiClient.getExerciseByName(value) ?? undefined; }
      catch { return undefined; }
    };
    const aliasName = catalogExerciseName(name);
    const [original, alias] = await Promise.all([
      lookup(name), aliasName !== name ? lookup(aliasName) : Promise.resolve(undefined),
    ]);
    const exercise = mergeDetails(name, original, alias);
    if (exercise && (original || alias)) detailCache.set(key, exercise);
    return exercise;
  },
};
