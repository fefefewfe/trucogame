import { create } from 'zustand';

export type ScreenId =
  | 'menu'
  | 'jugar'
  | 'partida'
  | 'historia'
  | 'torneos'
  | 'personajes'
  | 'tienda'
  | 'perfil'
  | 'config'
  | 'tutorial'
  | 'online';

interface NavState {
  screen: ScreenId;
  params: Record<string, unknown>;
  stack: ScreenId[];
  go(screen: ScreenId, params?: Record<string, unknown>): void;
  back(): void;
  home(): void;
}

export const useNav = create<NavState>()((set, get) => ({
  screen: 'menu',
  params: {},
  stack: [],
  go(screen, params = {}) {
    const { screen: current, stack } = get();
    if (current === screen) {
      set({ params });
      return;
    }
    set({ screen, params, stack: current === 'partida' ? stack : [...stack, current].slice(-8) });
  },
  back() {
    const stack = [...get().stack];
    const prev = stack.pop() ?? 'menu';
    set({ screen: prev, stack, params: {} });
  },
  home() {
    set({ screen: 'menu', stack: [], params: {} });
  },
}));
