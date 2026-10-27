import { AnimatePresence, motion } from 'framer-motion';
import { PERSONALITY_LABEL } from '../../ai/profiles';
import { getCharacter } from '../../game/characters';
import { useProfile } from '../../store/profile';
import type { SeatMeta, SeatStats } from '../../store/game';
import { Avatar } from '../art/Avatar';

/** Ficha de un jugador: solo información permitida (nunca sus cartas). */
export function RivalCard({ seat, meta, stats, onClose }: { seat: number | null; meta: SeatMeta | null; stats: SeatStats | null; onClose: () => void }) {
  const vs = useProfile((p) => p.vsCharacter);
  const ch = meta ? getCharacter(meta.characterId) : null;
  const record = meta ? vs[meta.characterId] : undefined;
  return (
    <AnimatePresence>
      {seat !== null && meta && ch && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="modal rival-card" initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="rc-head">
              <Avatar look={ch.look} expression="smug" size={96} />
              <div>
                <h2>{meta.name}</h2>
                <p className="muted">
                  {meta.human ? `Persona · nivel ${meta.level}` : `${meta.label ?? 'Bot'} · estilo ${PERSONALITY_LABEL[ch.personality].toLowerCase()}`}
                </p>
                <p className="cd-tagline">{ch.tagline}</p>
              </div>
            </div>
            <h3>En esta partida</h3>
            <div className="stats-grid">
              <div className="stat">
                <b>{stats?.trucos ?? 0}</b>
                <span>Trucos cantados</span>
              </div>
              <div className="stat">
                <b>{stats?.envidos ?? 0}</b>
                <span>Envidos cantados</span>
              </div>
              <div className="stat bad">
                <b>{stats?.faroles ?? 0}</b>
                <span>Faroles descubiertos</span>
              </div>
              <div className="stat">
                <b>{stats?.noQuiero ?? 0}</b>
                <span>"No quiero"</span>
              </div>
              <div className="stat good">
                <b>{stats?.manos ?? 0}</b>
                <span>Manos ganadas</span>
              </div>
            </div>
            {!meta.human && (
              <p className="field-help">
                Tu historial contra {ch.name}: {record ? `${record.won} ganadas y ${record.lost} perdidas` : 'todavía no jugaron'}.
              </p>
            )}
            <p className="field-help">Un farol se cuenta cuando cantó truco y después mostró cartas bajas. Nunca se muestran cartas que no se jugaron.</p>
            <div className="modal-foot">
              <button className="btn btn-primary" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
