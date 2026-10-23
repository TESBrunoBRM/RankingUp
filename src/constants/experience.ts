export const EXPERIENCE_VERSION = '2026-10-23';
export type AppFeature = 'training' | 'nutrition' | 'community';

export interface ExperiencePreferences {
  features: AppFeature[];
  safetyVersion: string;
  acknowledgedAt: string;
  guideCompletedAt: string;
}

export const FEATURE_OPTIONS = [
  { id: 'training', icon: 'barbell-outline', title: 'Ejercicios y rutinas', description: 'Organiza tus ejercicios y registra tu avance, a tu ritmo.' },
  { id: 'nutrition', icon: 'restaurant-outline', title: 'Registro de alimentación', description: 'Anota comidas y agua. Las metas son estimaciones orientativas.' },
  { id: 'community', icon: 'people-outline', title: 'Comunidad y retos', description: 'Comparte tu progreso. Con ejercicios activos, accede también a rangos y juegos.' },
] as const;

export const FEATURE_GUIDES: Record<AppFeature, { title: string; steps: string[] }> = {
  training: { title: 'Tus ejercicios, paso a paso', steps: [
    'Abre Rutinas y pulsa + para crear una rutina manual o una propuesta automática.',
    'Añade ejercicios y revisa sus instrucciones. Elige movimientos y cargas adecuados para ti.',
    'Abre la rutina para iniciar una sesión y registrar series y repeticiones. Puedes detenerte cuando lo necesites; descansar también es parte del proceso.',
  ] },
  nutrition: { title: 'Un registro para orientarte', steps: [
    'Abre Nutrición y busca un alimento para registrar una comida. Puedes usar el registro sin calcular una meta personal.',
    'Si usas una foto, revisa ingredientes, porción y nutrientes antes de guardar: el análisis puede equivocarse.',
    'Si quieres una meta estimada, completa tu perfil físico desde Nutrición. Valida cambios de dieta con un profesional y respeta tus indicaciones de hidratación.',
  ] },
  community: { title: 'Participa a tu manera', steps: [
    'Encuentra el progreso de la comunidad en Inicio y busca personas desde tu perfil.',
    'Revisa la visibilidad de tu perfil antes de compartir. Publicar una sesión es opcional.',
    'Si también activaste ejercicios, verás rangos y juegos. Una puntuación no mide tu salud: evita competir por encima de tus límites.',
  ] },
};

export const TRAINING_SAFETY = 'Empieza de forma gradual y respeta tus límites. Si tienes una lesión, enfermedad, embarazo o dudas sobre qué actividad puedes realizar, consulta a un profesional antes de seguir una rutina. Detente ante dolor, mareos o falta de aire inusual. Ante dolor en el pecho, desmayo o dificultad respiratoria intensa, busca atención urgente.';
export const NUTRITION_SAFETY = 'Las calorías, nutrientes, porciones y metas de agua son estimaciones, no una dieta clínica. No uses la app para decidir sobre alergias, medicación o tratamientos. Si tienes una condición médica, restricciones de líquidos, embarazo o antecedentes de trastornos alimentarios, consulta a un profesional antes de cambiar tu alimentación.';

export function hasCurrentExperience(value: ExperiencePreferences | null): value is ExperiencePreferences {
  return Boolean(value && value.safetyVersion === EXPERIENCE_VERSION && value.acknowledgedAt && value.guideCompletedAt
    && value.features.length > 0 && value.features.every(feature => FEATURE_OPTIONS.some(option => option.id === feature)));
}
