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

interface Data {
  players: Record<string, StoredPlayer>;
  reports: StoredReport[];
}

export interface Store {
  getPlayer(id: string): StoredPlayer | undefined;
  upsertPlayer(p: StoredPlayer): void;
  ranking(limit: number): RankingEntry[];
  addReport(r: StoredReport): void;
  flush(): void;
}

export function createStore(file: string | null): Store {
  let data: Data = { players: {}, reports: [] };
  if (file) {
    try {
      data = JSON.parse(readFileSync(file, 'utf8')) as Data;
      data.players ??= {};
      data.reports ??= [];
    } catch {
      data = { players: {}, reports: [] };
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
    ranking(limit) {
      return Object.values(data.players)
        .filter((p) => p.played > 0)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, limit)
        .map((p) => ({ name: p.name, characterId: p.characterId, rating: Math.round(p.rating), played: p.played, won: p.won }));
    },
    addReport(r) {
      data.reports.push(r);
      if (data.reports.length > 5000) data.reports.splice(0, data.reports.length - 5000);
      touch();
    },
    flush,
  };
}
