/**
 * Persistencia simple en un archivo JSON: cuentas de invitado, ranking y
 * denuncias. Para producción se puede reemplazar por una base de datos real
 * implementando la misma interfaz.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { RankingEntry } from '../src/net/protocol';

export interface StoredPlayer {
  id: string;
  name: string;
  characterId: string;
  rating: number;
  played: number;
  won: number;
}

export interface StoredReport {
  at: number;
  reporter: string;
  target: string;
  reason: string;
  room: string;
}

export interface StoredResult {
  at: number;
  playerId: string;
  won: boolean;
  delta: number;
}

interface Data {
  players: Record<string, StoredPlayer>;
  reports: StoredReport[];
  results: StoredResult[];
}

export type RankingPeriod = 'global' | 'semanal' | 'mensual';

export interface Store {
  getPlayer(id: string): StoredPlayer | undefined;
  upsertPlayer(p: StoredPlayer): void;
  ranking(limit: number, period?: RankingPeriod): RankingEntry[];
  addResult(r: StoredResult): void;
  addReport(r: StoredReport): void;
  flush(): void;
}

export function createStore(file: string | null): Store {
  let data: Data = { players: {}, reports: [], results: [] };
  if (file) {
    try {
      data = JSON.parse(readFileSync(file, 'utf8')) as Data;
      data.players ??= {};
      data.reports ??= [];
      data.results ??= [];
    } catch {
      data = { players: {}, reports: [], results: [] };
    }
  }
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    if (!file || !dirty) return;
    mkdirSync(dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, JSON.stringify(data));
    renameSync(tmp, file);
    dirty = false;
  };
  const touch = () => {
    dirty = true;
    if (!timer && file) {
      timer = setTimeout(() => {
        timer = null;
        flush();
      }, 2000);
    }
  };
  return {
    getPlayer: (id) => data.players[id],
    upsertPlayer(p) {
      data.players[p.id] = p;
      touch();
    },
    ranking(limit, period = 'global') {
      if (period === 'global') {
        return Object.values(data.players)
          .filter((p) => p.played > 0)
          .sort((a, b) => b.rating - a.rating)
          .slice(0, limit)
          .map((p) => ({ name: p.name, characterId: p.characterId, rating: Math.round(p.rating), played: p.played, won: p.won }));
      }
      // Semanal / mensual: puntos de ranking ganados en el período.
      const since = Date.now() - (period === 'semanal' ? 7 : 30) * 24 * 3600 * 1000;
      const acc = new Map<string, { delta: number; played: number; won: number }>();
      for (const r of data.results) {
        if (r.at < since) continue;
        const e = acc.get(r.playerId) ?? { delta: 0, played: 0, won: 0 };
        e.delta += r.delta;
        e.played++;
        if (r.won) e.won++;
        acc.set(r.playerId, e);
      }
      return [...acc.entries()]
        .sort((a, b) => b[1].delta - a[1].delta)
        .slice(0, limit)
        .map(([id, e]) => ({ name: data.players[id]?.name ?? 'Invitado', characterId: data.players[id]?.characterId ?? 'pibe', rating: e.delta, played: e.played, won: e.won }));
    },
    addResult(r) {
      data.results.push(r);
      const cutoff = Date.now() - 40 * 24 * 3600 * 1000;
      if (data.results.length > 20000 || (data.results[0] && data.results[0].at < cutoff)) {
        data.results = data.results.filter((x) => x.at >= cutoff).slice(-20000);
      }
      touch();
    },
    addReport(r) {
      data.reports.push(r);
      if (data.reports.length > 5000) data.reports.splice(0, data.reports.length - 5000);
      touch();
    },
    flush,
  };
}
