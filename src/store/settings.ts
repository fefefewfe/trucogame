import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AnimationLevel = 'completas' | 'reducidas' | 'minimas';
export type BotSpeed = 'lenta' | 'normal' | 'rapida';

export interface SettingsState {
  master: number;
  music: number;
  voice: number;
  sfx: number;
  ambient: number;
  /** Usar la voz sintetizada del navegador cuando no hay grabaciones. */
  speech: boolean;
  animations: AnimationLevel;
  /** Celular: un toque juega la carta o se necesita un segundo toque para confirmar. */
  doubleTap: boolean;
  botSpeed: BotSpeed;
  fanHand: boolean;
  showEnvido: boolean;
  /** Usar la baraja escaneada de public/cartas si está disponible. */
  realDeck: boolean;
  /** Lenguaje fuerte (+18): los personajes a veces putean. */
  puteadas: boolean;
  /** Nombre de la voz del navegador elegida ('' = automática). */
  voiceName: string;
  /** Escuchar el micrófono para cantar con la voz. */
  microphone: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
}

const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      master: 0.9,
      music: 0.45,
      voice: 0.9,
      sfx: 0.8,
      ambient: 0.35,
      speech: true,
      animations: 'completas',
      doubleTap: Boolean(isTouch),
      botSpeed: 'normal',
      fanHand: true,
      showEnvido: true,
      realDeck: true,
      puteadas: false,
      voiceName: '',
      microphone: false,
      set: (patch) => set(patch),
    }),
    { name: 'truco-settings-v1' },
  ),
);

/** Multiplicador de duraciones según la velocidad elegida y el nivel de animación. */
export function paceFactor(): number {
  const s = useSettings.getState();
  const speed = s.botSpeed === 'lenta' ? 1.35 : s.botSpeed === 'rapida' ? 0.6 : 1;
  const anim = s.animations === 'minimas' ? 0.55 : s.animations === 'reducidas' ? 0.8 : 1;
  return speed * anim;
}
