import { suggestProgression } from './progression.rules';

describe('progression suggestions', () => {
  it('does not suggest without history', () => expect(suggestProgression(null, 3, 8, 'Pecho')).toBeNull());
  it('suggests 2.5 kg after all upper-body targets', () => expect(suggestProgression([
    { weight: 80, reps: 8 }, { weight: 80, reps: 9 }, { weight: 80, reps: 8 },
  ], 3, 8, 'Pecho')).toEqual({ weight: 82.5, reps: 8, reason: expect.any(String) }));
  it('suggests 5 kg for lower body', () => expect(suggestProgression([
    { weight: 100, reps: 10 }, { weight: 100, reps: 10 },
  ], 2, 10, 'Cuadriceps')?.weight).toBe(105));
  it('does not suggest when target reps were missed', () => expect(suggestProgression([
    { weight: 100, reps: 10 }, { weight: 100, reps: 7 },
  ], 2, 10, 'Cuadriceps')).toBeNull());

  it('suggests a 10 percent deload after two consecutive missed sessions', () => expect(suggestProgression(
    [{ weight: 80, reps: 8 }, { weight: 80, reps: 6 }], 2, 8, 'Pecho',
    [{ weight: 80, reps: 7 }, { weight: 80, reps: 8 }],
  )).toEqual(expect.objectContaining({ weight: 72.5, reps: 8 })));

  it('does not deload after only one miss or an incomplete prior session', () => {
    const latest = [{ weight: 80, reps: 8 }, { weight: 80, reps: 6 }];
    expect(suggestProgression(latest, 2, 8, 'Pecho', [{ weight: 80, reps: 8 }, { weight: 80, reps: 8 }])).toBeNull();
    expect(suggestProgression(latest, 2, 8, 'Pecho', [{ weight: 80, reps: 6 }])).toBeNull();
  });
});
