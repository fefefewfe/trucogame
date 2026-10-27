import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io as connect, type Socket } from 'socket.io-client';
import { startServer, type StartedServer } from '../server/index';
import type { Action } from '../src/engine/types';
import type { PlayerView } from '../src/engine/view';
import type { Ack, ClientToServer, GameEnd, GameUpdate, RoomState, ServerToClient } from '../src/net/protocol';

type Client = Socket<ServerToClient, ClientToServer>;

let server: StartedServer;
const clients: Client[] = [];

beforeEach(async () => {
  server = await startServer({ port: 0, dataFile: null, staticDir: null, game: { timeScale: 0.02, reconnectGrace: 0.5 } });
});

afterEach(async () => {
  clients.forEach((c) => c.disconnect());
  clients.length = 0;
  await server.close();
});

function client(): Client {
  const c: Client = connect(`http://localhost:${server.port}`, { transports: ['websocket'], forceNew: true, reconnection: false });
  clients.push(c);
  return c;
}

function call<T = undefined>(c: Client, ev: string, ...args: unknown[]): Promise<Ack<T>> {
  return new Promise((r) => (c.emit as (e: string, ...a: unknown[]) => void)(ev, ...args, r));
}

function waitFor<T>(c: Client, ev: keyof ServerToClient, pred: (x: T) => boolean = () => true, ms = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout esperando ${String(ev)}`)), ms);
    const handler = (x: T) => {
      if (pred(x)) {
        clearTimeout(t);
        (c.off as (e: string, h: unknown) => void)(ev, handler);
        resolve(x);
      }
    };
    (c.on as (e: string, h: unknown) => void)(ev, handler);
  });
}

async function hello(c: Client, name: string, token?: string) {
  await new Promise<void>((r) => (c.connected ? r() : c.once('connect', () => r())));
  const res = await call<{ token: string; playerId: string; resumeCode: string | null }>(c, 'hello', { name, characterId: 'tano', level: 3, token });
  expect(res.ok).toBe(true);
  return res.data!;
}

describe('servidor multijugador', () => {
  it('sala privada con código: cada uno ve solo sus cartas y el servidor valida los turnos', async () => {
    const a = client();
    const b = client();
    await hello(a, 'Ana');
    await hello(b, 'Beto');
    const created = await call<{ code: string }>(a, 'room:create', { numPlayers: 2, target: 15, flor: false, turnSeconds: 30, visibility: 'privada', botDifficulty: 'normal' });
    expect(created.ok).toBe(true);
    expect(created.data!.code).toMatch(/^TRUCO-\d{4}$/);
    const roomBPromise = waitFor<RoomState>(b, 'room:state', (s) => s.seats.filter(Boolean).length === 2);
    const joined = await call(b, 'room:join', { code: created.data!.code });
    expect(joined.ok).toBe(true);
    const roomB = await roomBPromise;
    expect(roomB.yourSeat).toBe(1);

    const upA = waitFor<GameUpdate>(a, 'game:update');
    const upB = waitFor<GameUpdate>(b, 'game:update');
    expect((await call(b, 'room:start')).ok).toBe(false); // solo el anfitrión
    expect((await call(a, 'room:start')).ok).toBe(true);
    const [ga, gb] = await Promise.all([upA, upB]);
    expect(ga.view.seat).toBe(0);
    expect(gb.view.seat).toBe(1);
    expect(ga.view.hand.myCards).toHaveLength(3);
    const bIds = gb.view.hand.myCards.map((c) => c.id);
    expect(JSON.stringify(ga.view).includes(bIds[0])).toBe(false);

    const turn = ga.view.hand.turn;
    const actor = turn === 0 ? a : b;
    const other = turn === 0 ? b : a;
    const actorView = turn === 0 ? ga.view : gb.view;
    const otherView = turn === 0 ? gb.view : ga.view;
    // Fuera de turno: rechazado
    const bad = await call(other, 'game:action', { action: { type: 'play', seat: otherView.seat, cardId: otherView.hand.myCards[0].id } });
    expect(bad.ok).toBe(false);
    // Intentar jugar por el otro (asiento falso): el servidor usa el asiento real y lo rechaza
    const spoof = await call(other, 'game:action', { action: { type: 'play', seat: actorView.seat, cardId: actorView.hand.myCards[0].id } });
    expect(spoof.ok).toBe(false);
    // Jugada válida
    const next = waitFor<GameUpdate>(other, 'game:update', (u) => u.events.some((e) => e.type === 'card_played'));
    const ok = await call(actor, 'game:action', { action: { type: 'play', seat: actorView.seat, cardId: actorView.hand.myCards[0].id } satisfies Action });
    expect(ok.ok).toBe(true);
    const u = await next;
    expect(u.view.hand.bazas[0].plays).toHaveLength(1);
    expect(u.view.hand.cardCounts[actorView.seat]).toBe(2);
  });

  it('una desconexión no corrompe la partida: se vuelve con el token y se sigue jugando', async () => {
    const a = client();
    const b = client();
    await hello(a, 'Ana');
    const tb = await hello(b, 'Beto');
    const { data } = await call<{ code: string }>(a, 'room:create', { numPlayers: 2, target: 15, flor: false, turnSeconds: 60, visibility: 'privada', botDifficulty: 'normal' });
    await call(b, 'room:join', { code: data!.code });
    const firstB = waitFor<GameUpdate>(b, 'game:update');
    await call(a, 'room:start');
    const before = await firstB;
    const cardsBefore = before.view.hand.myCards.map((c) => c.id).sort();

    b.disconnect();
    await new Promise((r) => setTimeout(r, 100));
    const b2 = client();
    const snapshot = waitFor<GameUpdate>(b2, 'game:update');
    const again = await hello(b2, 'Beto', tb.token);
    expect(again.resumeCode).toBe(data!.code);
    const snap = await snapshot;
    expect(snap.view.seat).toBe(1);
    expect(snap.view.hand.myCards.map((c) => c.id).sort()).toEqual(cardsBefore);

    // La partida sigue: quien tenga el turno puede jugar.
    const turn = snap.view.hand.turn;
    const actor = turn === 1 ? b2 : a;
    const view: PlayerView = turn === 1 ? snap.view : (await call(a, 'room:join', { code: data!.code }), (await waitFor<GameUpdate>(a, 'game:update')).view);
    const res = await call(actor, 'game:action', { action: { type: 'play', seat: turn, cardId: view.hand.myCards[0].id } });
    expect(res.ok).toBe(true);
  });

  it('si nadie juega, el tiempo de turno y los bots llevan la partida hasta el final', async () => {
    const a = client();
    await hello(a, 'Ana');
    const end = waitFor<GameEnd>(a, 'game:end', () => true, 60000);
    const { data } = await call<{ code: string }>(a, 'room:create', { numPlayers: 4, target: 15, flor: true, turnSeconds: 10, visibility: 'publica', botDifficulty: 'facil' });
    expect(data!.code).toBeTruthy();
    await call(a, 'room:start');
    const result = await end;
    expect(Math.max(...result.scores)).toBe(15);
    expect(result.ratingChange).not.toBeNull();
  }, 70000);

  it('partida rápida: completa la mesa con bots si se pide', async () => {
    const a = client();
    await hello(a, 'Ana');
    const status = waitFor<{ waiting: number; needed: number }>(a, 'queue:status');
    expect((await call(a, 'queue:join', { numPlayers: 2, target: 15 })).ok).toBe(true);
    expect((await status).waiting).toBe(1);
    const started = waitFor<GameUpdate>(a, 'game:update');
    expect((await call(a, 'queue:fill')).ok).toBe(true);
    const g = await started;
    expect(g.view.players).toHaveLength(2);
  });

  it('modera el chat y no deja hablar demasiado rápido', async () => {
    const a = client();
    const b = client();
    await hello(a, 'Ana');
    await hello(b, 'Beto');
    const { data } = await call<{ code: string }>(a, 'room:create', { numPlayers: 2, target: 15, flor: false, turnSeconds: 30, visibility: 'privada', botDifficulty: 'normal' });
    await call(b, 'room:join', { code: data!.code });
    const msg = waitFor<{ text: string }>(b, 'chat:message');
    expect((await call(a, 'chat:send', { text: 'sos un boludo', kind: 'texto', teamOnly: false })).ok).toBe(true);
    expect((await msg).text).toBe('sos un b*****');
    expect((await call(a, 'chat:send', { text: 'otra', kind: 'texto', teamOnly: false })).ok).toBe(false);
  });
});
