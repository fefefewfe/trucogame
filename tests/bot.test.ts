import { describe, expect, it } from 'vitest';
import { decide } from '../src/ai/bot';
import { createMemory, observeHand, type BotMemory } from '../src/ai/memory';
import type { BotProfile, Difficulty, Personality } from '../src/ai/profiles';
import {
  applyAction,
  createDeck,
  createMatch,
  createRandom,
  getLegalActions,
  getPlayerView,
  parseCardId,
  shuffleInPlace,
  withPresetHand,
  type Card,
  type MatchConfig,
  type MatchState,
  type Team,
} from '../src/engine';

const hand = (...ids: string[]): Card[] => ids.map(parseCardId);

/** Asiento que tiene que actuar ahora (turno o respuesta). */
function actingSeat(s: MatchState): number | null {
  for (let i = 0; i < s.config.numPlayers; i++) {
    if (getLegalActions(s, i).length > 0) return i;
  }
  return null;
}

function playMatch(config: MatchConfig, profiles: BotProfile[], seed: number): MatchState {
  const random = createRandom(seed);
  const memories: BotMemory[] = profiles.map(() => createMemory());
  let s = createMatch(config, profiles.map((_, i) => `Bot${i}`), { seed: seed * 31 + 7 });
  let steps = 0;
  while (s.phase !== 'match_over') {
    if (steps++ > 4000) throw new Error('La partida no termina');
    if (s.phase === 'hand_over') {
      profiles.forEach((_, seat) => observeHand(memories[seat], s.lastHandLog, seat));
      s = applyAction(s, { type: 'next_hand' }).state;
      continue;
    }
    const seat = actingSeat(s);
    expect(seat).not.toBeNull();
    const view = getPlayerView(s, seat!);
    const { action } = decide(view, profiles[seat!], memories[seat!], random);
    s = applyAction(s, action).state;
  }
  return s;
}

describe('bots', () => {
  it('los bots no tienen información privilegiada', () => {
    // Mismo estado público, distintas cartas ocultas del rival: la decisión debe ser idéntica.
    const deck = createDeck();
    for (let trial = 0; trial < 25; trial++) {
      const random = createRandom(trial + 1);
      const shuffled = shuffleInPlace(deck.slice(), random);
      const botCards = shuffled.slice(0, 3);
      const rivalA = shuffled.slice(3, 6);
      const rivalB = shuffled.slice(6, 9);
      const config: MatchConfig = { numPlayers: 2, targetScore: 15, flor: false };
      const base = createMatch(config, ['Bot', 'Rival'], { seed: 3, firstMano: 0 });
      const sA = withPresetHand(base, [botCards, rivalA], 0);
      const sB = withPresetHand(base, [botCards, rivalB], 0);
      const vA = getPlayerView(sA, 0);
      const vB = getPlayerView(sB, 0);
      expect(vA).toEqual(vB);
      for (const difficulty of ['facil', 'normal', 'dificil'] as Difficulty[]) {
        const profile: BotProfile = { difficulty, personality: 'experto' };
        const dA = decide(vA, profile, createMemory(), createRandom(99 + trial));
        const dB = decide(vB, profile, createMemory(), createRandom(99 + trial));
        expect(dA).toEqual(dB);
      }
    }
  });

  it('juegan partidas completas sin acciones ilegales en todos los formatos', () => {
    const personalities: Personality[] = ['agresivo', 'conservador', 'mentiroso', 'equilibrado', 'experto'];
    let seed = 1;
    for (const numPlayers of [2, 4, 6] as const) {
      for (const flor of [false, true]) {
        const profiles: BotProfile[] = Array.from({ length: numPlayers }, (_, i) => ({
          difficulty: (['facil', 'normal', 'dificil'] as Difficulty[])[i % 3],
          personality: personalities[(i + seed) % personalities.length],
        }));
        const s = playMatch({ numPlayers, targetScore: 15, flor }, profiles, seed++);
        expect(s.phase).toBe('match_over');
        expect(Math.max(...s.scores)).toBe(15);
      }
    }
  });

  it('acepta el truco con cartas bravas y lo rechaza sin nada', () => {
    const config: MatchConfig = { numPlayers: 2, targetScore: 15, flor: false };
    const base = createMatch(config, ['Rival', 'Bot'], { seed: 5, firstMano: 0 });
    const profile: BotProfile = { difficulty: 'dificil', personality: 'equilibrado' };

    const strong = withPresetHand(base, [hand('4-oro', '5-copa', '6-basto'), hand('1-espada', '1-basto', '7-espada')], 0);
    let s = applyAction(strong, { type: 'call', seat: 0, call: 'truco' }).state;
    let d = decide(getPlayerView(s, 1), profile, createMemory(), createRandom(1));
    expect(d.action.type === 'call' || (d.action.type === 'respond' && d.action.response === 'quiero')).toBe(true);

    const weak = withPresetHand(base, [hand('1-espada', '1-basto', '7-oro'), hand('4-espada', '5-oro', '4-copa')], 0);
    s = applyAction(weak, { type: 'call', seat: 0, call: 'truco' }).state;
    let rejected = 0;
    for (let i = 0; i < 10; i++) {
      d = decide(getPlayerView(s, 1), profile, createMemory(), createRandom(i + 10));
      if (d.action.type === 'respond' && d.action.response === 'no_quiero') rejected++;
    }
    expect(rejected).toBeGreaterThanOrEqual(8);
  });

  it('gana la baza barata: tira la carta más baja que alcanza', () => {
    const config: MatchConfig = { numPlayers: 2, targetScore: 15, flor: false };
    const base = createMatch(config, ['Rival', 'Bot'], { seed: 5, firstMano: 0 });
    let s = withPresetHand(base, [hand('3-oro', '4-copa', '5-espada'), hand('1-espada', '2-basto', '6-oro')], 0);
    s = applyAction(s, { type: 'play', seat: 0, cardId: '4-copa' }).state;
    const profile: BotProfile = { difficulty: 'dificil', personality: 'equilibrado' };
    // El bot nunca debería gastar el ancho de espada para ganarle a un 4.
    for (let i = 0; i < 10; i++) {
      const d = decide(getPlayerView(s, 1), profile, createMemory(), createRandom(i + 1));
      if (d.action.type === 'play') expect(d.action.cardId).not.toBe('1-espada');
    }
  });

  it('el bot difícil le gana al fácil la mayoría de las veces', () => {
    let hardWins = 0;
    const games = 30;
    for (let g = 0; g < games; g++) {
      const hardSeat = g % 2;
      const profiles: BotProfile[] = [0, 1].map((seat) =>
        seat === hardSeat
          ? { difficulty: 'dificil', personality: 'experto' }
          : { difficulty: 'facil', personality: 'equilibrado' },
      );
      const s = playMatch({ numPlayers: 2, targetScore: 15, flor: false }, profiles, 500 + g);
      if (s.winnerTeam === ((hardSeat % 2) as Team)) hardWins++;
    }
    expect(hardWins).toBeGreaterThan(games * 0.6);
  }, 60_000);
});
