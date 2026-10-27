import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { teamOf } from '../../engine/match';
import type { Action } from '../../engine/types';
import { ambience } from '../../audio/ambience';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { stopSpeech } from '../../audio/voice';
import { CLOTHS, cosmeticValue, EMOTES, QUICK_MESSAGES, TABLES } from '../../game/cosmetics';
import { startLocalMatch } from '../../game/launcher';
import { canHumanAct, useGame } from '../../store/game';
import { useNav } from '../../store/nav';
import { useProfile } from '../../store/profile';
import { useResult } from '../../store/result';
import { useSettings } from '../../store/settings';
import { useTournament } from '../../store/tournament';
import type { CardBackStyle, DeckStyle } from '../art/CardFace';
import { Backdrop } from '../scene/Backdrop';
import { AudioControls, GameplayControls } from '../common/SettingsControls';
import { ActionBar, ResponsePanel } from './Actions';
import { CardLayer } from './CardLayer';
import { computeLayout } from './layout';
import { MatchResultOverlay } from './MatchResult';
import { MicButton } from './MicButton';
import { SenasPanel } from './SenasPanel';
import { RivalCard } from './RivalCard';
import { CallBanner, HandSummaryCard, ReplayModal, RulesModal, StatusBar, Toasts } from './Overlays';
import { Scoreboard } from './Scoreboard';
import { SeatsLayer } from './Seats';
import { getPlayerView } from '../../engine/view';
import { online } from '../../net/online';

function useStageSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/** Mide los FPS los primeros segundos y baja los efectos si el equipo no da. */
function useAutoPerformance() {
  useEffect(() => {
    let frames = 0;
    let raf = 0;
    const start = performance.now();
    const loop = () => {
      frames++;
      if (performance.now() - start < 4000) raf = requestAnimationFrame(loop);
      else {
        const fps = frames / 4;
        const s = useSettings.getState();
        if (fps < 34 && s.animations === 'completas') s.set({ animations: 'reducidas' });
      }
    };
    const t = setTimeout(() => (raf = requestAnimationFrame(loop)), 2500);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, []);
}

export function GameScreen() {
  const game = useGame();
  const settings = useSettings();
  const profile = useProfile();
  const nav = useNav();
  const stageRef = useRef<HTMLDivElement>(null);
  const { w, h } = useStageSize(stageRef);
  const camera = useAnimationControls();
  const [replayOpen, setReplayOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [senasOpen, setSenasOpen] = useState(false);
  const [teamChat, setTeamChat] = useState(false);
  const [inspect, setInspect] = useState<number | null>(null);
  const [chatText, setChatText] = useState('');
  const [confirmQuit, setConfirmQuit] = useState(false);
  const reduced = settings.animations !== 'completas';
  useAutoPerformance();

  useEffect(() => {
    music.play('mesa');
    ambience.start();
    return () => {
      ambience.stop();
      stopSpeech();
    };
  }, []);

  useEffect(() => {
    if (!game.cameraKick || settings.animations === 'minimas') return;
    const k = game.cameraKick.strength;
    void camera.start({
      scale: [1, 1 + 0.025 * k, 1],
      x: reduced ? 0 : [0, -6 * k, 5 * k, -3 * k, 0],
      y: reduced ? 0 : [0, 3 * k, -2 * k, 0],
      transition: { duration: 0.55 },
    });
  }, [game.cameraKick, camera, reduced, settings.animations]);

  const view = game.view;
  const layout = useMemo(() => computeLayout(w, h, view?.config.numPlayers ?? 2, game.humanSeat), [w, h, view?.config.numPlayers, game.humanSeat]);

  if (!game.active || !view) {
    return (
      <div className="screen center-screen">
        <p>No hay ninguna partida en curso.</p>
        <button className="btn btn-primary" onClick={() => nav.home()}>
          Volver al menú
        </button>
      </div>
    );
  }

  const myTeam = teamOf(view.seat < 0 ? 0 : view.seat);
  const canAct = canHumanAct(game);
  const teamGame = view.config.numPlayers >= 4;
  const table = TABLES[game.tableId] ?? TABLES.bodegon;
  const cloth = CLOTHS[game.clothId] ?? CLOTHS.verde;
  const backStyle = cosmeticValue(profile.equipped.reverso) as CardBackStyle;
  const deckStyle = cosmeticValue(profile.equipped.baraja) as DeckStyle;
  const frame = cosmeticValue(profile.equipped.marco);
  const humanActs = canAct && view.legalActions.length > 0;
  const actingSeat = game.thinkingSeat ?? (humanActs ? view.seat : !game.presenting && view.phase === 'playing' && !view.pending ? view.hand.turn : null);
  const resultInfo = useResult.getState().info;

  const act = (a: Action) => {
    if (!canAct) return;
    game.humanAct(a);
  };

  const isOnline = game.driver?.kind === 'online';
  const exitToMenu = () => {
    const wasOnline = isOnline;
    game.end();
    stopSpeech();
    const mode = resultInfo?.setup.mode;
    if (wasOnline) nav.go('online');
    else if (mode === 'historia') nav.go('historia');
    else if (mode === 'torneo') nav.go('torneos');
    else nav.home();
  };

  const rematch = () => {
    const setup = resultInfo?.setup;
    if (!setup) return;
    startLocalMatch({ ...setup });
  };

  const isTournament = resultInfo?.setup.mode === 'torneo';
  const isStory = resultInfo?.setup.mode === 'historia';
  const sendQuick = (text: string, kind: 'rapido' | 'emote' | 'texto' = 'rapido') => {
    sfx.click();
    game.say(view.seat, teamChat ? `(equipo) ${text}` : text, 'chat');
    setChatOpen(false);
    if (isOnline) {
      void online.chat(text, kind, teamChat).then((r) => !r.ok && game.notify(r.error ?? 'No se pudo enviar', false));
      return;
    }
    // Los rivales reaccionan con un gesto.
    const rival = game.seats.findIndex((m, i) => !m.human && teamOf(i) !== myTeam);
    if (rival >= 0) setTimeout(() => useGame.setState((st) => ({ expressions: { ...st.expressions, [rival]: Math.random() < 0.5 ? 'laugh' : 'smug' } })), 700);
  };
  const quickPack = cosmeticValue(profile.equipped.frases);
  const quickMessages = [...QUICK_MESSAGES.basicas, ...(quickPack !== 'basicas' ? QUICK_MESSAGES[quickPack] ?? [] : [])];

  return (
    <div className={`game-screen anim-${settings.animations} ${layout.portrait ? 'portrait' : 'landscape'} ${layout.compact ? 'compact' : ''}`}
      style={{ '--felt': cloth.felt, '--felt-dark': cloth.feltDark, '--felt-line': cloth.line, '--wood': table.wood, '--wood-dark': table.woodDark, '--wood-light': table.woodLight, '--trim': table.trim, '--lamp': table.lamp } as React.CSSProperties}
    >
      <Backdrop theme={table} className="game-backdrop" />
      <motion.div className="stage" ref={stageRef} animate={camera}>
        <svg className="felt" width={w} height={h} aria-hidden="true">
          <defs>
            <radialGradient id="felt-g" cx="0.5" cy="0.42" r="0.62">
              <stop offset="0" stopColor={cloth.felt} />
              <stop offset="0.75" stopColor={cloth.feltDark} />
              <stop offset="1" stopColor={cloth.feltDark} />
            </radialGradient>
            <linearGradient id="rim-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={table.woodLight} />
              <stop offset="0.5" stopColor={table.wood} />
              <stop offset="1" stopColor={table.woodDark} />
            </linearGradient>
            <radialGradient id="lamp-g" cx="0.5" cy="0.35" r="0.55">
              <stop offset="0" stopColor={table.lamp} stopOpacity="0.28" />
              <stop offset="1" stopColor={table.lamp} stopOpacity="0" />
            </radialGradient>
            <pattern id="felt-noise" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="transparent" />
              <circle cx="1" cy="1" r="0.6" fill="#000" opacity="0.12" />
              <circle cx="4" cy="3.5" r="0.5" fill="#fff" opacity="0.05" />
            </pattern>
          </defs>
          <ellipse cx={layout.felt.x} cy={layout.felt.y + 16} rx={layout.felt.rx + 26} ry={layout.felt.ry + 30} fill="#000" opacity={0.45} />
          <ellipse cx={layout.felt.x} cy={layout.felt.y + 6} rx={layout.felt.rx + 20} ry={layout.felt.ry + 22} fill="url(#rim-g)" />
          <ellipse cx={layout.felt.x} cy={layout.felt.y} rx={layout.felt.rx + 20} ry={layout.felt.ry + 20} fill="none" stroke={table.woodLight} strokeOpacity={0.6} strokeWidth={2} />
          <ellipse cx={layout.felt.x} cy={layout.felt.y} rx={layout.felt.rx} ry={layout.felt.ry} fill="url(#felt-g)" />
          <ellipse cx={layout.felt.x} cy={layout.felt.y} rx={layout.felt.rx} ry={layout.felt.ry} fill="url(#felt-noise)" />
          <ellipse cx={layout.felt.x} cy={layout.felt.y} rx={layout.felt.rx - 14} ry={layout.felt.ry - 14} fill="none" stroke={cloth.line} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="2 6" />
          <ellipse cx={layout.felt.x} cy={layout.felt.y} rx={layout.felt.rx} ry={layout.felt.ry} fill="none" stroke="#000" strokeOpacity={0.5} strokeWidth={6} />
          <ellipse cx={layout.felt.x} cy={layout.felt.y - layout.felt.ry * 0.1} rx={layout.felt.rx * 0.9} ry={layout.felt.ry * 0.9} fill="url(#lamp-g)" />
        </svg>

        <SeatsLayer
          view={view}
          layout={layout}
          seats={game.seats}
          expressions={game.expressions}
          bubbles={game.bubbles}
          thinkingSeat={game.thinkingSeat}
          actingSeat={actingSeat}
          frame={frame}
          deadline={game.turnDeadline}
          knownSenas={game.knownSenas}
          part="base"
          onInspect={setInspect}
        />
        <CardLayer
          view={view}
          layout={layout}
          fan={settings.fanHand}
          backStyle={backStyle}
          deckStyle={deckStyle}
          canPlay={canAct && view.legalActions.some((a) => a.type === 'play')}
          doubleTap={settings.doubleTap}
          dealing={game.dealing}
          highlight={game.bazaHighlight}
          reduced={settings.animations === 'minimas'}
          onPlay={(cardId) => act({ type: 'play', seat: view.seat, cardId })}
        />
        <SeatsLayer
          view={view}
          layout={layout}
          seats={game.seats}
          expressions={game.expressions}
          bubbles={game.bubbles}
          thinkingSeat={game.thinkingSeat}
          actingSeat={actingSeat}
          frame={frame}
          deadline={game.turnDeadline}
          knownSenas={game.knownSenas}
          part="overlay"
        />
      </motion.div>

      <div className="hud-top-left">
        <Scoreboard scores={game.displayScores} myTeam={myTeam} target={view.config.targetScore} pointsFx={game.pointsFx} compact={layout.compact} />
        <StatusBar view={settings.showEnvido ? view : { ...view, myEnvido: null }} myTeam={myTeam} />
      </div>

      <div className="hud-top-right">
        {!layout.portrait && (
          <>
            <button className="icon-btn" onClick={() => setRulesOpen(true)} aria-label="Reglas" title="Reglas">
              ?
            </button>
            <button className="icon-btn" onClick={() => setReplayOpen(true)} disabled={view.lastHandLog.length === 0} aria-label="Repetición de la última mano" title="Repetición">
              ⟲
            </button>
          </>
        )}
        {teamGame && view.seat >= 0 && game.driver?.sena && (
          <button
            className={`icon-btn senas-toggle ${senasOpen ? 'on' : ''}`}
            onClick={() => {
              setChatOpen(false);
              setSenasOpen((o) => !o);
            }}
            aria-label="Hacer señas"
            title="Señas a tu compañero"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
          </button>
        )}
        <button
          className="icon-btn"
          onClick={() => {
            setSenasOpen(false);
            setChatOpen((o) => !o);
          }}
          aria-label="Mensajes rápidos"
          title="Mensajes rápidos"
        >
          💬
        </button>
        <button className="icon-btn" onClick={() => game.setPaused(true)} aria-label="Pausa" title="Pausa">
          ❚❚
        </button>
      </div>

      <AnimatePresence>
        {chatOpen && (
          <motion.div className="quick-chat" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {isOnline && teamGame && (
              <label className="team-chat-toggle">
                <input type="checkbox" checked={teamChat} onChange={(e) => setTeamChat(e.target.checked)} /> Solo a mi equipo
              </label>
            )}
            <div className="quick-emotes">
              {EMOTES.map((e) => (
                <button key={e} onClick={() => sendQuick(e, 'emote')} aria-label={`Reacción ${e}`}>
                  {e}
                </button>
              ))}
            </div>
            <div className="quick-msgs">
              {quickMessages.map((m) => (
                <button key={m} onClick={() => sendQuick(m)}>
                  {m}
                </button>
              ))}
            </div>
            {isOnline && (
              <form
                className="chat-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (chatText.trim()) sendQuick(chatText.trim(), 'texto');
                  setChatText('');
                }}
              >
                <input value={chatText} onChange={(e) => setChatText(e.target.value)} maxLength={140} placeholder="Escribí un mensaje…" aria-label="Mensaje" />
                <button className="btn btn-secondary" type="submit">
                  Enviar
                </button>
              </form>
            )}
            {isOnline && (
              <div className="chat-moderation">
                {game.seats.map((m, i) =>
                  m.human && i !== view.seat ? (
                    <span key={i} className="mod-row">
                      {m.name}
                      <button className="link-btn" onClick={() => online.mute(m.name)}>
                        Silenciar
                      </button>
                      <button
                        className="link-btn"
                        onClick={() => void online.report(i, 'Comportamiento inapropiado').then((r) => game.notify(r.ok ? 'Denuncia enviada' : r.error ?? 'No se pudo denunciar', r.ok))}
                      >
                        Denunciar
                      </button>
                    </span>
                  ) : null,
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <SenasPanel
        open={senasOpen && view.phase === 'playing'}
        characterId={game.seats[game.humanSeat]?.characterId ?? profile.characterId}
        left={game.driver?.senasLeft?.() ?? 0}
        flor={view.config.flor}
        onSena={(s) => game.driver?.sena?.(s)}
        onClose={() => setSenasOpen(false)}
      />

      <Toasts toasts={game.toasts} />

      <div className={`bottom-hud ${layout.portrait ? 'portrait' : ''}`} style={layout.portrait ? { bottom: layout.cardH + 26 } : { left: layout.w / 2 + layout.cardW * 1.75 }}>
        <ActionBar view={view} enabled={canAct} onAct={act} />
      </div>

      {settings.microphone && view.seat >= 0 && (
        <MicButton style={layout.portrait ? { right: 10, bottom: layout.cardH + 84 } : { left: 16, bottom: 16 }} />
      )}

      <ResponsePanel view={view} seats={game.seats} enabled={canAct} onAct={act} />
      <CallBanner banner={game.banner} seats={game.seats} reduced={settings.animations === 'minimas'} />
      <HandSummaryCard
        summary={game.outcome ? null : game.handSummary}
        myTeam={myTeam}
        onContinue={() => game.continueHand()}
        onReplay={() => setReplayOpen(true)}
        manual={!isOnline}
      />

      <AnimatePresence>
        {humanActs && !layout.portrait && view.legalActions.some((a) => a.type === 'play') && !view.pending && (
          <motion.div className="your-turn" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ top: layout.handY - layout.cardH * 0.5 - 34 }}>
            Tu turno: tocá una carta {settings.doubleTap ? '(dos veces) ' : ''}o arrastrala a la mesa
          </motion.div>
        )}
      </AnimatePresence>

      <RivalCard seat={inspect} meta={inspect !== null ? game.seats[inspect] ?? null : null} stats={inspect !== null ? game.seatStats[inspect] ?? null : null} onClose={() => setInspect(null)} />
      <ReplayModal open={replayOpen} log={view.lastHandLog} seats={game.seats} myTeam={myTeam} deckStyle={deckStyle} onClose={() => setReplayOpen(false)} />
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} flor={view.config.flor} target={view.config.targetScore} />

      <AnimatePresence>
        {game.paused && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal pause" initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>
              <div className="modal-head">
                <h2>Pausa</h2>
              </div>
              <div className="pause-links">
                <button className="btn btn-ghost" onClick={() => setRulesOpen(true)}>
                  Reglas
                </button>
                <button className="btn btn-ghost" disabled={view.lastHandLog.length === 0} onClick={() => setReplayOpen(true)}>
                  Repetición de la última mano
                </button>
              </div>
              <div className="pause-body">
                <AudioControls />
                <GameplayControls />
              </div>
              <div className="modal-foot">
                {confirmQuit ? (
                  <>
                    <span className="warn">¿Abandonar? Cuenta como derrota.</span>
                    <button className="btn btn-ghost" onClick={() => setConfirmQuit(false)}>
                      No
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        setConfirmQuit(false);
                        game.setPaused(false);
                        game.abandon();
                      }}
                    >
                      Sí, abandonar
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-danger" onClick={() => setConfirmQuit(true)}>
                      Abandonar
                    </button>
                    <button className="btn btn-primary" onClick={() => game.setPaused(false)}>
                      Continuar
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {game.outcome && !game.presenting && (
          <MatchResultOverlay
            outcome={game.outcome}
            seats={game.seats}
            humanSeat={game.humanSeat}
            reduced={settings.animations === 'minimas'}
            onExit={exitToMenu}
            onRematch={!isTournament && !isOnline ? rematch : undefined}
            onContinue={isStory || isTournament || isOnline ? exitToMenu : undefined}
            continueLabel={isStory ? 'Volver al mapa' : isTournament ? 'Ver el cuadro' : isOnline ? 'Volver a la sala' : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Para pruebas manuales en la consola del navegador.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__truco = { useGame, getPlayerView, useTournament };
}
