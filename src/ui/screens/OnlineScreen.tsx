import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { DIFFICULTY_LABEL, type Difficulty } from '../../ai/profiles';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { getCharacter } from '../../game/characters';
import { connect, online, rehello, serverUrl, useOnline } from '../../net/online';
import { useProfile } from '../../store/profile';
import { DEFAULT_ROOM, normalizeCode, type RoomConfig, type RoomState } from '../../net/protocol';
import { useNav } from '../../store/nav';
import { Avatar } from '../art/Avatar';
import { ScreenHeader } from '../common/ProfileChip';

type Tab = 'publica' | 'amigos' | 'mesas' | 'ranking';

function StatusPill() {
  const status = useOnline((s) => s.status);
  const label = { desconectado: 'Desconectado', conectando: 'Conectando…', conectado: 'Conectado', 'sin-servidor': 'Sin servidor' }[status];
  const cls = status === 'conectado' ? 'ok' : status === 'conectando' ? 'wait' : 'err';
  return (
    <div className="server-status">
      <span className={`status-dot ${cls}`} /> {label}
    </div>
  );
}

function WaitingRoom({ room }: { room: RoomState }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerId = useOnline((s) => s.playerId);
  const isHost = room.hostId === playerId;
  const link = `${window.location.origin}${window.location.pathname}?sala=${room.code}`;
  const n = room.config.numPlayers;
  return (
    <section className="panel waiting-room">
      <h2>{room.status === 'terminada' ? 'Partida terminada' : room.quick ? 'Mesa de partida rápida' : 'Sala de espera'}</h2>
      <div className="room-code" aria-label="Código de la mesa">
        {room.code}
      </div>
      <div className="row center">
        <button
          className="btn btn-ghost"
          onClick={() => {
            void navigator.clipboard?.writeText(link).then(() => setCopied(true));
          }}
        >
          {copied ? '¡Enlace copiado!' : 'Copiar enlace para invitar'}
        </button>
        {typeof navigator.share === 'function' && (
          <button className="btn btn-ghost" onClick={() => void navigator.share({ title: 'Truco: La Revancha', text: `Sumate a mi mesa de truco: ${room.code}`, url: link })}>
            Compartir
          </button>
        )}
      </div>
      <div className="waiting-table">
        {room.seats.map((s, i) => {
          const angle = 90 - (i - Math.max(0, room.yourSeat)) * (360 / n);
          const x = 50 + 42 * Math.cos((angle * Math.PI) / 180);
          const y = 50 + 40 * Math.sin((angle * Math.PI) / 180);
          return (
            <motion.div key={i} className="wt-seat" style={{ left: `${x}%`, top: `${y}%` }} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.06 }}>
              {s ? (
                <>
                  <Avatar look={getCharacter(s.characterId).look} expression={s.connected ? 'happy' : 'sad'} size={56} />
                  <span>
                    {s.name}
                    {i === room.yourSeat ? ' (vos)' : ''}
                  </span>
                  <small className={s.connected ? 'good' : 'bad'}>{s.bot ? 'bot' : s.connected ? `Nv ${s.level}` : 'desconectado'}</small>
                </>
              ) : (
                <>
                  <span className="empty">?</span>
                  <small>{room.status === 'esperando' ? 'libre (bot si no llega nadie)' : 'libre'}</small>
                </>
              )}
              <small className="muted">{i % 2 === 0 ? 'Equipo A' : 'Equipo B'}</small>
            </motion.div>
          );
        })}
      </div>
      <p className="muted center-text">
        {n === 2 ? '1 contra 1' : n === 4 ? '2 contra 2' : '3 contra 3'} · a {room.config.target} · {room.config.flor ? 'con flor' : 'sin flor'} · {room.config.turnSeconds} s por turno ·{' '}
        {room.config.visibility === 'publica' ? 'pública' : 'privada'} · bots {DIFFICULTY_LABEL[room.config.botDifficulty].toLowerCase()}
        {room.spectators > 0 && ` · ${room.spectators} mirando`}
      </p>
      {error && <p className="warn">{error}</p>}
      <div className="row center">
        <button className="btn btn-ghost" onClick={() => online.leaveRoom()}>
          Salir de la mesa
        </button>
        {room.yourSeat >= 0 && room.status !== 'jugando' && !isHost && <span className="muted">Esperando a que el anfitrión empiece…</span>}
        {room.yourSeat >= 0 && room.status !== 'jugando' && isHost && (
          <button
            className="btn btn-primary btn-big"
            onClick={async () => {
              sfx.click();
              const r = await online.start();
              if (!r.ok) setError(r.error ?? 'No se pudo empezar');
            }}
          >
            {room.status === 'terminada' ? 'Revancha' : room.seats.includes(null) ? 'Empezar (completar con bots)' : 'Empezar'}
          </button>
        )}
      </div>
      {room.yourSeat < 0 && <p className="muted center-text">Estás mirando la partida como espectador: no se muestran las cartas de nadie.</p>}
    </section>
  );
}

export function OnlineScreen() {
  const nav = useNav();
  const st = useOnline();
  const initialTab = (nav.params.tab as Tab | undefined) ?? 'publica';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [code, setCode] = useState((nav.params.code as string | undefined) ?? '');
  const [cfg, setCfg] = useState<RoomConfig>({ ...DEFAULT_ROOM });
  const [quickN, setQuickN] = useState<2 | 4 | 6>(2);
  const [quickTarget, setQuickTarget] = useState<15 | 30>(15);
  const [msg, setMsg] = useState<string | null>(null);
  const [period, setPeriod] = useState<'global' | 'semanal' | 'mensual'>('global');
  const [now, setNow] = useState(Date.now());
  const profileName = useProfile((p) => p.name);
  const [name, setName] = useState(profileName);

  useEffect(() => {
    music.play('menu');
    connect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Unirse automáticamente con un enlace ?sala=TRUCO-1234
  useEffect(() => {
    const pending = nav.params.code as string | undefined;
    if (pending && st.status === 'conectado' && !st.room) {
      void online.joinRoom(normalizeCode(pending)).then((r) => !r.ok && setMsg(r.error ?? 'No se pudo entrar'));
    }
  }, [st.status, nav.params.code, st.room]);

  useEffect(() => {
    if (st.status !== 'conectado') return;
    if (tab === 'mesas') void online.listRooms();
    if (tab === 'ranking') void online.ranking(period);
  }, [tab, st.status, period]);

  const connected = st.status === 'conectado';

  return (
    <div className="screen online-screen">
      <ScreenHeader title="Multijugador" subtitle="Partidas reales contra personas, con servidor autoritativo" />
      <div className="online-top">
        <StatusPill />
        <span className="muted small">Servidor: {serverUrl()}</span>
        <label className="online-name">
          <span>Tu nombre en la mesa</span>
          <input
            value={name}
            maxLength={18}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              useProfile.getState().setName(name);
              rehello();
            }}
          />
        </label>
      </div>
      {profileName === 'Vos' && connected && !st.room && <p className="warn center-text">Elegí un nombre para que te reconozcan en la mesa.</p>}

      {st.status === 'sin-servidor' && (
        <section className="panel online-off">
          <h2>El modo online necesita el servidor</h2>
          <p>No encontramos el servidor multijugador en esta dirección, así que por ahora no se pueden jugar partidas contra personas. No mostramos jugadores falsos: el resto del juego (contra la computadora, historia, torneos) funciona igual sin conexión.</p>
          <p>
            Para jugar con amigos, alguien tiene que levantar el servidor con <code>npm run build</code> y <code>npm run server</code> y abrir el juego desde esa dirección (por ejemplo <code>http://tu-ip:3001</code>). Ver el archivo <code>README.md</code>.
          </p>
          <button className="btn btn-primary" onClick={() => connect()}>
            Reintentar
          </button>
        </section>
      )}

      {connected && st.room && <WaitingRoom room={st.room} />}

      {connected && !st.room && (
        <>
          <div className="tabs" role="tablist">
            {(
              [
                ['publica', 'Partida rápida'],
                ['amigos', 'Jugar con amigos'],
                ['mesas', 'Mesas públicas'],
                ['ranking', 'Ranking'],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>
          {msg && <p className="warn">{msg}</p>}
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="online-layout">
              {tab === 'publica' && (
                <section className="panel">
                  <h2>Partida rápida</h2>
                  {st.queue ? (
                    <div className="queue-box">
                      <div className="queue-spinner" />
                      <p>
                        Buscando rivales… {st.queue.waiting} de {st.queue.needed} jugadores · {Math.round((now - st.queue.since) / 1000)} s
                      </p>
                      <div className="row center">
                        <button className="btn btn-ghost" onClick={() => online.leaveQueue()}>
                          Cancelar
                        </button>
                        <button className="btn btn-secondary" disabled={now - st.queue.since < 8000} onClick={() => void online.fillWithBots()}>
                          Completar con bots
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="field">
                        <span>Modalidad</span>
                        <div className="choices">
                          {([2, 4, 6] as const).map((n) => (
                            <button key={n} className={`choice ${quickN === n ? 'on' : ''}`} onClick={() => setQuickN(n)}>
                              {n === 2 ? '1 vs 1' : n === 4 ? '2 vs 2' : '3 vs 3'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="field">
                        <span>Puntos</span>
                        <div className="choices">
                          {([15, 30] as const).map((t) => (
                            <button key={t} className={`choice ${quickTarget === t ? 'on' : ''}`} onClick={() => setQuickTarget(t)}>
                              A {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="field-help">Te juntamos con otras personas que estén buscando lo mismo. Si tarda, podés completar la mesa con bots. Las partidas cuentan para el ranking global.</p>
                      <button
                        className="btn btn-primary btn-big"
                        onClick={async () => {
                          sfx.click();
                          const r = await online.queue(quickN, quickTarget);
                          if (!r.ok) setMsg(r.error ?? 'No se pudo buscar partida');
                        }}
                      >
                        Buscar partida
                      </button>
                    </>
                  )}
                </section>
              )}

              {tab === 'amigos' && (
                <>
                  <section className="panel">
                    <h2>Crear mesa</h2>
                    <div className="field">
                      <span>Jugadores</span>
                      <div className="choices">
                        {([2, 4, 6] as const).map((n) => (
                          <button key={n} className={`choice ${cfg.numPlayers === n ? 'on' : ''}`} onClick={() => setCfg({ ...cfg, numPlayers: n })}>
                            {n === 2 ? '1 vs 1' : n === 4 ? '2 vs 2' : '3 vs 3'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="field">
                      <span>Puntos y flor</span>
                      <div className="choices">
                        {([15, 30] as const).map((t) => (
                          <button key={t} className={`choice ${cfg.target === t ? 'on' : ''}`} onClick={() => setCfg({ ...cfg, target: t })}>
                            A {t}
                          </button>
                        ))}
                        <button className={`choice ${cfg.flor ? 'on' : ''}`} onClick={() => setCfg({ ...cfg, flor: !cfg.flor })}>
                          {cfg.flor ? 'Con flor' : 'Sin flor'}
                        </button>
                      </div>
                    </div>
                    <div className="field">
                      <span>Tiempo por turno</span>
                      <div className="choices">
                        {[15, 30, 60].map((t) => (
                          <button key={t} className={`choice ${cfg.turnSeconds === t ? 'on' : ''}`} onClick={() => setCfg({ ...cfg, turnSeconds: t })}>
                            {t} s
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="field">
                      <span>Mesa</span>
                      <div className="choices">
                        <button className={`choice ${cfg.visibility === 'privada' ? 'on' : ''}`} onClick={() => setCfg({ ...cfg, visibility: 'privada' })}>
                          Privada (con código)
                        </button>
                        <button className={`choice ${cfg.visibility === 'publica' ? 'on' : ''}`} onClick={() => setCfg({ ...cfg, visibility: 'publica' })}>
                          Pública
                        </button>
                      </div>
                    </div>
                    <div className="field">
                      <span>Bots para completar</span>
                      <div className="choices">
                        {(['facil', 'normal', 'dificil'] as Difficulty[]).map((d) => (
                          <button key={d} className={`choice ${cfg.botDifficulty === d ? 'on' : ''}`} onClick={() => setCfg({ ...cfg, botDifficulty: d })}>
                            {DIFFICULTY_LABEL[d]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-big"
                      onClick={async () => {
                        sfx.click();
                        const r = await online.createRoom(cfg);
                        if (!r.ok) setMsg(r.error ?? 'No se pudo crear la mesa');
                      }}
                    >
                      Crear mesa
                    </button>
                  </section>
                  <section className="panel">
                    <h2>Entrar con código</h2>
                    <input className="code-input" placeholder="TRUCO-1234" value={code} onChange={(e) => setCode(e.target.value)} maxLength={12} aria-label="Código de la mesa" />
                    <div className="row">
                      <button
                        className="btn btn-primary"
                        onClick={async () => {
                          const r = await online.joinRoom(normalizeCode(code));
                          if (!r.ok) setMsg(r.error ?? 'No se pudo entrar');
                        }}
                      >
                        Entrar
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={async () => {
                          const r = await online.joinRoom(normalizeCode(code), true);
                          if (!r.ok) setMsg(r.error ?? 'No se pudo entrar');
                        }}
                      >
                        Mirar como espectador
                      </button>
                    </div>
                  </section>
                </>
              )}

              {tab === 'mesas' && (
                <section className="panel">
                  <h2>Mesas públicas</h2>
                  {st.publicRooms.length === 0 ? (
                    <p className="muted">No hay mesas públicas en este momento. Creá una desde "Jugar con amigos" eligiendo "Pública".</p>
                  ) : (
                    <ul className="room-list">
                      {st.publicRooms.map((r) => (
                        <li key={r.code}>
                          <span>
                            <b>{r.code}</b> · {r.config.numPlayers === 2 ? '1v1' : r.config.numPlayers === 4 ? '2v2' : '3v3'} · a {r.config.target} · {r.players} persona{r.players === 1 ? '' : 's'} · {r.status}
                          </span>
                          <span className="row">
                            {r.status === 'esperando' && (
                              <button className="btn btn-primary" onClick={() => void online.joinRoom(r.code)}>
                                Sentarme
                              </button>
                            )}
                            <button className="btn btn-ghost" onClick={() => void online.joinRoom(r.code, true)}>
                              Mirar
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button className="btn btn-ghost" onClick={() => void online.listRooms()}>
                    Actualizar
                  </button>
                </section>
              )}

              {tab === 'ranking' && (
                <section className="panel">
                  <h2>Ranking</h2>
                  <div className="choices">
                    {(
                      [
                        ['global', 'Global'],
                        ['semanal', 'Esta semana'],
                        ['mensual', 'Este mes'],
                      ] as const
                    ).map(([id, label]) => (
                      <button key={id} className={`choice ${period === id ? 'on' : ''}`} onClick={() => setPeriod(id)}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="field-help">
                    Calculado por el servidor con los resultados verificados de cada partida online. {period === 'global' ? 'Puntaje total.' : 'Puntos ganados en el período.'}
                  </p>
                  {st.ranking.length === 0 ? (
                    <p className="muted">Todavía no hay partidas registradas en este servidor.</p>
                  ) : (
                    <ol className="ranking-list">
                      {st.ranking.map((r, i) => (
                        <li key={`${r.name}-${i}`}>
                          <span className="rk-pos">{i + 1}</span>
                          <Avatar look={getCharacter(r.characterId).look} size={32} animated={false} />
                          <span className="rk-name">{r.name}</span>
                          <span className="rk-rating">{r.rating}</span>
                          <span className="muted">
                            {r.won}/{r.played}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
      {st.error && st.status === 'conectado' && <p className="warn center-text">{st.error}</p>}
    </div>
  );
}
