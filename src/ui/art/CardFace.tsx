import { memo } from 'react';
import type { Card, Suit } from '../../engine/cards';
import { CourtFigure } from './figures';
import { LongBasto, LongEspada, PINTAS, Pip, SUIT_COLOR } from './suits';
import { useRealDeck } from './realDeck';

export const CARD_W = 200;
export const CARD_H = 310;

export type DeckStyle = 'clasica' | 'antigua' | 'dorada';

const PIP_LAYOUT: Record<number, [number, number][]> = {
  2: [
    [100, 88],
    [100, 222],
  ],
  3: [
    [100, 78],
    [100, 155],
    [100, 232],
  ],
  4: [
    [72, 92],
    [128, 92],
    [72, 218],
    [128, 218],
  ],
  5: [
    [72, 88],
    [128, 88],
    [100, 155],
    [72, 222],
    [128, 222],
  ],
  6: [
    [72, 80],
    [128, 80],
    [72, 155],
    [128, 155],
    [72, 230],
    [128, 230],
  ],
  7: [
    [72, 76],
    [128, 76],
    [100, 116],
    [72, 156],
    [128, 156],
    [72, 234],
    [128, 234],
  ],
};

const PIP_SIZE: Record<number, number> = { 2: 60, 3: 54, 4: 50, 5: 46, 6: 42, 7: 38 };

/**
 * Espadas y bastos de la baraja tradicional: largos y entrecruzados.
 * Mitad inclinados hacia un lado, mitad hacia el otro y, si son impares, uno derecho al medio.
 */
function crossLayout(n: number): { x: number; rot: number; len: number }[] {
  const pairs = Math.floor(n / 2);
  const xs = pairs === 1 ? [100] : pairs === 2 ? [76, 124] : [62, 100, 138];
  const angle = pairs === 1 ? 30 : pairs === 2 ? 22 : 17;
  const len = n <= 3 ? 1 : n <= 5 ? 0.95 : 0.9;
  const out: { x: number; rot: number; len: number }[] = [];
  xs.forEach((x, i) => {
    out.push({ x, rot: i % 2 === 0 ? angle : -angle, len });
    out.push({ x, rot: i % 2 === 0 ? -angle : angle, len });
  });
  if (n % 2 === 1) out.push({ x: 100, rot: 0, len });
  return out;
}

const DECK_PAPER: Record<DeckStyle, { paper: string; edge: string; tint?: string }> = {
  clasica: { paper: 'url(#card-paper)', edge: '#c7b48c' },
  antigua: { paper: 'url(#card-paper)', edge: '#9c7c4a', tint: '#b07a2a' },
  dorada: { paper: 'url(#card-paper)', edge: '#c9a24a', tint: '#f2c14e' },
};

function Frame({ suit, style }: { suit: Suit; style: DeckStyle }) {
  const color = style === 'dorada' ? '#b8892a' : SUIT_COLOR[suit];
  const gaps = PINTAS[suit];
  const centers = gaps === 0 ? [] : gaps === 1 ? [100] : gaps === 2 ? [88, 112] : [78, 100, 122];
  const gapW = 10;
  const edge = (y: number) => {
    const segs: [number, number][] = [];
    let start = 22;
    for (const c of centers) {
      segs.push([start, c - gapW / 2]);
      start = c + gapW / 2;
    }
    segs.push([start, 178]);
    return segs.map(([a, b], i) => <line key={`${y}-${i}`} x1={a} y1={y} x2={b} y2={y} stroke={color} strokeWidth={2.6} strokeLinecap="round" />);
  };
  return (
    <g>
      {edge(14)}
      {edge(296)}
      <line x1={14} y1={24} x2={14} y2={286} stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      <line x1={186} y1={24} x2={186} y2={286} stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M 14 24 Q 14 14 22 14" stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <path d="M 178 14 Q 186 14 186 24" stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <path d="M 14 286 Q 14 296 22 296" stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <path d="M 178 296 Q 186 296 186 286" stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" />
    </g>
  );
}

function CornerIndex({ card }: { card: Card }) {
  const color = SUIT_COLOR[card.suit];
  const label = String(card.rank);
  const fontSize = label.length > 1 ? 30 : 36;
  return (
    <g>
      <text
        x={label.length > 1 ? 21 : 24}
        y={50}
        fontFamily="'Alfa Slab One', Georgia, serif"
        fontSize={fontSize}
        fill={color}
        stroke="#fffaf0"
        strokeWidth={1}
        paintOrder="stroke"
      >
        {label}
      </text>
    </g>
  );
}

export const CardFace = memo(function CardFace({ card, deck = 'clasica' }: { card: Card; deck?: DeckStyle }) {
  const real = useRealDeck();
  if (real) {
    return <img className="card-img" src={real.src(card.id)} alt={`${card.rank} de ${card.suit}`} draggable={false} />;
  }
  const paper = DECK_PAPER[deck];
  const crossing = card.suit === 'espada' || card.suit === 'basto';
  let center: React.ReactNode;
  if (card.rank === 1) {
    center = (
      <g>
        <ellipse cx={100} cy={160} rx={56} ry={74} fill="#000" opacity={0.04} />
        <Pip suit={card.suit} x={100} y={155} size={card.suit === 'espada' || card.suit === 'basto' ? 150 : 118} ornate />
      </g>
    );
  } else if (card.rank >= 10) {
    center = <CourtFigure rank={card.rank as 10 | 11 | 12} suit={card.suit} />;
  } else if (crossing) {
    const Long = card.suit === 'espada' ? LongEspada : LongBasto;
    center = crossLayout(card.rank).map((p, i) => (
      <g key={i} transform={`translate(${p.x} 156) rotate(${p.rot}) scale(${0.98 * p.len})`}>
        <Long />
      </g>
    ));
  } else {
    const layout = PIP_LAYOUT[card.rank];
    const size = PIP_SIZE[card.rank];
    center = layout.map(([x, y], i) => <Pip key={i} suit={card.suit} x={x} y={y} size={size} />);
  }
  return (
    <svg viewBox={`0 0 ${CARD_W} ${CARD_H}`} className="card-svg" role="img" aria-label={`${card.rank} de ${card.suit}`}>
      <rect x={1} y={1} width={198} height={308} rx={14} fill={paper.paper} stroke={paper.edge} strokeWidth={2} />
      {paper.tint && <rect x={1} y={1} width={198} height={308} rx={14} fill={paper.tint} opacity={deck === 'antigua' ? 0.16 : 0.08} />}
      <Frame suit={card.suit} style={deck} />
      {center}
      <rect x={1} y={1} width={198} height={308} rx={14} fill="url(#card-sheen)" opacity={0.55} pointerEvents="none" />
      <CornerIndex card={card} />
      <g transform={`rotate(180 ${CARD_W / 2} ${CARD_H / 2})`}>
        <CornerIndex card={card} />
      </g>
    </svg>
  );
});

export type CardBackStyle = 'clasico' | 'azul' | 'celeste' | 'premium' | 'fileteado' | 'paño';

const BACK_FRAME: Record<CardBackStyle, { frame: string; inner: string; emblem: string; text: string }> = {
  clasico: { frame: '#f3e3c0', inner: '#7a1218', emblem: '#f0c75e', text: '#7a1218' },
  azul: { frame: '#f0e3c4', inner: '#0c2149', emblem: '#d9b45a', text: '#0c2149' },
  celeste: { frame: '#ffffff', inner: '#3d7fbf', emblem: '#f2b631', text: '#3d7fbf' },
  premium: { frame: '#c9a24a', inner: '#0a0a0a', emblem: '#e9c66a', text: '#0a0a0a' },
  fileteado: { frame: '#f2c14e', inner: '#111111', emblem: '#e23b3b', text: '#111111' },
  paño: { frame: '#e8d9b0', inner: '#0b3a26', emblem: '#e8c35a', text: '#0b3a26' },
};

/** Sol de mayo estilizado para el reverso. */
function Sun({ color }: { color: string }) {
  const rays = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const straight = i % 2 === 0;
    const r1 = 17;
    const r2 = straight ? 30 : 27;
    if (straight) {
      return <line key={i} x1={Math.cos(a) * r1} y1={Math.sin(a) * r1} x2={Math.cos(a) * r2} y2={Math.sin(a) * r2} stroke={color} strokeWidth={3} strokeLinecap="round" />;
    }
    const mx = Math.cos(a + 0.12) * 23;
    const my = Math.sin(a + 0.12) * 23;
    return (
      <path
        key={i}
        d={`M ${Math.cos(a) * r1} ${Math.sin(a) * r1} Q ${mx} ${my} ${Math.cos(a) * r2} ${Math.sin(a) * r2}`}
        stroke={color}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
      />
    );
  });
  return (
    <g>
      {rays}
      <circle r={15} fill={color} />
      <circle r={15} fill="url(#card-sheen)" />
      <circle cx={-5} cy={-3} r={1.6} fill="#5a3a0a" />
      <circle cx={5} cy={-3} r={1.6} fill="#5a3a0a" />
      <path d="M -5 5 Q 0 8.5 5 5" stroke="#5a3a0a" strokeWidth={1.4} fill="none" />
    </g>
  );
}

export const CardBack = memo(function CardBack({ style = 'clasico' }: { style?: CardBackStyle }) {
  const f = BACK_FRAME[style];
  return (
    <svg viewBox={`0 0 ${CARD_W} ${CARD_H}`} className="card-svg" aria-hidden="true">
      <rect x={1} y={1} width={198} height={308} rx={14} fill={f.frame} stroke="#00000033" strokeWidth={2} />
      <rect x={12} y={12} width={176} height={286} rx={9} fill={`url(#pat-${style})`} />
      <rect x={12} y={12} width={176} height={286} rx={9} fill="none" stroke={f.inner} strokeWidth={3} />
      <rect x={19} y={19} width={162} height={272} rx={6} fill="none" stroke={f.frame} strokeWidth={1.2} opacity={0.8} />
      <ellipse cx={100} cy={155} rx={52} ry={64} fill={f.inner} stroke={f.emblem} strokeWidth={3} />
      <ellipse cx={100} cy={155} rx={45} ry={57} fill="none" stroke={f.emblem} strokeWidth={1} strokeDasharray="3 3" />
      <g transform="translate(100 140)">
        <Sun color={f.emblem} />
      </g>
      <text x={100} y={196} textAnchor="middle" fontFamily="'Alfa Slab One', Georgia, serif" fontSize={13} fill={f.emblem} letterSpacing={2}>
        TRUCO
      </text>
      <rect x={1} y={1} width={198} height={308} rx={14} fill="url(#card-sheen)" opacity={0.6} />
    </svg>
  );
});
