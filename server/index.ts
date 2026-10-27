/**
 * Servidor de TRUCO: LA REVANCHA.
 *
 * - Socket.IO para las partidas en tiempo real.
 * - Sirve la versión compilada del juego (carpeta dist) si existe, así todo
 *   funciona desde un solo puerto.
 * - /health y /api/ranking para monitoreo y tablas.
 *
 * Variables de entorno: PORT (3001), DATA_FILE (server/data/datos.json),
 * CORS_ORIGIN (orígenes permitidos separados por coma; por defecto, cualquiera).
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import type { ClientToServer, ServerToClient } from '../src/net/protocol';
import { GameServer, type ServerOptions } from './gameServer';
import { createStore, type Store } from './store';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.md': 'text/markdown; charset=utf-8',
};

export interface StartedServer {
  port: number;
  close(): Promise<void>;
  game: GameServer;
}

export function startServer(opts: { port?: number; dataFile?: string | null; staticDir?: string | null; game?: ServerOptions } = {}): Promise<StartedServer> {
  const store: Store = createStore(opts.dataFile === undefined ? resolve('server/data/datos.json') : opts.dataFile);
  const staticDir = opts.staticDir === undefined ? resolve('dist') : opts.staticDir;
  let game: GameServer | null = null;

  const http = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, rooms: game?.rooms.size ?? 0, players: game?.players.size ?? 0 }));
      return;
    }
    if (url.pathname === '/api/ranking') {
      res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
      res.end(JSON.stringify(store.ranking(50)));
      return;
    }
    if (!staticDir || !existsSync(staticDir)) {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Servidor de Truco: La Revancha funcionando. Compilá el cliente con "npm run build" para servirlo desde acá.');
      return;
    }
    const safe = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(staticDir, safe);
    if (!file.startsWith(staticDir)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(staticDir, 'index.html');
    const type = MIME[extname(file)] ?? 'application/octet-stream';
    const cache = file.includes(`${join(staticDir, 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache';
    res.writeHead(200, { 'content-type': type, 'cache-control': cache });
    createReadStream(file).pipe(res);
  });

  const origins = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);
  const io = new Server<ClientToServer, ServerToClient>(http, {
    cors: { origin: origins && origins.length > 0 ? origins : true },
    pingInterval: 10000,
    pingTimeout: 8000,
  });
  game = new GameServer(io, store, opts.game);

  return new Promise((resolveStart) => {
    http.listen(opts.port ?? Number(process.env.PORT ?? 3001), () => {
      const address = http.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolveStart({
        port,
        game: game!,
        close: () =>
          new Promise<void>((r) => {
            for (const room of game!.rooms.values()) room.clearTimers();
            store.flush();
            io.close();
            http.close(() => r());
          }),
      });
    });
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  startServer({ dataFile: process.env.DATA_FILE ?? resolve('server/data/datos.json') }).then(({ port }) => {
    console.log(`Truco: La Revancha · servidor en http://localhost:${port}`);
  });
}
