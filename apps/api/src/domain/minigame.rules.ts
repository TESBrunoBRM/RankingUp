export const MINIGAME_REQUIRED_REPS = 100;
export const MINIGAME_MIN_REWARDED_REPS = 10;
export const MINIGAME_DAILY_REWARD_LIMIT = 5;
export const MINIGAME_MAX_REPS_PER_SECOND = 1.5;

export const calculateMinigameXp = (reps: number): number => {
  if (!Number.isInteger(reps) || reps < MINIGAME_MIN_REWARDED_REPS) return 0;
  return Math.floor(Math.min(reps, MINIGAME_REQUIRED_REPS) * 0.4)
    + (reps >= MINIGAME_REQUIRED_REPS ? 10 : 0);
};
