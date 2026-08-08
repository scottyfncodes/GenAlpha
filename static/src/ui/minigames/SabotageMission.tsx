import { useEffect, useRef, useState } from 'react';
import {
  abort,
  availableDetails,
  choose,
  createSabotage,
  examine,
  hesitate,
  openWindow,
  optionsFor,
  type SabotageConfig,
  type SabotageState,
} from '../../systems/sabotage';
import { SKINS, type SkinId } from '../../content/skins';
import { RiskMeter } from '../RiskMeter';
import type { RunOutcome } from '../../systems/missions';
import './sabotage.css';
import { play } from '../../systems/audio';

/**
 * The single sabotage component. Casing is unhurried and free; the Window is a
 * timed decision tree, never a reflex test. Failure is soft — spotted, forced
 * retreat — and the mission stays retryable.
 */
export function SabotageMission({
  config,
  inventory,
  onResolve,
}: {
  config: SabotageConfig;
  inventory: string[];
  onResolve: (outcome: RunOutcome, toolsUsed: string[]) => void;
}) {
  const skin = SKINS[config.skinId as SkinId];
  const [state, setState] = useState<SabotageState>(() => createSabotage(config));

  return (
    <div className={`sab ${skin.language === 'B' ? 'lang-b' : 'lang-a'}`}>
      <header className="sab__head">
        <p className="sab__framing">{skin.framing}</p>
        <h2 className="sab__title">{config.title}</h2>
      </header>

      {state.phase === 'casing' && (
        <Casing state={state} setState={setState} />
      )}

      {/*
        Keyed on the beat. `left` is component state, and without a key it
        survived a beat change: a timeout advanced the mission, `beat.id`
        changed, and the timeout effect re-ran while `left` was still zero —
        so the clock forced a choice on the *next* beat before the player had
        seen it. The `forced` ref only guarded against firing twice for the
        same beat, which is a different bug. Remounting per beat resets both.
      */}
      {state.phase === 'window' && (
        <Window
          key={state.config.windowBeats[state.beatIndex]?.id ?? state.beatIndex}
          state={state}
          setState={setState}
          inventory={inventory}
        />
      )}

      {state.phase === 'resolved' && (
        <Resolution state={state} onResolve={onResolve} />
      )}
    </div>
  );
}

function Casing({
  state,
  setState,
}: {
  state: SabotageState;
  setState: (s: SabotageState) => void;
}) {
  const details = availableDetails(state);
  return (
    <>
      <p className="sab__brief">{state.config.brief}</p>
      <p className="sab__phase">Casing — no clock, no cost. Look at whatever you want.</p>

      <ul className="sab__details">
        {details.map((d) => {
          const seen = state.examined.includes(d.id);
          return (
            <li key={d.id}>
              <button
                className={`sab__detail ${seen ? 'is-seen' : ''}`}
                onClick={() => setState(examine(state, d.id))}
                disabled={seen}
              >
                {d.label}
              </button>
              {seen && <p className="sab__finding">{d.finding}</p>}
            </li>
          );
        })}
      </ul>

      <button className="sab__go" onClick={() => setState(openWindow(state))}>
        Open the window ({state.examined.length}/{details.length} cased)
      </button>
      <p className="sab__note">
        You can go in on what you’ve got. Everything you skipped just costs more later.
      </p>
    </>
  );
}

function Window({
  state,
  setState,
  inventory,
}: {
  state: SabotageState;
  setState: (s: SabotageState) => void;
  inventory: string[];
}) {
  const beat = state.config.windowBeats[state.beatIndex];
  const options = optionsFor(state, inventory);
  const [left, setLeft] = useState(beat.seconds);

  /**
   * Latest state/inventory for the timeout path, so the effect below doesn't
   * need them as dependencies — `inventory` is a fresh array every render and
   * would otherwise restart the clock continuously.
   */
  const live = useRef({ state, inventory, setState });
  live.current = { state, inventory, setState };

  /** Which beat has already had its clock run out. Forcing twice is a bug. */
  const forced = useRef<string | null>(null);

  // Tick the clock. The updater stays pure — advancing the mission is a side
  // effect and belongs in the effect below, not inside a setState callback.
  // This component is keyed on the beat, so the initial `useState(beat.seconds)`
  // is already correct on mount and there is nothing to reset here.
  useEffect(() => {
    const id = window.setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(id);
  }, [beat.id, beat.seconds]);

  // The clock doesn't fail you — it takes the choice out of your hands, and
  // only ever one of the choices you could actually have made.
  useEffect(() => {
    if (left > 0 || forced.current === beat.id) return;
    forced.current = beat.id;
    const { state: s, inventory: inv, setState: set } = live.current;
    set(hesitate(s, inv));
  }, [left, beat.id]);

  return (
    <>
      {/* One cue per rise, keyed on the value so a beat that costs nothing is
          silent — the meter is honest and so is the sound on it. */}
      <AlertnessCue value={state.alertness} />

      <RiskMeter
        label="Alertness"
        value={state.alertness}
        max={state.config.alertnessBudget}
        ceiling={state.config.baseAlertnessBudget}
        status={`beat ${state.beatIndex + 1} of ${state.config.windowBeats.length}`}
      />

      <div
        className="sab__clock"
        role="timer"
        aria-label={`${left} seconds left in the window`}
      >
        <span style={{ width: `${(left / beat.seconds) * 100}%` }} />
      </div>

      <p className="sab__prompt">{beat.prompt}</p>

      <ul className="sab__options">
        {options.map((o) => (
          <li key={o.id}>
            <button className="sab__option" onClick={() => setState(choose(state, o.id))}>
              <span>{o.text}</span>
              <em>
                {o.requiresTool ? 'uses your tool' : o.risk <= 1 ? 'prepared' : 'blind'} · +{o.risk}
              </em>
            </button>
          </li>
        ))}
      </ul>

      {state.log.length > 0 && <p className="sab__log">{state.log[state.log.length - 1]}</p>}

      <button className="sab__bail" onClick={() => setState(abort(state))}>
        Pull out
      </button>
    </>
  );
}

function Resolution({
  state,
  onResolve,
}: {
  state: SabotageState;
  onResolve: (outcome: RunOutcome, toolsUsed: string[]) => void;
}) {
  const messy = state.alertness > state.config.alertnessBudget * 0.6;
  const outcome: RunOutcome =
    state.status === 'won' ? (messy ? 'messy' : 'clean') : state.status === 'aborted' ? 'aborted' : 'failed';

  // Same rule as the trace: clean gets the cue, messy doesn't. Not a reward
  // sound — the sound of nothing having gone wrong.
  useEffect(() => {
    if (outcome === 'clean') play('clear');
  }, [outcome]);

  return (
    <div className="sab__result">
      <h3>
        {state.status === 'won' && (messy ? 'Done. Loudly.' : 'Done. Nobody saw.')}
        {state.status === 'spotted' && 'Spotted.'}
        {state.status === 'aborted' && 'You walked away.'}
      </h3>
      <p>
        {state.status === 'won' && !messy && 'Clean in, clean out. Tomorrow this looks like it always looked.'}
        {state.status === 'won' && messy && 'It worked, but you left edges. Somebody is going to notice edges.'}
        {state.status === 'spotted' &&
          'A shout, a light, and you’re moving before you decide to. Nothing gets caught tonight except your breath — but they’ll be readier next time.'}
        {state.status === 'aborted' && 'The window closes. It’ll open again. That’s what windows do.'}
      </p>
      {state.log.map((line, i) => (
        <p key={i} className="sab__logline">{line}</p>
      ))}
      <button className="sab__go" onClick={() => onResolve(outcome, state.toolsUsed)}>
        Continue
      </button>
    </div>
  );
}

/**
 * Sounds the Alertness meter when it moves, and only when it moves. Low and
 * short — module 04's principle applied to the other risk meter: felt more than
 * heard, and never a punishment.
 */
function AlertnessCue({ value }: { value: number }) {
  const previous = useRef(value);
  useEffect(() => {
    if (value > previous.current) play('alert');
    previous.current = value;
  }, [value]);
  return null;
}
