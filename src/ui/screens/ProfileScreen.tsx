import { motion } from 'framer-motion';
import { DIFFICULTY_LABEL } from '../../ai/profiles';
import { getCharacter } from '../../game/characters';
import { cosmeticValue } from '../../game/cosmetics';
import { BADGES, levelFromXp, nextRank, RANKS, rankFor } from '../../game/progression';
import { useNav } from '../../store/nav';
import { useProfile } from '../../store/profile';
import { Avatar } from '../art/Avatar';
import { BadgeIcon, RankEmblem } from '../art/Emblems';
import { ScreenHeader } from '../common/ProfileChip';

const MODE_LABEL: Record<string, string> = { rapida: 'Rápida', personalizada: 'Personalizada', historia: 'Historia', torneo: 'Torneo', online: 'Online' };

export function ProfileScreen() {
  const p = useProfile();
  const nav = useNav();
  const lvl = levelFromXp(p.xp);
  const rank = rankFor(p.rp);
  const next = nextRank(p.rp);
  const winRate = p.stats.played > 0 ? Math.round((p.stats.won / p.stats.played) * 100) : 0;
  const rivals = Object.entries(p.vsCharacter).sort((a, b) => b[1].won + b[1].lost - (a[1].won + a[1].lost));

  return (
    <div className="screen profile-screen">
      <ScreenHeader title="Mi perfil" subtitle="Tu progreso se guarda en este dispositivo" />
      <div className="profile-layout">
        <section className="panel profile-card">
          <span className={`avatar-ring huge frame-${cosmeticValue(p.equipped.marco)}`}>
            <Avatar look={getCharacter(p.characterId).look} expression="smug" size="100%" />
          </span>
          <h2>{p.name}</h2>
          <p className="muted">Jugando como {getCharacter(p.characterId).name}</p>
          <div className="lvl-block">
            <div className="lvl-head">
              <span>Nivel {lvl.level}</span>
              <span>
                {lvl.into} / {lvl.needed} XP
              </span>
            </div>
            <div className="xp-bar">
              <motion.div className="xp-fill" initial={{ width: 0 }} animate={{ width: `${(lvl.into / lvl.needed) * 100}%` }} transition={{ duration: 1 }} />
            </div>
          </div>
          <div className="rank-block">
            <RankEmblem rank={rank} size={84} />
            <div>
              <b>{rank.name}</b>
              <small>{p.rp} puntos de ranking</small>
              {next && (
                <>
                  <div className="xp-bar thin">
                    <div className="xp-fill" style={{ width: `${((p.rp - rank.minRp) / (next.minRp - rank.minRp)) * 100}%` }} />
                  </div>
                  <small>Siguiente: {next.name} ({next.minRp})</small>
                </>
              )}
            </div>
          </div>
          <div className="row">
            <button className="btn btn-ghost" onClick={() => nav.go('personajes')}>
              Cambiar personaje
            </button>
            <button className="btn btn-ghost" onClick={() => nav.go('config')}>
              Cambiar nombre
            </button>
          </div>
        </section>

        <section className="panel">
          <h2>Estadísticas</h2>
          <div className="stats-grid">
            <div className="stat">
              <b>{p.stats.played}</b>
              <span>Partidas</span>
            </div>
            <div className="stat good">
              <b>{p.stats.won}</b>
              <span>Ganadas</span>
            </div>
            <div className="stat bad">
              <b>{p.stats.lost}</b>
              <span>Perdidas</span>
            </div>
            <div className="stat">
              <b>{winRate}%</b>
              <span>Victorias</span>
            </div>
            <div className="stat">
              <b>{p.stats.streak}</b>
              <span>Racha actual</span>
            </div>
            <div className="stat">
              <b>{p.stats.bestStreak}</b>
              <span>Mejor racha</span>
            </div>
            <div className="stat">
              <b>{p.stats.trucosGanados}</b>
              <span>Trucos ganados</span>
            </div>
            <div className="stat">
              <b>{p.stats.envidosGanados}</b>
              <span>Envidos ganados</span>
            </div>
            <div className="stat">
              <b>{p.tournaments.won}</b>
              <span>Torneos ganados</span>
            </div>
          </div>
          <h2 className="mt">Insignias</h2>
          <div className="badges-grid">
            {BADGES.map((b) => {
              const has = p.badges.includes(b.id);
              return (
                <div key={b.id} className={`badge-cell ${has ? '' : 'locked'}`} title={b.description}>
                  <BadgeIcon badge={b} size={50} locked={!has} />
                  <b>{b.name}</b>
                  <small>{b.description}</small>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <h2>Historial</h2>
          {p.history.length === 0 ? (
            <p className="muted">Todavía no jugaste ninguna partida.</p>
          ) : (
            <ul className="history">
              {p.history.map((h) => (
                <li key={h.id} className={h.won ? 'won' : 'lost'}>
                  <span className="h-res">{h.abandoned ? 'Abandono' : h.won ? 'Victoria' : 'Derrota'}</span>
                  <span className="h-score">
                    {h.scores[0]} a {h.scores[1]}
                  </span>
                  <span className="h-vs">vs {h.opponents.join(' y ')}</span>
                  <span className="h-meta">
                    {MODE_LABEL[h.mode] ?? h.mode} · {DIFFICULTY_LABEL[h.difficulty]} · a {h.target} · {new Date(h.date).toLocaleDateString('es-AR')}
                  </span>
                  <span className="h-xp">+{h.xp} XP</span>
                </li>
              ))}
            </ul>
          )}
          <h2 className="mt">Contra cada rival</h2>
          {rivals.length === 0 ? (
            <p className="muted">Acá vas a ver tu historial contra cada personaje.</p>
          ) : (
            <ul className="vs-list">
              {rivals.map(([id, r]) => (
                <li key={id}>
                  <Avatar look={getCharacter(id).look} size={36} animated={false} />
                  <span>{getCharacter(id).name}</span>
                  <span className="good">{r.won} G</span>
                  <span className="bad">{r.lost} P</span>
                </li>
              ))}
            </ul>
          )}
          <h2 className="mt">Rangos</h2>
          <div className="ranks-row">
            {RANKS.map((r) => (
              <div key={r.id} className={`rank-cell ${p.rp >= r.minRp ? '' : 'locked'}`} title={`${r.name}: ${r.minRp} puntos`}>
                <RankEmblem rank={r} size={40} />
                <small>{r.name}</small>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
