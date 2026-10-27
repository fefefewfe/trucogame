/**
 * Jugar con la voz: reconocimiento de voz del navegador (es-AR) y traducción
 * de lo que dice el jugador a una acción legal del motor.
 */
import { trucoValue, type Card, type Rank, type Suit } from '../engine/cards';
import type { Action, Call, Response } from '../engine/types';
import type { PlayerView } from '../engine/view';

interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechRecognitionSupported(): boolean {
  return ctor() !== null;
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const RANK_WORDS: [RegExp, Rank][] = [
  [/\b(ancho|as|uno|1)\b/, 1],
  [/\b(dos|2)\b/, 2],
  [/\b(tres|3)\b/, 3],
  [/\b(cuatro|4)\b/, 4],
  [/\b(cinco|5)\b/, 5],
  [/\b(seis|6)\b/, 6],
  [/\b(siete|7)\b/, 7],
  [/\b(diez|sota|10)\b/, 10],
  [/\b(once|caballo|11)\b/, 11],
  [/\b(doce|rey|12)\b/, 12],
];

const SUIT_WORDS: [RegExp, Suit][] = [
  [/\bespadas?\b/, 'espada'],
  [/\bbastos?\b/, 'basto'],
  [/\boros?\b/, 'oro'],
  [/\bcopas?\b/, 'copa'],
];

export interface ParsedCommand {
  action: Action | null;
  /** Explicación cuando no se pudo convertir en una acción legal. */
  reason?: string;
}

function legal(view: PlayerView, a: Action): Action | null {
  return view.legalActions.find((x) => JSON.stringify(x) === JSON.stringify(a)) ?? null;
}

function findCall(t: string): Call | null {
  if (/contra ?flor al resto/.test(t)) return 'contraflor_al_resto';
  if (/contra ?flor/.test(t)) return 'contraflor';
  if (/vale (cuatro|4)|vale cuatro/.test(t)) return 'vale_cuatro';
  if (/re ?truco/.test(t)) return 'retruco';
  if (/falta envido|la falta|falta/.test(t)) return 'falta_envido';
  if (/real envido|real/.test(t)) return 'real_envido';
  if (/envido|envi do|el envido esta primero|primero el envido/.test(t)) return 'envido';
  if (/\bflor\b/.test(t)) return 'flor';
  if (/truco|truko/.test(t)) return 'truco';
  return null;
}

function findCard(t: string, cards: Card[]): { card: Card | null; reason?: string } {
  if (cards.length === 0) return { card: null };
  if (/\b(la )?(mas alta|mejor|mas grande|mas brava)\b/.test(t)) {
    return { card: [...cards].sort((a, b) => trucoValue(b) - trucoValue(a))[0] };
  }
  if (/\b(la )?(mas baja|peor|mas chica|basura)\b/.test(t)) {
    return { card: [...cards].sort((a, b) => trucoValue(a) - trucoValue(b))[0] };
  }
  const suit = SUIT_WORDS.find(([re]) => re.test(t))?.[1];
  // "ancho" sin palo: el de espada o el de basto si los tengo
  const ranks = RANK_WORDS.filter(([re]) => re.test(t)).map(([, r]) => r);
  if (ranks.length === 0 && !suit) return { card: null };
  let candidates = cards.filter((c) => (ranks.length === 0 || ranks.includes(c.rank)) && (!suit || c.suit === suit));
  if (candidates.length === 0) return { card: null, reason: 'No tenés esa carta.' };
  if (candidates.length > 1 && ranks.length > 0) {
    // si nombró varios números (por ejemplo "siete de oro" reconocido como "7 oro 1"), priorizar el primero
    const first = ranks[0];
    const narrowed = candidates.filter((c) => c.rank === first);
    if (narrowed.length > 0) candidates = narrowed;
  }
  if (candidates.length > 1) return { card: null, reason: 'Tenés más de una: decí también el palo.' };
  return { card: candidates[0] };
}

/** Traduce una frase dicha por el jugador en una acción legal (o explica por qué no). */
export function parseCommand(raw: string, view: PlayerView): ParsedCommand {
  const t = normalize(raw);
  if (!t) return { action: null };
  const seat = view.seat;
  const respond = (r: Response) => legal(view, { type: 'respond', seat, response: r });

  if (/\bno (lo )?quiero\b|\bpaso\b|\bni loco\b/.test(t)) {
    const a = respond('no_quiero');
    return a ? { action: a } : { action: null, reason: 'Ahora no hay nada que rechazar.' };
  }
  if (/me achico/.test(t)) {
    const a = respond('me_achico');
    if (a) return { action: a };
  }
  if (/\b(me voy al mazo|al mazo|mazo|me voy|me retiro)\b/.test(t)) {
    const a = legal(view, { type: 'mazo', seat });
    return a ? { action: a } : { action: null, reason: 'Ahora no te podés ir al mazo.' };
  }
  const call = findCall(t);
  if (call) {
    // "truco" cuando ya hay truco se interpreta como subir al siguiente nivel.
    const order: Call[] = call === 'truco' ? ['truco', 'retruco', 'vale_cuatro'] : [call];
    for (const c of order) {
      const a = legal(view, { type: 'call', seat, call: c });
      if (a) return { action: a };
    }
    if (!/quiero/.test(t)) return { action: null, reason: 'Ese canto no se puede ahora.' };
  }
  if (/\bquiero\b|\bdale\b|\bacepto\b|\bvamos\b/.test(t)) {
    const a = respond('quiero');
    return a ? { action: a } : { action: null, reason: 'Nadie te cantó nada todavía.' };
  }
  const { card, reason } = findCard(t, view.hand.myCards);
  if (card) {
    const a = legal(view, { type: 'play', seat, cardId: card.id });
    return a ? { action: a } : { action: null, reason: 'Ahora no podés tirar esa carta.' };
  }
  return { action: null, reason: reason ?? 'No te entendí.' };
}

/** Escucha una frase (tocar para hablar). */
export class VoiceListener {
  private rec: Recognition | null = null;
  listening = false;

  start(handlers: { onPartial: (text: string) => void; onFinal: (text: string) => void; onEnd: () => void; onError: (msg: string) => void }): boolean {
    const C = ctor();
    if (!C) {
      handlers.onError('Tu navegador no reconoce la voz.');
      return false;
    }
    this.stop();
    const rec = new C();
    rec.lang = 'es-AR';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = '';
    rec.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        text += r[0].transcript;
        if (r.isFinal) finalText = text;
      }
      if (finalText) handlers.onFinal(finalText);
      else handlers.onPartial(text);
    };
    rec.onerror = (e) => {
      const msg = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Permití el uso del micrófono para jugar con la voz.' : e.error === 'no-speech' ? 'No escuché nada.' : 'No se pudo usar el micrófono.';
      handlers.onError(msg);
    };
    rec.onend = () => {
      this.listening = false;
      handlers.onEnd();
    };
    try {
      rec.start();
      this.rec = rec;
      this.listening = true;
      return true;
    } catch {
      handlers.onError('No se pudo usar el micrófono.');
      return false;
    }
  }

  stop(): void {
    if (this.rec) {
      try {
        this.rec.abort();
      } catch {
        /* ya detenido */
      }
    }
    this.rec = null;
    this.listening = false;
  }
}
