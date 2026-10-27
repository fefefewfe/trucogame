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

/** Silueta simplificada de la Argentina continental y Tierra del Fuego (trazada a partir de coordenadas aproximadas). */
const ARG_PATH =
  'M 20.3 0.9 L 25.2 2.9 L 29.6 2 L 33.8 5.7 L 42.6 10.8 L 50.4 11.7 L 52.8 13.4 L 52 17.1 L 47.3 19.1 L 42.6 24.8 L 41.1 32.8 L 40.6 35.6 L 43.7 39.6 L 45 42.5 L 42.9 47.6 L 37 49 L 32.5 49.9 L 30.4 54.4 L 23.4 55.6 L 26 59 L 22.9 65.8 L 16.9 69.8 L 21.3 74.9 L 16.6 79.2 L 14.6 87.8 L 6.5 86.9 L 4.4 82.7 L 5 74 L 5.7 64 L 6.5 52.7 L 8.3 44.2 L 10.4 35.6 L 10.9 24.2 L 14.3 15.7 L 17.4 8.6 Z';
const TDF_PATH = 'M 14.6 89 L 23 93.6 L 20 94.6 L 14.6 94.2 Z';

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
          <svg viewBox="0 0 60 100" className="map-svg" aria-label="Mapa de la Argentina">
            <defs>
              <linearGradient id="map-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3d6b4a" />
                <stop offset="1" stopColor="#24402d" />
              </linearGradient>
            </defs>
            <path d={ARG_PATH} fill="url(#map-g)" stroke="#e8c35a" strokeWidth={0.5} strokeLinejoin="round" />
            <path d={TDF_PATH} fill="url(#map-g)" stroke="#e8c35a" strokeWidth={0.5} strokeLinejoin="round" />
            <path d={STORY.map((s, i) => `${i === 0 ? 'M' : 'L'} ${s.map.x} ${s.map.y}`).join(' ')} fill="none" stroke="#f2e6c8" strokeWidth={0.35} strokeDasharray="1 1" opacity={0.7} />
            {STORY.map((s) => {
              const unlocked = s.id <= profile.story.unlocked;
              const done = profile.story.completed.includes(s.id);
              const on = selected.id === s.id;
              return (
                <g
                  key={s.id}
                  className={`map-node-svg ${unlocked ? '' : 'locked'}`}
                  transform={`translate(${s.map.x} ${s.map.y})`}
                  onClick={() => {
                    if (!unlocked) return;
                    sfx.click();
                    setSelected(s);
                  }}
                  role="button"
                  aria-label={`Etapa ${s.id}: ${s.title}`}
                >
                  <circle r={on ? 2.6 : 1.9} fill={!unlocked ? '#4a3a2e' : done ? '#2a5ea8' : '#e8a92a'} stroke={on ? '#fff3c4' : '#2a1505'} strokeWidth={0.4} />
                  {on && <circle r={3.6} fill="none" stroke="#ffe19a" strokeWidth={0.3} opacity={0.8} />}
                </g>
              );
            })}
            <text x={36} y={95} fontSize={3} fill="#e8c35a" fontFamily="'Lobster', cursive">
              Argentina
            </text>
          </svg>
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
