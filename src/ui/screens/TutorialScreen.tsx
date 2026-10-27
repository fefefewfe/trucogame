import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { parseCardId } from '../../engine/cards';
import { applyAction, createMatch, getLegalActions, withPresetHand } from '../../engine/match';
import type { Action, Call, GameEvent, MatchState } from '../../engine/types';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { speak } from '../../audio/voice';
import { getCharacter } from '../../game/characters';
import { LESSONS, practiceHands, scriptedBotAction, type Lesson, type Practice } from '../../game/tutorial';
import { callLabel } from '../../store/game';
import { useProfile } from '../../store/profile';
import { Avatar, type Expression } from '../art/Avatar';
import { CardBack, CardFace } from '../art/CardFace';
import { ScreenHeader } from '../common/ProfileChip';

const COACH = getCharacter('abuela');

function Coach({ text, expression }: { text: string; expression: Expression }) {
  return (
    <div className="coach">
      <div className="coach-avatar">
        <Avatar look={COACH.look} expression={expression} size="100%" />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={text} className="coach-bubble" initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
          {text}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function DealDemo({ onDone }: { onDone: () => void }) {
  const [dealt, setDealt] = useState(0);
  const cards = ['3-oro', '12-copa', '1-basto', '7-espada', '4-oro', '2-copa'];
  useEffect(() => {
    if (dealt === 0 || dealt >= 6) return;
    const t = setTimeout(() => {
      sfx.deal();
      setDealt((d) => d + 1);
    }, 380);
    return () => clearTimeout(t);
  }, [dealt]);
  useEffect(() => {
    if (dealt >= 6) onDone();
  }, [dealt, onDone]);
  return (
    <div className="deal-demo">
      <div className="dd-row">
        <span className="dd-label">Rival (reparte)</span>
        <div className="dd-cards">
          {cards.map((_, i) =>
            i % 2 === 1 && i < dealt ? (
              <motion.div key={i} className="dd-card" initial={{ x: -120, y: 120, rotate: -40, opacity: 0 }} animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}>
                <CardBack />
              </motion.div>
            ) : null,
          )}
        </div>
      </div>
      <div className="dd-deck">
        {dealt < 6 && (
          <button
            className="btn btn-primary"
            onClick={() => {
              sfx.shuffle();
              setDealt(1);
            }}
            disabled={dealt > 0}
          >
            {dealt === 0 ? 'Repartir' : 'Repartiendo…'}
          </button>
        )}
      </div>
      <div className="dd-row">
        <span className="dd-label">Vos (mano)</span>
        <div className="dd-cards">
          {cards.map((id, i) =>
            i % 2 === 0 && i < dealt ? (
              <motion.div key={i} className="dd-card" initial={{ x: -120, y: -120, rotate: 40, opacity: 0 }} animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}>
                <CardFace card={parseCardId(id)} />
              </motion.div>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}

function Quiz({ lesson, onDone, setCoach }: { lesson: Lesson; onDone: () => void; setCoach: (t: string, e: Expression) => void }) {
  const [q, setQ] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const question = lesson.quiz![q];
  const correct = picked === question.answer;
  return (
    <div className="quiz">
      <h3>{question.prompt}</h3>
      {question.cards && (
        <div className="quiz-cards">
          {question.cards.map((group, gi) => (
            <div key={gi} className="quiz-group">
              {group.map((id) => (
                <motion.div key={id} className="quiz-card" initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ delay: gi * 0.15 }}>
                  <CardFace card={parseCardId(id)} />
                </motion.div>
              ))}
              {question.cards!.length > 1 && gi === 0 && <span className="quiz-vs">vs</span>}
            </div>
          ))}
        </div>
      )}
      <div className="quiz-options">
        {question.options.map((o, i) => (
          <button
            key={o}
            className={`choice ${picked === i ? (i === question.answer ? 'right' : 'wrong') : ''} ${picked !== null && i === question.answer ? 'right' : ''}`}
            disabled={picked !== null && correct}
            onClick={() => {
              setPicked(i);
              if (i === question.answer) {
                sfx.bazaWin();
                setCoach(`¡Muy bien! ${question.explain}`, 'laugh');
              } else {
                sfx.bazaLose();
                setCoach(`Casi... ${question.explain}`, 'thinking');
              }
            }}
          >
            {o}
          </button>
        ))}
      </div>
      {picked !== null && correct && (
        <button
          className="btn btn-primary"
          onClick={() => {
            if (q < lesson.quiz!.length - 1) {
              setQ(q + 1);
              setPicked(null);
              setCoach('Siguiente pregunta.', 'happy');
            } else onDone();
          }}
        >
          {q < lesson.quiz!.length - 1 ? 'Siguiente' : 'Terminar'}
        </button>
      )}
    </div>
  );
}

function newPractice(p: Practice): MatchState {
  const names = p.numPlayers === 2 ? ['Vos', 'Rival'] : ['Vos', 'Rival 1', 'Compañero', 'Rival 2'];
  const base = createMatch({ numPlayers: p.numPlayers, targetScore: 15, flor: Boolean(p.flor) }, names, { seed: 1, firstMano: p.mano });
  return withPresetHand(base, practiceHands(p), p.mano);
}

function PracticeTable({ practice, onDone, setCoach }: { practice: Practice; onDone: () => void; setCoach: (t: string, e: Expression) => void }) {
  const [state, setState] = useState<MatchState>(() => newPractice(practice));
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const n = practice.numPlayers;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const evaluate = (s: MatchState, events: GameEvent[]): boolean => {
    if (practice.goal(s, events)) {
      setDone(true);
      sfx.reward();
      setCoach(practice.success, 'laugh');
      return true;
    }
    const fail = practice.fail?.(s);
    if (fail) {
      setCoach(fail, 'thinking');
      setBusy(true);
      timer.current = setTimeout(() => {
        setState(newPractice(practice));
        setBusy(false);
      }, 2200);
      return true;
    }
    return false;
  };

  const runBots = (s: MatchState) => {
    let cur = s;
    const step = () => {
      if (cur.phase !== 'playing') {
        setBusy(false);
        return;
      }
      if (getLegalActions(cur, 0).length > 0) {
        setBusy(false);
        return;
      }
      let actor = -1;
      for (let seat = 1; seat < n; seat++) if (getLegalActions(cur, seat).length > 0) actor = seat;
      if (actor < 0) {
        setBusy(false);
        return;
      }
      const a = scriptedBotAction(cur, actor);
      if (!a) {
        setBusy(false);
        return;
      }
      const res = applyAction(cur, a);
      cur = res.state;
      if (a.type === 'play') sfx.cardSlap();
      if (a.type === 'respond') sfx.call('respuesta');
      setState(cur);
      if (evaluate(cur, res.events)) return;
      timer.current = setTimeout(step, 700);
    };
    setBusy(true);
    timer.current = setTimeout(step, 650);
  };

  const act = (a: Action) => {
    if (busy || done) return;
    const msg = practice.check?.(state, a);
    if (msg) {
      setCoach(msg, 'thinking');
      setShake((x) => x + 1);
      sfx.bazaLose();
      return;
    }
    try {
      const res = applyAction(state, a);
      if (a.type === 'play') sfx.cardSlap();
      if (a.type === 'call') {
        sfx.call(a.call === 'truco' ? 'truco' : 'envido');
        speak(getCharacter(useProfile.getState().characterId), a.call as 'truco', callLabel(a.call));
      }
      setState(res.state);
      if (evaluate(res.state, res.events)) return;
      runBots(res.state);
    } catch {
      setShake((x) => x + 1);
    }
  };

  const legal = getLegalActions(state, 0);
  const h = state.hand;
  const seatName = (seat: number) => state.players[seat].name;
  const calls = legal.filter((a): a is Extract<Action, { type: 'call' }> => a.type === 'call');
  const responses = legal.filter((a): a is Extract<Action, { type: 'respond' }> => a.type === 'respond');
  const order = n === 2 ? [1] : [3, 2, 1];

  return (
    <motion.div className={`practice ${n === 4 ? 'four' : ''}`} animate={shake ? { x: [0, -8, 8, -4, 0] } : undefined} key={shake}>
      <div className="pr-opponents">
        {order.map((seat) => (
          <div key={seat} className={`pr-seat ${seat % 2 === 0 ? 'partner' : ''}`}>
            <span className="pr-name">{seatName(seat)}</span>
            <div className="pr-backs">
              {h.cards[seat].map((_, i) => (
                <div key={i} className="pr-back">
                  <CardBack />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="pr-table">
        {h.bazas.map((b, bi) => (
          <div key={bi} className={`pr-baza ${b.winnerTeam === 0 ? 'won' : b.winnerTeam === 1 ? 'lost' : b.winnerTeam === null ? 'parda' : ''}`}>
            <span className="pr-baza-label">Baza {bi + 1}{b.winnerTeam === null ? ' · parda' : b.winnerTeam === 0 ? ' · ganada' : b.winnerTeam === 1 ? ' · perdida' : ''}</span>
            <div className="pr-baza-cards">
              {b.plays.map((p) => (
                <motion.div key={p.card.id} className="pr-played" initial={{ y: p.seat === 0 ? 60 : -60, opacity: 0, rotate: p.seat === 0 ? 8 : -8 }} animate={{ y: 0, opacity: 1, rotate: 0 }}>
                  <CardFace card={p.card} />
                  <small>{seatName(p.seat)}</small>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="pr-status">
        Puntos: Vos {state.scores[0]} · Rival {state.scores[1]}
        {h.truco.level > 0 && ` · Truco querido (vale ${h.truco.level + 1})`}
        {h.envido.declarations.length > 0 && ` · Envido: ${h.envido.declarations.map((d) => `${seatName(d.seat)} ${d.points ?? 'son buenas'}`).join(', ')}`}
      </div>
      <div className="pr-actions">
        {responses.map((a) => (
          <button key={a.response} className={`gbtn gbtn-${a.response === 'quiero' ? 'quiero' : 'noquiero'}`} onClick={() => act(a)}>
            <span>{a.response === 'quiero' ? 'Quiero' : 'No quiero'}</span>
          </button>
        ))}
        {calls.map((a) => (
          <button key={a.call} className={`gbtn gbtn-${a.call.includes('envido') ? 'envido' : a.call.includes('flor') ? 'flor' : 'truco'}`} onClick={() => act(a)}>
            <span>{callLabel(a.call as Call).replace(/[¡!]/g, '')}</span>
          </button>
        ))}
      </div>
      <div className="pr-hand">
        {h.cards[0].map((card) => {
          const playable = legal.some((a) => a.type === 'play' && a.cardId === card.id) && !busy && !done;
          return (
            <motion.button
              key={card.id}
              className={`pr-card ${playable ? 'playable' : ''}`}
              whileHover={playable ? { y: -14, scale: 1.04 } : undefined}
              whileTap={playable ? { scale: 0.96 } : undefined}
              onClick={() => playable && act({ type: 'play', seat: 0, cardId: card.id })}
              aria-label={`Jugar ${card.rank} de ${card.suit}`}
            >
              <CardFace card={card} />
            </motion.button>
          );
        })}
      </div>
      {done && (
        <motion.div className="pr-done" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <button className="btn btn-primary btn-big" onClick={onDone}>
            ¡Lección completa! Seguir
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

export function TutorialScreen() {
  const profile = useProfile();
  const [lessonIdx, setLessonIdx] = useState(0);
  const [introIdx, setIntroIdx] = useState(0);
  const [phase, setPhase] = useState<'intro' | 'activity' | 'done'>('intro');
  const [completed, setCompleted] = useState<number[]>([]);
  const [coachText, setCoachText] = useState(LESSONS[0].intro[0]);
  const [coachExpr, setCoachExpr] = useState<Expression>('happy');
  const [dealDone, setDealDone] = useState(false);
  const lesson = LESSONS[lessonIdx];

  useEffect(() => {
    music.play('menu');
  }, []);

  const setCoach = (t: string, e: Expression) => {
    setCoachText(t);
    setCoachExpr(e);
  };

  const goLesson = (i: number) => {
    setLessonIdx(i);
    setIntroIdx(0);
    setPhase('intro');
    setDealDone(false);
    setCoach(LESSONS[i].intro[0], 'happy');
  };

  const nextIntro = () => {
    sfx.click();
    if (introIdx < lesson.intro.length - 1) {
      setIntroIdx(introIdx + 1);
      setCoach(lesson.intro[introIdx + 1], 'happy');
    } else {
      setPhase('activity');
      setCoach(lesson.practice ? lesson.practice.hint : lesson.deal ? 'Tocá "Repartir" y mirá el orden.' : 'Respondé las preguntas.', 'smug');
    }
  };

  const finishLesson = () => {
    const next = [...new Set([...completed, lesson.id])];
    setCompleted(next);
    if (next.length >= LESSONS.length) {
      profile.setTutorialDone();
      setPhase('done');
      setCoach('¡Terminaste el tutorial! Ya sabés lo necesario para sentarte en cualquier mesa. Te regalo 100 monedas.', 'laugh');
      sfx.victory();
      return;
    }
    const nextIdx = LESSONS.findIndex((l) => !next.includes(l.id) && l.id > lesson.id);
    goLesson(nextIdx >= 0 ? nextIdx : LESSONS.findIndex((l) => !next.includes(l.id)));
  };

  return (
    <div className="screen tutorial-screen">
      <ScreenHeader title="Aprender a jugar" subtitle="Diez lecciones cortas con práctica" />
      <div className="tutorial-layout">
        <aside className="lesson-list">
          {LESSONS.map((l, i) => (
            <button key={l.id} className={`lesson-item ${i === lessonIdx ? 'on' : ''} ${completed.includes(l.id) ? 'done' : ''}`} onClick={() => goLesson(i)}>
              <span className="li-num">{completed.includes(l.id) ? '✓' : l.id}</span>
              <span>{l.title}</span>
            </button>
          ))}
        </aside>
        <section className="panel lesson-stage">
          <h2>
            {lesson.id}. {lesson.title}
          </h2>
          <Coach text={coachText} expression={coachExpr} />
          {phase === 'intro' && (
            <div className="lesson-intro-actions">
              <span className="muted">
                {introIdx + 1} / {lesson.intro.length}
              </span>
              <button className="btn btn-primary" onClick={nextIntro}>
                {introIdx < lesson.intro.length - 1 ? 'Seguir' : lesson.practice ? 'Practicar' : lesson.deal ? 'Ver el reparto' : 'Preguntas'}
              </button>
            </div>
          )}
          {phase === 'activity' && (
            <div className="lesson-activity">
              {lesson.deal && !dealDone && (
                <DealDemo
                  onDone={() => {
                    setDealDone(true);
                    setCoach('Una carta por vez, empezando por la mano. Ahora, dos preguntas.', 'happy');
                  }}
                />
              )}
              {lesson.quiz && (!lesson.deal || dealDone) && <Quiz key={lesson.id} lesson={lesson} onDone={finishLesson} setCoach={setCoach} />}
              {lesson.practice && <PracticeTable key={lesson.id} practice={lesson.practice} onDone={finishLesson} setCoach={setCoach} />}
            </div>
          )}
          {phase === 'done' && (
            <div className="lesson-intro-actions">
              <button className="btn btn-primary btn-big" onClick={() => goLesson(0)}>
                Repasar desde el principio
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
