import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { PERSONALITY_LABEL } from '../../ai/profiles';
import { sfx } from '../../audio/sfx';
import { speak } from '../../audio/voice';
import { CHARACTERS, pickPhrase, type Character } from '../../game/characters';
import { storyStage } from '../../game/story';
import { useProfile } from '../../store/profile';
import { Avatar, type Expression } from '../art/Avatar';
import { ScreenHeader } from '../common/ProfileChip';

const DEMO: Expression[] = ['happy', 'smug', 'laugh', 'surprised', 'angry', 'thinking', 'sad'];

function unlockText(c: Character): string {
  if (c.unlock.kind === 'inicial') return 'Disponible';
  if (c.unlock.kind === 'historia') return `Se desbloquea al ganar "${storyStage(c.unlock.stage).title}"`;
  return `Tienda: ${c.unlock.price} monedas`;
}

export function CharactersScreen() {
  const profile = useProfile();
  const [selected, setSelected] = useState<Character>(CHARACTERS.find((c) => c.id === profile.characterId) ?? CHARACTERS[0]);
  const [expr, setExpr] = useState<Expression>('happy');
  const [line, setLine] = useState<string>('');
  const unlocked = profile.unlockedCharacters.includes(selected.id);
  const record = profile.vsCharacter[selected.id];

  const sayHi = () => {
    const text = pickPhrase(selected, 'saludo');
    setLine(text);
    speak(selected, 'saludo', text);
    setExpr(DEMO[Math.floor(Math.random() * DEMO.length)]);
  };

  return (
    <div className="screen characters-screen">
      <ScreenHeader title="Personajes" subtitle="Cada rival tiene su estilo, sus frases y su estrategia" />
      <div className="chars-layout">
        <div className="chars-list">
          {CHARACTERS.map((c) => {
            const own = profile.unlockedCharacters.includes(c.id);
            return (
              <button
                key={c.id}
                className={`char-tile ${c.id === selected.id ? 'on' : ''} ${own ? '' : 'locked'} ${c.id === profile.characterId ? 'mine' : ''}`}
                onClick={() => {
                  sfx.click();
                  setSelected(c);
                  setLine('');
                  setExpr('happy');
                }}
              >
                <Avatar look={c.look} size={64} animated={false} />
                <span>{c.name}</span>
                {c.id === profile.characterId && <em>Vos</em>}
              </button>
            );
          })}
        </div>
        <AnimatePresence mode="wait">
          <motion.section key={selected.id} className="panel char-detail" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="cd-portrait" onClick={sayHi}>
              <Avatar look={selected.look} expression={expr} size={200} />
              <AnimatePresence>
                {line && (
                  <motion.div key={line} className="bubble bubble-up bubble-frase cd-bubble" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    {line}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="cd-info">
              <h2>{selected.name}</h2>
              <p className="cd-tagline">{selected.tagline}</p>
              <p>{selected.bio}</p>
              <dl className="cd-facts">
                <dt>Origen</dt>
                <dd>{selected.origin}</dd>
                <dt>Estilo</dt>
                <dd>{PERSONALITY_LABEL[selected.personality]}</dd>
                <dt>Tu historial</dt>
                <dd>{record ? `${record.won} ganadas · ${record.lost} perdidas` : 'Todavía no jugaron'}</dd>
                <dt>Como avatar</dt>
                <dd>{unlockText(selected)}</dd>
              </dl>
              <div className="cd-expr">
                {DEMO.map((e) => (
                  <button key={e} className={`chip-btn ${expr === e ? 'on' : ''}`} onClick={() => setExpr(e)}>
                    {{ happy: 'Contento', smug: 'Canchero', laugh: 'Festejo', surprised: 'Sorpresa', angry: 'Enojo', thinking: 'Pensando', sad: 'Derrota', neutral: 'Neutral' }[e]}
                  </button>
                ))}
              </div>
              <div className="row">
                <button className="btn btn-ghost" onClick={sayHi}>
                  Escuchar una frase
                </button>
                {unlocked ? (
                  <button
                    className="btn btn-primary"
                    disabled={profile.characterId === selected.id}
                    onClick={() => {
                      sfx.reward();
                      profile.setCharacter(selected.id);
                    }}
                  >
                    {profile.characterId === selected.id ? 'Es tu personaje' : 'Usar como mi personaje'}
                  </button>
                ) : selected.unlock.kind === 'tienda' ? (
                  <button
                    className="btn btn-primary"
                    disabled={profile.coins < selected.unlock.price}
                    onClick={() => {
                      if (selected.unlock.kind === 'tienda' && profile.buyCharacter(selected.id, selected.unlock.price)) sfx.reward();
                    }}
                  >
                    Desbloquear · {selected.unlock.price} <span className="coin" />
                  </button>
                ) : (
                  <span className="muted">{unlockText(selected)}</span>
                )}
              </div>
            </div>
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  );
}
