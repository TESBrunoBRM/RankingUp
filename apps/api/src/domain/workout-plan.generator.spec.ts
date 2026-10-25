import { generateWorkoutPlan } from './workout-plan.generator';
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
    expect(plan.workouts.map((workout) => workout.scheduled_day)).toEqual(['MON', 'TUE', 'WED', 'THU']);
  });

  it('changes exercise count by duration', () => {
    const shortPlan = generateWorkoutPlan({
      equipment: 'Casa',
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
});
