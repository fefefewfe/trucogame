/**
 * Moderación básica del chat: largo máximo, caracteres de control y
 * palabras ofensivas reemplazadas por asteriscos.
 */
const BLOCKED = [
  'boludo',
  'pelotudo',
  'forro',
  'puto',
  'puta',
  'trolo',
  'concha',
  'conchudo',
  'mierda',
  'idiota',
  'imbecil',
  'imbécil',
  'pajero',
  'hdp',
  'culiao',
  'culiado',
  'tarado',
  'mogolico',
  'mogólico',
  'negro de mierda',
  'sorete',
  'gil',
];

const pattern = new RegExp(`\\b(${BLOCKED.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');

export function cleanText(raw: unknown, max = 140): string {
  if (typeof raw !== 'string') return '';
  const noControl = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return noControl.slice(0, max).replace(pattern, (m) => m[0] + '*'.repeat(Math.max(1, m.length - 1)));
}

export function cleanName(raw: unknown): string {
  const name = cleanText(raw, 18);
  return name.length >= 2 ? name : 'Invitado';
}
