import { AnimatePresence, motion } from 'framer-motion';
import { envidoAcceptedPoints, envidoRejectedPoints, faltaPoints, teamOf, TRUCO_CALL_LEVEL } from '../../engine/match';
import type { Action, Call, EnvidoCall, Response, Team, TrucoCall } from '../../engine/types';
import type { PlayerView } from '../../engine/view';
import { sfx } from '../../audio/sfx';
import { callLabel, type SeatMeta } from '../../store/game';

const CALL_BUTTON: Record<Call, { label: string; family: string }> = {
  truco: { label: 'Truco', family: 'truco' },
  retruco: { label: 'Retruco', family: 'truco' },
  vale_cuatro: { label: 'Vale cuatro', family: 'truco' },
  envido: { label: 'Envido', family: 'envido' },
  real_envido: { label: 'Real envido', family: 'envido' },
  falta_envido: { label: 'Falta envido', family: 'envido' },
  flor: { label: 'Flor', family: 'flor' },
  contraflor: { label: 'Contraflor', family: 'flor' },
  contraflor_al_resto: { label: 'Contraflor al resto', family: 'flor' },
};

const RESPONSE_LABEL: Record<Response, string> = {
  quiero: 'Quiero',
  no_quiero: 'No quiero',
  me_achico: 'Con flor me achico',
};

function GameButton({ action, label, family, onAct, disabled, hint }: { action: Action; label: string; family: string; onAct: (a: Action) => void; disabled: boolean; hint?: string }) {
  return (
    <motion.button
      layout
      className={`gbtn gbtn-${family}`}
      disabled={disabled}
      onClick={() => {
        sfx.click();
        onAct(action);
      }}
      whileHover={disabled ? undefined : { y: -2, scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.9 }}
      title={hint}
    >
      <span>{label}</span>
      {hint && <small>{hint}</small>}
    </motion.button>
  );
}

function trucoHint(call: TrucoCall): string {
  const level = TRUCO_CALL_LEVEL[call];
  return `vale ${level + 1}`;
}

/** Botonera de cantos disponibles en mi turno (no se muestran las cartas: se juegan tocándolas). */
export function ActionBar({ view, enabled, onAct }: { view: PlayerView; enabled: boolean; onAct: (a: Action) => void }) {
  const pending = view.pending;
  const myTurn = !pending && view.hand.turn === view.seat && view.phase === 'playing';
  const calls = myTurn ? view.legalActions.filter((a) => a.type === 'call' || a.type === 'mazo') : [];
  return (
    <div className="action-bar" aria-label="Cantos disponibles">
      <AnimatePresence mode="popLayout">
        {calls.map((a) => {
          if (a.type === 'mazo') {
            return <GameButton key="mazo" action={a} label="Al mazo" family="mazo" onAct={onAct} disabled={!enabled} />;
          }
          if (a.type !== 'call') return null;
          const meta = CALL_BUTTON[a.call];
          const hint = a.call === 'truco' || a.call === 'retruco' || a.call === 'vale_cuatro' ? trucoHint(a.call) : undefined;
          return <GameButton key={a.call} action={a} label={meta.label} family={meta.family} onAct={onAct} disabled={!enabled} hint={hint} />;
        })}
      </AnimatePresence>
    </div>
  );
}

function stakes(view: PlayerView, response: Action): string | undefined {
  const pending = view.pending;
  if (!pending) return undefined;
  const callerTeam: Team = pending.team;
  const mine = teamOf(view.seat);
  if (pending.kind === 'truco') {
    const level = TRUCO_CALL_LEVEL[pending.call as TrucoCall];
    if (response.type === 'respond' && response.response === 'quiero') return `La mano vale ${level + 1}`;
    if (response.type === 'respond' && response.response === 'no_quiero') return `Ellos suman ${level}`;
    if (response.type === 'call' && (response.call === 'retruco' || response.call === 'vale_cuatro')) return `Subís a ${TRUCO_CALL_LEVEL[response.call] + 1}`;
    if (response.type === 'call' && response.call === 'envido') return 'El envido está primero';
    return undefined;
  }
  if (pending.kind === 'envido') {
    const chain = view.hand.envido.calls.map((c) => c.call);
    if (response.type === 'respond' && response.response === 'quiero') {
      const pts = envidoAcceptedPoints(chain, () => faltaPoints(view.scores, view.config.targetScore, mine));
      return chain.includes('falta_envido') ? `Se juega la falta (${pts})` : `Se juegan ${pts}`;
    }
    if (response.type === 'respond' && response.response === 'no_quiero') return `Ellos suman ${envidoRejectedPoints(chain)}`;
    if (response.type === 'call') {
      const next = [...chain, response.call as EnvidoCall];
      if (response.call === 'falta_envido') return 'A todo o nada';
      return `Se juegan ${envidoAcceptedPoints(next, () => 0)}`;
    }
    return undefined;
  }
  if (pending.kind === 'flor') {
    if (response.type === 'respond' && response.response === 'me_achico') return 'Ellos suman 4';
    if (response.type === 'respond' && response.response === 'quiero') return pending.call === 'contraflor' ? 'La mejor flor suma 6' : 'Se juega la falta';
    if (response.type === 'respond' && response.response === 'no_quiero') return `Ellos suman ${pending.call === 'contraflor_al_resto' && view.hand.flor.calls.some((c) => c.call === 'contraflor') ? 6 : 4}`;
  }
  void callerTeam;
  return undefined;
}

const HEAD_CLASS: Record<string, string> = { truco: 'truco', envido: 'envido', flor: 'flor' };

/** Panel emergente para responder un canto del rival. */
export function ResponsePanel({ view, seats, enabled, onAct }: { view: PlayerView; seats: SeatMeta[]; enabled: boolean; onAct: (a: Action) => void }) {
  const pending = view.pending;
  const options = pending && pending.team !== teamOf(view.seat) ? view.legalActions : [];
  const show = options.length > 0 && enabled;
  return (
    <AnimatePresence>
      {show && pending && (
        <motion.div
          className={`response-panel family-${HEAD_CLASS[pending.kind]}`}
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          role="dialog"
          aria-label="Responder canto"
        >
          <div className="response-title">{callLabel(pending.call)}</div>
          <div className="response-sub">
            {seats[pending.seat]?.name ?? 'El rival'} {pending.kind === 'truco' ? 'te canta' : pending.kind === 'envido' ? 'canta' : 'canta'}{' '}
            {pending.call.replace(/_/g, ' ')}
            {view.myEnvido !== null && pending.kind === 'envido' && <> · Tenés <b>{view.myEnvido}</b> de envido</>}
          </div>
          <div className="response-buttons">
            {options.map((a) => {
              const key = a.type === 'respond' ? a.response : a.type === 'call' ? a.call : a.type;
              const label = a.type === 'respond' ? RESPONSE_LABEL[a.response] : a.type === 'call' ? CALL_BUTTON[a.call].label : '';
              const family =
                a.type === 'respond' ? (a.response === 'quiero' ? 'quiero' : 'noquiero') : a.type === 'call' ? CALL_BUTTON[a.call].family : 'mazo';
              return <GameButton key={key} action={a} label={label} family={family} onAct={onAct} disabled={!enabled} hint={stakes(view, a)} />;
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
