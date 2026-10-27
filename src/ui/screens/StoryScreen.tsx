import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { DIFFICULTY_LABEL } from '../../ai/profiles';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { speak } from '../../audio/voice';
import { getCharacter } from '../../game/characters';
import { TABLES } from '../../game/cosmetics';
import { startLocalMatch } from '../../game/launcher';
import { levelFromXp } from '../../game/progression';
import { buildSeats } from '../../game/setup';
import { STORY, type StoryStage } from '../../game/story';
import { useProfile } from '../../store/profile';
import { Avatar } from '../art/Avatar';
import { ScreenHeader } from '../common/ProfileChip';
import { Backdrop } from '../scene/Backdrop';

/** Silueta estilizada de la Argentina continental (dibujo propio simplificado). */
const ARG_PATH =
  'M 44 4 L 58 6 L 64 12 L 74 14 L 82 22 L 80 30 L 72 34 L 70 40 L 66 46 L 68 52 L 62 58 L 56 60 L 54 66 L 48 70 L 46 76 L 40 80 L 38 86 L 34 92 L 30 96 L 26 94 L 28 86 L 26 78 L 28 70 L 26 62 L 28 54 L 26 46 L 28 38 L 30 30 L 34 22 L 38 14 Z';

function Dialogue({ stage, onDone, onCancel }: { stage: StoryStage; onDone: () => void; onCancel: () => void }) {
  const profile = useProfile();
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const line = stage.intro[idx];
  const speakerChar = line.speaker === 'yo' ? getCharacter(profile.characterId) : line.speaker === 'narrador' ? null : getCharacter(line.speaker);
  const name = line.speaker === 'yo' ? profile.name : line.speaker === 'narrador' ? '' : speakerChar?.name;

  useEffect(() => {
    setTyped('');
    let i = 0;
    const t = setInterval(() => {
      i++;
      setTyped(line.text.slice(0, i));
      if (i >= line.text.length) clearInterval(t);
    }, 22);
    if (speakerChar && line.speaker !== 'yo') speak(speakerChar, 'dialogo', line.text);
    return () => clearInterval(t);
  }, [idx, line.text, line.speaker, speakerChar]);

  const next = () => {
    sfx.click();
    if (typed.length < line.text.length) {
      setTyped(line.text);
      return;
    }
    if (idx < stage.intro.length - 1) setIdx(idx + 1);
    else onDone();
  };

  const rival = getCharacter(stage.rivals[0]);
  return (
    <motion.div className="story-scene" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Backdrop theme={TABLES[stage.tableId]} />
      <div className="scene-title">
        <motion.h2 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          {stage.id}. {stage.title}
        </motion.h2>
        <p>
          {stage.place} · {stage.region}
        </p>
      </div>
      <div className="scene-actors">
        <motion.div className={`actor left ${line.speaker === 'yo' ? 'talking' : ''}`} initial={{ x: -120, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <Avatar look={getCharacter(profile.characterId).look} expression={line.speaker === 'yo' ? 'smug' : 'neutral'} size="100%" />
        </motion.div>
        <motion.div className={`actor right ${line.speaker !== 'yo' && line.speaker !== 'narrador' ? 'talking' : ''}`} initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <Avatar look={(speakerChar && line.speaker !== 'yo' ? speakerChar : rival).look} expression={line.speaker !== 'yo' && line.speaker !== 'narrador' ? 'happy' : 'neutral'} size="100%" />
        </motion.div>
      </div>
      <div className="dialogue-box" onClick={next} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && next()}>
        {name && <div className="dialogue-name">{name}</div>}
        <p className={line.speaker === 'narrador' ? 'narrator' : ''}>{typed}</p>
        <div className="dialogue-foot">
          <button
            className="link-btn"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
          >
            Volver al mapa
          </button>
          <button
            className="link-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDone();
            }}
          >
            Saltear
          </button>
          <span className="dialogue-next">{idx < stage.intro.length - 1 ? 'Tocá para seguir ▶' : '¡A jugar! ▶'}</span>
        </div>
      </div>
    </motion.div>
  );
}

export function StoryScreen() {
  const profile = useProfile();
  const [selected, setSelected] = useState<StoryStage>(STORY[Math.min(profile.story.unlocked, 10) - 1]);
  const [playingIntro, setPlayingIntro] = useState(false);

  useEffect(() => {
    music.play('menu');
  }, []);

  const start = (stage: StoryStage) => {
    startLocalMatch({
      mode: 'historia',
      numPlayers: stage.numPlayers,
      targetScore: stage.target,
      flor: stage.flor,
      difficulty: stage.difficulty,
      seats: buildSeats({ name: profile.name, characterId: profile.characterId, level: levelFromXp(profile.xp).level }, stage.rivals, stage.partners, stage.difficulty, stage.numPlayers),
      tableId: stage.tableId,
      clothId: stage.clothId,
      storyStage: stage.id,
    });
  };

  return (
    <div className="screen story-screen">
      <ScreenHeader title="Modo historia" subtitle="De un bar de barrio a la final del campeonato nacional" />
      <div className="story-layout">
        <div className="story-map panel">
          <svg viewBox="0 0 100 100" className="map-svg" aria-label="Mapa de la Argentina">
            <defs>
              <linearGradient id="map-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3d6b4a" />
                <stop offset="1" stopColor="#24402d" />
              </linearGradient>
            </defs>
            <path d={ARG_PATH} fill="url(#map-g)" stroke="#e8c35a" strokeWidth={0.6} strokeLinejoin="round" />
            <path d={STORY.map((s, i) => `${i === 0 ? 'M' : 'L'} ${s.map.x * 0.9 + 3} ${s.map.y}`).join(' ')} fill="none" stroke="#f2e6c8" strokeWidth={0.5} strokeDasharray="1.5 1.5" opacity={0.6} />
          </svg>
          <div className="map-nodes">
            {STORY.map((s) => {
              const unlocked = s.id <= profile.story.unlocked;
              const done = profile.story.completed.includes(s.id);
              return (
                <button
                  key={s.id}
                  className={`map-node ${unlocked ? '' : 'locked'} ${done ? 'done' : ''} ${selected.id === s.id ? 'on' : ''}`}
                  style={{ left: `${s.map.x * 0.9 + 3 + (s.id % 3) * 1.4}%`, top: `${s.map.y + (s.id % 2) * 2.5 - 2}%` }}
                  disabled={!unlocked}
                  onClick={() => {
                    sfx.click();
                    setSelected(s);
                  }}
                  aria-label={`Etapa ${s.id}: ${s.title}`}
                >
                  {done ? '★' : s.id}
                </button>
              );
            })}
          </div>
          <ol className="stage-list">
            {STORY.map((s) => {
              const unlocked = s.id <= profile.story.unlocked;
              const done = profile.story.completed.includes(s.id);
              return (
                <li key={s.id}>
                  <button className={`stage-row ${selected.id === s.id ? 'on' : ''} ${unlocked ? '' : 'locked'}`} disabled={!unlocked} onClick={() => setSelected(s)}>
                    <span className="stage-num">{done ? '★' : s.id}</span>
                    <span className="stage-name">{s.title}</span>
                    <span className="stage-where">{s.region}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <motion.section key={selected.id} className="panel stage-detail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="stage-scene">
            <Backdrop theme={TABLES[selected.tableId]} />
            <div className="stage-rivals">
              {selected.rivals.map((r) => (
                <Avatar key={r} look={getCharacter(r).look} expression="smug" size={110} />
              ))}
            </div>
          </div>
          <h2>
            {selected.id}. {selected.title}
          </h2>
          <p className="muted">
            {selected.place} · {selected.region}
          </p>
          <ul className="stage-facts">
            <li>Rival: {selected.rivals.map((r) => getCharacter(r).name).join(' y ')}</li>
            {selected.partners.length > 0 && <li>Compañero: {selected.partners.map((r) => getCharacter(r).name).join(', ')}</li>}
            <li>
              {selected.numPlayers === 2 ? '1 contra 1' : '2 contra 2'} · a {selected.target} {selected.target === 30 ? '(malas y buenas)' : ''} · {selected.flor ? 'con flor' : 'sin flor'}
            </li>
            <li>Dificultad: {DIFFICULTY_LABEL[selected.difficulty]}</li>
            <li>
              Premio: {selected.reward} <span className="coin" /> {profile.story.completed.includes(selected.id) ? '(repetir da el 25%)' : ''}
            </li>
          </ul>
          <button
            className="btn btn-primary btn-big"
            disabled={selected.id > profile.story.unlocked}
            onClick={() => {
              sfx.click();
              setPlayingIntro(true);
            }}
          >
            {profile.story.completed.includes(selected.id) ? 'Volver a jugar' : 'Jugar etapa'}
          </button>
        </motion.section>
      </div>
      <AnimatePresence>{playingIntro && <Dialogue stage={selected} onDone={() => start(selected)} onCancel={() => setPlayingIntro(false)} />}</AnimatePresence>
    </div>
  );
}
