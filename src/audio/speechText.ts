/** Utilidades para que la voz sintetizada lea bien los cantos y los tantos. */

const UNITS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const TWENTIES = ['veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const TENS: Record<number, string> = { 3: 'treinta', 4: 'cuarenta', 5: 'cincuenta', 6: 'sesenta', 7: 'setenta', 8: 'ochenta', 9: 'noventa' };

export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
  if (n < 20) return UNITS[n];
  if (n < 30) return TWENTIES[n - 20];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? TENS[t] : `${TENS[t]} y ${UNITS[u]}`;
}

/** Texto preparado para la voz: números en palabras y sin signos que algunas voces leen. */
export function toSpeech(text: string): string {
  return text
    .replace(/\b(\d{1,2})\b/g, (_, d: string) => numberToWords(Number(d)))
    .replace(/[¡¿]/g, '')
    .replace(/\.\.\./g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}
