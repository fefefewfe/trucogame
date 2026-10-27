/**
 * Baraja española de 40 cartas y valores del truco argentino.
 * Este módulo es puro: no depende de React ni del navegador.
 */

export const SUITS = ['espada', 'basto', 'oro', 'copa'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  readonly id: string;
  readonly suit: Suit;
  readonly rank: Rank;
}

export function cardId(rank: Rank, suit: Suit): string {
  return `${rank}-${suit}`;
}

export function makeCard(rank: Rank, suit: Suit): Card {
  return { id: cardId(rank, suit), suit, rank };
}

export function parseCardId(id: string): Card {
  const [r, s] = id.split('-');
  const rank = Number(r) as Rank;
  const suit = s as Suit;
  if (!RANKS.includes(rank) || !SUITS.includes(suit)) {
    throw new Error(`Carta inválida: ${id}`);
  }
  return makeCard(rank, suit);
}

/** Crea el mazo completo, ordenado (40 cartas, sin 8 ni 9). */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) deck.push(makeCard(rank, suit));
  }
  return deck;
}

/**
 * Jerarquía del truco: número mayor = carta más fuerte.
 * 14: 1 de espada (ancho de espada)
 * 13: 1 de basto (ancho de basto)
 * 12: 7 de espada
 * 11: 7 de oro
 * 10: todos los 3
 *  9: todos los 2
 *  8: 1 de oro y 1 de copa (anchos falsos)
 *  7: todos los 12
 *  6: todos los 11
 *  5: todos los 10
 *  4: 7 de basto y 7 de copa (sietes falsos)
 *  3: todos los 6
 *  2: todos los 5
 *  1: todos los 4
 */
export function trucoValue(card: Pick<Card, 'rank' | 'suit'>): number {
  const { rank, suit } = card;
  switch (rank) {
    case 1:
      if (suit === 'espada') return 14;
      if (suit === 'basto') return 13;
      return 8;
    case 7:
      if (suit === 'espada') return 12;
      if (suit === 'oro') return 11;
      return 4;
    case 3:
      return 10;
    case 2:
      return 9;
    case 12:
      return 7;
    case 11:
      return 6;
    case 10:
      return 5;
    case 6:
      return 3;
    case 5:
      return 2;
    case 4:
      return 1;
  }
}

/** >0 si `a` le gana a `b`, <0 si pierde, 0 si empatan (parda). */
export function compareCards(a: Card, b: Card): number {
  return trucoValue(a) - trucoValue(b);
}

/** Valor de una carta para el envido: las figuras (10, 11, 12) valen cero. */
export function envidoValue(card: Pick<Card, 'rank'>): number {
  return card.rank >= 10 ? 0 : card.rank;
}

/**
 * Tantos de envido de una mano (2 o 3 cartas, o una sola).
 * - Dos cartas del mismo palo: 20 + suma de sus valores.
 * - Tres del mismo palo: se usan las dos de mayor valor.
 * - Sin cartas del mismo palo: el valor individual más alto.
 * Máximo posible: 33 (7 y 6 del mismo palo).
 */
export function envidoPoints(cards: readonly Card[]): number {
  let best = 0;
  for (const c of cards) best = Math.max(best, envidoValue(c));
  for (const suit of SUITS) {
    const values = cards
      .filter((c) => c.suit === suit)
      .map(envidoValue)
      .sort((x, y) => y - x);
    if (values.length >= 2) best = Math.max(best, 20 + values[0] + values[1]);
  }
  return best;
}

/** Flor: las tres cartas del mismo palo. */
export function hasFlor(cards: readonly Card[]): boolean {
  return cards.length === 3 && cards.every((c) => c.suit === cards[0].suit);
}

/** Puntos de flor para comparar flores: 20 + la suma de las tres cartas. */
export function florPoints(cards: readonly Card[]): number {
  return 20 + cards.reduce((acc, c) => acc + envidoValue(c), 0);
}

export const SUIT_LABEL: Record<Suit, string> = {
  espada: 'espada',
  basto: 'basto',
  oro: 'oro',
  copa: 'copa',
};

export const SUIT_PLURAL: Record<Suit, string> = {
  espada: 'Espadas',
  basto: 'Bastos',
  oro: 'Oros',
  copa: 'Copas',
};

const RANK_LABEL: Record<Rank, string> = {
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  10: '10 (sota)',
  11: '11 (caballo)',
  12: '12 (rey)',
};

export function cardName(card: Card): string {
  if (card.rank === 1 && card.suit === 'espada') return 'Ancho de espada';
  if (card.rank === 1 && card.suit === 'basto') return 'Ancho de basto';
  if (card.rank === 7 && card.suit === 'espada') return 'Siete de espada';
  if (card.rank === 7 && card.suit === 'oro') return 'Siete de oro';
  return `${RANK_LABEL[card.rank]} de ${SUIT_LABEL[card.suit]}`;
}

/** Nombre corto de la jerarquía, útil para el tutorial y la ayuda. */
export const TRUCO_HIERARCHY: { value: number; label: string }[] = [
  { value: 14, label: '1 de espada' },
  { value: 13, label: '1 de basto' },
  { value: 12, label: '7 de espada' },
  { value: 11, label: '7 de oro' },
  { value: 10, label: 'Todos los 3' },
  { value: 9, label: 'Todos los 2' },
  { value: 8, label: '1 de oro y 1 de copa' },
  { value: 7, label: 'Todos los 12' },
  { value: 6, label: 'Todos los 11' },
  { value: 5, label: 'Todos los 10' },
  { value: 4, label: '7 de basto y 7 de copa' },
  { value: 3, label: 'Todos los 6' },
  { value: 2, label: 'Todos los 5' },
  { value: 1, label: 'Todos los 4' },
];
