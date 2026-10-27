/**
 * Señas del truco: gestos que un jugador le hace a su compañero para avisarle
 * qué cartas tiene. Los rivales pueden llegar a verlas.
 *
 * Las señas no forman parte del motor de reglas (son comunicación entre
 * jugadores); el controlador decide quién las ve y se las pasa a los bots
 * como información adicional.
 */
import { envidoPoints, hasFlor, trucoValue, type Card } from '../engine/cards';
import type { Difficulty } from '../ai/profiles';
import type { Expression } from '../ui/art/Avatar';

export type SenaId =
  | 'ancho_espada'
  | 'ancho_basto'
  | 'siete_espada'
  | 'siete_oro'
  | 'tres'
  | 'dos'
  | 'ancho_falso'
  | 'nada'
  | 'flor'
  | 'envido';

export interface SenaDef {
  id: SenaId;
  label: string;
  /** Cómo se hace el gesto. */
  gesture: string;
  expression: Expression;
  /** ¿Una mano (las tres cartas recibidas) es coherente con esta seña? */
  matches(dealt: readonly Card[]): boolean;
}

const has = (dealt: readonly Card[], id: string) => dealt.some((c) => c.id === id);

export const SENAS: SenaDef[] = [
  { id: 'ancho_espada', label: 'Ancho de espada', gesture: 'Levantar las cejas', expression: 'cejas', matches: (d) => has(d, '1-espada') },
  { id: 'ancho_basto', label: 'Ancho de basto', gesture: 'Guiñar un ojo', expression: 'guino', matches: (d) => has(d, '1-basto') },
  { id: 'siete_espada', label: 'Siete de espada', gesture: 'Torcer la boca a la derecha', expression: 'boca_der', matches: (d) => has(d, '7-espada') },
  { id: 'siete_oro', label: 'Siete de oro', gesture: 'Torcer la boca a la izquierda', expression: 'boca_izq', matches: (d) => has(d, '7-oro') },
  { id: 'tres', label: 'Un tres', gesture: 'Morderse el labio', expression: 'labio', matches: (d) => d.some((c) => c.rank === 3) },
  { id: 'dos', label: 'Un dos', gesture: 'Trompita de beso', expression: 'beso', matches: (d) => d.some((c) => c.rank === 2) },
  { id: 'ancho_falso', label: 'Ancho falso', gesture: 'Abrir la boca', expression: 'boca_abierta', matches: (d) => has(d, '1-oro') || has(d, '1-copa') },
  { id: 'nada', label: 'No tengo nada', gesture: 'Cerrar los ojos', expression: 'ojos_cerrados', matches: (d) => d.every((c) => trucoValue(c) < 9) },
  { id: 'flor', label: 'Flor', gesture: 'Inflar los cachetes', expression: 'cachetes', matches: (d) => hasFlor([...d]) },
  { id: 'envido', label: 'Buen envido', gesture: 'Mostrar la punta de la lengua', expression: 'lengua', matches: (d) => envidoPoints(d) >= 28 },
];

export function senaDef(id: SenaId): SenaDef {
  return SENAS.find((s) => s.id === id)!;
}

/** Lo que un jugador sabe por las señas que vio en esta mano. */
export interface SenaKnowledge {
  seat: number;
  sena: SenaId;
}

/** Probabilidad de que un bot rival se dé cuenta de una seña ajena. */
export function spotChance(difficulty: Difficulty): number {
  return difficulty === 'facil' ? 0.15 : difficulty === 'normal' ? 0.28 : 0.4;
}

/** Probabilidad de que el jugador humano pesque una seña de los rivales (los bots fáciles disimulan peor). */
export function humanSpotChance(rivalDifficulty: Difficulty): number {
  return rivalDifficulty === 'facil' ? 0.45 : rivalDifficulty === 'normal' ? 0.32 : 0.22;
}

/** Señas que haría un jugador honesto con su mano (las más útiles primero). */
export function senasForHand(dealt: readonly Card[], flor: boolean): SenaId[] {
  const out: SenaId[] = [];
  const order: SenaId[] = ['ancho_espada', 'ancho_basto', 'siete_espada', 'siete_oro', 'tres', 'dos', 'ancho_falso'];
  if (flor && hasFlor([...dealt])) out.push('flor');
  else if (envidoPoints(dealt) >= 28) out.push('envido');
  for (const id of order) {
    if (senaDef(id).matches(dealt)) {
      out.push(id);
      if (out.filter((x) => x !== 'envido' && x !== 'flor').length >= 2) break;
    }
  }
  if (!out.some((x) => x !== 'envido' && x !== 'flor')) out.push('nada');
  return out;
}

/**
 * Quién ve una seña: los compañeros siempre; cada rival según su chance.
 * Devuelve los asientos que la vieron (sin incluir a quien la hizo).
 */
export function resolveSena(from: number, numPlayers: number, rivalChance: (seat: number) => number, random: () => number): number[] {
  const seen: number[] = [];
  for (let seat = 0; seat < numPlayers; seat++) {
    if (seat === from) continue;
    if (seat % 2 === from % 2) seen.push(seat);
    else if (random() < rivalChance(seat)) seen.push(seat);
  }
  return seen;
}

export const MAX_SENAS_PER_HAND = 4;
