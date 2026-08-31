/**
 * Carga data/exercises.es-en.json en public.exercises.
 *
 * Datos: hasaneyldrm/exercises-dataset (MIT).
 * Media: (c) Gym visual — solo guardamos rutas relativas y la atribucion;
 * los binarios NO se redistribuyen desde este repo.
 *
 *   pnpm --filter @rankingup/api seed:exercises
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const SOURCE = 'gymvisual';
const BATCH_SIZE = 200;

interface SeedExercise {
  id: string;
  name: string;
  body_part: string;
  equipment: string;
  target: string;
  muscle_group: string;
  secondary_muscles: string[];
  instructions_es: string;
  instructions_en: string;
  steps_es: string[];
  steps_en: string[];
  media_id: string;
  image: string;
  gif: string;
  attribution: string;
}

// Mismo orden que ConfigModule en app.module.ts: apps/api/.env y luego la raiz.
const loadEnvFiles = () => {
  const candidates = [join(__dirname, '..', '.env'), join(__dirname, '..', '..', '..', '.env')];

  for (const path of candidates) {
    if (!existsSync(path)) continue;

    for (const line of readFileSync(path, 'utf-8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.trim().replace(/^["']|["']$/g, '');
    }
  }
};

const requireEnv = (key: string): string => {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Falta ${key}. Definelo antes de ejecutar el seed.`);
  return value;
};

async function main() {
  loadEnvFiles();

  const client = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const datasetPath = join(__dirname, '..', 'data', 'exercises.es-en.json');
  const dataset: SeedExercise[] = JSON.parse(readFileSync(datasetPath, 'utf-8'));
  console.log(`Cargando ${dataset.length} ejercicios desde ${datasetPath}`);

  const rows = dataset.map((exercise) => ({
    id: `${SOURCE}-${exercise.id}`,
    name: exercise.name,
    muscle_group: exercise.muscle_group,
    body_part: exercise.body_part,
    equipment: exercise.equipment,
    target: exercise.target,
    secondary_muscles: exercise.secondary_muscles,
    instructions_es: exercise.instructions_es,
    instructions_en: exercise.instructions_en,
    steps_es: exercise.steps_es,
    steps_en: exercise.steps_en,
    media_id: exercise.media_id,
    image_path: exercise.image,
    gif_path: exercise.gif,
    attribution: exercise.attribution,
    source: SOURCE,
  }));

  let inserted = 0;
  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    const { error } = await client.from('exercises').upsert(batch, { onConflict: 'id' });
    if (error) throw new Error(`Fallo el lote ${index / BATCH_SIZE + 1}: ${error.message}`);
    inserted += batch.length;
    console.log(`  ${inserted}/${rows.length}`);
  }

  const { count, error } = await client
    .from('exercises')
    .select('id', { count: 'exact', head: true })
    .eq('source', SOURCE);

  if (error) throw new Error(error.message);
  console.log(`Listo. ${count} ejercicios con source="${SOURCE}" en la tabla.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
