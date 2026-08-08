import { useGame, useSave } from '../state/GameContext';
import type { TextSpeed } from '../state/schema';
import './settings-panel.css';
import { setMuted } from '../systems/audio';

const SPEEDS: { value: TextSpeed; label: string }[] = [
  { value: 'slow', label: 'Slow' },
  { value: 'normal', label: 'Normal' },
  { value: 'fast', label: 'Fast' },
];

/**
 * Both of these settings already existed in the save shape and in the code that
 * reads them; neither had anywhere to be changed. The flicker toggle is the
 * point of SCHEMA-NOTES gap 5 — a kid on a shared laptop can't change an OS
 * accessibility setting, so the game has to offer its own.
 *
 * Language B, because this is the player's own chrome, not the town's.
 */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const save = useSave();
  const { dispatch } = useGame();

  return (
    <div className="settings lang-b" role="dialog" aria-label="Settings">
      <header className="settings__head">
        <h2>Settings</h2>
        <button onClick={onClose}>Done</button>
      </header>

      <fieldset className="settings__field">
        <legend>Text speed</legend>
        <div className="settings__row">
          {SPEEDS.map((s) => (
            <button
              key={s.value}
              className={save.settings.textSpeed === s.value ? 'is-on' : ''}
              aria-pressed={save.settings.textSpeed === s.value}
              onClick={() => dispatch({ type: 'SET_SETTING', patch: { textSpeed: s.value } })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="settings__field">
        <legend>Screen effects</legend>
        <button
          className={save.settings.reducedFlicker ? 'is-on' : ''}
          aria-pressed={save.settings.reducedFlicker}
          onClick={() =>
            dispatch({
              type: 'SET_SETTING',
              patch: { reducedFlicker: !save.settings.reducedFlicker },
            })
          }
        >
          {save.settings.reducedFlicker ? 'Flicker off' : 'Flicker on'}
        </button>
        <p className="settings__note">
          Some moments break up the picture for a second — a flicker, a colour split. Turn this off
          and they hold still instead.
        </p>
      </fieldset>

      <fieldset className="settings__field">
        <legend>Sound</legend>
        <button
          className={save.settings.audioMuted ? 'is-on' : ''}
          aria-pressed={save.settings.audioMuted}
          onClick={() =>
            {
              /* The audio module holds its own mute flag so a cue can be
                 fired from anywhere without threading the save through — this
                 is the one place that keeps the two in step. */
              setMuted(!save.settings.audioMuted);
              dispatch({ type: 'SET_SETTING', patch: { audioMuted: !save.settings.audioMuted } });
            }
          }
        >
          {save.settings.audioMuted ? 'Muted' : 'Sound on'}
        </button>
      </fieldset>
    </div>
  );
}
