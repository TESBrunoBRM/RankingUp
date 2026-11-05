// Exact movement/equipment matches only. Never substitute a similar exercise
// just to fill an empty animation (e.g. weighted plank for a bodyweight plank).
export const EXERCISE_CATALOG_ALIASES: Record<string, string> = {
  'press de banca': 'barbell bench press',
  'jalon al pecho': 'cable lat pulldown full range of motion',
  'elevaciones laterales': 'dumbbell lateral raise',
  'remo con barra': 'barbell bent over row',
  'sentadilla libre': 'barbell full squat',
  'sentadilla hack': 'sled hack squat',
  'sentadilla en maquina smith': 'smith squat',
  'press inclinado con mancuernas': 'dumbbell incline bench press',
  'peso muerto rumano': 'barbell romanian deadlift',
  'curl de biceps': 'dumbbell biceps curl',
  'extension de triceps en polea': 'cable pushdown (with rope attachment)',
  'pec deck': 'lever seated fly',
  'prensa de piernas': 'sled 45° leg press (side pov)',
  'remo en polea sentado': 'cable seated row',
  'press inclinado en poleas': 'cable incline bench press',
  'curl femoral en maquina': 'lever lying leg curl',
  'dominadas en parque': 'pull-up',
  'peso muerto rumano con mancuernas': 'dumbbell romanian deadlift',
  'remo con mancuernas de pie': 'dumbbell bent over row',
};
export const normalizeExerciseName = (value: string) => value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export const catalogExerciseName = (name: string): string => EXERCISE_CATALOG_ALIASES[normalizeExerciseName(name)] ?? name.trim();
