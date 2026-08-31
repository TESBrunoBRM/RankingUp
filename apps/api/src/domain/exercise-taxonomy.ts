/**
 * El dataset (hasaneyldrm/exercises-dataset) viene en ingles. La app es en
 * espanol, asi que traducimos las tres facetas de filtrado y los musculos.
 * Los nombres de los ejercicios se dejan en ingles: el dataset no trae nombres
 * traducidos y en gimnasio se usan tal cual.
 */

export const BODY_PART_ES: Record<string, string> = {
  back: 'Espalda',
  cardio: 'Cardio',
  chest: 'Pecho',
  'lower arms': 'Antebrazos',
  'lower legs': 'Pantorrillas',
  neck: 'Cuello',
  shoulders: 'Hombros',
  'upper arms': 'Brazos',
  'upper legs': 'Piernas',
  waist: 'Core',
};

export const TARGET_ES: Record<string, string> = {
  abs: 'Abdominales',
  abductors: 'Abductores',
  adductors: 'Aductores',
  biceps: 'Biceps',
  calves: 'Pantorrillas',
  'cardiovascular system': 'Sistema cardiovascular',
  delts: 'Deltoides',
  forearms: 'Antebrazos',
  glutes: 'Gluteos',
  hamstrings: 'Isquiosurales',
  lats: 'Dorsales',
  'levator scapulae': 'Elevador de la escapula',
  pectorals: 'Pectorales',
  quads: 'Cuadriceps',
  'serratus anterior': 'Serrato anterior',
  spine: 'Espalda baja',
  traps: 'Trapecios',
  triceps: 'Triceps',
  'upper back': 'Espalda alta',
};

export const EQUIPMENT_ES: Record<string, string> = {
  assisted: 'Asistido',
  band: 'Banda elastica',
  barbell: 'Barra',
  'body weight': 'Peso corporal',
  'bosu ball': 'Bosu',
  cable: 'Polea',
  dumbbell: 'Mancuernas',
  'elliptical machine': 'Eliptica',
  'ez barbell': 'Barra Z',
  hammer: 'Martillo',
  kettlebell: 'Kettlebell',
  'leverage machine': 'Maquina de palanca',
  'medicine ball': 'Balon medicinal',
  'olympic barbell': 'Barra olimpica',
  'resistance band': 'Banda de resistencia',
  roller: 'Rodillo',
  rope: 'Cuerda',
  'skierg machine': 'SkiErg',
  'sled machine': 'Trineo',
  'smith machine': 'Multipower',
  'stability ball': 'Fitball',
  'stationary bike': 'Bicicleta estatica',
  'stepmill machine': 'Escaladora',
  tire: 'Neumatico',
  'trap bar': 'Barra hexagonal',
  'upper body ergometer': 'Ergometro de brazos',
  weighted: 'Con lastre',
  'wheel roller': 'Rueda abdominal',
};

export const MUSCLE_ES: Record<string, string> = {
  abdominals: 'Abdominales',
  abductors: 'Abductores',
  adductors: 'Aductores',
  'ankle stabilizers': 'Estabilizadores del tobillo',
  ankles: 'Tobillos',
  biceps: 'Biceps',
  calves: 'Pantorrillas',
  chest: 'Pecho',
  core: 'Core',
  deltoids: 'Deltoides',
  delts: 'Deltoides',
  forearms: 'Antebrazos',
  glutes: 'Gluteos',
  hamstrings: 'Isquiosurales',
  hands: 'Manos',
  'hip flexors': 'Flexores de cadera',
  'latissimus dorsi': 'Dorsal ancho',
  lats: 'Dorsales',
  'lower back': 'Espalda baja',
  neck: 'Cuello',
  obliques: 'Oblicuos',
  pectorals: 'Pectorales',
  quadriceps: 'Cuadriceps',
  quads: 'Cuadriceps',
  rhomboids: 'Romboides',
  'rotator cuff': 'Manguito rotador',
  serratus: 'Serrato',
  'serratus anterior': 'Serrato anterior',
  shoulders: 'Hombros',
  soleus: 'Soleo',
  spine: 'Espalda baja',
  traps: 'Trapecios',
  trapezius: 'Trapecios',
  triceps: 'Triceps',
  'upper back': 'Espalda alta',
  'wrist extensors': 'Extensores de muneca',
  'wrist flexors': 'Flexores de muneca',
  wrists: 'Munecas',
};

const invert = (map: Record<string, string>): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [english, spanish] of Object.entries(map)) {
    result[normalizeSearchTerm(spanish)] = english;
  }
  return result;
};

export const normalizeSearchTerm = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const ES_TO_EN = {
  ...invert(BODY_PART_ES),
  ...invert(TARGET_ES),
  ...invert(EQUIPMENT_ES),
  ...invert(MUSCLE_ES),
};

/**
 * El indice de busqueda esta en ingles. Si el usuario escribe "pecho" o
 * "mancuernas", lo traducimos antes de consultar para que encuentre resultados.
 */
export const translateSearchTerm = (query: string): string => {
  const normalized = normalizeSearchTerm(query);
  return ES_TO_EN[normalized] ?? normalized;
};

export const toSpanishBodyPart = (value: string | null): string =>
  (value && BODY_PART_ES[value]) || value || 'Otro';

export const toSpanishTarget = (value: string | null): string =>
  (value && TARGET_ES[value]) || value || 'Otro';

export const toSpanishEquipment = (value: string | null): string =>
  (value && EQUIPMENT_ES[value]) || value || 'Otro';

export const toSpanishMuscle = (value: string | null): string =>
  (value && MUSCLE_ES[value]) || value || 'Otro';
