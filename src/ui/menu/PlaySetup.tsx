import { motion } from 'framer-motion';
import { DIFFICULTY_LABEL, PERSONALITY_LABEL, type Difficulty } from '../../ai/profiles';
import { sfx } from '../../audio/sfx';
import { CHARACTERS, getCharacter } from '../../game/characters';
import { cosmeticValue } from '../../game/cosmetics';
import { startLocalMatch } from '../../game/launcher';
import { levelFromXp } from '../../game/progression';
import { buildSeats } from '../../game/setup';
import { usePrefs } from '../../store/prefs';
import { useProfile } from '../../store/profile';
import { Avatar } from '../art/Avatar';
import { ScreenHeader } from '../common/ProfileChip';

function Choice<T extends string | number | boolean>({ value, current, onPick, children }: { value: T; current: T; onPick: (v: T) => void; children: React.ReactNode }) {
  return (
    <button
      className={`choice ${value === current ? 'on' : ''}`}
      onClick={() => {
        sfx.click();
        onPick(value);
      }}
    >
      {children}
    </button>
  );
}

export function PlaySetup() {
  const prefs = usePrefs();
  const profile = useProfile();
  const n = prefs.numPlayers;
  const rivalSlots = n / 2;
  const partnerSlots = n / 2 - 1;
  const available = CHARACTERS.filter((c) => c.id !== profile.characterId);
  const rivals = Array.from({ length: rivalSlots }, (_, i) => prefs.rivals[i] ?? available[i % available.length].id);
  const partners = Array.from({ length: partnerSlots }, (_, i) => prefs.partners[i] ?? available[(i + 3) % available.length].id);

  const setRival = (slot: number, id: string) => {
    const next = [...rivals];
    next[slot] = id;
    prefs.set({ rivals: next });
  };
  const setPartner = (slot: number, id: string) => {
    const next = [...partners];
    next[slot] = id;
    prefs.set({ partners: next });
  };

  const start = () => {
    sfx.click();
    startLocalMatch({
      mode: 'personalizada',
      numPlayers: n,
      targetScore: prefs.target,
      flor: prefs.flor,
      difficulty: prefs.difficulty,
      seats: buildSeats({ name: profile.name, characterId: profile.characterId, level: levelFromXp(profile.xp).level }, rivals, partners, prefs.difficulty, n),
      tableId: cosmeticValue(profile.equipped.mesa),
      clothId: cosmeticValue(profile.equipped.paño),
    });
  };

  const picker = (label: string, current: string, onPick: (id: string) => void, taken: string[]) => (
    <div className="char-picker">
      <div className="cp-label">{label}</div>
      <div className="cp-list">
        {available.map((c) => (
          <button
            key={c.id}
            className={`cp-item ${c.id === current ? 'on' : ''}`}
            disabled={taken.includes(c.id) && c.id !== current}
            onClick={() => {
              sfx.click();
              onPick(c.id);
            }}
            title={`${c.name} · ${PERSONALITY_LABEL[c.personality]}`}
          >
            <Avatar look={c.look} size={52} animated={false} />
            <span>{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const taken = [...rivals, ...partners];
  return (
    <div className="screen setup-screen">
      <ScreenHeader title="Partida personalizada" subtitle="Contra la computadora, sin conexión" />
      <div className="setup-grid">
        <section className="panel">
          <h2>Mesa</h2>
          <div className="field">
            <span>Jugadores</span>
            <div className="choices">
              <Choice value={2} current={n} onPick={(v) => prefs.set({ numPlayers: v as 2 })}>
                1 vs 1
              </Choice>
              <Choice value={4} current={n} onPick={(v) => prefs.set({ numPlayers: v as 4 })}>
                2 vs 2
              </Choice>
              <Choice value={6} current={n} onPick={(v) => prefs.set({ numPlayers: v as 6 })}>
                3 vs 3
              </Choice>
            </div>
          </div>
          <div className="field">
            <span>Puntos</span>
            <div className="choices">
              <Choice value={15} current={prefs.target} onPick={(v) => prefs.set({ target: v as 15 })}>
                A 15
              </Choice>
              <Choice value={30} current={prefs.target} onPick={(v) => prefs.set({ target: v as 30 })}>
                A 30 (malas y buenas)
              </Choice>
            </div>
          </div>
          <div className="field">
            <span>Flor</span>
            <div className="choices">
              <Choice value={false} current={prefs.flor} onPick={(v) => prefs.set({ flor: v })}>
                Sin flor
              </Choice>
              <Choice value={true} current={prefs.flor} onPick={(v) => prefs.set({ flor: v })}>
                Con flor
              </Choice>
            </div>
          </div>
          <div className="field">
            <span>Dificultad</span>
            <div className="choices">
              {(['facil', 'normal', 'dificil'] as Difficulty[]).map((d) => (
                <Choice key={d} value={d} current={prefs.difficulty} onPick={(v) => prefs.set({ difficulty: v })}>
                  {DIFFICULTY_LABEL[d]}
                </Choice>
              ))}
            </div>
            <p className="field-help">
              {prefs.difficulty === 'facil'
                ? 'Comete errores y apuesta de manera básica. Ideal para aprender.'
                : prefs.difficulty === 'normal'
                  ? 'Calcula sus cartas, recuerda lo que salió y a veces miente con el truco.'
                  : 'Calcula probabilidades, lee tu estilo de juego y sabe cuándo retirarse.'}
            </p>
          </div>
        </section>
        <section className="panel">
          <h2>Rivales{partnerSlots > 0 ? ' y compañeros' : ''}</h2>
          {rivals.map((r, i) => (
            <div key={`r${i}`}>{picker(rivalSlots > 1 ? `Rival ${i + 1}` : 'Rival', r, (id) => setRival(i, id), taken)}</div>
          ))}
          {partners.map((p, i) => (
            <div key={`p${i}`}>{picker(partnerSlots > 1 ? `Compañero ${i + 1}` : 'Compañero', p, (id) => setPartner(i, id), taken)}</div>
          ))}
          <div className="setup-preview">
            {rivals.map((r) => {
              const c = getCharacter(r);
              return (
                <motion.div key={r} className="sp-rival" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Avatar look={c.look} expression="smug" size={72} />
                  <div>
                    <b>{c.name}</b>
                    <small>{PERSONALITY_LABEL[c.personality]} · {c.tagline}</small>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      </div>
      <div className="setup-actions">
        <button className="btn btn-primary btn-big" onClick={start}>
          ¡A la mesa!
        </button>
      </div>
    </div>
  );
}
