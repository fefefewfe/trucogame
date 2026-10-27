/**
 * Voces de los personajes.
 *
 * Prioridad:
 * 1. Grabaciones reales declaradas en /voices/manifest.json (ver public/voices/LEEME.md).
 * 2. La mejor voz en español del dispositivo (Web Speech API). Se prefieren las
 *    voces de Argentina (por ejemplo "Tomás" o "Elena" en Edge, o "Diego" en
 *    Mac y iPhone) y las voces "naturales". El jugador puede elegir otra.
 * El texto siempre se muestra en un globo, así que el juego funciona sin audio.
 */
import type { Character, PhraseKey } from '../game/characters';
import { useSettings } from '../store/settings';
import { audio } from './engine';
import { toSpeech } from './speechText';

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
if (typeof window !== 'undefined') void loadManifest();

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

// ---------------------------------------------------------------------------
// Selección de voces del navegador
// ---------------------------------------------------------------------------

const MALE = /(diego|tom[aá]s|jorge|juan|carlos|pablo|[aá]lvaro|ra[uú]l|enrique|gonzalo|dar[ií]o|andr[eé]s|jos[eé]|alonso|federico|gerardo|liberto|emilio|mateo|lorenzo|male|hombre)/i;
const FEMALE = /(elena|paulina|m[oó]nica|sabina|helena|laura|luc[ií]a|elvira|dalia|paloma|lupe|marisol|isabela|valentina|camila|soledad|esperanza|ximena|tessa|female|mujer)/i;

export interface VoiceOption {
  name: string;
  lang: string;
  score: number;
  gender: 'm' | 'f' | '?';
}

function voiceScore(v: SpeechSynthesisVoice): number {
  const lang = v.lang.replace('_', '-').toLowerCase();
  if (!lang.startsWith('es')) return -1;
  let score = 30;
  if (lang === 'es-ar') score = 100;
  else if (lang === 'es-uy' || lang === 'es-419') score = 75;
  else if (lang === 'es-us' || lang === 'es-mx' || lang === 'es-cl' || lang === 'es-co') score = 60;
  else if (lang === 'es-es') score = 45;
  if (/natural|neural|online|enhanced|premium|mejorada/i.test(v.name)) score += 25;
  if (/google/i.test(v.name)) score += 12;
  if (/diego|tom[aá]s|elena/i.test(v.name)) score += 8;
  return score;
}

export function listSpanishVoices(): VoiceOption[] {
  if (typeof speechSynthesis === 'undefined') return [];
  return speechSynthesis
    .getVoices()
    .map((v) => ({ name: v.name, lang: v.lang, score: voiceScore(v), gender: (MALE.test(v.name) ? 'm' : FEMALE.test(v.name) ? 'f' : '?') as VoiceOption['gender'] }))
    .filter((v) => v.score >= 0)
    .sort((a, b) => b.score - a.score);
}

const listeners = new Set<() => void>();
export function onVoicesChanged(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.onvoiceschanged = () => listeners.forEach((l) => l());
}

function pickVoice(character: Character | null): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices();
  const chosen = useSettings.getState().voiceName;
  if (chosen) {
    const v = voices.find((x) => x.name === chosen);
    if (v) return v;
  }
  const spanish = voices.filter((v) => voiceScore(v) >= 0).sort((a, b) => voiceScore(b) - voiceScore(a));
  if (spanish.length === 0) return null;
  if (!character) return spanish[0];
  // Entre las voces de la mejor calidad disponible, se busca una del género del personaje.
  const best = voiceScore(spanish[0]);
  const top = spanish.filter((v) => voiceScore(v) >= best - 20);
  const wantFemale = Boolean(character.voice.female);
  const match = top.find((v) => (wantFemale ? FEMALE.test(v.name) : MALE.test(v.name)));
  return match ?? spanish[0];
}

export function hasSpanishSpeech(): boolean {
  return listSpanishVoices().length > 0;
}

export function hasRecordings(characterId: string): boolean {
  return Boolean(manifest?.characters[characterId] && Object.keys(manifest.characters[characterId]).length > 0);
}

function duckMusic(seconds: number): void {
  const ctx = audio.ctx;
  const music = audio.bus('music');
  if (!ctx || !music) return;
  const base = useSettings.getState().music * 0.55;
  music.gain.setTargetAtTime(base * 0.4, ctx.currentTime, 0.05);
  music.gain.setTargetAtTime(base, ctx.currentTime + seconds, 0.3);
}

/** Frases importantes (cantos y respuestas) que no se pueden perder. */
const PRIORITY: PhraseKey[] = ['truco', 'retruco', 'vale_cuatro', 'envido', 'real_envido', 'falta_envido', 'flor', 'contraflor', 'contraflor_al_resto', 'quiero', 'quiero_dudoso', 'no_quiero', 'me_achico', 'tengo', 'mejores', 'son_buenas', 'mazo'];

export function speak(character: Character, key: PhraseKey | 'dialogo', text: string): void {
  const settings = useSettings.getState();
  if (settings.voice <= 0 || settings.master <= 0) return;

  const files = key !== 'dialogo' ? manifest?.characters[character.id]?.[key] : undefined;
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
  const voice = pickVoice(character);
  if (!voice) return;
  const spoken = toSpeech(text);
  if (!spoken) return;
  const u = new SpeechSynthesisUtterance(spoken);
  u.voice = voice;
  u.lang = voice.lang;
  const isCall = key !== 'dialogo' && PRIORITY.includes(key);
  u.pitch = Math.max(0.1, Math.min(2, character.voice.pitch + (Math.random() - 0.5) * 0.06));
  // Los cantos se dicen un poco más lento para que se entiendan bien.
  u.rate = Math.max(0.6, Math.min(1.5, character.voice.rate * (isCall ? 0.95 : 1.02)));
  u.volume = audio.effectiveVolume('voice');
  // No acumular frases viejas: si hay cola, se descarta lo que no es importante.
  if (speechSynthesis.pending || (speechSynthesis.speaking && isCall)) speechSynthesis.cancel();
  speechSynthesis.speak(u);
  duckMusic(Math.min(3.5, 0.5 + spoken.length * 0.065));
}

/** Prueba de la voz elegida desde Configuración. */
export function previewVoice(character: Character): void {
  speak(character, 'truco', '¡Truco! Y tengo veintisiete de envido.');
}

export function stopSpeech(): void {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}
