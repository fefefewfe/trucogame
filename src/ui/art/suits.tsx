import type { Suit } from '../../engine/cards';

/**
 * Símbolos de los cuatro palos dibujados en un cuadro local de -50..50.
 * Ilustraciones originales en SVG.
 */

const OUTLINE = '#3a2615';

export function OroSymbol({ ornate = false }: { ornate?: boolean }) {
  const dots = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return <circle key={i} cx={Math.cos(a) * 39.5} cy={Math.sin(a) * 39.5} r={1.7} fill="#fff1b5" />;
  });
  const star: string[] = [];
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? 21 : 9;
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    star.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
  }
  return (
    <g>
      <circle r={46} fill="#7a5512" opacity={0.25} cy={2} />
      <circle r={45} fill="url(#g-oro)" stroke="#7a5512" strokeWidth={2.6} />
      <circle r={35} fill="none" stroke="#9a6c17" strokeWidth={2} />
      {dots}
      <circle r={27} fill="url(#g-oro-inner)" stroke="#9a6c17" strokeWidth={1.4} />
      <polygon points={star.join(' ')} fill="#cf8c1d" stroke="#7a4b0e" strokeWidth={1.2} />
      <circle r={6} fill="#fff1b5" stroke="#9a6c17" strokeWidth={1} />
      {ornate && (
        <g>
          <circle r={3} fill="#c0392b" />
          <circle r={31} fill="none" stroke="#fff1b5" strokeWidth={0.8} strokeDasharray="2 3" />
        </g>
      )}
      <path d="M -30 -22 A 38 38 0 0 1 -6 -40" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={4} fill="none" strokeLinecap="round" />
    </g>
  );
}

export function CopaSymbol({ ornate = false }: { ornate?: boolean }) {
  return (
    <g>
      {/* copa */}
      <path d="M -31 -38 Q -33 -4 0 8 Q 33 -4 31 -38 Z" fill="url(#g-copa)" stroke={OUTLINE} strokeWidth={2} />
      <path d="M -29 -22 Q 0 -12 29 -22 L 28 -15 Q 0 -5 -28 -15 Z" fill="url(#g-gold)" stroke="#7a4b0e" strokeWidth={1} />
      <circle cx={-14} cy={-15} r={2.6} fill="#2f6fd0" stroke="#173a75" strokeWidth={0.6} />
      <circle cx={0} cy={-12} r={3} fill="#2f9a52" stroke="#145a2c" strokeWidth={0.6} />
      <circle cx={14} cy={-15} r={2.6} fill="#2f6fd0" stroke="#173a75" strokeWidth={0.6} />
      <ellipse cx={0} cy={-38} rx={32} ry={7} fill="url(#g-gold)" stroke="#7a4b0e" strokeWidth={1.6} />
      <ellipse cx={0} cy={-38} rx={26} ry={4.2} fill="#5e0f14" />
      <path d="M -22 -32 Q -24 -14 -10 -4" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={3} fill="none" strokeLinecap="round" />
      {/* tallo */}
      <path d="M -6 7 L 6 7 L 4 30 L -4 30 Z" fill="url(#g-gold)" stroke="#7a4b0e" strokeWidth={1.4} />
      <ellipse cx={0} cy={18} rx={10} ry={5.5} fill="url(#g-gold)" stroke="#7a4b0e" strokeWidth={1.4} />
      {/* base */}
      <path d="M -24 45 Q -20 30 0 29 Q 20 30 24 45 Z" fill="url(#g-gold)" stroke="#7a4b0e" strokeWidth={1.6} />
      <rect x={-26} y={44} width={52} height={5} rx={2} fill="#c08a22" stroke="#7a4b0e" strokeWidth={1.2} />
      {ornate && (
        <g>
          <path d="M -31 -38 Q -44 -48 -40 -58" stroke="#7a4b0e" strokeWidth={2} fill="none" />
          <path d="M 31 -38 Q 44 -48 40 -58" stroke="#7a4b0e" strokeWidth={2} fill="none" />
          <circle cx={-40} cy={-58} r={3} fill="url(#g-gold)" />
          <circle cx={40} cy={-58} r={3} fill="url(#g-gold)" />
        </g>
      )}
    </g>
  );
}

export function EspadaSymbol({ ornate = false }: { ornate?: boolean }) {
  return (
    <g>
      {/* hoja */}
      <path d="M 0 -50 L 7 -38 L 6.5 16 L -6.5 16 L -7 -38 Z" fill="url(#g-steel)" stroke="#23365c" strokeWidth={1.6} />
      <line x1={0} y1={-40} x2={0} y2={12} stroke="#6d83aa" strokeWidth={1.4} />
      <line x1={-2.5} y1={-36} x2={-2.5} y2={12} stroke="#ffffff" strokeOpacity={0.7} strokeWidth={1} />
      {/* guarda */}
      <path d="M -28 16 Q -34 21 -28 27 L 28 27 Q 34 21 28 16 Z" fill="url(#g-guard)" stroke="#15305f" strokeWidth={1.6} />
      <circle cx={-30} cy={21.5} r={4.5} fill="url(#g-gold)" stroke="#7a4b0e" strokeWidth={1} />
      <circle cx={30} cy={21.5} r={4.5} fill="url(#g-gold)" stroke="#7a4b0e" strokeWidth={1} />
      <path d="M -6 27 Q -14 34 -9 40" fill="none" stroke="#c8932d" strokeWidth={2.4} />
      {/* empuñadura */}
      <rect x={-4.5} y={27} width={9} height={16} rx={2} fill="url(#g-wood-grip)" stroke={OUTLINE} strokeWidth={1.2} />
      <path d="M -4.5 31 L 4.5 34 M -4.5 35 L 4.5 38 M -4.5 39 L 4.5 42" stroke="#3a2209" strokeWidth={1} />
      <circle cx={0} cy={46} r={6} fill="url(#g-gold)" stroke="#7a4b0e" strokeWidth={1.4} />
      {ornate && (
        <g>
          <path d="M -9 -20 Q -26 -8 -20 10" fill="none" stroke="#2f9a52" strokeWidth={2.2} />
          <path d="M 9 -20 Q 26 -8 20 10" fill="none" stroke="#2f9a52" strokeWidth={2.2} />
          {[-18, -10, -2, 6].map((y, i) => (
            <g key={i}>
              <ellipse cx={-20 + i * 0.6} cy={y} rx={5} ry={2.3} fill="#3fae5a" transform={`rotate(-35 ${-20 + i * 0.6} ${y})`} />
              <ellipse cx={20 - i * 0.6} cy={y} rx={5} ry={2.3} fill="#3fae5a" transform={`rotate(35 ${20 - i * 0.6} ${y})`} />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

export function BastoSymbol({ ornate = false }: { ornate?: boolean }) {
  return (
    <g>
      <path
        d="M -7 47 L -10 4 Q -21 -18 -12 -38 Q -4 -52 10 -46 Q 22 -38 18 -16 Q 15 -2 10 4 L 7 47 Q 0 51 -7 47 Z"
        fill="url(#g-basto)"
        stroke="#2c1d0b"
        strokeWidth={1.8}
      />
      {/* ramitas cortadas */}
      <path d="M -13 -14 L -24 -22 L -21 -26 L -11 -19 Z" fill="#7a5a2a" stroke="#2c1d0b" strokeWidth={1.2} />
      <ellipse cx={-23} cy={-24.5} rx={2.6} ry={3.2} fill="#e6c38a" stroke="#2c1d0b" strokeWidth={0.8} />
      <path d="M 15 -26 L 26 -32 L 27 -27 L 16 -21 Z" fill="#7a5a2a" stroke="#2c1d0b" strokeWidth={1.2} />
      <ellipse cx={27} cy={-29.5} rx={2.4} ry={3} fill="#e6c38a" stroke="#2c1d0b" strokeWidth={0.8} />
      <path d="M 9 8 L 18 2 L 19 6 L 10 12 Z" fill="#7a5a2a" stroke="#2c1d0b" strokeWidth={1} />
      {/* nudos y vetas */}
      <ellipse cx={2} cy={-30} rx={4} ry={2.6} fill="none" stroke="#2c1d0b" strokeWidth={1.2} />
      <ellipse cx={-4} cy={-4} rx={3} ry={2} fill="none" stroke="#2c1d0b" strokeWidth={1.1} />
      <path d="M -6 -42 Q -12 -20 -4 2 M 6 -40 Q 10 -22 4 0 M -2 10 L -2 44 M 3 14 L 3 44" stroke="#2c1d0b" strokeOpacity={0.45} strokeWidth={1} fill="none" />
      <path d="M -10 -32 Q -14 -20 -10 -8" stroke="#d6f0a8" strokeOpacity={0.5} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      {ornate && (
        <g>
          <path d="M -9 30 Q -24 26 -30 36 Q -20 40 -9 34" fill="#c0392b" stroke="#6d1a12" strokeWidth={1} />
          <path d="M 9 30 Q 24 26 30 36 Q 20 40 9 34" fill="#c0392b" stroke="#6d1a12" strokeWidth={1} />
          <rect x={-10} y={28} width={20} height={8} rx={2} fill="url(#g-gold)" stroke="#7a4b0e" strokeWidth={1} />
        </g>
      )}
    </g>
  );
}

/** Espada larga como en la baraja tradicional: las espadas se entrecruzan en los números. */
export function LongEspada() {
  return (
    <g>
      <path d="M 0 -118 L 7.5 -100 L 6.5 58 L -6.5 58 L -7.5 -100 Z" fill="url(#g-steel-blue)" stroke="#1b2f57" strokeWidth={1.8} />
      <line x1={0} y1={-104} x2={0} y2={54} stroke="#2a4a8a" strokeWidth={1.6} />
      <line x1={-2.8} y1={-98} x2={-2.8} y2={54} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1.1} />
      <path d="M -26 58 Q -33 63.5 -26 69 L 26 69 Q 33 63.5 26 58 Z" fill="url(#g-gold)" stroke="#7a4b0e" strokeWidth={1.6} />
      <circle cx={-29} cy={63.5} r={4.5} fill="#c0392b" stroke="#6d1a12" strokeWidth={1} />
      <circle cx={29} cy={63.5} r={4.5} fill="#c0392b" stroke="#6d1a12" strokeWidth={1} />
      <rect x={-5} y={69} width={10} height={32} rx={2.5} fill="#b3242c" stroke="#4a0c08" strokeWidth={1.2} />
      <path d="M -5 75 L 5 79 M -5 82 L 5 86 M -5 89 L 5 93 M -5 96 L 5 100" stroke="#5a0f0a" strokeWidth={1.1} />
      <circle cx={0} cy={107} r={7.5} fill="url(#g-gold)" stroke="#7a4b0e" strokeWidth={1.4} />
    </g>
  );
}

/** Basto largo y nudoso para los números de bastos. */
export function LongBasto() {
  return (
    <g>
      <path
        d="M -7 112 L -10 24 Q -19 -36 -13 -86 Q -5 -116 10 -110 Q 21 -96 17 -50 Q 13 0 9 24 L 7 112 Q 0 117 -7 112 Z"
        fill="url(#g-basto)"
        stroke="#2c1d0b"
        strokeWidth={1.8}
      />
      <path d="M -14 -40 L -26 -50 L -22 -55 L -11 -46 Z" fill="#7a5a2a" stroke="#2c1d0b" strokeWidth={1.1} />
      <ellipse cx={-24.5} cy={-52.5} rx={2.6} ry={3.2} fill="#e6c38a" stroke="#2c1d0b" strokeWidth={0.8} />
      <path d="M 15 -70 L 27 -78 L 28 -72 L 16 -64 Z" fill="#7a5a2a" stroke="#2c1d0b" strokeWidth={1.1} />
      <ellipse cx={28} cy={-75} rx={2.4} ry={3} fill="#e6c38a" stroke="#2c1d0b" strokeWidth={0.8} />
      <path d="M 10 2 L 20 -5 L 21 0 L 11 7 Z" fill="#7a5a2a" stroke="#2c1d0b" strokeWidth={1} />
      <ellipse cx={2} cy={-80} rx={4} ry={2.6} fill="none" stroke="#2c1d0b" strokeWidth={1.2} />
      <ellipse cx={-5} cy={-22} rx={3} ry={2} fill="none" stroke="#2c1d0b" strokeWidth={1.1} />
      <ellipse cx={3} cy={40} rx={2.6} ry={1.8} fill="none" stroke="#2c1d0b" strokeWidth={1} />
      <path d="M -6 -100 Q -13 -40 -4 20 M 6 -98 Q 11 -46 4 20 M -2 30 L -2 108 M 3 30 L 3 108" stroke="#2c1d0b" strokeOpacity={0.4} strokeWidth={1} fill="none" />
      <path d="M -10 -84 Q -15 -50 -10 -20" stroke="#d6f0a8" strokeOpacity={0.5} strokeWidth={2.6} fill="none" strokeLinecap="round" />
    </g>
  );
}

export function SuitSymbol({ suit, ornate }: { suit: Suit; ornate?: boolean }) {
  switch (suit) {
    case 'oro':
      return <OroSymbol ornate={ornate} />;
    case 'copa':
      return <CopaSymbol ornate={ornate} />;
    case 'espada':
      return <EspadaSymbol ornate={ornate} />;
    case 'basto':
      return <BastoSymbol ornate={ornate} />;
  }
}

export function Pip({
  suit,
  x,
  y,
  size,
  rotate = 0,
  ornate,
}: {
  suit: Suit;
  x: number;
  y: number;
  size: number;
  rotate?: number;
  ornate?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${size / 100})`}>
      <SuitSymbol suit={suit} ornate={ornate} />
    </g>
  );
}

export const SUIT_COLOR: Record<Suit, string> = {
  oro: '#b07a12',
  copa: '#b3242c',
  espada: '#2a56a6',
  basto: '#2f7a3a',
};

/** Cantidad de interrupciones del marco ("pintas") que identifican el palo. */
export const PINTAS: Record<Suit, number> = {
  oro: 0,
  copa: 1,
  espada: 2,
  basto: 3,
};
