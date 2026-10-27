/**
 * Simulación completa de una partida entre bots usando el motor real.
 * Se usa en los torneos para resolver los cruces en los que no juega el humano.
 */
import { decide } from '../ai/bot';
import { createMemory, observeHand } from '../ai/memory';
import type { BotProfile } from '../ai/profiles';
import { applyAction, createMatch, createRandom, getLegalActions, getPlayerView } from '../engine';
import type { Team } from '../engine/types';

export function simulateBotMatch(
  profiles: [BotProfile, BotProfile],
  target: 15 | 30,
  flor: boolean,
  seed: number,
): { winner: 0 | 1; scores: [number, number] } {
  const random = createRandom(seed);
  const fast: BotProfile[] = profiles.map((p) => ({ ...p, tuning: { ...p.tuning, samples: 14 } }));
  const memories = [createMemory(), createMemory()];
  let s = createMatch({ numPlayers: 2, targetScore: target, flor }, ['A', 'B'], { seed: seed ^ 0x9e3779b9 });
  let guard = 0;
  while (s.phase !== 'match_over' && guard++ < 5000) {
    if (s.phase === 'hand_over') {
      memories.forEach((m, i) => observeHand(m, s.lastHandLog, i));
      s = applyAction(s, { type: 'next_hand' }).state;
      continue;
    }
    const seat = getLegalActions(s, 0).length > 0 ? 0 : 1;
    const { action } = decide(getPlayerView(s, seat), fast[seat], memories[seat], random);
    s = applyAction(s, action).state;
  }
  const winner = (s.winnerTeam ?? 0) as Team;
  return { winner: winner as 0 | 1, scores: [s.scores[0], s.scores[1]] };
}
