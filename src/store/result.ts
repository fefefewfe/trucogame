import { create } from 'zustand';
import type { Rewards } from '../game/progression';
import type { MatchSetup } from '../game/setup';

export interface ResultInfo {
  setup: MatchSetup;
  won: boolean;
  abandoned: boolean;
  scores: [number, number];
  rewards: Rewards;
  newBadges: string[];
  levelBefore: number;
  levelAfter: number;
  rankUp: boolean;
  xpBefore: number;
  rpBefore: number;
  storyCleared?: number;
  storyBonus?: number;
}

export const useResult = create<{ info: ResultInfo | null }>()(() => ({ info: null }));
