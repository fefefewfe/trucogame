import { getCharacter } from '../../game/characters';
import { levelFromXp, rankFor } from '../../game/progression';
import { useNav } from '../../store/nav';
import { useProfile } from '../../store/profile';
import { cosmeticValue } from '../../game/cosmetics';
import { Avatar } from '../art/Avatar';
import { RankEmblem } from '../art/Emblems';

export function ProfileChip() {
  const p = useProfile();
  const nav = useNav();
  const lvl = levelFromXp(p.xp);
  const rank = rankFor(p.rp);
  return (
    <button className="profile-chip" onClick={() => nav.go('perfil')} aria-label="Mi perfil">
      <span className={`avatar-ring small frame-${cosmeticValue(p.equipped.marco)}`}>
        <Avatar look={getCharacter(p.characterId).look} size="100%" />
      </span>
      <span className="pc-info">
        <span className="pc-name">{p.name}</span>
        <span className="pc-level">
          Nivel {lvl.level}
          <span className="pc-xp">
            <span style={{ width: `${(lvl.into / lvl.needed) * 100}%` }} />
          </span>
        </span>
      </span>
      <span className="pc-rank" title={rank.name}>
        <RankEmblem rank={rank} size={30} />
      </span>
      <span className="pc-coins">
        <span className="coin" />
        {p.coins}
      </span>
    </button>
  );
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const nav = useNav();
  return (
    <header className="screen-header">
      <button className="back-btn" onClick={() => nav.back()} aria-label="Volver">
        ‹ <span>Volver</span>
      </button>
      <div className="sh-titles">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <ProfileChip />
    </header>
  );
}
