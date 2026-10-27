import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { parseCommand, speechRecognitionSupported, VoiceListener } from '../../audio/voiceCommands';
import { sfx } from '../../audio/sfx';
import { canHumanAct, useGame } from '../../store/game';

/** Botón para cantar con la voz. También responde a la tecla "V". */
export function MicButton({ style }: { style?: React.CSSProperties }) {
  const listener = useRef(new VoiceListener());
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const supported = speechRecognitionSupported();

  const handleFinal = (text: string) => {
    setHeard(text);
    const st = useGame.getState();
    if (!st.view) return;
    const res = parseCommand(text, st.view);
    if (!canHumanAct(st)) {
      st.notify('Esperá tu turno', null);
      return;
    }
    if (res.action) {
      sfx.click();
      st.humanAct(res.action, { spokenText: text });
    } else {
      st.notify(`${res.reason ?? 'No te entendí'} ("${text}")`, false);
    }
  };

  const toggle = () => {
    if (!supported) {
      useGame.getState().notify('Tu navegador no reconoce la voz. Probá con Chrome, Edge o Safari.', false);
      return;
    }
    if (listener.current.listening) {
      listener.current.stop();
      setListening(false);
      return;
    }
    setHeard('');
    const ok = listener.current.start({
      onPartial: setHeard,
      onFinal: handleFinal,
      onEnd: () => setListening(false),
      onError: (msg) => {
        setListening(false);
        useGame.getState().notify(msg, false);
      },
    });
    if (ok) {
      sfx.hover();
      setListening(true);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'v' || e.key === 'V') && !e.repeat && !(e.target instanceof HTMLInputElement)) toggle();
    };
    window.addEventListener('keydown', onKey);
    const l = listener.current;
    return () => {
      window.removeEventListener('keydown', onKey);
      l.stop();
    };
  }, []);

  useEffect(() => {
    if (!heard || listening) return;
    const t = setTimeout(() => setHeard(''), 2500);
    return () => clearTimeout(t);
  }, [heard, listening]);

  return (
    <div className="mic-wrap" style={style}>
      <AnimatePresence>
        {(listening || heard) && (
          <motion.div className="mic-heard" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {listening && !heard ? 'Escuchando… decí "truco", "quiero", "envido"…' : heard}
          </motion.div>
        )}
      </AnimatePresence>
      <button className={`mic-btn ${listening ? 'on' : ''}`} onClick={toggle} aria-pressed={listening} aria-label="Cantar con el micrófono (tecla V)" title="Cantar con el micrófono (tecla V)">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
          <path d="M6 11a6 6 0 0 0 12 0M12 17v4M8.5 21h7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
