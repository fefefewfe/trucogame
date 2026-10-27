import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Difficulty } from '../ai/profiles';
import { COSMETICS, FREE_COSMETICS, type CosmeticKind } from '../game/cosmetics';
import { CHARACTERS } from '../game/characters';
import { BADGES, levelFromXp, matchRewards, rankFor, type Rewards } from '../game/progression';

export interface MatchRecord {
  id: string;
  date: number;
  mode: string;
  opponents: string[];
  opponentIds: string[];
  won: boolean;
  scores: [number, number];
  target: number;
  difficulty: Difficulty;
  xp: number;
  coins: number;
  abandoned: boolean;
}

export interface ProfileStats {
  played: number;
  won: number;
  lost: number;
  streak: number;
  bestStreak: number;
  trucosGanados: number;
  envidosGanados: number;
  flores: number;
  noQuieroGanados: number;
  perfect: number;
  abandons: number;
}

export interface ProfileState {
  name: string;
  characterId: string;
  xp: number;
  coins: number;
  rp: number;
  stats: ProfileStats;
  history: MatchRecord[];
  badges: string[];
  owned: string[];
  equipped: Record<CosmeticKind, string>;
  unlockedCharacters: string[];
  story: { unlocked: number; completed: number[] };
  tournaments: { played: number; won: number };
  vsCharacter: Record<string, { won: number; lost: number }>;
  tutorialDone: boolean;
  createdAt: number;

  setName(name: string): void;
  setCharacter(id: string): void;
  buy(cosmeticId: string): boolean;
  buyCharacter(id: string, price: number): boolean;
  equip(cosmeticId: string): void;
  recordMatch(input: {
    mode: string;
    opponents: { name: string; characterId: string }[];
    won: boolean;
    abandoned: boolean;
    scores: [number, number];
    target: 15 | 30;
    difficulty: Difficulty;
    trucosGanados: number;
    envidosGanados: number;
    flores: number;
    noQuiero?: number;
    bonusCoins?: number;
  }): { rewards: Rewards; newBadges: string[]; levelBefore: number; levelAfter: number; rankUp: boolean };
  completeStoryStage(stage: number): void;
  recordTournament(won: boolean, prize: number): string[];
  setTutorialDone(): void;
  addCoins(n: number): void;
}

const emptyStats: ProfileStats = {
  played: 0,
  won: 0,
  lost: 0,
  streak: 0,
  bestStreak: 0,
  trucosGanados: 0,
  envidosGanados: 0,
  flores: 0,
  noQuieroGanados: 0,
  perfect: 0,
  abandons: 0,
};

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      name: 'Vos',
      characterId: 'pibe',
      xp: 0,
      coins: 150,
      rp: 0,
      stats: { ...emptyStats },
      history: [],
      badges: [],
      owned: [...FREE_COSMETICS],
      equipped: {
        mesa: 'mesa:bodegon',
        paño: 'paño:verde',
        reverso: 'reverso:clasico',
        baraja: 'baraja:clasica',
        marco: 'marco:madera',
        festejo: 'festejo:confeti',
        frases: 'frases:basicas',
      },
      unlockedCharacters: CHARACTERS.filter((c) => c.unlock.kind === 'inicial').map((c) => c.id),
      story: { unlocked: 1, completed: [] },
      tournaments: { played: 0, won: 0 },
      vsCharacter: {},
      tutorialDone: false,
      createdAt: Date.now(),

      setName(name) {
        const clean = name.trim().slice(0, 18);
        if (clean.length >= 2) set({ name: clean });
      },
      setCharacter(id) {
        if (get().unlockedCharacters.includes(id)) set({ characterId: id });
      },
      buy(cosmeticId) {
        const item = COSMETICS.find((c) => c.id === cosmeticId);
        const st = get();
        if (!item || st.owned.includes(cosmeticId) || st.coins < item.price) return false;
        set({ coins: st.coins - item.price, owned: [...st.owned, cosmeticId] });
        return true;
      },
      buyCharacter(id, price) {
        const st = get();
        if (st.unlockedCharacters.includes(id) || st.coins < price) return false;
        set({ coins: st.coins - price, unlockedCharacters: [...st.unlockedCharacters, id] });
        return true;
      },
      equip(cosmeticId) {
        const item = COSMETICS.find((c) => c.id === cosmeticId);
        if (!item || !get().owned.includes(cosmeticId)) return;
        set({ equipped: { ...get().equipped, [item.kind]: cosmeticId } });
      },
      recordMatch(input) {
        const st = get();
        const myScore = input.scores[0];
        const rewards = matchRewards({
          won: input.won,
          abandoned: input.abandoned,
          difficulty: input.difficulty,
          target: input.target,
          myScore,
          bonusCoins: input.bonusCoins,
        });
        const levelBefore = levelFromXp(st.xp).level;
        const rankBefore = rankFor(st.rp).id;
        const stats: ProfileStats = { ...st.stats };
        stats.played++;
        if (input.abandoned) stats.abandons++;
        if (input.won) {
          stats.won++;
          stats.streak++;
          stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
          if (input.scores[1] === 0) stats.perfect++;
        } else {
          stats.lost++;
          stats.streak = 0;
        }
        stats.trucosGanados += input.trucosGanados;
        stats.envidosGanados += input.envidosGanados;
        stats.flores += input.flores;
        stats.noQuieroGanados += input.noQuiero ?? 0;
        const vs = { ...st.vsCharacter };
        for (const o of input.opponents) {
          const prev = vs[o.characterId] ?? { won: 0, lost: 0 };
          vs[o.characterId] = input.won ? { ...prev, won: prev.won + 1 } : { ...prev, lost: prev.lost + 1 };
        }
        const record: MatchRecord = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          date: Date.now(),
          mode: input.mode,
          opponents: input.opponents.map((o) => o.name),
          opponentIds: input.opponents.map((o) => o.characterId),
          won: input.won,
          scores: input.scores,
          target: input.target,
          difficulty: input.difficulty,
          xp: rewards.xp,
          coins: rewards.coins,
          abandoned: input.abandoned,
        };
        const xp = st.xp + rewards.xp;
        const rp = Math.max(0, st.rp + rewards.rp);
        const badges = new Set(st.badges);
        const earn = (id: string, cond: boolean) => {
          if (cond) badges.add(id);
        };
        earn('primera', stats.won >= 1);
        earn('racha3', stats.bestStreak >= 3);
        earn('racha7', stats.bestStreak >= 7);
        earn('trucos25', stats.trucosGanados >= 25);
        earn('envidos25', stats.envidosGanados >= 25);
        earn('flor5', stats.flores >= 5);
        earn('perfecta', stats.perfect >= 1);
        earn('dificil', input.won && input.difficulty === 'dificil');
        earn('veterano50', stats.played >= 50);
        earn('lector', stats.noQuieroGanados >= 10);
        const newBadges = [...badges].filter((b) => !st.badges.includes(b));
        set({
          stats,
          xp,
          rp,
          coins: st.coins + rewards.coins,
          history: [record, ...st.history].slice(0, 40),
          badges: [...badges],
          vsCharacter: vs,
        });
        return {
          rewards,
          newBadges,
          levelBefore,
          levelAfter: levelFromXp(xp).level,
          rankUp: rankFor(rp).id > rankBefore,
        };
      },
      completeStoryStage(stage) {
        const st = get();
        const completed = st.story.completed.includes(stage) ? st.story.completed : [...st.story.completed, stage];
        const unlockedChars = new Set(st.unlockedCharacters);
        for (const c of CHARACTERS) if (c.unlock.kind === 'historia' && c.unlock.stage === stage) unlockedChars.add(c.id);
        const badges = new Set(st.badges);
        if (stage === 10) badges.add('campeon');
        set({
          story: { unlocked: Math.max(st.story.unlocked, Math.min(10, stage + 1)), completed },
          unlockedCharacters: [...unlockedChars],
          badges: [...badges],
        });
      },
      recordTournament(won, prize) {
        const st = get();
        const badges = new Set(st.badges);
        if (won) badges.add('torneo');
        const newBadges = [...badges].filter((b) => !st.badges.includes(b));
        set({
          tournaments: { played: st.tournaments.played + 1, won: st.tournaments.won + (won ? 1 : 0) },
          coins: st.coins + prize,
          badges: [...badges],
        });
        return newBadges;
      },
      setTutorialDone() {
        if (!get().tutorialDone) set({ tutorialDone: true, coins: get().coins + 100 });
      },
      addCoins(n) {
        set({ coins: Math.max(0, get().coins + n) });
      },
    }),
    { name: 'truco-profile-v1', version: 1 },
  ),
);

export function badgeById(id: string) {
  return BADGES.find((b) => b.id === id);
}
