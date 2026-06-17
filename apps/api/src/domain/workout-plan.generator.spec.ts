import { generateWorkoutPlan } from './workout-plan.generator';

describe('workout plan generator', () => {
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
