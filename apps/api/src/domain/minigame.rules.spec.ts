import { calculateMinigameXp, MINIGAME_DAILY_REWARD_LIMIT } from './minigame.rules';

describe('minigame XP', () => {
  it.each([
    [0, 0], [9, 0], [10, 4], [25, 10], [50, 20], [99, 39], [100, 50],
  ])('awards %i reps exactly %i XP', (reps, expected) => {
    expect(calculateMinigameXp(reps)).toBe(expected);
  });

  it('caps a full day at the existing 250 XP', () => {
    expect(calculateMinigameXp(100) * MINIGAME_DAILY_REWARD_LIMIT).toBe(250);
  });
});
