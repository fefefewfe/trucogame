import { AnimatePresence, motion } from 'framer-motion';
import { getCharacter } from '../../game/characters';
import { SENAS, type SenaId } from '../../game/senas';
import { sfx } from '../../audio/sfx';
import { Avatar } from '../art/Avatar';

/** Panel para hacerle señas al compañero. Los rivales pueden llegar a verlas. */
export function SenasPanel({
  open,
  characterId,
  left,
  flor,
  onSena,
  onClose,
}: {
  open: boolean;
  characterId: string;
  left: number;
  flor: boolean;
  onSena: (sena: SenaId) => void;
  onClose: () => void;
}) {
  const look = getCharacter(characterId).look;
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="senas-panel" initial={{ opacity: 0, y: -10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }} role="dialog" aria-label="Señas">
          <div className="senas-head">
            <b>Señas a tu compañero</b>
            <span>{left > 0 ? `Te quedan ${left} en esta mano` : 'No te quedan señas en esta mano'}</span>
            <button className="icon-btn small" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>
          <p className="senas-warn">Ojo: los rivales pueden verte la seña. Podés mentir, pero tu compañero te va a creer.</p>
          <div className="senas-grid">
            {SENAS.filter((s) => flor || s.id !== 'flor').map((s) => (
              <button
                key={s.id}
                className="sena-btn"
                disabled={left <= 0}
                onClick={() => {
                  sfx.hover();
                  onSena(s.id);
                  onClose();
                }}
              >
                <Avatar look={look} expression={s.expression} size={52} animated={false} />
                <span className="sena-label">{s.label}</span>
                <small>{s.gesture}</small>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
