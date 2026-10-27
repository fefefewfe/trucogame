import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getCharacter } from '../../game/characters';
import { cosmeticValue } from '../../game/cosmetics';
import { levelFromXp, rankFor } from '../../game/progression';
import { storyStage } from '../../game/story';
import { sfx } from '../../audio/sfx';
import { useProfile, badgeById } from '../../store/profile';
import { useResult } from '../../store/result';
import type { MatchOutcome, SeatMeta } from '../../store/game';
import { Avatar } from '../art/Avatar';
import { BadgeIcon, RankEmblem } from '../art/Emblems';
import { Particles, type ParticleStyle } from '../fx/Particles';

export function MatchResultOverlay({
  outcome,
  seats,
  humanSeat,
  reduced,
  onRematch,
  onExit,
  onContinue,
  continueLabel,
}: {
  outcome: MatchOutcome;
  seats: SeatMeta[];
  humanSeat: number;
  reduced: boolean;
  onRematch?: () => void;
  onExit: () => void;
  onContinue?: () => void;
  continueLabel?: string;
}) {
  const info = useResult((s) => s.info);
  const profile = useProfile();
  const me = seats[humanSeat];
  const rival = seats.find((_, i) => i % 2 !== humanSeat % 2);
  const festejo = cosmeticValue(profile.equipped.festejo) as ParticleStyle;
  const [xpShown, setXpShown] = useState(info?.xpBefore ?? profile.xp);
  useEffect(() => {
    if (!info) return;
    const target = info.xpBefore + info.rewards.xp;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 1400);
      setXpShown(Math.round(info.xpBefore + (target - info.xpBefore) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    const t = setTimeout(() => {
      raf = requestAnimationFrame(step);
      if (info.rewards.coins > 0) sfx.reward();
    }, 700);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [info]);

  const lvl = levelFromXp(xpShown);
  const rank = rankFor(profile.rp);
  const won = outcome.humanWon;
  const storyLines = info?.setup.storyStage ? storyStage(info.setup.storyStage)[won ? 'win' : 'lose'] : null;

  return (
    <motion.div className={`match-result ${won ? 'victory' : 'defeat'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      {won && !reduced && <Particles style={festejo === 'fuegos' || festejo === 'cartas' ? festejo : 'confeti'} intensity={1} />}
      <motion.div className="mr-card" initial={{ y: 60, scale: 0.9, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.15 }}>
        <motion.div className="mr-title" initial={{ scale: 2, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: -2 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.3 }}>
          {outcome.abandoned ? 'Abandonaste' : won ? '¡Victoria!' : 'Derrota'}
        </motion.div>
        <div className="mr-faces">
          {me && (
            <motion.div className="mr-face" animate={won && !reduced ? { y: [0, -14, 0] } : undefined} transition={{ repeat: Infinity, duration: 0.9 }}>
              <Avatar look={getCharacter(me.characterId).look} expression={won ? 'laugh' : 'sad'} size={110} />
              <span>{me.name}</span>
            </motion.div>
          )}
          <div className="mr-score">
            <span className={won ? 'win' : ''}>{outcome.scores[humanSeat % 2]}</span>
            <small>a</small>
            <span className={!won ? 'win' : ''}>{outcome.scores[1 - (humanSeat % 2)]}</span>
          </div>
          {rival && (
            <motion.div className="mr-face" animate={!won && !reduced ? { y: [0, -14, 0] } : undefined} transition={{ repeat: Infinity, duration: 0.9 }}>
              <Avatar look={getCharacter(rival.characterId).look} expression={won ? 'sad' : 'laugh'} size={110} />
              <span>{rival.name}</span>
            </motion.div>
          )}
        </div>
        {storyLines && (
          <div className="mr-story">
            {storyLines.map((l, i) => (
              <p key={i}>
                <b>{l.speaker === 'yo' ? me?.name : getCharacter(l.speaker).name}:</b> {l.text}
              </p>
            ))}
          </div>
        )}
        {info && (
          <div className="mr-rewards">
            <div className="mr-xp">
              <div className="mr-xp-head">
                <span>Nivel {lvl.level}</span>
                <span>+{info.rewards.xp} XP</span>
              </div>
              <div className="xp-bar">
                <motion.div className="xp-fill" style={{ width: `${(lvl.into / lvl.needed) * 100}%` }} />
              </div>
              {info.levelAfter > info.levelBefore && <div className="mr-levelup">¡Subiste al nivel {info.levelAfter}!</div>}
            </div>
            <div className="mr-chips">
              <div className="mr-chip coins">
                <span className="coin" /> +{info.rewards.coins}
                {info.storyBonus ? <small> (incluye premio de historia)</small> : null}
              </div>
              <div className={`mr-chip ${info.rewards.rp >= 0 ? 'up' : 'down'}`}>
                <RankEmblem rank={rank} size={26} /> {info.rewards.rp >= 0 ? '+' : ''}
                {info.rewards.rp} pts de ranking
              </div>
            </div>
            {info.rankUp && <div className="mr-rankup">¡Nuevo rango: {rank.name}!</div>}
            {info.newBadges.length > 0 && (
              <div className="mr-badges">
                {info.newBadges.map((b) => {
                  const badge = badgeById(b);
                  return badge ? (
                    <motion.div key={b} className="mr-badge" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', delay: 1 }}>
                      <BadgeIcon badge={badge} size={44} />
                      <span>{badge.name}</span>
                    </motion.div>
                  ) : null;
                })}
              </div>
            )}
          </div>
        )}
        <div className="mr-buttons">
          <button className="btn btn-ghost" onClick={onExit}>
            Menú
          </button>
          {onRematch && (
            <button className="btn btn-secondary" onClick={onRematch}>
              Revancha
            </button>
          )}
          {onContinue && (
            <button className="btn btn-primary" onClick={onContinue}>
              {continueLabel ?? 'Continuar'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
