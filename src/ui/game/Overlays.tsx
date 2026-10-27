import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { cardName, TRUCO_HIERARCHY, type Card } from '../../engine/cards';
import { teamOf } from '../../engine/match';
import type { GameEvent, Team } from '../../engine/types';
import type { PlayerView } from '../../engine/view';
import { getCharacter } from '../../game/characters';
import { callLabel, type Banner, type HandSummary, type SeatMeta, type Toast } from '../../store/game';
import { Avatar } from '../art/Avatar';
import { CardFace, type DeckStyle } from '../art/CardFace';
import { Particles } from '../fx/Particles';

export function CallBanner({ banner, seats, reduced }: { banner: Banner | null; seats: SeatMeta[]; reduced: boolean }) {
  return (
    <AnimatePresence>
      {banner && (
        <motion.div key={banner.id} className="call-banner-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <motion.div
            className={`call-banner call-${banner.call}`}
            initial={reduced ? { opacity: 0 } : { scale: 2.6, rotate: -8, opacity: 0, y: -20 }}
            animate={reduced ? { opacity: 1 } : { scale: 1, rotate: -3, opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { scale: 0.8, opacity: 0, y: -30 }}
            transition={{ type: 'spring', stiffness: 520, damping: 18 }}
          >
            <div className="call-banner-who">
              <Avatar look={getCharacter(seats[banner.seat]?.characterId ?? 'pibe').look} expression="smug" size={44} animated={false} />
              <span>{seats[banner.seat]?.name}</span>
            </div>
            <div className="call-banner-text" data-text={callLabel(banner.call)}>
              {callLabel(banner.call)}
            </div>
          </motion.div>
          {!reduced && (banner.call === 'vale_cuatro' || banner.call === 'falta_envido' || banner.call === 'contraflor_al_resto') && (
            <Particles style="chispas" intensity={1.2} className="banner-sparks" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toasts">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`toast ${t.good === true ? 'good' : t.good === false ? 'bad' : ''}`}
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const TRUCO_NAMES = ['Sin truco', 'Truco', 'Retruco', 'Vale cuatro'];

export function StatusBar({ view, myTeam }: { view: PlayerView; myTeam: Team }) {
  const h = view.hand;
  const level = h.truco.level;
  const holder = h.truco.holder;
  const results = h.bazas.map((b) => b.winnerTeam);
  return (
    <div className="status-bar">
      <div className="status-chip status-truco" title="Lo que vale la mano">
        <span className="status-k">{TRUCO_NAMES[level]}</span>
        <span className="status-v">vale {level + 1}</span>
        {holder !== null && level > 0 && level < 3 && <span className="status-h">{holder === myTeam ? 'quiero tuyo' : 'quiero de ellos'}</span>}
      </div>
      <div className="baza-track" aria-label="Bazas">
        {[0, 1, 2].map((i) => {
          const r = results[i];
          const cls = r === undefined ? 'pending' : r === null ? 'parda' : r === myTeam ? 'won' : 'lost';
          return (
            <span key={i} className={`baza-dot ${cls}`} title={`Baza ${i + 1}`}>
              {cls === 'won' ? '✓' : cls === 'lost' ? '✗' : cls === 'parda' ? '=' : i + 1}
            </span>
          );
        })}
      </div>
      {view.myEnvido !== null && h.envido.status !== 'closed' && h.envido.status !== 'resolved' && (
        <div className="status-chip status-envido" title="Tus tantos de envido">
          <span className="status-k">{view.myFlor ? 'Flor' : 'Envido'}</span>
          <span className="status-v">{view.myEnvido}</span>
        </div>
      )}
    </div>
  );
}

export function HandSummaryCard({
  summary,
  myTeam,
  onContinue,
  onReplay,
}: {
  summary: HandSummary | null;
  myTeam: Team;
  onContinue: () => void;
  onReplay: () => void;
}) {
  return (
    <AnimatePresence>
      {summary && (
        <motion.div
          className={`hand-summary ${summary.winnerTeam === myTeam ? 'won' : 'lost'}`}
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        >
          <div className="hs-title">{summary.winnerTeam === myTeam ? '¡Mano ganada!' : 'Mano perdida'}</div>
          <ul className="hs-lines">
            {summary.lines.map((l, i) => (
              <li key={i} className={l.good ? 'good' : 'bad'}>
                {l.text}
              </li>
            ))}
          </ul>
          <div className="hs-buttons">
            <button className="btn btn-ghost" onClick={onReplay}>
              Ver repetición
            </button>
            <button className="btn btn-primary" onClick={onContinue}>
              Siguiente mano
            </button>
          </div>
          <div className="hs-timer" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ReplayStep {
  seat: number | null;
  text: string;
  card?: Card;
  baza?: number;
}

function describe(ev: GameEvent, seats: SeatMeta[], myTeam: Team): ReplayStep | null {
  const name = (s: number) => seats[s]?.name ?? `Jugador ${s + 1}`;
  const team = (t: Team) => (t === myTeam ? 'Nosotros' : 'Ellos');
  switch (ev.type) {
    case 'hand_start':
      return { seat: null, text: `Mano ${ev.hand}: es mano ${name(ev.mano)}` };
    case 'card_played':
      return { seat: ev.seat, text: `${name(ev.seat)} juega ${cardName(ev.card)}`, card: ev.card, baza: ev.baza };
    case 'baza_end':
      return { seat: ev.winnerSeat, text: ev.winnerTeam === null ? `Baza ${ev.baza + 1}: parda` : `Baza ${ev.baza + 1} para ${team(ev.winnerTeam)}` };
    case 'call':
      return { seat: ev.seat, text: `${name(ev.seat)}: ${callLabel(ev.call)}` };
    case 'response':
      return { seat: ev.seat, text: `${name(ev.seat)}: ${ev.response === 'quiero' ? '¡Quiero!' : ev.response === 'no_quiero' ? 'No quiero' : 'Con flor me achico'}` };
    case 'envido_declaration':
      return { seat: ev.seat, text: `${name(ev.seat)}: ${ev.points === null ? 'son buenas' : `${ev.points}`}` };
    case 'envido_result':
      return { seat: null, text: `Envido${ev.accepted ? '' : ' no querido'}: +${ev.points} ${team(ev.winnerTeam)}` };
    case 'flor_result':
      return { seat: null, text: `Flor: +${ev.points} ${team(ev.team)}` };
    case 'mazo':
      return { seat: ev.seat, text: `${name(ev.seat)} se va al mazo` };
    case 'hand_end':
      return { seat: null, text: `Fin de la mano: +${ev.points} ${team(ev.winnerTeam)}` };
    default:
      return null;
  }
}

export function ReplayModal({ open, log, seats, myTeam, deckStyle, onClose }: { open: boolean; log: GameEvent[]; seats: SeatMeta[]; myTeam: Team; deckStyle: DeckStyle; onClose: () => void }) {
  const steps = useMemo(() => log.map((e) => describe(e, seats, myTeam)).filter((s): s is ReplayStep => s !== null), [log, seats, myTeam]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (open) {
      setIdx(0);
      setPlaying(true);
    }
  }, [open]);
  useEffect(() => {
    if (!open || !playing) return;
    if (idx >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setIdx((i) => i + 1), 900);
    return () => clearTimeout(t);
  }, [open, playing, idx, steps.length]);

  const visible = steps.slice(0, idx + 1);
  const bySeat = new Map<number, ReplayStep[]>();
  for (const s of visible) if (s.card && s.seat !== null) bySeat.set(s.seat, [...(bySeat.get(s.seat) ?? []), s]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="modal replay" initial={{ y: 40, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 30, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Repetición de la última mano</h2>
              <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
                ✕
              </button>
            </div>
            {steps.length === 0 ? (
              <p className="muted">Todavía no terminó ninguna mano.</p>
            ) : (
              <div className="replay-body">
                <div className="replay-table">
                  {seats.map((m, seat) => (
                    <div key={seat} className={`replay-row ${teamOf(seat) === myTeam ? 'us' : 'them'}`}>
                      <div className="replay-who">
                        <Avatar look={getCharacter(m.characterId).look} size={34} animated={false} />
                        <span>{m.name}</span>
                      </div>
                      <div className="replay-cards">
                        {(bySeat.get(seat) ?? []).map((s, i) => (
                          <motion.div key={i} className="replay-card" initial={{ y: -20, opacity: 0, rotate: -10 }} animate={{ y: 0, opacity: 1, rotate: 0 }}>
                            <CardFace card={s.card!} deck={deckStyle} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <ol className="replay-steps">
                  {visible.map((s, i) => (
                    <li key={i} className={i === idx ? 'current' : ''}>
                      {s.text}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setIdx((i) => Math.max(0, i - 1))}>
                ◀ Anterior
              </button>
              <button className="btn btn-ghost" onClick={() => setPlaying((p) => !p)}>
                {playing ? 'Pausa' : 'Reproducir'}
              </button>
              <button className="btn btn-ghost" onClick={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}>
                Siguiente ▶
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function RulesModal({ open, onClose, flor, target }: { open: boolean; onClose: () => void; flor: boolean; target: number }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="modal rules" initial={{ y: 40, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 30, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Reglas rápidas</h2>
              <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
                ✕
              </button>
            </div>
            <div className="rules-grid">
              <section>
                <h3>Jerarquía de las cartas</h3>
                <ol className="hierarchy">
                  {TRUCO_HIERARCHY.map((t) => (
                    <li key={t.value}>{t.label}</li>
                  ))}
                </ol>
              </section>
              <section>
                <h3>Truco</h3>
                <p>Truco querido: 2 · Retruco: 3 · Vale cuatro: 4. Sin truco la mano vale 1.</p>
                <p>No querido: truco 1, retruco 2, vale cuatro 3 para quien cantó. Solo sube la apuesta quien tiene el quiero.</p>
                <h3>Envido</h3>
                <p>Dos cartas del mismo palo: suman + 20. Las figuras valen 0. Sin palo repetido vale la carta más alta. Máximo 33.</p>
                <p>Envido 2 · Real envido 3 · Falta envido: lo que le falta al que va ganando{target === 30 ? ' (en las malas, el partido)' : ''}. No querido: lo acumulado o 1.</p>
                <p>Se canta en la primera baza. Si te cantan truco, "el envido está primero". Los empates los gana la mano.</p>
                <h3>Pardas</h3>
                <p>Parda en la primera: define la segunda. Ganó la primera y parda en la segunda: gana el de la primera. Tres pardas: gana la mano.</p>
                {flor && (
                  <>
                    <h3>Flor</h3>
                    <p>Tres cartas del mismo palo. Es obligatorio cantarla y anula el envido: vale 3. Contraflor querida: 6 a la mejor flor. Con flor me achico: 4.</p>
                  </>
                )}
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
