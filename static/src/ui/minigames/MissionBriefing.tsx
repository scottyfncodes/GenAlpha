import { RiskMeter } from '../RiskMeter';
import { heatPreview, type MissionKind } from '../../systems/missions';
import { useSave } from '../../state/GameContext';
import './briefing.css';

/**
 * Every mission opens here. Heat System guardrail 2: the player is told what an
 * action will cost before they commit to it, every time, no exceptions.
 */
export function MissionBriefing({
  title,
  framing,
  brief,
  kind,
  variant,
  language,
  heatRange,
  relief = 0,
  onStart,
  onCancel,
}: {
  title: string;
  framing: string;
  brief?: string;
  kind: MissionKind;
  /** Which hacking feel this is — Trace's grid walk or Cipher's code-breaking.
   * Ignored for `kind: 'sabotage'`. Defaults to Trace's copy, matching the
   * SceneMinigame type's own default. */
  variant?: 'trace' | 'cipher';
  language: 'A' | 'B';
  /** Overrides the mission-table range — story scenes own their own cost. */
  heatRange?: [number, number];
  /** Heat the player's gear takes off this run (module 03's burner phone). */
  relief?: number;
  onStart: () => void;
  onCancel: () => void;
}) {
  const save = useSave();
  const [low, high] = heatRange ?? heatPreview(kind, relief);

  return (
    <div className={`briefing ${language === 'B' ? 'lang-b' : 'lang-a'}`}>
      <p className="briefing__eyebrow">{framing}</p>
      <h2 className="briefing__title">{title}</h2>
      {brief && <p className="briefing__body">{brief}</p>}

      {kind === 'hacking' && variant === 'cipher' && (
        <p className="briefing__howto">
          It’s a locked code, not a network to walk. Set a guess and <b>read</b> it — you’ll only
          learn how many symbols were exactly right and how many were just somewhere in there,
          never which. Close it out before you’re out of reads.
        </p>
      )}

      {kind === 'hacking' && variant !== 'cipher' && (
        <p className="briefing__howto">
          You’re moving through their network, not just guessing a password. <b>Pulse</b> a node
          next to you to read it before you commit to it — some are clean path, one trips their
          alarm, and a few just dead-end. The <b>trace counter</b> is how close they are to
          noticing; reach the target before it fills.
        </p>
      )}

      <div className="briefing__cost">
        <RiskMeter
          label="Heat if you do this"
          value={save.heat.current}
          max={100}
          pending={low}
          status={low === high ? `+${low}, either way` : `+${low} clean · +${high} if it goes wrong`}
        />
      </div>

      {relief > 0 && (
        /* Said out loud for the same reason a cost is: the player should never
           find out what their gear did by comparing two numbers afterwards. */
        <p className="briefing__relief">Burner phone — {relief} less Heat than this would cost you.</p>
      )}

      <div className="briefing__actions">
        <button className="briefing__go" onClick={onStart}>Start</button>
        <button className="briefing__back" onClick={onCancel}>Not tonight</button>
      </div>
    </div>
  );
}
