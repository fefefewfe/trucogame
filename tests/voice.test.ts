import { describe, expect, it } from 'vitest';
import { parseCommand } from '../src/audio/voiceCommands';
import { numberToWords, toSpeech } from '../src/audio/speechText';
import { applyAction, createMatch, getPlayerView, parseCardId, withPresetHand, type MatchState } from '../src/engine';

const hand = (...ids: string[]) => ids.map(parseCardId);

function base(): MatchState {
  const m = createMatch({ numPlayers: 2, targetScore: 15, flor: false }, ['Vos', 'Bot'], { seed: 1, firstMano: 0 });
  return withPresetHand(m, [hand('1-espada', '7-oro', '3-copa'), hand('4-oro', '5-copa', '6-basto')], 0);
}

describe('comandos de voz', () => {
  it('reconoce cantos en mi turno', () => {
    const v = getPlayerView(base(), 0);
    expect(parseCommand('¡Truco!', v).action).toEqual({ type: 'call', seat: 0, call: 'truco' });
    expect(parseCommand('envido', v).action).toEqual({ type: 'call', seat: 0, call: 'envido' });
    expect(parseCommand('real envido', v).action).toEqual({ type: 'call', seat: 0, call: 'real_envido' });
    expect(parseCommand('falta envido', v).action).toEqual({ type: 'call', seat: 0, call: 'falta_envido' });
    expect(parseCommand('me voy al mazo', v).action).toEqual({ type: 'mazo', seat: 0 });
  });

  it('reconoce cartas por nombre', () => {
    const v = getPlayerView(base(), 0);
    expect(parseCommand('tiro el ancho de espada', v).action).toEqual({ type: 'play', seat: 0, cardId: '1-espada' });
    expect(parseCommand('juego el siete de oro', v).action).toEqual({ type: 'play', seat: 0, cardId: '7-oro' });
    expect(parseCommand('el tres', v).action).toEqual({ type: 'play', seat: 0, cardId: '3-copa' });
    expect(parseCommand('la más alta', v).action).toEqual({ type: 'play', seat: 0, cardId: '1-espada' });
    expect(parseCommand('el cuatro de basto', v).action).toBeNull();
  });

  it('responde quiero, no quiero y sube la apuesta', () => {
    const s = applyAction(base(), { type: 'call', seat: 0, call: 'truco' }).state;
    const v = getPlayerView(s, 1);
    expect(parseCommand('quiero', v).action).toEqual({ type: 'respond', seat: 1, response: 'quiero' });
    expect(parseCommand('no quiero', v).action).toEqual({ type: 'respond', seat: 1, response: 'no_quiero' });
    expect(parseCommand('quiero retruco', v).action).toEqual({ type: 'call', seat: 1, call: 'retruco' });
    expect(parseCommand('el envido está primero', v).action).toEqual({ type: 'call', seat: 1, call: 'envido' });
  });

  it('no hace nada ilegal', () => {
    const v = getPlayerView(base(), 1);
    expect(parseCommand('truco', v).action).toBeNull();
    expect(parseCommand('quiero', v).action).toBeNull();
  });
});

describe('texto para la voz', () => {
  it('dice todos los tantos en palabras', () => {
    expect(numberToWords(0)).toBe('cero');
    expect(numberToWords(7)).toBe('siete');
    expect(numberToWords(21)).toBe('veintiuno');
    expect(numberToWords(27)).toBe('veintisiete');
    expect(numberToWords(30)).toBe('treinta');
    expect(numberToWords(33)).toBe('treinta y tres');
    expect(toSpeech('¡33 son mejores!')).toBe('treinta y tres son mejores!');
    expect(toSpeech('Tengo 26.')).toBe('Tengo veintiséis.');
  });
});
