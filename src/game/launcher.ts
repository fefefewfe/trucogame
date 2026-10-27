import { useNav } from '../store/nav';
import { useProfile } from '../store/profile';
import { useResult } from '../store/result';
import { useTournament } from '../store/tournament';
import { LocalDriver } from './localDriver';
import type { MatchSetup } from './setup';
import { storyStage } from './story';

/** Arranca una partida local contra bots y registra el resultado al terminar. */
export function startLocalMatch(setup: MatchSetup): void {
  useResult.setState({ info: null });
  const driver = new LocalDriver(setup, (r) => {
    const profile = useProfile.getState();
    const xpBefore = profile.xp;
    const rpBefore = profile.rp;
    const opponents = setup.seats.filter((_, i) => i % 2 === 1).map((s) => ({ name: s.name, characterId: s.characterId }));
    let storyBonus = 0;
    let storyCleared: number | undefined;
    if (setup.mode === 'historia' && setup.storyStage && r.humanWon) {
      const stage = storyStage(setup.storyStage);
      const firstTime = !profile.story.completed.includes(stage.id);
      storyBonus = firstTime ? stage.reward : Math.round(stage.reward * 0.25);
      storyCleared = stage.id;
      profile.completeStoryStage(stage.id);
    }
    const recorded = useProfile.getState().recordMatch({
      mode: setup.mode,
      opponents,
      won: r.humanWon,
      abandoned: r.abandoned,
      scores: [r.state.scores[0], r.state.scores[1]],
      target: setup.targetScore,
      difficulty: setup.difficulty,
      trucosGanados: r.stats.trucosGanados,
      envidosGanados: r.stats.envidosGanados,
      flores: r.stats.floresCantadas,
      noQuiero: r.stats.noQuieroGanados,
      bonusCoins: storyBonus,
    });
    if (setup.mode === 'torneo') {
      useTournament.getState().reportHuman(r.humanWon && !r.abandoned, [r.state.scores[0], r.state.scores[1]]);
    }
    useResult.setState({
      info: {
        setup,
        won: r.humanWon,
        abandoned: r.abandoned,
        scores: [r.state.scores[0], r.state.scores[1]],
        rewards: recorded.rewards,
        newBadges: recorded.newBadges,
        levelBefore: recorded.levelBefore,
        levelAfter: recorded.levelAfter,
        rankUp: recorded.rankUp,
        xpBefore,
        rpBefore,
        storyCleared,
        storyBonus,
      },
    });
  });
  useNav.getState().go('partida');
  driver.start();
}
