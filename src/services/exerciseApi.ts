import { Exercise } from '../types';

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

export const exerciseApi = {
  async getExercises(
    filterType: 'muscle' | 'type' | 'difficulty' | 'name' = 'type',
    filterValue: string = 'strength'
  ): Promise<Exercise[]> {
    const normalizedFilter = normalize(filterValue);

    if (filterType === 'type' && ['strength', 'fuerza'].includes(normalizedFilter)) {
      return FEATURED_EXERCISES;
    }

    const results = FEATURED_EXERCISES.filter((exercise) =>
      normalize(String(exercise[filterType])).includes(normalizedFilter)
    );

    return results.length > 0 ? results : FEATURED_EXERCISES;
  },

  async getExerciseByName(name: string): Promise<Exercise | undefined> {
    const normalizedName = normalize(name);
    return (
      FEATURED_EXERCISES.find((exercise) => normalize(exercise.name) === normalizedName) ??
      FEATURED_EXERCISES.find((exercise) => normalize(exercise.name).includes(normalizedName))
    );
  },
};
