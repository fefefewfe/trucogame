import { AnimatePresence, motion } from 'framer-motion';
import { memo } from 'react';
import type { Team } from '../../engine/types';

/**
 * Tanteador con fósforos: cada grupo de cinco es un cuadrado con su diagonal,
 * como se anota en cualquier mesa de truco.
 */
function Matches({ count }: { count: number }) {
  // 1: izquierda, 2: arriba, 3: derecha, 4: abajo, 5: diagonal
  const segs: [number, number, number, number][] = [
    [4, 26, 4, 4],
    [4, 4, 26, 4],
    [26, 4, 26, 26],
    [26, 26, 4, 26],
    [5, 25, 25, 5],
  ];
  return (
    <svg viewBox="0 0 30 30" className="match-box" aria-hidden="true">
      {segs.slice(0, count).map(([x1, y1, x2, y2], i) => (
        <motion.g key={i} initial={{ opacity: 0, pathLength: 0 }} animate={{ opacity: 1, pathLength: 1 }} transition={{ duration: 0.35, delay: i * 0.04 }}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d9b98a" strokeWidth={2.6} strokeLinecap="round" />
          <circle cx={x2} cy={y2} r={2.2} fill="#c0392b" />
        </motion.g>
      ))}
    </svg>
  );
}

function Column({ score, target, label, us }: { score: number; target: number; label: string; us: boolean }) {
  const groups = Math.ceil(target / 5);
  const boxes = Array.from({ length: groups }, (_, i) => Math.max(0, Math.min(5, score - i * 5)));
  const half = target === 30 ? 3 : groups;
  return (
    <div className={`score-col ${us ? 'us' : 'them'}`}>
      <div className="score-label">{label}</div>
      <div className="score-number">{score}</div>
      <div className="score-boxes">
        {boxes.map((c, i) => (
          <div key={i} className={`score-box ${target === 30 && i >= half ? 'buenas' : ''}`}>
            <Matches count={c} />
            {target === 30 && i === half - 1 && <div className="malas-line" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export const Scoreboard = memo(function Scoreboard({
  scores,
  myTeam,
  target,
  pointsFx,
  compact,
}: {
  scores: [number, number];
  myTeam: Team;
  target: number;
  pointsFx: { id: number; team: Team; points: number }[];
  compact: boolean;
}) {
  const other = (1 - myTeam) as Team;
  const inBuenas = (s: number) => target === 30 && s > 15;
  return (
    <div className={`scoreboard ${compact ? 'compact' : ''}`}>
      <div className="score-title">
        A {target}
        {target === 30 && (
          <span className="score-sub">
            {inBuenas(scores[myTeam]) ? 'Buenas' : 'Malas'} · {inBuenas(scores[other]) ? 'Buenas' : 'Malas'}
          </span>
        )}
      </div>
      <div className="score-cols">
        <Column score={scores[myTeam]} target={target} label="Nosotros" us />
        <div className="score-divider" />
        <Column score={scores[other]} target={target} label="Ellos" us={false} />
      </div>
      <AnimatePresence>
        {pointsFx.slice(-2).map((fx) => (
          <motion.div
            key={fx.id}
            className={`points-fx ${fx.team === myTeam ? 'us' : 'them'}`}
            initial={{ opacity: 0, y: 10, scale: 0.6 }}
            animate={{ opacity: [0, 1, 1, 0], y: -30, scale: 1.2 }}
            transition={{ duration: 1.6 }}
          >
            +{fx.points}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});
