import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { DIFFICULTY_LABEL, type Difficulty } from '../../ai/profiles';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { getCharacter } from '../../game/characters';
import { cosmeticValue } from '../../game/cosmetics';
import { startLocalMatch } from '../../game/launcher';
import { levelFromXp } from '../../game/progression';
import { botSeat } from '../../game/setup';
import { useProfile } from '../../store/profile';
import { ROUND_NAMES, tournamentPrize, useTournament, type Tournament } from '../../store/tournament';
import { Avatar } from '../art/Avatar';
import { ScreenHeader } from '../common/ProfileChip';
import { Particles } from '../fx/Particles';

export function Trophy({ size = 180 }: { size?: number }) {
  return (
    <div className="trophy3d" style={{ width: size, height: size * 1.2 }}>
      <motion.div className="trophy-spin" animate={{ rotateY: [0, 360] }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}>
        <svg viewBox="0 0 100 120" className="trophy-face">
          <defs>
            <linearGradient id="tr-g" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#8a5a10" />
              <stop offset="0.35" stopColor="#ffe9a0" />
              <stop offset="0.5" stopColor="#f2c14e" />
              <stop offset="1" stopColor="#7a4a0a" />
            </linearGradient>
          </defs>
          <path d="M 26 10 L 74 10 L 72 40 Q 70 62 50 66 Q 30 62 28 40 Z" fill="url(#tr-g)" stroke="#5a3a08" strokeWidth={1.5} />
          <path d="M 26 16 Q 8 16 10 30 Q 12 44 28 46" fill="none" stroke="url(#tr-g)" strokeWidth={5} />
          <path d="M 74 16 Q 92 16 90 30 Q 88 44 72 46" fill="none" stroke="url(#tr-g)" strokeWidth={5} />
          <rect x={45} y={66} width={10} height={18} fill="url(#tr-g)" />
          <path d="M 30 84 L 70 84 L 76 100 L 24 100 Z" fill="url(#tr-g)" stroke="#5a3a08" strokeWidth={1.2} />
          <rect x={20} y={100} width={60} height={12} rx={2} fill="#3a2414" />
          <text x={50} y={40} textAnchor="middle" fontFamily="'Alfa Slab One', serif" fontSize={12} fill="#7a4a0a">
            1º
          </text>
        </svg>
      </motion.div>
      <div className="trophy-shadow" />
    </div>
  );
}

function roundsWonByHuman(t: Tournament): number {
  return t.rounds.flat().filter((m) => (m.a === 0 || m.b === 0) && m.winner === 0).length;
}

function Bracket({ t }: { t: Tournament }) {
  const totalRounds = Math.log2(t.size);
  const columns = Array.from({ length: totalRounds }, (_, r) => t.rounds[r] ?? Array.from({ length: t.size / Math.pow(2, r + 1) }, () => null));
  return (
    <div className="bracket" style={{ gridTemplateColumns: `repeat(${totalRounds}, minmax(150px, 1fr))` }}>
      {columns.map((matches, r) => (
        <div key={r} className="bracket-col">
          <div className="bracket-head">{ROUND_NAMES[t.size / Math.pow(2, r)]}</div>
          <div className="bracket-matches">
            {matches.map((m, i) => (
              <motion.div
                key={i}
                className={`bracket-match ${m && (m.a === 0 || m.b === 0) ? 'mine' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: r * 0.15 + i * 0.04 }}
              >
                {m ? (
                  [m.a, m.b].map((pi, k) => {
                    const p = t.players[pi];
                    const won = m.winner === pi;
                    const lost = m.winner !== undefined && !won;
                    return (
                      <div key={k} className={`bm-player ${won ? 'won' : ''} ${lost ? 'lost' : ''} ${p.human ? 'human' : ''}`}>
                        <Avatar look={getCharacter(p.characterId).look} size={26} animated={false} />
                        <span className="bm-name">{p.human ? `${p.name} (vos)` : p.name}</span>
                        {m.scores && <span className="bm-score">{k === 0 ? m.scores[0] : m.scores[1]}</span>}
                      </div>
                    );
                  })
                ) : (
                  <div className="bm-tbd">A definir</div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TournamentScreen() {
  const tour = useTournament();
  const profile = useProfile();
  const [size, setSize] = useState<8 | 16>(8);
  const [target, setTarget] = useState<15 | 30>(15);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [simulating, setSimulating] = useState(false);
  const [claimed, setClaimed] = useState<number | null>(null);
  const t = tour.current;

  useEffect(() => {
    music.play('menu');
  }, []);

  // Si el humano ya jugó su partido de esta ronda, se simula el resto.
  useEffect(() => {
    if (!t || t.finished || simulating) return;
    const mine = t.rounds[t.round].find((m) => m.a === 0 || m.b === 0);
    const humanDone = !mine || mine.winner !== undefined;
    if (humanDone && !t.humanOut) {
      setSimulating(true);
      setTimeout(() => {
        tour.advance();
        setSimulating(false);
      }, 900);
    }
  }, [t, simulating, tour]);

  const humanMatch = tour.humanMatch();

  const playMatch = () => {
    if (!t || !humanMatch) return;
    sfx.click();
    const opp = humanMatch.opponent;
    const diff = opp.profile?.difficulty ?? t.difficulty;
    const rival = botSeat(opp.characterId, diff);
    rival.name = opp.name;
    startLocalMatch({
      mode: 'torneo',
      numPlayers: 2,
      targetScore: t.target,
      flor: false,
      difficulty: diff,
      seats: [{ characterId: profile.characterId, name: profile.name, human: true, level: levelFromXp(profile.xp).level }, rival],
      tableId: 'torneo',
      clothId: cosmeticValue(profile.equipped.paño),
      tournamentId: t.id,
    });
  };

  const simulateRest = () => {
    sfx.click();
    setSimulating(true);
    const step = () => {
      const cur = useTournament.getState().current;
      if (!cur || cur.finished) {
        setSimulating(false);
        return;
      }
      useTournament.getState().advance();
      setTimeout(step, 700);
    };
    setTimeout(step, 300);
  };

  if (!t) {
    return (
      <div className="screen tournament-screen">
        <ScreenHeader title="Torneos" subtitle="Eliminación directa contra la computadora" />
        <div className="setup-grid">
          <section className="panel">
            <h2>Nuevo torneo</h2>
            <div className="field">
              <span>Participantes</span>
              <div className="choices">
                {([8, 16] as const).map((s) => (
                  <button key={s} className={`choice ${size === s ? 'on' : ''}`} onClick={() => setSize(s)}>
                    {s} jugadores
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Puntos por partido</span>
              <div className="choices">
                {([15, 30] as const).map((s) => (
                  <button key={s} className={`choice ${target === s ? 'on' : ''}`} onClick={() => setTarget(s)}>
                    A {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Nivel del torneo</span>
              <div className="choices">
                {(['facil', 'normal', 'dificil'] as Difficulty[]).map((d) => (
                  <button key={d} className={`choice ${difficulty === d ? 'on' : ''}`} onClick={() => setDifficulty(d)}>
                    {DIFFICULTY_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
            <p className="field-help">
              Los cruces entre otros jugadores se juegan de verdad con el motor del juego, carta por carta. Campeón: {tournamentPrize(size, difficulty, Math.log2(size), true)} monedas.
            </p>
            <button
              className="btn btn-primary btn-big"
              onClick={() => {
                sfx.click();
                tour.create({ size, target, difficulty, human: { name: profile.name, characterId: profile.characterId } });
              }}
            >
              Inscribirme
            </button>
          </section>
          <section className="panel">
            <h2>Tu palmarés</h2>
            <div className="stats-grid">
              <div className="stat">
                <b>{profile.tournaments.played}</b>
                <span>Jugados</span>
              </div>
              <div className="stat good">
                <b>{profile.tournaments.won}</b>
                <span>Ganados</span>
              </div>
            </div>
            <div className="online-note">
              <b>Torneos online, clasificación semanal y rankings globales</b>
              <p>Necesitan el servidor multijugador. Se habilitan desde la sección Multijugador cuando hay un servidor configurado.</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const champion = t.finished && t.champion !== undefined ? t.players[t.champion] : null;
  const humanChampion = t.finished && t.champion === 0;
  const prize = tournamentPrize(t.size, t.difficulty, roundsWonByHuman(t), humanChampion);

  return (
    <div className="screen tournament-screen">
      <ScreenHeader title={t.name} subtitle={`${t.size} jugadores · a ${t.target} · nivel ${DIFFICULTY_LABEL[t.difficulty].toLowerCase()}`} />
      <div className="panel bracket-panel">
        <Bracket t={t} />
      </div>
      <div className="tournament-actions">
        {humanMatch && !t.finished && (
          <div className="next-match">
            <Avatar look={getCharacter(humanMatch.opponent.characterId).look} expression="smug" size={64} />
            <div>
              <b>{ROUND_NAMES[t.size / Math.pow(2, t.round)]}</b>
              <small>
                Tu rival: {humanMatch.opponent.name} ({DIFFICULTY_LABEL[humanMatch.opponent.profile?.difficulty ?? 'normal']})
              </small>
            </div>
            <button className="btn btn-primary btn-big" onClick={playMatch}>
              Jugar mi partido
            </button>
          </div>
        )}
        {simulating && <div className="muted">Se están jugando los otros cruces…</div>}
        {t.humanOut && !t.finished && !simulating && (
          <div className="next-match">
            <span>Quedaste afuera. ¿Querés ver quién gana?</span>
            <button className="btn btn-secondary" onClick={simulateRest}>
              Ver el resto del torneo
            </button>
          </div>
        )}
        {t.finished && (
          <AnimatePresence>
            <motion.div className={`champion ${humanChampion ? 'me' : ''}`} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              {humanChampion && <Particles style="fuegos" intensity={1} />}
              {humanChampion ? <Trophy /> : champion && <Avatar look={getCharacter(champion.characterId).look} expression="laugh" size={120} />}
              <h2>{humanChampion ? '¡Sos el campeón!' : `Campeón: ${champion?.name}`}</h2>
              {claimed === null ? (
                <button
                  className="btn btn-primary btn-big"
                  onClick={() => {
                    sfx.reward();
                    useProfile.getState().recordTournament(humanChampion, prize);
                    setClaimed(prize);
                  }}
                >
                  Cobrar premio: {prize} <span className="coin" />
                </button>
              ) : (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setClaimed(null);
                    tour.clear();
                  }}
                >
                  Nuevo torneo
                </button>
              )}
            </motion.div>
          </AnimatePresence>
        )}
        {!t.finished && (
          <button className="link-btn" onClick={() => tour.clear()}>
            Abandonar torneo
          </button>
        )}
      </div>
    </div>
  );
}
