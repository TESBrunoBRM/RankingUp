import { create } from 'zustand';

interface UIState {
  isPlanningMenuOpen: boolean;
  setPlanningMenuOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isPlanningMenuOpen: false,
  setPlanningMenuOpen: (isOpen) => set({ isPlanningMenuOpen: isOpen })
}));
