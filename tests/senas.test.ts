import { describe, expect, it } from 'vitest';
import { Analysis } from '../src/ai/analysis';
import { botParams } from '../src/ai/profiles';
import { createMatch, createRandom, getPlayerView, parseCardId, withPresetHand } from '../src/engine';
import { resolveSena, senaDef, senasForHand, SENAS } from '../src/game/senas';

const hand = (...ids: string[]) => ids.map(parseCardId);

function fourPlayers() {
  const m = createMatch({ numPlayers: 4, targetScore: 15, flor: false }, ['A', 'B', 'C', 'D'], { seed: 9, firstMano: 0 });
  return withPresetHand(
    m,
    [hand('1-espada', '4-copa', '5-oro'), hand('3-oro', '6-copa', '12-basto'), hand('7-oro', '2-copa', '11-espada'), hand('10-oro', '4-basto', '6-espada')],
    0,
  );
}

describe('señas', () => {
  it('los compañeros siempre ven la seña y los rivales según su chance', () => {
    const r = createRandom(1);
    expect(resolveSena(0, 4, () => 0, r).sort()).toEqual([2]);
    expect(resolveSena(0, 4, () => 1, r).sort()).toEqual([1, 2, 3]);
    expect(resolveSena(1, 6, () => 0, r).sort()).toEqual([3, 5]);
  });

  it('cada seña describe correctamente la mano', () => {
    expect(senaDef('ancho_espada').matches(hand('1-espada', '4-copa', '5-oro'))).toBe(true);
    expect(senaDef('ancho_basto').matches(hand('1-espada', '4-copa', '5-oro'))).toBe(false);
    expect(senaDef('tres').matches(hand('3-oro', '6-copa', '12-basto'))).toBe(true);
    expect(senaDef('nada').matches(hand('10-oro', '4-basto', '6-espada'))).toBe(true);
    expect(senaDef('nada').matches(hand('2-oro', '4-basto', '6-espada'))).toBe(false);
    expect(senaDef('envido').matches(hand('7-copa', '6-copa', '1-oro'))).toBe(true);
    expect(SENAS).toHaveLength(10);
  });

  it('un jugador honesto hace señas verdaderas', () => {
    for (const h of [hand('1-espada', '7-oro', '3-copa'), hand('10-oro', '4-basto', '6-espada'), hand('7-copa', '6-copa', '2-oro')]) {
      for (const id of senasForHand(h, false)) expect(senaDef(id).matches(h)).toBe(true);
    }
  });

  it('el bot usa la seña de su compañero para deducir sus cartas', () => {
    const s = fourPlayers();
    const view = getPlayerView(s, 2);
    const params = botParams({ difficulty: 'dificil', personality: 'equilibrado' });
    const withSena = new Analysis(view, params, null, createRandom(3), [{ seat: 0, sena: 'ancho_espada' }]).samples();
    expect(withSena.length).toBeGreaterThan(5);
    for (const sample of withSena) expect(sample.dealt[0].some((c) => c.id === '1-espada')).toBe(true);
    const without = new Analysis(view, params, null, createRandom(3), []).samples();
    expect(without.some((sample) => !sample.dealt[0].some((c) => c.id === '1-espada'))).toBe(true);
  });

  it('sin ver la seña, el rival no sabe nada de esa carta', () => {
    const s = fourPlayers();
    const view = getPlayerView(s, 1);
    const params = botParams({ difficulty: 'dificil', personality: 'equilibrado' });
    const samples = new Analysis(view, params, null, createRandom(5), []).samples();
    const withAncho = samples.filter((x) => x.dealt[0].some((c) => c.id === '1-espada')).length;
    expect(withAncho).toBeLessThan(samples.length);
  });
});
