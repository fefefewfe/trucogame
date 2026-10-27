/**
 * Soporte para usar una baraja real escaneada (por ejemplo, la baraja española
 * clásica de dominio público). Si existe public/cartas/manifest.json, el juego
 * usa esas imágenes en lugar de las ilustraciones SVG propias.
 * Ver public/cartas/LEEME.md.
 */
import { create } from 'zustand';
import { useSettings } from '../../store/settings';

interface RealDeckManifest {
  formato: 'png' | 'jpg' | 'webp' | 'svg';
  nombre?: string;
  licencia?: string;
  fuente?: string;
}

interface RealDeckState {
  manifest: RealDeckManifest | null;
}

export const useRealDeckStore = create<RealDeckState>()(() => ({ manifest: null }));

if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
  fetch(`${import.meta.env.BASE_URL}cartas/manifest.json`, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((m: RealDeckManifest | null) => {
      if (m && ['png', 'jpg', 'webp', 'svg'].includes(m.formato)) useRealDeckStore.setState({ manifest: m });
    })
    .catch(() => undefined);
}

export function useRealDeck(): { src: (id: string) => string; manifest: RealDeckManifest } | null {
  const manifest = useRealDeckStore((s) => s.manifest);
  const enabled = useSettings((s) => s.realDeck);
  if (!manifest || !enabled) return null;
  return { manifest, src: (id) => `${import.meta.env.BASE_URL}cartas/${id}.${manifest.formato}` };
}
