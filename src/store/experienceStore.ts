import { create } from 'zustand';
import type { ExperiencePreferences } from '../constants/experience';

// Server-backed preferences; never reuse another account's selection.
export const useExperienceStore = create<{
  userId: string | null;
  preferences: ExperiencePreferences | null;
  setPreferences: (userId: string, preferences: ExperiencePreferences | null) => void;
}>((set) => ({
  userId: null,
  preferences: null,
  setPreferences: (userId, preferences) => set({ userId, preferences }),
}));

export function useEnabledFeatures() {
  const features = useExperienceStore(state => state.preferences?.features);
  return {
    training: features?.includes('training') ?? false,
    nutrition: features?.includes('nutrition') ?? false,
    community: features?.includes('community') ?? false,
  };
}
