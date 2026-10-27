import type { Difficulty } from '../ai/profiles';

export interface Rank {
  id: number;
  name: string;
  minRp: number;
  color: string;
  accent: string;
}

export const RANKS: Rank[] = [
  { id: 1, name: 'Aprendiz', minRp: 0, color: '#8a6a4a', accent: '#c9a77d' },
  { id: 2, name: 'Principiante', minRp: 100, color: '#9c6b3a', accent: '#e0a868' },
  { id: 3, name: 'Truquero', minRp: 250, color: '#a7a7ad', accent: '#e6e6ee' },
  { id: 4, name: 'Chamuyero', minRp: 450, color: '#4f8a5b', accent: '#9fdcaa' },
  { id: 5, name: 'Veterano', minRp: 700, color: '#3f6fb0', accent: '#9cc3f2' },
  { id: 6, name: 'Experto', minRp: 1000, color: '#7a4fb0', accent: '#c9a6f2' },
  { id: 7, name: 'Maestro del Envido', minRp: 1400, color: '#1f8a8a', accent: '#8ee8e0' },
  { id: 8, name: 'Rey del Truco', minRp: 1900, color: '#b8892a', accent: '#ffe08a' },
  { id: 9, name: 'Leyenda', minRp: 2500, color: '#b0303a', accent: '#ff9aa2' },
  { id: 10, name: 'Campeón Nacional', minRp: 3200, color: '#5aa0d8', accent: '#ffffff' },
];

export function rankFor(rp: number): Rank {
  let r = RANKS[0];
  for (const rank of RANKS) if (rp >= rank.minRp) r = rank;
  return r;
}

export function nextRank(rp: number): Rank | null {
  return RANKS.find((r) => r.minRp > rp) ?? null;
}

/** Experiencia necesaria para pasar del nivel `level` al siguiente. */
export function xpToNext(level: number): number {
  return 100 + (level - 1) * 40;
}

export function levelFromXp(totalXp: number): { level: number; into: number; needed: number } {
  let level = 1;
  let rest = totalXp;
  while (level < 99 && rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return { level, into: rest, needed: xpToNext(level) };
}

const DIFF_MULT: Record<Difficulty, number> = { facil: 1, normal: 1.4, dificil: 1.9 };

export interface Rewards {
  xp: number;
  coins: number;
  rp: number;
}

export function matchRewards(opts: {
  won: boolean;
  abandoned: boolean;
  difficulty: Difficulty;
  target: 15 | 30;
  myScore: number;
  bonusCoins?: number;
}): Rewards {
  if (opts.abandoned) return { xp: 0, coins: 0, rp: -10 };
  const mult = DIFF_MULT[opts.difficulty] * (opts.target === 30 ? 1.5 : 1);
  const xp = Math.round((35 + (opts.won ? 65 : 0) + opts.myScore * 2) * mult);
  const coins = Math.round((opts.won ? 50 : 15) * mult) + (opts.bonusCoins ?? 0);
  const rpWin: Record<Difficulty, number> = { facil: 8, normal: 16, dificil: 26 };
  const rpLoss: Record<Difficulty, number> = { facil: -12, normal: -9, dificil: -6 };
  const rp = opts.won ? Math.round(rpWin[opts.difficulty] * (opts.target === 30 ? 1.4 : 1)) : rpLoss[opts.difficulty];
  return { xp, coins, rp };
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: 'estrella' | 'llama' | 'espada' | 'copa' | 'flor' | 'corona' | 'escudo' | 'rayo' | 'mate' | 'trofeo' | 'ojo' | 'cohete';
  color: string;
}

export const BADGES: Badge[] = [
  { id: 'primera', name: 'Primera victoria', description: 'Ganá tu primera partida.', icon: 'estrella', color: '#e8b23c' },
  { id: 'racha3', name: 'En racha', description: 'Ganá 3 partidas seguidas.', icon: 'llama', color: '#e2603a' },
  { id: 'racha7', name: 'Imparable', description: 'Ganá 7 partidas seguidas.', icon: 'cohete', color: '#c0392b' },
  { id: 'trucos25', name: 'Truquero de ley', description: 'Ganá 25 manos con truco.', icon: 'espada', color: '#2a56a6' },
  { id: 'envidos25', name: 'Rey de los tantos', description: 'Ganá 25 envidos.', icon: 'copa', color: '#b3242c' },
  { id: 'flor5', name: 'Flor y nata', description: 'Cantá 5 flores.', icon: 'flor', color: '#2f7a3a' },
  { id: 'perfecta', name: 'Partida perfecta', description: 'Ganá una partida sin que el rival sume.', icon: 'escudo', color: '#5aa0d8' },
  { id: 'dificil', name: 'Sin miedo', description: 'Ganale a un bot difícil.', icon: 'rayo', color: '#7a4fb0' },
  { id: 'veterano50', name: 'Habitué del bar', description: 'Jugá 50 partidas.', icon: 'mate', color: '#8a6a4a' },
  { id: 'campeon', name: 'Vencedor del Campeón', description: 'Ganá la gran final del modo historia.', icon: 'corona', color: '#c9a24a' },
  { id: 'torneo', name: 'Campeón de torneo', description: 'Ganá un torneo.', icon: 'trofeo', color: '#e8b23c' },
  { id: 'lector', name: 'Te leo la mente', description: 'Ganá 10 manos porque el rival no quiso tu truco.', icon: 'ojo', color: '#1f8a8a' },
];
