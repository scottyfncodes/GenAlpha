import { Fragment, useState } from 'react';
import { RiskMeter } from './RiskMeter';
import { useGame, useSave } from '../state/GameContext';
import { tierLabel } from '../systems/heat';
import { progressOf } from '../systems/mentors';
import { MENTORS } from '../content/mentors';
import './hud.css';

/**
 * The HUD: the Heat meter, always visible, plus settings, plus a debug drawer.
 * The drawer and the Workbench are gated on `import.meta.env.DEV` and are
 * tree-shaken out of a production build — they are scaffolding, not features.
 */
export function Hud({
  onOpenWorkbench,
  onOpenSettings,
  onOpenCrew,
}: {
  onOpenWorkbench: () => void;
  onOpenSettings: () => void;
  onOpenCrew: () => void;
}) {
  const save = useSave();
  const { dispatch, deleteSave } = useGame();
  const [open, setOpen] = useState(false);
  const { current, threshold_tier } = save.heat;

  return (
    <div className="hud">
      <div className={`hud__heat hud__heat--${threshold_tier}`}>
        <RiskMeter label="Heat" value={current} max={100} status={threshold_tier} compact />
        <p className="hud__tierline">{tierLabel(threshold_tier)}</p>
      </div>

      <div className="hud__bar">
        {/* Only offered once there is somebody on it. Before the first mentor
            it would be an empty screen explaining that you're on your own,
            which the game is already saying perfectly well without a button. */}
        {Object.values(save.skills).some((s) => s.unlocked) && (
          <button className="hud__toggle" onClick={onOpenCrew}>
            Crew
          </button>
        )}
        <button className="hud__toggle" onClick={onOpenSettings}>
          Settings
        </button>
        {import.meta.env.DEV && (
          <button className="hud__toggle" onClick={() => setOpen((v) => !v)}>
            {open ? 'Close debug' : 'Debug'}
          </button>
        )}
      </div>

      {import.meta.env.DEV && open && (
        <div className="hud__debug">
          <div className="hud__row">
            {[1, 5, 10, 25].map((n) => (
              <button key={n} onClick={() => dispatch({ type: 'ADD_HEAT', eventId: 'debug_add', delta: n, logToHistory: n >= 10 })}>
                +{n}
              </button>
            ))}
          </div>
          <div className="hud__row">
            <button onClick={() => dispatch({ type: 'ADD_HEAT', eventId: 'debug_sub', delta: -10 })}>−10</button>
            <button onClick={() => dispatch({ type: 'ADVANCE_DAY' })}>Next day (−2)</button>
            <button onClick={() => dispatch({ type: 'LIE_LOW' })}>Lie low (−12, +1 day)</button>
          </div>
          <div className="hud__row">
            <button onClick={onOpenWorkbench}>Workbench</button>
            <button onClick={() => dispatch({ type: 'SET_TRUST', npcId: 'nova', delta: 10 })}>Nova trust +10</button>
            <button onClick={deleteSave}>Wipe save</button>
          </div>
          <dl className="hud__state">
            <dt>day</dt><dd>{save.world.day}</dd>
            <dt>chapter</dt><dd>{save.player.currentChapter}</dd>
            <dt>location</dt><dd>{save.player.currentLocation}</dd>
            <dt>nova trust</dt><dd>{save.relationships.nova?.trust ?? 0}</dd>
            <dt>heat log</dt><dd>{save.heat.history.length} entries</dd>
            {/* The mentor cursor, which is otherwise invisible while playing —
                this is where to check that a beat advanced and a skill landed. */}
            {MENTORS.map((m) => {
              const p = progressOf(save, m);
              return (
                <Fragment key={m.id}>
                  <dt>{m.id}</dt>
                  <dd>
                    {p.complete ? 'done' : `beat ${p.beat} · ${p.beatName ?? '—'}`} · trust {p.trust}
                    {p.unlocked ? ' · unlocked' : ''}
                  </dd>
                </Fragment>
              );
            })}
          </dl>
        </div>
      )}
    </div>
  );
}
