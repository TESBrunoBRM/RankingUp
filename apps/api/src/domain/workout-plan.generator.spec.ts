import { generateWorkoutPlan, inspectWorkoutPlan, type TrainingGoal } from './workout-plan.generator';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FEATURED_EXERCISES } from './exercise-catalog';

describe('workout plan generator', () => {
  const fullBody = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Isquiosurales', 'Glúteos', 'Pantorrillas', 'Abdomen'];

  it.each([2, 3, 4, 5, 6])('does not omit legs from a complete %i-day plan', days => {
    const plan = generateWorkoutPlan({ equipment: 'Gimnasio Comercial', primaryMuscles: fullBody, secondaryMuscles: [], duration: 30, days });
    const names = plan.workouts.flatMap(day => day.exercises.map(exercise => exercise.name));
    expect(names).toContain('Sentadilla Libre');
    expect(names).toContain('Peso Muerto Rumano');
    expect(names).toContain('bodyweight standing calf raise');
    expect(names).toContain('Plancha');
    expect(names).toContain('Press de Banca');
    expect(names).toContain('Jalon al Pecho');
    expect(plan.workouts.some(day => /piernas/i.test(day.name))).toBe(true);
    expect(plan.workouts).toHaveLength(days);
    for (const day of plan.workouts) {
      expect(day.exercises.length).toBeLessThanOrEqual(3);
      expect(new Set(day.exercises.map(exercise => exercise.name)).size).toBe(day.exercises.length);
    }
  });

  it('covers both requested groups even in a short single session', () => {
    const plan = generateWorkoutPlan({ equipment: 'Gimnasio', primaryMuscles: ['Pecho'], secondaryMuscles: ['Cuádriceps'], duration: 30, days: 1 });
    const names = plan.workouts[0].exercises.map(exercise => exercise.name);
    expect(names).toContain('Press de Banca');
    expect(names).toContain('Sentadilla Libre');
  });

  it('rejects a complete plan that cannot fit instead of silently dropping muscles', () => {
    expect(() => generateWorkoutPlan({ equipment: 'Gimnasio', primaryMuscles: fullBody, secondaryMuscles: [], duration: 30, days: 1 })).toThrow(/días|duración/);
  });

  it('allows a complete single session when the time budget can fit the coverage', () => {
    const plan = generateWorkoutPlan({ equipment: 'Gimnasio', primaryMuscles: ['Cuerpo completo'], secondaryMuscles: [], duration: 120, days: 1 });
    expect(plan.workouts[0].exercises).toHaveLength(6);
    expect(plan.workouts[0].exercises.map(exercise => exercise.name)).toEqual(expect.arrayContaining(['Sentadilla Libre', 'Peso Muerto Rumano', 'bodyweight standing calf raise', 'Plancha']));
  });

  it('does not depend on the order in which muscles were selected', () => {
    const input = { equipment: 'Gimnasio', primaryMuscles: fullBody, secondaryMuscles: [], duration: 45, days: 4 };
    const first = generateWorkoutPlan(input);
    const reversed = generateWorkoutPlan({ ...input, primaryMuscles: [...fullBody].reverse() });
    expect(first.workouts).toEqual(reversed.workouts);
  });

  it('does not let high-priority core work displace secondary leg muscles', () => {
    const plan = generateWorkoutPlan({
      equipment: 'Gimnasio', primaryMuscles: ['Pecho', 'Espalda', 'Abdomen'],
      secondaryMuscles: ['Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Isquiosurales', 'Glúteos', 'Pantorrillas'], duration: 30, days: 2,
    });
    expect(plan.workouts[1].exercises.map(exercise => exercise.name)).toEqual(expect.arrayContaining(['Sentadilla Libre', 'Peso Muerto Rumano', 'bodyweight standing calf raise']));
  });

  it('accepts accented labels and deduplicates primary and secondary muscles', () => {
    const input = { equipment: 'Gimnasio', primaryMuscles: ['Cuádriceps'], secondaryMuscles: ['CUADRICEPS', '  isquiosurales  '], duration: 30, days: 2 };
    const plan = generateWorkoutPlan(input);
    expect(plan.description.match(/Cuádriceps/g)).toHaveLength(1);
    expect(plan.workouts.flatMap(day => day.exercises.map(exercise => exercise.name))).toContain('Peso Muerto Rumano');
  });

  it('expands legs instead of silently substituting chest exercises', () => {
    const plan = generateWorkoutPlan({ equipment: 'Gimnasio', primaryMuscles: ['Piernas'], secondaryMuscles: [], duration: 45, days: 2 });
    const names = plan.workouts.flatMap(day => day.exercises.map(exercise => exercise.name));
    expect(names).toEqual(expect.arrayContaining(['Sentadilla Libre', 'Peso Muerto Rumano', 'bodyweight standing calf raise']));
    expect(names).not.toContain('Press de Banca');
  });

  it('uses actual calf exercises when calves are the only requested group', () => {
    const plan = generateWorkoutPlan({ equipment: 'Gimnasio', primaryMuscles: ['Pantorrillas'], secondaryMuscles: [], duration: 60, days: 2 });
    for (const day of plan.workouts) for (const exercise of day.exercises) expect(exercise.name).toMatch(/calf raise/);
  });

  it('can fit every nonempty muscle combination in two short sessions, including mixed priorities', () => {
    for (let mask = 1; mask < (1 << fullBody.length); mask++) {
      const selected = fullBody.filter((_, index) => mask & (1 << index));
      for (const primaryMuscles of [selected, selected.slice(0, 1)]) {
        const secondaryMuscles = selected.filter(muscle => !primaryMuscles.includes(muscle));
        const plan = generateWorkoutPlan({ equipment: 'Gimnasio', primaryMuscles, secondaryMuscles, duration: 30, days: 2 });
        expect(plan.workouts).toHaveLength(2);
        for (const day of plan.workouts) {
          expect(day.exercises.length).toBeGreaterThan(0);
          expect(day.exercises.length).toBeLessThanOrEqual(3);
          expect(new Set(day.exercises.map(exercise => exercise.name)).size).toBe(day.exercises.length);
        }
      }
    }
  });

  it('only generates names that can be resolved by the exercise catalog', () => {
    const dataset = JSON.parse(readFileSync(resolve(__dirname, '../../data/exercises.es-en.json'), 'utf8')) as Array<{ name: string }>;
    const available = new Set([...dataset, ...FEATURED_EXERCISES].map(exercise => exercise.name));
    for (const muscle of fullBody) {
      const plan = generateWorkoutPlan({ equipment: 'Gimnasio', primaryMuscles: [muscle], secondaryMuscles: [], duration: 180, days: 2 });
      for (const day of plan.workouts) for (const exercise of day.exercises) expect(available.has(exercise.name)).toBe(true);
    }
  });

  it.each(['Desconocido', 'constructor', '__proto__'])('rejects unsupported group %s', muscle => {
    expect(() => generateWorkoutPlan({ equipment: 'Gimnasio', primaryMuscles: [muscle], secondaryMuscles: [], duration: 60, days: 3 })).toThrow(/no reconocido/);
  });

  it('generates the requested number of days within schedule bounds', () => {
    const plan = generateWorkoutPlan({
      equipment: 'Gimnasio',
      primaryMuscles: ['Pecho'],
      secondaryMuscles: ['Espalda'],
      duration: 60,
      days: 4,
    });

    expect(plan.workouts).toHaveLength(4);
    expect(plan.workouts.map((workout) => workout.scheduled_day)).toEqual(['MON', 'TUE', 'THU', 'FRI']);
  });

  it('changes exercise count by duration', () => {
    const shortPlan = generateWorkoutPlan({
      equipment: 'Gimnasio',
      primaryMuscles: ['Pecho'],
      secondaryMuscles: [],
      duration: 30,
      days: 1,
    });
    const longPlan = generateWorkoutPlan({
      equipment: 'Gimnasio',
      primaryMuscles: ['Pecho'],
      secondaryMuscles: [],
      duration: 90,
      days: 1,
    });

    expect(shortPlan.workouts[0].exercises).toHaveLength(3);
    expect(longPlan.workouts[0].exercises).toHaveLength(5);
  });

  it.each([2, 3, 4, 5, 6])('never prescribes gym equipment for a %i-day home plan', days => {
    const plan = generateWorkoutPlan({ equipment: 'Casa (Sin equipo)', primaryMuscles: fullBody, secondaryMuscles: [], duration: 60, days });
    const equipment = new Map(FEATURED_EXERCISES.map(item => [item.name, item.equipment]));
    const dataset = JSON.parse(readFileSync(resolve(__dirname, '../../data/exercises.es-en.json'), 'utf8')) as Array<{ name: string; equipment: string }>;
    const known = new Map(dataset.map(item => [item.name, item.equipment]));
    for (const day of plan.workouts) for (const exercise of day.exercises) {
      expect(equipment.get(exercise.name) ?? known.get(exercise.name)).toMatch(/^(Peso corporal|Peso corporal\/Mancuernas|body weight)$/);
      expect(exercise.name).not.toMatch(/bench|pull-up|inverted row|donkey|banca|barra|polea/i);
    }
    expect(plan.workouts.flatMap(day => day.exercises.map(item => item.name))).toEqual(expect.arrayContaining([
      'Puente con pasos de talones', 'Ángeles invertidos en el suelo', 'Curl de bíceps con autorresistencia',
    ]));
  });

  it('does not silently fall back to gym equipment when a home plan cannot fit', () => {
    expect(() => generateWorkoutPlan({ equipment: 'Casa (Sin equipo)', primaryMuscles: fullBody, secondaryMuscles: [], duration: 30, days: 1 })).toThrow(/duración/);
  });

  it('does not assume a bench or barbell is available with home dumbbells', () => {
    const plan = generateWorkoutPlan({ equipment: 'Casa (Mancuernas)', primaryMuscles: fullBody, secondaryMuscles: [], duration: 60, days: 3 });
    const names = plan.workouts.flatMap(day => day.exercises.map(item => item.name));
    expect(names).toContain('Remo con mancuernas de pie');
    expect(names).not.toEqual(expect.arrayContaining(['Press de Banca', 'dumbbell bench press']));
    for (const name of names) expect(name).not.toMatch(/banca|bench|barra|polea|hack/i);
  });

  it.each(['Desconocido', 'constructor', '__proto__'])('rejects unsupported equipment %s', equipment => {
    expect(() => generateWorkoutPlan({ equipment, primaryMuscles: ['Pecho'], secondaryMuscles: [], duration: 60, days: 3 })).toThrow(/entrenamiento no reconocido/);
  });

  it('prioritizes the bench press and longer rests for strength', () => {
    const plan = generateWorkoutPlan({ equipment: 'Gimnasio Comercial', trainingGoal: 'strength', primaryMuscles: ['Pecho'], secondaryMuscles: [], duration: 60, days: 2 });
    expect(plan.trainingGoal).toBe('strength');
    expect(plan.workouts[0].exercises[0]).toMatchObject({ name: 'Press de Banca', sets: 3, reps: 5, rest_seconds: 180 });
    expect(plan.assessment.decisions[0].reason).toMatch(/fuerza/);
  });

  it('includes incline cables and pec deck in a hypertrophy-focused chest plan', () => {
    const input = { equipment: 'Gimnasio Comercial', primaryMuscles: ['Pecho'], secondaryMuscles: [], duration: 60, days: 2 };
    const strength = generateWorkoutPlan({ ...input, trainingGoal: 'strength' });
    const growth = generateWorkoutPlan({ ...input, trainingGoal: 'hypertrophy' });
    expect(growth.workouts[0].exercises[0]).toMatchObject({ name: 'Press inclinado en poleas', reps: 10, rest_seconds: 120 });
    expect(growth.workouts[0].exercises).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Pec deck', reps: 12, rest_seconds: 75 })]));
    expect(strength.workouts).not.toEqual(growth.workouts);
  });

  it.each(['strength', 'hypertrophy'] as TrainingGoal[])('keeps home equipment constraints for %s and exposes actual weekly work', trainingGoal => {
    const input = { equipment: 'Casa (Sin equipo)', primaryMuscles: fullBody, secondaryMuscles: [], duration: 60, days: 3, trainingGoal };
    const plan = generateWorkoutPlan(input);
    expect(inspectWorkoutPlan(plan, input)).toEqual([]);
    for (const day of plan.workouts) for (const exercise of day.exercises) {
      expect(exercise.name).not.toMatch(/banca|polea|pec deck|barra|máquina|mancuerna|dominadas/i);
    }
    expect(plan.assessment.muscles).toHaveLength(10);
    expect(plan.assessment.estimatedMinutesByDay.every(minutes => minutes <= input.duration)).toBe(true);
    if (trainingGoal === 'strength') expect(plan.assessment.warnings.join(' ')).toMatch(/cargas altas/);
  });

  it('does not prescribe cable/machine variants with only dumbbells or a small gym', () => {
    for (const equipment of ['Casa (Mancuernas)', 'Gimnasio Pequeño']) {
      const plan = generateWorkoutPlan({ equipment, trainingGoal: 'hypertrophy', primaryMuscles: ['Pecho'], secondaryMuscles: [], duration: 60, days: 3 });
      for (const day of plan.workouts) for (const exercise of day.exercises) expect(exercise.name).not.toMatch(/polea|pec deck/i);
    }
  });

  it('reports low direct volume instead of claiming every requested muscle received enough hypertrophy work', () => {
    const plan = generateWorkoutPlan({ equipment: 'Gimnasio', trainingGoal: 'hypertrophy', primaryMuscles: fullBody, secondaryMuscles: [], duration: 30, days: 2 });
    expect(plan.assessment.warnings.join(' ')).toMatch(/menos de 10 series directas/);
    expect(plan.assessment.muscles.every(item => item.directSets + item.indirectSets > 0)).toBe(true);
  });

  it('validates actual output for equipment, duplicates, coverage, duration and ordering', () => {
    const input = { equipment: 'Casa (Sin equipo)', trainingGoal: 'strength' as const, primaryMuscles: ['Pecho'], secondaryMuscles: [], duration: 30, days: 2 };
    const valid = generateWorkoutPlan(input);
    const altered = structuredClone(valid);
    altered.workouts[0].exercises = [
      { name: 'Curl de Biceps', sets: 3, reps: 10, rest_seconds: 90 },
      { name: 'Press de Banca', sets: 5, reps: 5, rest_seconds: 300 },
      { name: 'Press de Banca', sets: 5, reps: 5, rest_seconds: 300 },
    ];
    expect(inspectWorkoutPlan(altered, input)).toEqual(expect.arrayContaining(['Equipo incompatible', 'Ejercicios duplicados', 'Tiempo excedido', 'Compuesto después de accesorios']));
    altered.workouts.forEach(day => { day.exercises = []; });
    expect(inspectWorkoutPlan(altered, input)).toEqual(expect.arrayContaining(['Sesión vacía', 'Grupo omitido: Pecho']));
  });

  it('rejects invalid training goals and keeps old clients on the balanced plan', () => {
    const input = { equipment: 'Gimnasio', primaryMuscles: ['Pecho'], secondaryMuscles: [], duration: 30, days: 2 };
    expect(generateWorkoutPlan(input).trainingGoal).toBe('balanced');
    expect(() => generateWorkoutPlan({ ...input, trainingGoal: 'constructor' as TrainingGoal })).toThrow(/Objetivo/);
  });

  it.each([2, 3])('spreads a %i-day schedule across the week', days => {
    const plan = generateWorkoutPlan({ equipment: 'Gimnasio', primaryMuscles: ['Pecho'], secondaryMuscles: [], duration: 30, days });
    expect(plan.workouts.map(day => day.scheduled_day)).toEqual(days === 2 ? ['MON', 'THU'] : ['MON', 'WED', 'FRI']);
  });
});
