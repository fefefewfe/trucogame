import { AnimatePresence, motion } from 'framer-motion';
import { teamOf } from '../../engine/match';
import type { PlayerView } from '../../engine/view';
import { getCharacter } from '../../game/characters';
import type { Bubble, KnownSena, SeatMeta } from '../../store/game';
import { senaDef } from '../../game/senas';
import { Avatar, type Expression } from '../art/Avatar';
import type { Layout } from './layout';

export function SeatsLayer({
  view,
  layout,
  seats,
  expressions,
  bubbles,
  thinkingSeat,
  actingSeat,
  frame,
  deadline,
  knownSenas,
  part,
}: {
  view: PlayerView;
  layout: Layout;
  seats: SeatMeta[];
  expressions: Record<number, Expression>;
  bubbles: Record<number, Bubble>;
  thinkingSeat: number | null;
  actingSeat: number | null;
  frame: string;
  deadline: number | null;
  knownSenas: KnownSena[];
  /** 'base' dibuja los avatares (debajo de las cartas); 'overlay' los nombres y globos (encima). */
  part: 'base' | 'overlay';
}) {
  const me = view.seat;
  return (
    <div className={`seats-layer seats-${part}`}>
      {layout.seats.map((s) => {
        const meta = seats[s.seat];
        if (!meta) return null;
        const ch = getCharacter(meta.characterId);
        const isMano = view.hand.mano === s.seat;
        const isDealer = view.hand.dealer === s.seat;
        const acting = actingSeat === s.seat;
        const partner = s.seat !== me && teamOf(s.seat) === teamOf(me);
        const bubble = bubbles[s.seat];
        const size = s.avatarSize;
        const below = s.vis !== 0 && s.avatar.y < layout.h * 0.3;
        const bubblePos = below ? 'down' : 'up';
        return (
          <div
            key={s.seat}
            className={`seat seat-vis-${s.vis} ${acting ? 'is-acting' : ''} ${partner ? 'is-partner' : ''} ${s.seat === me ? 'is-me' : ''} ${meta.connected ? '' : 'is-offline'}`}
            style={{ left: s.avatar.x, top: s.avatar.y, width: size, height: size }}
          >
            {part === 'base' ? (
              <div className={`avatar-ring frame-${s.seat === me ? frame : 'madera'} team-${teamOf(s.seat) === teamOf(me) ? 'us' : 'them'}`}>
                {acting && <div className="turn-glow" />}
                <Avatar look={ch.look} expression={expressions[s.seat] ?? 'neutral'} size="100%" />
                {deadline && acting && <TurnTimer deadline={deadline} />}
              </div>
            ) : (
              <>
            <div className={`nameplate ${s.vis === 0 && layout.portrait ? 'nameplate-side' : ''} ${s.vis !== 0 && s.avatar.y < layout.h * 0.25 ? 'nameplate-left' : ''}`}>
              <span className="nameplate-name">{meta.name}</span>
              <span className="nameplate-meta">
                <span className="lvl">Nv {meta.level}</span>
                {meta.label && <span className="bot-tag">{meta.label}</span>}
                {!meta.connected && <span className="offline-tag">desconectado</span>}
              </span>
            </div>
            {knownSenas.some((k) => k.seat === s.seat) && (
              <div className="sena-chips">
                {knownSenas
                  .filter((k) => k.seat === s.seat)
                  .map((k) => (
                    <span key={k.id} className={`sena-chip ${k.rival ? 'rival' : ''}`} title={k.rival ? 'Seña que le pescaste' : 'Seña de tu compañero'}>
                      👁 {senaDef(k.sena).label}
                    </span>
                  ))}
              </div>
            )}
            <div className="seat-chips">
              {isMano && <span className="chip chip-mano" title="Es mano: empieza y gana los empates">MANO</span>}
              {isDealer && <span className="chip chip-dealer" title="Reparte">REPARTE</span>}
              {partner && <span className="chip chip-partner">COMPAÑERO</span>}
            </div>
            <AnimatePresence>
              {thinkingSeat === s.seat && !bubble && (
                <motion.div
                  key="thinking"
                  className={`bubble bubble-${bubblePos} bubble-thinking`}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                >
                  <span className="dots">
                    <i />
                    <i />
                    <i />
                  </span>
                </motion.div>
              )}
              {bubble && (
                <motion.div
                  key={bubble.id}
                  className={`bubble bubble-${bubblePos} bubble-${bubble.kind}`}
                  initial={{ opacity: 0, scale: 0.5, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -6 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                >
                  {bubble.text}
                </motion.div>
              )}
            </AnimatePresence>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TurnTimer({ deadline }: { deadline: number }) {
  const total = 30000;
  const remaining = Math.max(0, deadline - Date.now());
  return (
    <svg className="turn-timer" viewBox="0 0 100 100">
      <circle cx={50} cy={50} r={47} className="turn-timer-track" />
      <circle
        cx={50}
        cy={50}
        r={47}
        className="turn-timer-bar"
        style={{ animationDuration: `${remaining}ms`, strokeDashoffset: `${(1 - remaining / total) * 295}` }}
      />
    </svg>
  );
}
