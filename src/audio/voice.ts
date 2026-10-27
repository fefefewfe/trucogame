/**
 * Voces de los personajes.
 *
 * Prioridad:
 * 1. Grabaciones reales declaradas en /voices/manifest.json (ver public/voices/LEEME.md).
 * 2. La voz en español del navegador (Web Speech API), con tono y velocidad por personaje,
 *    si el jugador la tiene activada.
 * El texto siempre se muestra en un globo, así que el juego funciona sin audio.
 */
import type { Character, PhraseKey } from '../game/characters';
import { useSettings } from '../store/settings';
import { audio } from './engine';

interface VoiceManifest {
  version: number;
  characters: Record<string, Partial<Record<PhraseKey, string[]>>>;
}

let manifest: VoiceManifest | null = null;
const bufferCache = new Map<string, Promise<AudioBuffer | null>>();

async function loadManifest(): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}voices/manifest.json`, { cache: 'no-cache' });
    if (!res.ok) return;
    const data = (await res.json()) as VoiceManifest;
    if (data && typeof data === 'object' && data.characters) manifest = data;
  } catch {
    manifest = null;
  }
}
void loadManifest();

function loadBuffer(path: string): Promise<AudioBuffer | null> {
  let p = bufferCache.get(path);
  if (!p) {
    p = (async () => {
      const ctx = audio.ctx;
      if (!ctx) return null;
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}voices/${path}`);
        if (!res.ok) return null;
        return await ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        return null;
      }
    })();
    bufferCache.set(path, p);
  }
  return p;
}

let spanishVoice: SpeechSynthesisVoice | null | undefined;

function pickSpanishVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const pref = ['es-AR', 'es-419', 'es-UY', 'es-US', 'es-MX', 'es-CL', 'es-CO', 'es-ES'];
  for (const lang of pref) {
    const v = voices.find((x) => x.lang.replace('_', '-').toLowerCase() === lang.toLowerCase());
    if (v) return v;
  }
  return voices.find((x) => x.lang.toLowerCase().startsWith('es')) ?? null;
}

if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.onvoiceschanged = () => {
    spanishVoice = pickSpanishVoice();
  };
}

export function hasSpanishSpeech(): boolean {
  if (spanishVoice === undefined) spanishVoice = pickSpanishVoice();
  return Boolean(spanishVoice);
}

export function hasRecordings(characterId: string): boolean {
  return Boolean(manifest?.characters[characterId] && Object.keys(manifest.characters[characterId]).length > 0);
}

function duckMusic(seconds: number): void {
  const ctx = audio.ctx;
  const music = audio.bus('music');
  if (!ctx || !music) return;
  const base = useSettings.getState().music * 0.55;
  music.gain.setTargetAtTime(base * 0.45, ctx.currentTime, 0.05);
  music.gain.setTargetAtTime(base, ctx.currentTime + seconds, 0.3);
}

export function speak(character: Character, key: PhraseKey, text: string): void {
  const settings = useSettings.getState();
  if (settings.voice <= 0 || settings.master <= 0) return;

  const files = manifest?.characters[character.id]?.[key];
  if (files && files.length > 0 && audio.ctx) {
    const file = files[Math.floor(Math.random() * files.length)];
    void loadBuffer(file).then((buf) => {
      const ctx = audio.ctx;
      const bus = audio.bus('voice');
      if (!buf || !ctx || !bus) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(bus);
      src.start();
      duckMusic(buf.duration);
    });
    return;
  }

  if (!settings.speech || typeof speechSynthesis === 'undefined') return;
  if (spanishVoice === undefined) spanishVoice = pickSpanishVoice();
  if (!spanishVoice) return;
  const clean = text.replace(/[¡!¿?]/g, (m) => (m === '¡' || m === '¿' ? '' : m)).replace(/\.\.\./g, ',');
  const u = new SpeechSynthesisUtterance(clean);
  u.voice = spanishVoice;
  u.lang = spanishVoice.lang;
  u.pitch = Math.max(0.1, Math.min(2, character.voice.pitch + (Math.random() - 0.5) * 0.08));
  u.rate = Math.max(0.5, Math.min(1.6, character.voice.rate * (text.includes('!') ? 1.05 : 1)));
  u.volume = audio.effectiveVolume('voice');
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  duckMusic(Math.min(3, 0.4 + clean.length * 0.06));
}

export function stopSpeech(): void {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}
