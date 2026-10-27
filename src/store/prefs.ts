import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Difficulty } from '../ai/profiles';

interface PrefsState {
  numPlayers: 2 | 4 | 6;
  target: 15 | 30;
  flor: boolean;
  difficulty: Difficulty;
  rivals: string[];
  partners: string[];
  set(patch: Partial<Omit<PrefsState, 'set'>>): void;
}

/** Última configuración elegida para las partidas contra la computadora. */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      numPlayers: 2,
      target: 15,
      flor: false,
      difficulty: 'normal',
      rivals: ['tano'],
      partners: [],
      set: (patch) => set(patch),
    }),
    { name: 'truco-prefs-v1' },
  ),
);
