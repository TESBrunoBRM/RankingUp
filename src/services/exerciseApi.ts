import { Exercise } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_API_NINJAS_KEY;
const BASE_URL = 'https://api.api-ninjas.com/v1';

const options = {
  method: 'GET',
  headers: {
    'X-Api-Key': API_KEY || ''
  }
};

// Simple in-memory cache
const cache: { [key: string]: any } = {};

// Pre-curated list of absolute classic exercises for instant loading and better UX
const FEATURED_EXERCISES: Exercise[] = [
  { name: 'Press de Banca', type: 'Fuerza', muscle: 'Pecho', equipment: 'Barra', difficulty: 'Intermedio', instructions: 'Acuéstate en la banca y empuja la barra hacia arriba.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif' },
  { name: 'Jalón al Pecho', type: 'Fuerza', muscle: 'Espalda (Dorsales)', equipment: 'Máquina/Polea', difficulty: 'Principiante', instructions: 'Tira de la barra hacia la parte superior de tu pecho.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lat-Pulldown.gif' },
  { name: 'Elevaciones Laterales', type: 'Fuerza', muscle: 'Hombros', equipment: 'Mancuernas', difficulty: 'Principiante', instructions: 'Eleva las mancuernas hacia los lados hasta ponerlas paralelas al suelo.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif' },
  { name: 'Remo con Barra', type: 'Fuerza', muscle: 'Espalda Media', equipment: 'Barra', difficulty: 'Intermedio', instructions: 'Inclina el torso hacia adelante y tira de la barra hacia tu abdomen.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Row.gif' },
  { name: 'Sentadilla Libre (Squat)', type: 'Fuerza', muscle: 'Cuádriceps', equipment: 'Barra', difficulty: 'Intermedio', instructions: 'Baja flexionando las rodillas con la espalda recta y vuelve a subir.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Squat.gif' },
  { name: 'Sentadilla Hack', type: 'Fuerza', muscle: 'Cuádriceps', equipment: 'Máquina', difficulty: 'Intermedio', instructions: 'Coloca los hombros bajo las almohadillas y flexiona piernas en la máquina.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hack-Squat.gif' },
  { name: 'Sentadilla en Máquina Smith', type: 'Fuerza', muscle: 'Cuádriceps', equipment: 'Máquina', difficulty: 'Principiante', instructions: 'Usa la barra guiada de la máquina Smith para bajar con seguridad.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Smith-Machine-Squat.gif' },
  { name: 'Press Inclinado con Mancuernas', type: 'Fuerza', muscle: 'Pecho Superior', equipment: 'Mancuernas', difficulty: 'Intermedio', instructions: 'Empuja las mancuernas hacia arriba en una banca inclinada.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Press.gif' },
  { name: 'Peso Muerto Rumano', type: 'Fuerza', muscle: 'Isquiosurales', equipment: 'Barra', difficulty: 'Intermedio', instructions: 'Baja la barra manteniendo las piernas casi rectas para estirar la parte trasera del muslo.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Romanian-Deadlift.gif' },
  { name: 'Press Militar (Overhead Press)', type: 'Fuerza', muscle: 'Hombros', equipment: 'Barra', difficulty: 'Intermedio', instructions: 'Empuja la barra por encima de tu cabeza desde la altura del pecho.' },
  { name: 'Curl de Bíceps', type: 'Fuerza', muscle: 'Bíceps', equipment: 'Mancuernas', difficulty: 'Principiante', instructions: 'Flexiona los brazos acercando las mancuernas a tus hombros.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Curl.gif' },
  { name: 'Extensión de Tríceps en Polea', type: 'Fuerza', muscle: 'Tríceps', equipment: 'Polea', difficulty: 'Principiante', instructions: 'Empuja la cuerda hacia abajo hasta estirar completamente los brazos.', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pushdown.gif' }
];

export const exerciseApi = {
  // Ej: getExercises('muscle', 'biceps') o ('type', 'strength')
  async getExercises(filterType: 'muscle' | 'type' | 'difficulty' | 'name' = 'type', filterValue: string = 'strength'): Promise<Exercise[]> {
    // Return our highly curated hyper-premium list instantly to save API calls and ensure quality
    if (filterType === 'type' && filterValue === 'strength') {
       return FEATURED_EXERCISES;
    }

    const cacheKey = `ninjas_${filterType}_${filterValue}`;
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }

    try {
      const response = await fetch(`${BASE_URL}/exercises?${filterType}=${filterValue}`, options);
      if (!response.ok) {
        throw new Error('Error al fetchear ejercicios: ' + response.statusText);
      }
      const data = await response.json();
      cache[cacheKey] = data; // Cache the result
      return data;
    } catch (error) {
      console.error('Error fetching API Ninjas:', error);
      throw error;
    }
  },

  async getExerciseByName(name: string): Promise<Exercise | undefined> {
    const featured = FEATURED_EXERCISES.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (featured) return featured;

    const cacheKey = `ninjas_name_${name}`;
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }

    try {
      // Encode name correctly for the URL
      const response = await fetch(`${BASE_URL}/exercises?name=${encodeURIComponent(name)}`, options);
      if (!response.ok) {
        throw new Error(`Failed to fetch exercise with name: ${name}`);
      }
      const data: Exercise[] = await response.json();
      if (data.length > 0) {
         // Because search might return a list, take the exact match or first result
         cache[cacheKey] = data[0]; 
         return data[0];
      }
      return undefined;
    } catch (error) {
      console.error(`Error fetching exercise ${name}:`, error);
      throw error;
    }
  }
};
