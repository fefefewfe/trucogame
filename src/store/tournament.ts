import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BotProfile, Difficulty } from '../ai/profiles';
import { CHARACTERS, getCharacter } from '../game/characters';
import { simulateBotMatch } from '../game/simulate';

export interface TPlayer {
  name: string;
  characterId: string;
  human: boolean;
  profile?: BotProfile;
}

export interface TMatch {
  a: number;
  b: number;
  winner?: number;
  scores?: [number, number];
}

export interface Tournament {
  id: string;
  name: string;
  size: 8 | 16;
  target: 15 | 30;
  difficulty: Difficulty;
  players: TPlayer[];
  rounds: TMatch[][];
  round: number;
  finished: boolean;
  champion?: number;
  humanOut: boolean;
  prizeClaimed: boolean;
}

const NAMES = ['Coco', 'Beto', 'Chiche', 'Pocho', 'Nené', 'Tito', 'Marga', 'Cacho', 'Lili', 'Quique', 'Mirta', 'Rubén', 'Tota', 'Fito', 'Cuca', 'Nacho'];

export const ROUND_NAMES: Record<number, string> = { 16: 'Octavos de final', 8: 'Cuartos de final', 4: 'Semifinal', 2: 'Final' };

export function tournamentPrize(size: 8 | 16, difficulty: Difficulty, roundsWon: number, champion: boolean): number {
  const base = size === 16 ? 90 : 70;
  const mult = difficulty === 'facil' ? 1 : difficulty === 'normal' ? 1.5 : 2.2;
  return Math.round((roundsWon * base + (champion ? base * 3 : 20)) * mult);
}

interface TournamentState {
  current: Tournament | null;
  create(opts: { size: 8 | 16; target: 15 | 30; difficulty: Difficulty; human: { name: string; characterId: string } }): void;
  humanMatch(): { match: TMatch; opponent: TPlayer } | null;
  reportHuman(won: boolean, scores: [number, number]): void;
  /** Simula las partidas de bots que faltan en la ronda actual y avanza. */
  advance(): void;
  clear(): void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const useTournament = create<TournamentState>()(
  persist(
    (set, get) => ({
      current: null,
      create({ size, target, difficulty, human }) {
        const chars = shuffle(CHARACTERS.filter((c) => c.id !== human.characterId));
        const names = shuffle(NAMES);
        const players: TPlayer[] = [{ name: human.name, characterId: human.characterId, human: true }];
        for (let i = 1; i < size; i++) {
          const ch = chars[(i - 1) % chars.length];
          const unique = i <= chars.length;
          const diff: Difficulty =
            difficulty === 'facil' ? (Math.random() < 0.7 ? 'facil' : 'normal') : difficulty === 'normal' ? (Math.random() < 0.6 ? 'normal' : Math.random() < 0.5 ? 'facil' : 'dificil') : Math.random() < 0.7 ? 'dificil' : 'normal';
          players.push({
            name: unique ? ch.name : `${names[i % names.length]}`,
            characterId: ch.id,
            human: false,
            profile: { difficulty: diff, personality: ch.personality },
          });
        }
        const order = [0, ...shuffle(players.slice(1).map((_, i) => i + 1))];
        // el humano en una punta del cuadro, el resto mezclado
        const first: TMatch[] = [];
        for (let i = 0; i < size; i += 2) first.push({ a: order[i], b: order[i + 1] });
        set({
          current: {
            id: `${Date.now()}`,
            name: size === 16 ? 'Copa del Interior' : 'Torneo del Barrio',
            size,
            target,
            difficulty,
            players,
            rounds: [first],
            round: 0,
            finished: false,
            humanOut: false,
            prizeClaimed: false,
          },
        });
      },
      humanMatch() {
        const t = get().current;
        if (!t || t.finished || t.humanOut) return null;
        const match = t.rounds[t.round].find((m) => (m.a === 0 || m.b === 0) && m.winner === undefined);
        if (!match) return null;
        const opp = match.a === 0 ? match.b : match.a;
        return { match, opponent: t.players[opp] };
      },
      reportHuman(won, scores) {
        const t = get().current;
        if (!t) return;
        const rounds = t.rounds.map((r) => r.map((m) => ({ ...m })));
        const m = rounds[t.round].find((x) => (x.a === 0 || x.b === 0) && x.winner === undefined);
        if (!m) return;
        const opp = m.a === 0 ? m.b : m.a;
        m.winner = won ? 0 : opp;
        m.scores = m.a === 0 ? scores : [scores[1], scores[0]];
        set({ current: { ...t, rounds, humanOut: !won } });
      },
      advance() {
        const t = get().current;
        if (!t || t.finished) return;
        const rounds = t.rounds.map((r) => r.map((m) => ({ ...m })));
        const current = rounds[t.round];
        // No avanzar si el humano todavía tiene que jugar en esta ronda.
        if (current.some((m) => (m.a === 0 || m.b === 0) && m.winner === undefined)) return;
        for (const m of current) {
          if (m.winner !== undefined) continue;
          const pa = t.players[m.a];
          const pb = t.players[m.b];
          const res = simulateBotMatch(
            [pa.profile ?? { difficulty: 'normal', personality: getCharacter(pa.characterId).personality }, pb.profile ?? { difficulty: 'normal', personality: 'equilibrado' }],
            t.target,
            false,
            Math.floor(Math.random() * 1e9),
          );
          m.winner = res.winner === 0 ? m.a : m.b;
          m.scores = res.scores;
        }
        const winners = current.map((m) => m.winner!);
        if (winners.length === 1) {
          set({ current: { ...t, rounds, finished: true, champion: winners[0] } });
          return;
        }
        const next: TMatch[] = [];
        for (let i = 0; i < winners.length; i += 2) next.push({ a: winners[i], b: winners[i + 1] });
        rounds.push(next);
        set({ current: { ...t, rounds, round: t.round + 1 } });
      },
      clear() {
        set({ current: null });
      },
    }),
    { name: 'truco-tournament-v1' },
  ),
);
