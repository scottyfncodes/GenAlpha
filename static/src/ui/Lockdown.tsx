import { useEffect, useRef, useState } from 'react';
import { useSave } from '../state/GameContext';
import { Glitch } from './Glitch';
import { SWEEP_DAYS } from '../systems/coverage';
import './lockdown.css';

/**
 * What the player sees when SafeTrace reaches 100% coverage.
 *
 * Deliberately *not* a `content/*.ts` Scene. A Scene is location-gated
 * (`scenesAt`) and has to satisfy `validateScene`'s two graph invariants —
 * every node reachable from `start`, every terminal node closing its own door
 * with a chapter or beat effect. Neither fits here: this fires from a systems
 * threshold rather than from standing somewhere, it has to appear wherever the
 * player happens to be, and it must not consume a story beat, because the
 * story hasn't moved — the town has. Keeping it out of the scene graph is what
 * lets the coverage system have a forced consequence without the whole
 * reachability walk in `content/reachability.test.ts` having to model it.
 *
 * GUARDRAIL: one button, and that button is "go on playing". This is the
 * severe consequence `systems/heat.ts` allows and the fail state it forbids —
 * everything the player could do before this notice, they can still do after.
 *
 * Detection is a ref rather than a save flag on purpose: the *fact* of the
 * sweep is already durable (`world.surveillance.sweeps`), and what this ref
 * tracks is only whether this session has shown the notice for it yet. A save
 * reloaded after a sweep shouldn't reopen the notice — the consequence already
 * landed, and re-announcing it would read as it happening twice.
 */
export function Lockdown() {
  const save = useSave();
  const { sweeps, lastSweepDay } = save.world.surveillance;
  const seen = useRef(sweeps);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sweeps > seen.current) {
      seen.current = sweeps;
      setShow(true);
    }
  }, [sweeps]);

  if (!show) return null;

  return (
    <div className="lockdown" role="alertdialog" aria-modal="true" aria-labelledby="lockdown-title">
      <div className="lockdown__panel">
        <Glitch active intensity={2}>
          <p className="lockdown__eyebrow">SafeTrace — Coverage Notice</p>
          <h2 className="lockdown__title" id="lockdown-title">
            Full coverage achieved
          </h2>
        </Glitch>

        <p className="lockdown__body">
          Every camera in Bellhaven came online at once, and the town went quiet for{' '}
          {SWEEP_DAYS} days while they walked it street by street. Vans on the corners. Everything you
          had opened up, closed. Everything you had cut, spliced back.
        </p>
        <p className="lockdown__body">
          You spent those days indoors, and you are further behind than when they started. Nobody came
          to the door. That isn’t the same as nobody knowing where it is.
        </p>

        <ul className="lockdown__ledger">
          <li>
            <span>Days gone</span>
            <span>{SWEEP_DAYS}</span>
          </li>
          <li>
            <span>Network</span>
            <span>Fully restored</span>
          </li>
          <li>
            <span>Heat</span>
            <span>Hunted</span>
          </li>
          <li>
            <span>Lenses</span>
            <span>Reach further, permanently</span>
          </li>
        </ul>

        <p className="lockdown__note">
          {sweeps === 1
            ? 'They can do this again. It gets easier for them every time.'
            : `Sweep number ${sweeps}. Every one of them tightened the net a little more.`}
          {lastSweepDay > 0 && ` Day ${lastSweepDay}.`}
        </p>

        <button className="lockdown__button" onClick={() => setShow(false)} autoFocus>
          Get back to work
        </button>
      </div>
    </div>
  );
}
