/**
 * Memoria del bot: estadísticas del estilo de cada rival construidas
 * exclusivamente con eventos públicos (cantos, respuestas, cartas jugadas y
 * tantos declarados). Nunca usa cartas que no se mostraron.
 */
import { trucoValue, type Card } from '../engine/cards';
import { isEnvidoCall, isTrucoCall, type GameEvent } from '../engine/types';

export interface OpponentStats {
  trucoCalls: number;
  trucoRevealed: number;
  trucoWeak: number;
  envidoCalls: number;
  envidoRevealed: number;
  envidoWeak: number;
  trucoFaced: number;
  trucoFolds: number;
  envidoFaced: number;
  envidoFolds: number;
}

export interface BotMemory {
  opponents: Record<number, OpponentStats>;
  handsSeen: number;
}

export function createMemory(): BotMemory {
  return { opponents: {}, handsSeen: 0 };
}

function stats(memory: BotMemory, seat: number): OpponentStats {
  if (!memory.opponents[seat]) {
    memory.opponents[seat] = {
      trucoCalls: 0,
      trucoRevealed: 0,
      trucoWeak: 0,
      envidoCalls: 0,
      envidoRevealed: 0,
      envidoWeak: 0,
      trucoFaced: 0,
      trucoFolds: 0,
      envidoFaced: 0,
      envidoFolds: 0,
    };
  }
  return memory.opponents[seat];
}

/** Fuerza de un conjunto de cartas vistas (0..1) según las dos mejores. */
export function revealedStrength(cards: readonly Card[]): number {
  const values = cards.map(trucoValue).sort((a, b) => b - a);
  const top = (values[0] ?? 0) + (values[1] ?? 0);
  return top / 27;
}

/** Actualiza la memoria con el registro público de una mano terminada. */
export function observeHand(memory: BotMemory, log: readonly GameEvent[], mySeat: number): void {
  const myTeam = mySeat % 2;
  const played: Record<number, Card[]> = {};
  const trucoCallers = new Set<number>();
  const envidoCallers = new Set<number>();
  const declared: Record<number, number | null> = {};
  let lastCallBySeat: number | null = null;

  for (const ev of log) {
    switch (ev.type) {
      case 'card_played':
        (played[ev.seat] ??= []).push(ev.card);
        break;
      case 'call':
        lastCallBySeat = ev.seat;
        if (ev.seat % 2 === myTeam) break;
        if (isTrucoCall(ev.call)) {
          stats(memory, ev.seat).trucoCalls++;
          trucoCallers.add(ev.seat);
        } else if (isEnvidoCall(ev.call)) {
          stats(memory, ev.seat).envidoCalls++;
          envidoCallers.add(ev.seat);
        }
        break;
      case 'response':
        if (ev.seat % 2 === myTeam) break;
        if (lastCallBySeat === null || lastCallBySeat % 2 !== myTeam) break;
        if (isTrucoCall(ev.to)) {
          const s = stats(memory, ev.seat);
          s.trucoFaced++;
          if (ev.response === 'no_quiero') s.trucoFolds++;
        } else if (isEnvidoCall(ev.to)) {
          const s = stats(memory, ev.seat);
          s.envidoFaced++;
          if (ev.response === 'no_quiero') s.envidoFolds++;
        }
        break;
      case 'envido_declaration':
        declared[ev.seat] = ev.points;
        break;
    }
  }

  for (const seat of trucoCallers) {
    const cards = played[seat] ?? [];
    // Solo evaluamos si mostró al menos dos cartas.
    if (cards.length >= 2) {
      const s = stats(memory, seat);
      s.trucoRevealed++;
      if (revealedStrength(cards) < 0.5) s.trucoWeak++;
    }
  }
  for (const seat of envidoCallers) {
    if (!(seat in declared)) continue;
    const s = stats(memory, seat);
    s.envidoRevealed++;
    const pts = declared[seat];
    if (pts === null || pts < 25) s.envidoWeak++;
  }
  memory.handsSeen++;
}

/** Estimación bayesiana de la frecuencia de faroles con el truco. */
export function trucoBluffRate(memory: BotMemory | null, seat: number): number {
  const s = memory?.opponents[seat];
  if (!s) return 0.25;
  return (s.trucoWeak + 1) / (s.trucoRevealed + 4);
}

export function envidoBluffRate(memory: BotMemory | null, seat: number): number {
  const s = memory?.opponents[seat];
  if (!s) return 0.2;
  return (s.envidoWeak + 1) / (s.envidoRevealed + 5);
}

/** Con qué frecuencia el rival se achica frente a nuestro truco. */
export function trucoFoldRate(memory: BotMemory | null, seat: number): number {
  const s = memory?.opponents[seat];
  if (!s) return 0.3;
  return (s.trucoFolds + 1) / (s.trucoFaced + 3);
}
