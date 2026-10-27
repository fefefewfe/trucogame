/**
 * Toma de decisiones de los bots.
 *
 * La única entrada sobre la partida es la PlayerView del bot: no hay forma de
 * acceder a las cartas ocultas de los demás jugadores.
 */
import { trucoValue } from '../engine/cards';
import {
  envidoAcceptedPoints,
  envidoChainAllows,
  envidoRejectedPoints,
  faltaPoints,
  teamOf,
  TRUCO_CALL_LEVEL,
} from '../engine/match';
import type { Action, Call, EnvidoCall, Response, Team, TrucoCall } from '../engine/types';
import type { PlayerView } from '../engine/view';
import { Analysis } from './analysis';
import { trucoFoldRate, type BotMemory } from './memory';
import { botParams, type BotParams, type BotProfile } from './profiles';

export interface BotDecision {
  action: Action;
  /** Información para las reacciones del personaje (no afecta las reglas). */
  intent: 'normal' | 'farol' | 'fuerte' | 'debil';
}

interface Ctx {
  view: PlayerView;
  params: BotParams;
  analysis: Analysis;
  random: () => number;
  memory: BotMemory | null;
  myTeam: Team;
  oppTeam: Team;
  myScore: number;
  oppScore: number;
  target: number;
}

function has(view: PlayerView, pred: (a: Action) => boolean): Action | undefined {
  return view.legalActions.find(pred);
}

function callAction(view: PlayerView, call: Call): Action | undefined {
  return has(view, (a) => a.type === 'call' && a.call === call);
}

function respondAction(view: PlayerView, response: Response): Action | undefined {
  return has(view, (a) => a.type === 'respond' && a.response === response);
}

/** Corrección de agresividad según el marcador: el que va perdiendo arriesga más. */
function scorePressure(ctx: Ctx): number {
  if (!ctx.params.scoreAware) return 0;
  const diff = ctx.oppScore - ctx.myScore;
  const scale = ctx.target === 30 ? 10 : 5;
  return Math.max(-0.06, Math.min(0.08, (diff / scale) * 0.05));
}

function opponentSeats(ctx: Ctx): number[] {
  return ctx.view.players.filter((p) => p.team === ctx.oppTeam).map((p) => p.seat);
}

function avgFoldRate(ctx: Ctx): number {
  if (!ctx.memory) return 0.3;
  const seats = opponentSeats(ctx);
  return seats.reduce((acc, s) => acc + trucoFoldRate(ctx.memory, s), 0) / seats.length;
}

export function decide(view: PlayerView, profile: BotProfile, memory: BotMemory | null, random: () => number): BotDecision {
  const legal = view.legalActions;
  if (legal.length === 0) throw new Error('El bot no tiene acciones legales');
  const params = botParams(profile);
  const myTeam = teamOf(view.seat);
  const oppTeam = (1 - myTeam) as Team;
  const ctx: Ctx = {
    view,
    params,
    analysis: new Analysis(view, params, memory, random),
    random,
    memory: params.memory ? memory : null,
    myTeam,
    oppTeam,
    myScore: view.scores[myTeam],
    oppScore: view.scores[oppTeam],
    target: view.config.targetScore,
  };
  if (legal.length === 1) return { action: legal[0], intent: 'normal' };

  const pending = view.pending;
  if (pending && pending.team !== myTeam) {
    if (pending.kind === 'flor') return decideFlorResponse(ctx);
    if (pending.kind === 'envido') return decideEnvidoResponse(ctx);
    return decideTrucoResponse(ctx);
  }

  const flor = callAction(view, 'flor');
  if (flor) return { action: flor, intent: 'fuerte' };

  return maybeCallEnvido(ctx) ?? maybeCallTruco(ctx) ?? maybeMazo(ctx) ?? chooseCard(ctx);
}

// ---------------------------------------------------------------------------
// Envido
// ---------------------------------------------------------------------------

function envidoStakes(ctx: Ctx, chain: EnvidoCall[], winner: Team): number {
  return envidoAcceptedPoints(chain, () => faltaPoints(ctx.view.scores, ctx.target, winner));
}

function maybeCallEnvido(ctx: Ctx): BotDecision | null {
  const { view, params, random } = ctx;
  const envido = callAction(view, 'envido');
  if (!envido) return null;
  const tanto = view.myEnvido ?? 0;
  const p = ctx.analysis.envidoWinProb();
  const threshold = params.envidoCall - scorePressure(ctx);

  if (p >= threshold) {
    // Si con el envido ganamos el partido, alcanza con cantarlo.
    if (ctx.myScore + 2 >= ctx.target) return { action: envido, intent: 'fuerte' };
    const falta = faltaPoints(view.scores, ctx.target, ctx.myTeam);
    if (p > 0.9 && tanto >= 31) {
      const behind = ctx.oppScore - ctx.myScore;
      if ((behind >= 4 || falta <= 5) && random() < 0.6) return { action: callAction(view, 'falta_envido')!, intent: 'fuerte' };
      if (random() < 0.55) return { action: callAction(view, 'real_envido')!, intent: 'fuerte' };
    } else if (p > 0.8 && random() < 0.35) {
      return { action: callAction(view, 'real_envido')!, intent: 'fuerte' };
    }
    return { action: envido, intent: 'fuerte' };
  }
  // Farol con el envido: más creíble cuando el rival ya mostró una carta baja.
  if (p < 0.35 && ctx.oppScore + 2 < ctx.target) {
    const firstBaza = view.hand.bazas[0];
    const shownLow = firstBaza.plays.some((pl) => teamOf(pl.seat) === ctx.oppTeam && pl.card.rank >= 10);
    const chance = params.envidoBluff * (shownLow ? 1.6 : 1);
    if (random() < chance) return { action: envido, intent: 'farol' };
  }
  return null;
}

function decideEnvidoResponse(ctx: Ctx): BotDecision {
  const { view, params, random } = ctx;
  const flor = callAction(view, 'flor');
  if (flor) return { action: flor, intent: 'fuerte' };

  const chain = view.hand.envido.calls.map((c) => c.call);
  const p = ctx.analysis.envidoWinProb();
  const accept = envidoStakes(ctx, chain, ctx.myTeam);
  const acceptLoss = envidoStakes(ctx, chain, ctx.oppTeam);
  const reject = envidoRejectedPoints(chain);
  const quiero = respondAction(view, 'quiero')!;
  const noQuiero = respondAction(view, 'no_quiero')!;

  // Si rechazar le da el partido al rival, hay que aceptar sí o sí.
  if (ctx.oppScore + reject >= ctx.target) return { action: quiero, intent: 'normal' };

  // Subir la apuesta con muy buenos tantos.
  if (p > 0.82) {
    const canReal = envidoChainAllows(chain, 'real_envido');
    const canFalta = envidoChainAllows(chain, 'falta_envido');
    const faltaNow = faltaPoints(view.scores, ctx.target, ctx.myTeam);
    if (canFalta && p > 0.92 && (faltaNow <= 6 || ctx.oppScore - ctx.myScore >= 5) && random() < 0.6) {
      return { action: callAction(view, 'falta_envido')!, intent: 'fuerte' };
    }
    if (canReal && random() < 0.5) return { action: callAction(view, 'real_envido')!, intent: 'fuerte' };
    if (envidoChainAllows(chain, 'envido') && random() < 0.4) {
      return { action: callAction(view, 'envido')!, intent: 'fuerte' };
    }
    return { action: quiero, intent: 'fuerte' };
  }

  // Valor esperado de aceptar contra rechazar.
  const evAccept = p * accept - (1 - p) * acceptLoss;
  const evReject = -reject;
  const bias = params.acceptBias * Math.max(accept, 2) + scorePressure(ctx) * 4;
  const losingEndsMatch = ctx.oppScore + acceptLoss >= ctx.target;
  if (losingEndsMatch && p < 0.5 + (chain.includes('falta_envido') ? 0.05 : 0)) {
    return { action: noQuiero, intent: 'debil' };
  }
  if (evAccept + bias > evReject) return { action: quiero, intent: p > 0.6 ? 'fuerte' : 'normal' };

  // Farol de vuelta: subir sin tantos (solo los mentirosos y de vez en cuando).
  if (chain.length === 1 && envidoChainAllows(chain, 'real_envido') && random() < params.envidoBluff * 0.5) {
    return { action: callAction(view, 'real_envido')!, intent: 'farol' };
  }
  return { action: noQuiero, intent: 'debil' };
}

// ---------------------------------------------------------------------------
// Flor
// ---------------------------------------------------------------------------

function decideFlorResponse(ctx: Ctx): BotDecision {
  const { view } = ctx;
  const p = ctx.analysis.florWinProb();
  const pending = view.pending!;
  if (pending.call === 'flor') {
    const resto = callAction(view, 'contraflor_al_resto');
    if (p > 0.88 && resto && ctx.oppScore - ctx.myScore >= 3) return { action: resto, intent: 'fuerte' };
    if (p > 0.58) return { action: callAction(view, 'contraflor')!, intent: 'fuerte' };
    return { action: respondAction(view, 'me_achico')!, intent: 'debil' };
  }
  if (pending.call === 'contraflor') {
    const resto = callAction(view, 'contraflor_al_resto');
    if (p > 0.88 && resto) return { action: resto, intent: 'fuerte' };
    if (p > 0.45) return { action: respondAction(view, 'quiero')!, intent: 'normal' };
    return { action: respondAction(view, 'no_quiero')!, intent: 'debil' };
  }
  if (p > 0.55 || ctx.oppScore + 4 >= ctx.target) return { action: respondAction(view, 'quiero')!, intent: 'normal' };
  return { action: respondAction(view, 'no_quiero')!, intent: 'debil' };
}

// ---------------------------------------------------------------------------
// Truco
// ---------------------------------------------------------------------------

function nextTrucoCall(view: PlayerView): Action | undefined {
  return has(view, (a) => a.type === 'call' && (a.call === 'truco' || a.call === 'retruco' || a.call === 'vale_cuatro'));
}

function maybeCallTruco(ctx: Ctx): BotDecision | null {
  const { view, params, random } = ctx;
  const action = nextTrucoCall(view);
  if (!action || action.type !== 'call') return null;
  const level = TRUCO_CALL_LEVEL[action.call as TrucoCall];
  const p = ctx.analysis.winProb();
  const pressure = scorePressure(ctx);
  const threshold = (level === 1 ? params.trucoCall : params.trucoRaise) - pressure;
  const bazaIndex = view.hand.bazas.length - 1;

  if (p >= threshold) {
    // Con una mano muy buena a veces conviene esperar para que el rival cante.
    if (p > 0.85 && level === 1 && bazaIndex === 0 && random() < params.slowPlay) return null;
    return { action, intent: 'fuerte' };
  }

  // Si el rival está por ganar con lo que vale la mano ahora, cantar no tiene sentido como farol.
  const currentValue = view.hand.truco.level + 1;
  if (ctx.oppScore + currentValue + 1 >= ctx.target && p < 0.5) return null;

  // Farol: más probable si ganamos una baza o si el rival suele achicarse.
  if (p < 0.45 && level <= 2) {
    const wonABaza = view.hand.bazas.some((b) => b.winnerTeam === ctx.myTeam);
    let chance = params.bluff * (level === 1 ? 1 : 0.5);
    if (wonABaza) chance *= 1.6;
    if (bazaIndex === 0) chance *= 0.6;
    chance *= 0.6 + avgFoldRate(ctx) * 1.5;
    if (random() < chance) return { action, intent: 'farol' };
  }
  return null;
}

function decideTrucoResponse(ctx: Ctx): BotDecision {
  const { view, params, random } = ctx;
  const pending = view.pending!;
  const level = TRUCO_CALL_LEVEL[pending.call as TrucoCall];
  const quiero = respondAction(view, 'quiero')!;
  const noQuiero = respondAction(view, 'no_quiero')!;

  // "El envido está primero" o la flor antes de responder al truco.
  const flor = callAction(view, 'flor');
  if (flor) return { action: flor, intent: 'fuerte' };
  const envido = maybeCallEnvido(ctx);
  if (envido) return envido;

  const p = ctx.analysis.winProb();
  const raise = nextTrucoCall(view);

  // Si rechazar le da el partido al rival, se acepta (y si se puede, se sube).
  if (ctx.oppScore + level >= ctx.target) {
    if (raise && p > 0.6) return { action: raise, intent: 'fuerte' };
    return { action: quiero, intent: 'normal' };
  }

  if (raise && p >= params.trucoRaise + 0.04 - scorePressure(ctx)) {
    return { action: raise, intent: 'fuerte' };
  }

  const baseThreshold = level === 1 ? 0.36 : level === 2 ? 0.42 : 0.46;
  let threshold = baseThreshold - params.acceptBias - scorePressure(ctx);
  // Si aceptar y perder nos deja afuera, hay que estar más seguros.
  if (ctx.oppScore + level + 1 >= ctx.target) threshold += 0.08;
  // Si ganando la mano ganamos el partido, vale la pena arriesgar.
  if (ctx.myScore + level + 1 >= ctx.target) threshold -= 0.08;

  if (p >= threshold) return { action: quiero, intent: p > 0.6 ? 'fuerte' : 'normal' };

  // Farol de vuelta: retrucar sin cartas (muy de vez en cuando).
  if (raise && level === 1 && random() < params.bluff * 0.25) return { action: raise, intent: 'farol' };
  return { action: noQuiero, intent: 'debil' };
}

// ---------------------------------------------------------------------------
// Cartas y mazo
// ---------------------------------------------------------------------------

function maybeMazo(ctx: Ctx): BotDecision | null {
  const { view, params } = ctx;
  const mazo = has(view, (a) => a.type === 'mazo');
  if (!mazo || params.mistakeRate > 0.1) return null;
  // Con la mano perdida y el truco aceptado, irse al mazo cuesta lo mismo y no muestra las cartas.
  if (view.hand.truco.level >= 1 && view.hand.bazas.length > 1) {
    const probs = [...ctx.analysis.cardWinProbs().values()];
    if (probs.length > 0 && Math.max(...probs) === 0) return { action: mazo, intent: 'debil' };
  }
  return null;
}

function chooseCard(ctx: Ctx): BotDecision {
  const { view, params, random } = ctx;
  const plays = view.legalActions.filter((a): a is Extract<Action, { type: 'play' }> => a.type === 'play');
  if (plays.length === 0) {
    // Sin cartas para jugar (no debería pasar): cualquier acción legal.
    return { action: view.legalActions[0], intent: 'normal' };
  }
  const cards = view.hand.myCards;
  const valueOf = (id: string) => trucoValue(cards.find((c) => c.id === id)!);
  if (plays.length === 1) return { action: plays[0], intent: 'normal' };

  if (random() < params.mistakeRate) {
    return { action: plays[Math.floor(random() * plays.length)], intent: 'normal' };
  }

  const probs = ctx.analysis.cardWinProbs();
  let best = -1;
  for (const p of probs.values()) best = Math.max(best, p);
  // Entre las cartas casi igual de buenas, se juega la más baja para guardar las fuertes.
  const tolerance = 0.03;
  const candidates = plays.filter((a) => (probs.get(a.cardId) ?? 0) >= best - tolerance);
  candidates.sort((a, b) => valueOf(a.cardId) - valueOf(b.cardId));

  const h = view.hand;
  const current = h.bazas[h.bazas.length - 1];
  // Abriendo la primera baza con varias opciones equivalentes, a veces conviene no
  // revelar la carta más baja (para disimular el envido o la fuerza).
  if (current.plays.length === 0 && h.bazas.length === 1 && candidates.length >= 2 && random() < 0.3) {
    return { action: candidates[1], intent: 'normal' };
  }
  return { action: candidates[0], intent: best > 0.7 ? 'fuerte' : best < 0.3 ? 'debil' : 'normal' };
}
