import { useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light';
export interface ThemePalette {
  mode: ThemeMode;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentFill: string;
  warningSurface: string;
  warningText: string;
}

export const palettes: Record<ThemeMode, ThemePalette> = {
  dark: {
    mode: 'dark', background: '#101114', surface: '#1A1A1A', surfaceAlt: '#24272D',
    border: '#333333', text: '#FFFFFF', muted: '#A0A0A0', accent: '#CCFF00',
    accentFill: '#CCFF00', warningSurface: '#211D14', warningText: '#E6D7AC',
  },
  light: {
    mode: 'light', background: '#F5F7F0', surface: '#FFFFFF', surfaceAlt: '#E9EDE3',
    border: '#C9D0C3', text: '#182018', muted: '#536052', accent: '#526F00',
    accentFill: '#C5EA40', warningSurface: '#FFF3DA', warningText: '#624A12',
  },
};

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(persist(
  (set) => ({ mode: 'dark', setMode: (mode) => set({ mode }) }),
  { name: 'rankingup-theme', storage: createJSONStorage(() => AsyncStorage) },
));

export const useThemePalette = (): ThemePalette => {
  const mode = useThemeStore((state) => state.mode);
  return palettes[mode];
};

export const useThemedStyles = <T,>(factory: (theme: ThemePalette) => T): T => {
  const theme = useThemePalette();
  return useMemo(() => factory(theme), [factory, theme]);
};
