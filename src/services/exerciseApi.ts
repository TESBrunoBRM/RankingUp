import { CatalogExerciseDetail, Exercise } from '../types';
import { rankingUpApiClient } from './rankingUpApiClient';

const FEATURED_EXERCISES: Exercise[] = [
  { name: 'Press de Banca', type: 'Fuerza', muscle: 'Pecho', equipment: 'Barra', difficulty: 'Intermedio', instructions: 'Acostado en banca, baja la barra con control hasta el pecho y empuja verticalmente manteniendo los hombros estables.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif' },
  { name: 'Jalon al Pecho', type: 'Fuerza', muscle: 'Espalda (Dorsales)', equipment: 'Maquina/Polea', difficulty: 'Principiante', instructions: 'Tira la barra hacia la parte alta del pecho, junta escapulas y evita balancear el torso.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lat-Pulldown.gif' },
  { name: 'Elevaciones Laterales', type: 'Fuerza', muscle: 'Hombros', equipment: 'Mancuernas', difficulty: 'Principiante', instructions: 'Eleva las mancuernas hasta la linea de hombros con codos ligeramente flexionados.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif' },
  { name: 'Remo con Barra', type: 'Fuerza', muscle: 'Espalda Media', equipment: 'Barra', difficulty: 'Intermedio', instructions: 'Inclina el torso, mantiene espalda neutra y tira la barra hacia el abdomen.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Row.gif' },
  { name: 'Sentadilla Libre', type: 'Fuerza', muscle: 'Cuadriceps', equipment: 'Barra', difficulty: 'Intermedio', instructions: 'Baja con control manteniendo rodillas alineadas y sube empujando el suelo.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Squat.gif' },
  { name: 'Sentadilla Hack', type: 'Fuerza', muscle: 'Cuadriceps', equipment: 'Maquina', difficulty: 'Intermedio', instructions: 'Apoya la espalda en la maquina, baja profundo y extiende piernas sin bloquear agresivamente.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hack-Squat.gif' },
  { name: 'Sentadilla en Maquina Smith', type: 'Fuerza', muscle: 'Cuadriceps', equipment: 'Maquina', difficulty: 'Principiante', instructions: 'Ubica pies levemente adelantados, baja estable y sube siguiendo el riel.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Smith-Machine-Squat.gif' },
  { name: 'Press Inclinado con Mancuernas', type: 'Fuerza', muscle: 'Pecho Superior', equipment: 'Mancuernas', difficulty: 'Intermedio', instructions: 'En banca inclinada, empuja las mancuernas con recorrido controlado y sin perder retraccion escapular.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Press.gif' },
  { name: 'Peso Muerto Rumano', type: 'Fuerza', muscle: 'Isquiosurales', equipment: 'Barra', difficulty: 'Intermedio', instructions: 'Lleva la cadera atras, baja la barra cerca del cuerpo y vuelve apretando gluteos.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Romanian-Deadlift.gif' },
  { name: 'Press Militar', type: 'Fuerza', muscle: 'Hombros', equipment: 'Barra', difficulty: 'Intermedio', instructions: 'Empuja la barra desde claviculas hasta sobre la cabeza manteniendo abdomen firme.' },
  { name: 'Curl de Biceps', type: 'Fuerza', muscle: 'Biceps', equipment: 'Mancuernas', difficulty: 'Principiante', instructions: 'Flexiona los codos sin balancear el torso y controla la bajada.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Curl.gif' },
  { name: 'Extension de Triceps en Polea', type: 'Fuerza', muscle: 'Triceps', equipment: 'Polea', difficulty: 'Principiante', instructions: 'Empuja la cuerda hacia abajo y separa ligeramente al final para contraer triceps.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pushdown.gif' },
  { name: 'Plancha', type: 'Core', muscle: 'Abdominales', equipment: 'Peso corporal', difficulty: 'Principiante', instructions: 'Mantiene cuerpo recto, abdomen activo y respiracion controlada.' },
  { name: 'Zancadas', type: 'Fuerza', muscle: 'Gluteos', equipment: 'Peso corporal/Mancuernas', difficulty: 'Principiante', instructions: 'Da un paso al frente, baja estable y vuelve empujando con la pierna delantera.' },
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

// El catalogo completo (1.324 ejercicios) vive en la API. Estos 14 destacados
// se mantienen como respaldo offline y para las rutinas antiguas en espanol.
const detailCache = new Map<string, Exercise | undefined>();

const findFeatured = (name: string): Exercise | undefined => {
  const normalizedName = normalize(name);
  return (
    FEATURED_EXERCISES.find((exercise) => normalize(exercise.name) === normalizedName) ??
    FEATURED_EXERCISES.find((exercise) => normalize(exercise.name).includes(normalizedName))
  );
};

const toExercise = (detail: CatalogExerciseDetail): Exercise => ({
  name: detail.name,
  type: detail.bodyPartLabel,
  muscle: detail.targetLabel,
  equipment: detail.equipmentLabel,
  difficulty: detail.muscleGroupLabel,
  instructions: detail.instructions,
  gifUrl: detail.gifUrl ?? undefined,
});

export const exerciseApi = {
  /**
   * Precarga la ficha de varios ejercicios en una sola peticion y las deja en
   * cache, para que las pantallas de rutina no hagan una llamada por ejercicio.
   */
  async primeExercises(names: string[]): Promise<void> {
    const pending = names
      .map((name) => name.trim())
      .filter((name) => name && !detailCache.has(normalize(name)) && !findFeatured(name));

    if (pending.length === 0) return;

    try {
      const details = await rankingUpApiClient.getExercisesByNames([...new Set(pending)]);
      const byNormalizedName = new Map(details.map((detail) => [normalize(detail.name), detail]));

      for (const name of pending) {
        const key = normalize(name);
        const detail = byNormalizedName.get(key);
        detailCache.set(key, detail ? toExercise(detail) : undefined);
      }
    } catch {
      // Sin red: cada pantalla cae al lookup individual, que ya tolera el fallo.
    }
  },

  async getExerciseByName(name: string): Promise<Exercise | undefined> {
    const normalizedName = normalize(name);

    const featured = findFeatured(name);
    if (featured) return featured;

    if (detailCache.has(normalizedName)) return detailCache.get(normalizedName);

    try {
      const detail = await rankingUpApiClient.getExerciseByName(name);
      const mapped = detail ? toExercise(detail) : undefined;
      detailCache.set(normalizedName, mapped);
      return mapped;
    } catch {
      // Sin red o sin sesion: la pantalla se pinta sin previsualizacion.
      return undefined;
    }
  },
};
