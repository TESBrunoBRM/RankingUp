import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FEATURED_EXERCISES } from '../src/domain/exercise-catalog';
import { normalizeLabel } from '../src/domain/normalize';
import { generateWorkoutPlan, inspectWorkoutPlan, WorkoutPlanInputError, type TrainingGoal, type WorkoutPlanInput } from '../src/domain/workout-plan.generator';

const allMuscles = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Isquiosurales', 'Glúteos', 'Pantorrillas', 'Abdomen'];
const selections = [
  ...allMuscles.map(muscle => ({ name: muscle, primary: [muscle], secondary: [] as string[] })),
  { name: 'Completo', primary: allMuscles, secondary: [] },
  { name: 'Piernas', primary: allMuscles.slice(5, 9), secondary: [] },
  { name: 'Superior', primary: allMuscles.slice(0, 5), secondary: [] },
  { name: 'Pecho y piernas', primary: ['Pecho'], secondary: ['Cuádriceps', 'Isquiosurales', 'Glúteos', 'Pantorrillas'] },
  { name: 'Brazos', primary: ['Bíceps', 'Tríceps'], secondary: [] },
  { name: 'Pecho prioritario completo', primary: ['Pecho'], secondary: allMuscles.slice(1) },
];
const equipmentProfiles: Record<string, string[]> = {
  'Casa (Sin equipo)': [], 'Casa (Mancuernas)': ['dumbbell'], 'Casa (Bandas)': ['band'],
  'Calistenia (Parque)': ['pullup'], 'Gimnasio Pequeño': ['dumbbell', 'barbell', 'bench', 'pullup'],
  'Gimnasio Comercial': ['dumbbell', 'barbell', 'bench', 'pullup', 'cable', 'machine'],
};
// Independent catalog cross-check: do not trust the generator's equipment tags.
const dataset = JSON.parse(readFileSync(resolve(__dirname, '../data/exercises.es-en.json'), 'utf8')) as Array<{ name: string; equipment: string }>;
const catalog = new Map([...dataset, ...FEATURED_EXERCISES].map(item => [item.name, item.equipment]));
const equipmentLabels: Record<string, string[]> = {
  'peso corporal': [], 'peso corporal/mancuernas': [], 'body weight': [],
  barra: ['barbell'], mancuernas: ['dumbbell'], dumbbell: ['dumbbell'], maquina: ['machine'],
  polea: ['cable'], 'maquina/polea': ['cable'], 'banda elastica': ['band'],
  'barra de dominadas': ['pullup'], 'poleas y banco inclinado': ['cable', 'bench'], 'barra y banco': ['barbell', 'bench'],
};
const alsoNeedsBench = new Set(['Press de Banca', 'Press Inclinado con Mancuernas', 'dumbbell fly', 'dumbbell bench press', 'donkey calf raise']);
const checks: Record<string, number> = { catalog: 0, equipment: 0, coverage: 0, duplicate: 0, duration: 0, prescription: 0, order: 0, days: 0, unexpected: 0 };
const groups = new Map<string, { attempted: number; generated: number; rejected: number; failed: number }>();
const failures: Array<{ input: WorkoutPlanInput; errors: string[] }> = [];
const rejections: Array<{ input: WorkoutPlanInput; reason: string }> = [];
const examples: Record<string, unknown> = {};
let attempted = 0; let generated = 0; let rejected = 0; let decisions = 0; let invalidOutputs = 0;

for (const [equipment, available] of Object.entries(equipmentProfiles)) {
  for (const trainingGoal of ['balanced', 'strength', 'hypertrophy'] as TrainingGoal[]) {
    const group = { attempted: 0, generated: 0, rejected: 0, failed: 0 };
    groups.set(`${equipment} · ${trainingGoal}`, group);
    for (const duration of [30, 45, 60, 90, 120]) for (const days of [2, 3, 4, 5, 6]) for (const selection of selections) {
      const input: WorkoutPlanInput = { equipment, trainingGoal, duration, days, primaryMuscles: selection.primary, secondaryMuscles: selection.secondary };
      attempted++; group.attempted++;
      try {
        const plan = generateWorkoutPlan(input);
        generated++; group.generated++;
        const errors = inspectWorkoutPlan(plan, input);
        for (const day of plan.workouts) {
          const estimated = 5 + day.exercises.reduce((sum, item) => sum + (item.sets * item.reps * 4
            * (['Zancadas', 'Curl de bíceps con autorresistencia'].includes(item.name) ? 2 : 1)
            + (item.sets - 1) * item.rest_seconds + 60) / 60, 0);
          if (estimated > duration + 1e-9) { checks.duration++; errors.push('Independent duration check'); }
          for (const exercise of day.exercises) {
            decisions++;
            const label = catalog.get(exercise.name);
            if (!label) { checks.catalog++; errors.push(`Missing catalog: ${exercise.name}`); continue; }
            const requirements = equipmentLabels[normalizeLabel(label)];
            if (!requirements) { checks.catalog++; errors.push(`Unknown equipment label: ${label}`); continue; }
            const required = [...requirements, ...(alsoNeedsBench.has(exercise.name) ? ['bench'] : [])];
            if (required.some(item => !available.includes(item))) { checks.equipment++; errors.push(`Incompatible: ${exercise.name}`); }
          }
        }
        for (const error of errors) {
          if (/omitido/.test(error)) checks.coverage++;
          if (/duplicad/.test(error)) checks.duplicate++;
          if (/Prescrip/.test(error)) checks.prescription++;
          if (/Compuesto/.test(error)) checks.order++;
          if (/días incorrecto/.test(error)) checks.days++;
        }
        if (errors.length) {
          invalidOutputs++;
          group.failed++;
          if (failures.length < 30) failures.push({ input, errors });
        }
        if (equipment === 'Gimnasio Comercial' && selection.name === 'Pecho' && duration === 60 && days === 3) examples[trainingGoal] = plan;
      } catch (error) {
        if (error instanceof WorkoutPlanInputError) {
          rejected++; group.rejected++;
          if (rejections.length < 100) rejections.push({ input, reason: error.message });
        }
        else {
          checks.unexpected++; group.failed++;
          if (failures.length < 30) failures.push({ input, errors: [error instanceof Error ? error.message : String(error)] });
        }
      }
    }
  }
}
const failed = [...groups.values()].reduce((sum, group) => sum + group.failed, 0);
const summary = { attempted, generated, rejected, failed, decisions, observedInvalidOutputPercent: generated ? invalidOutputs / generated * 100 : null, checks };
const outDir = resolve(__dirname, '../../../artifacts/planner-audit');
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'latest.json'), JSON.stringify({ summary, groups: Object.fromEntries(groups), failures, rejections, examples }, null, 2));
const rows = [...groups].map(([name, value]) => `| ${name} | ${value.attempted} | ${value.generated} | ${value.rejected} | ${value.failed} |`).join('\n');
writeFileSync(resolve(outDir, 'latest.md'), `# Auditoría del planificador\n\n` +
  `${attempted} combinaciones deterministas de 16 selecciones musculares, 6 equipos, 3 objetivos, 5 duraciones y 5 frecuencias.\n\n` +
  `- Planes generados: ${generated}.\n- Solicitudes rechazadas por límites de capacidad/tiempo: ${rejected}.\n- Salidas con errores observados: ${failed}.\n- Selecciones de ejercicio examinadas: ${decisions}.\n\n` +
  `| Perfil | Casos | Generados | Rechazados | Errores |\n|---|---:|---:|---:|---:|\n${rows}\n\n` +
  `Se contrasta el equipo con las fichas del catálogo, además del control interno de cobertura, duplicados, días, orden, tiempo y prescripciones. ` +
  `Los rechazos son límites del algoritmo y no una prueba matemática de que no exista otra distribución posible. ` +
  `Esta matriz no es una muestra aleatoria: el porcentaje observado no equivale a un margen de error estadístico, validación clínica ni garantía de resultados físicos. ` +
  `La duración es estimada, sin medir ritmos individuales. Los ejemplos completos y los fallos, si existen, están en latest.json.\n`);
console.log(JSON.stringify(summary, null, 2));
if (failed) process.exitCode = 1;
