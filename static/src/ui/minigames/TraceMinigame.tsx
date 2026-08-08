import { useEffect, useState } from 'react';
import {
  backOut,
  canPulse,
  createTrace,
  pulse,
  showsCount,
  type TraceConfig,
  type TraceState,
} from '../../systems/trace';
import { SKINS, type SkinId } from '../../content/skins';
import { RiskMeter } from '../RiskMeter';
import type { RunOutcome } from '../../systems/missions';
import './trace.css';
import { play } from '../../systems/audio';

/**
 * The single hacking component. Every hacking mission in the game renders this
 * with a different config and skin — there are no bespoke hacking screens.
 */
export function TraceMinigame({
  config,
  skinId,
  onResolve,
}: {
  config: TraceConfig;
  skinId: SkinId;
  onResolve: (outcome: RunOutcome, intel: number[]) => void;
}) {
  const skin = SKINS[skinId];
  const [state, setState] = useState<TraceState>(() => createTrace(config));
  const size = config.gridSize;

  const done = state.status !== 'active';

  const handle = (index: number) => {
    if (!canPulse(state, index)) return;
    setState((s) => pulse(s, index));
  };

  const finish = () => {
    if (state.status === 'won') {
      // A trace that burns most of the counter is a messy win: louder, costlier.
      const messy = state.counter > state.config.traceCounterBudget * 0.75;
      // Getting out clean gets a cue; getting out messy doesn't. It isn't a
      // reward sound — it's the sound of nothing having gone wrong, which is
      // the only kind of congratulation this game does.
      if (!messy) play('clear');
      onResolve(messy ? 'messy' : 'clean', state.intel);
    } else if (state.status === 'backed_out') {
      onResolve('aborted', state.intel);
    } else {
      onResolve('failed', state.intel);
    }
  };

  return (
    <div className="trace">
      <header className="trace__head">
        <div>
          <p className="trace__framing">{skin.framing}</p>
          <h2 className="trace__title">{skin.title}</h2>
        </div>
        <span className="trace__pulses">{state.pulsesLeft} pulses</span>
      </header>

      {/* ceiling makes a tightened budget visible at every tier, not just the
          one where the number happened to fall under a threshold. */}
      <RiskMeter
        label="Trace counter"
        value={state.counter}
        max={state.config.traceCounterBudget}
        ceiling={state.config.baseCounterBudget}
      />

      <div
        className="trace__grid"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        aria-label="Node map"
      >
        {state.nodes.map((node) => {
          const reachable = canPulse(state, node.index);
          const isCurrent = node.index === state.current;
          const isTarget = node.index === state.target;
          const cls = [
            'node',
            node.revealed ? `node--${node.spent ? 'spent' : node.type}` : 'node--hidden',
            reachable ? 'node--reachable' : '',
            isCurrent ? 'node--current' : '',
            isTarget ? 'node--target' : '',
          ].join(' ');

          return (
            <button
              key={node.index}
              className={cls}
              disabled={!reachable || done}
              onClick={() => handle(node.index)}
              aria-label={node.revealed ? node.type : 'unread node'}
            >
              {isTarget && '◎'}
              {!isTarget && isCurrent && '●'}
              {!isTarget && !isCurrent && showsCount(state, node) && node.adjacentTraps > 0
                ? node.adjacentTraps
                : ''}
            </button>
          );
        })}
      </div>

      {/*
        Module 04: the trap should land as a "close call" jolt rather than a
        failure buzzer. The cue fires off `lastEvent` rather than off the click
        handler so it stays in step with what the player is reading, and it is
        keyed on the pulse count so two traps in a row both sound.
      */}
      <Cue event={state.lastEvent} pulses={state.pulsesLeft} />

      <p className="trace__event">
        {state.lastEvent === 'trap' && 'Tripwire. The system just leaned in.'}
        {state.lastEvent === 'dead_end' && 'Nothing behind it. Route around.'}
        {state.lastEvent === 'clean' && 'Clean. Keep going.'}
        {!state.lastEvent && !done && 'Pulse a neighbouring node to read it.'}
      </p>

      {!done && (
        <button className="trace__bail" onClick={() => setState(backOut(state))}>
          Back out and keep what you’ve learned
        </button>
      )}

      {done && (
        <div className="trace__result">
          <h3>
            {state.status === 'won' && 'You’re through.'}
            {state.status === 'burned' && 'It saw you.'}
            {state.status === 'backed_out' && 'You backed out.'}
          </h3>
          <p>
            {state.status === 'won' && 'The path holds. Whatever was behind the wall is yours now.'}
            {state.status === 'burned' &&
              'The trace filled before you reached it. The target knows something tried — it’ll be tighter next time, not closed.'}
            {state.status === 'backed_out' &&
              'Everything you read is still yours. The map will look the same when you come back.'}
          </p>
          <button className="trace__go" onClick={finish}>Continue</button>
        </div>
      )}
    </div>
  );
}

/**
 * Fires one audio cue per resolved pulse. A component rather than an inline
 * effect so the dependency is explicit: it re-runs when the pulse count moves,
 * which is exactly once per read, and never on a re-render caused by anything
 * else.
 */
function Cue({ event, pulses }: { event: string | null; pulses: number }) {
  useEffect(() => {
    if (!event) return;
    if (event === 'trap') play('trap');
    else if (event === 'dead_end') play('pulse');
    else play('reveal');
    // `pulses` is the real trigger; `event` alone repeats across two traps.
  }, [pulses]);
  return null;
}
