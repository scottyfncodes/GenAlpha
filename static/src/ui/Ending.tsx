import { useGame, useSave } from '../state/GameContext';
import { MENTORS } from '../content/mentors';
import { progressOf } from '../systems/mentors';
import { shdwHeld } from '../systems/market';
import { resolveCharacterName } from '../systems/names';
import './ending.css';

/**
 * The recap. Act 3's finale (`content/act3/finale.ts`) sets `currentChapter`
 * to `'ending'` and then just... closes the scene — there was never
 * anything after that. A player who finishes the game landed back in an
 * empty town with the "nothing is asking anything of you tonight" hint and
 * no acknowledgement anything had actually ended.
 *
 * Not a stat sheet either, per the same Story Bible pillar Crew.tsx already
 * follows — every number here is something the player actually chose
 * (who they trusted, whose money they moved, how hot they ran), not a score.
 */
export function Ending({ onDismiss }: { onDismiss: () => void }) {
  const save = useSave();
  const { deleteSave } = useGame();

  const crewCount = MENTORS.filter((m) => progressOf(save, m).unlocked).length;
  const compromised = save.skills.resistanceIntel.compromised;
  const drained = save.economy.villainWalletsDrained.length;
  const minutes = Math.max(1, Math.round(save.meta.playtimeSeconds / 60));
  const ellen = resolveCharacterName(save.player.flags, 'Ellen');

  return (
    <div className="ending lang-a" role="dialog" aria-label="The end">
      <div className="ending__card">
        <p className="ending__eyebrow">Bellhaven, after</p>
        <h1 className="ending__title">{save.player.name}</h1>
        <p className="ending__line">
          {compromised
            ? `You know exactly what trust costs, because you spent some of somebody else's. ${ellen} doesn't know. You're not going to be the one who tells her.`
            : `The people who helped you are still around. ${ellen} is still around. That part, at least, held.`}
        </p>

        <dl className="ending__stats">
          <div>
            <dt>Days</dt>
            <dd>{save.world.day}</dd>
          </div>
          <div>
            <dt>Played</dt>
            <dd>{minutes} min</dd>
          </div>
          <div>
            <dt>People who taught you something</dt>
            <dd>{crewCount} of {MENTORS.length}</dd>
          </div>
          <div>
            <dt>Wallets drained back to the town</dt>
            <dd>{drained}</dd>
          </div>
          <div>
            <dt>Town trust</dt>
            <dd>{save.world.townTrust}</dd>
          </div>
          <div>
            <dt>Cash on hand</dt>
            <dd>${save.economy.cashOnHand}</dd>
          </div>
          <div>
            <dt>SHDW held</dt>
            <dd>{shdwHeld(save).toFixed(1)}</dd>
          </div>
          <div>
            <dt>Heat, at the end</dt>
            <dd>{save.heat.current} · {save.heat.threshold_tier}</dd>
          </div>
        </dl>

        <div className="ending__actions">
          <button className="ending__stay" onClick={onDismiss}>
            Stay a while longer
          </button>
          <button className="ending__again" onClick={deleteSave}>
            Start over
          </button>
        </div>
      </div>
    </div>
  );
}
