import { useSave } from '../state/GameContext';
import { MENTORS } from '../content/mentors';
import { progressOf } from '../systems/mentors';
import { KID_HANDLES, resolveCharacterName } from '../systems/names';
import type { StoryFlags } from '../state/schema';

/** Every mentor here is a kid with a hacking handle — the whole point of a
 * contacts list like this, in-fiction, is that it's organised by handle,
 * not by whatever a mentor's mom calls them. Falls back to the name-
 * collision resolver for anyone `KID_HANDLES` doesn't cover. */
function crewName(flags: StoryFlags, canonical: string): string {
  return KID_HANDLES[canonical] ?? resolveCharacterName(flags, canonical);
}
import './crew.css';

/**
 * THE CREW.
 *
 * Phase 4 deliberately didn't build this: there was nothing in the game that
 * used a skill outside its own mission, so a screen would have listed four
 * capabilities with nowhere to spend them. The economy changed that — the
 * heist takes either Hacking or Sabotage, whichever the player found a way
 * into — so it can now point at something.
 *
 * Story Bible pillar 4: the protagonist's whole skill set is literally other
 * people's trust. So this is not a stat sheet. It is a list of people, and the
 * capability is the second line, not the first. The trust number is shown
 * because it's real and it moves, but it is never the headline.
 *
 * It is also where the betrayal will land. When
 * `skills.resistanceIntel.compromised` flips, Bishop's entry changes here —
 * the same screen the player has been proud of, saying something different.
 * That's built and reachable now; nothing writes the flag yet, on purpose.
 */
interface CrewLine {
  id: string;
  taught: string;
  /** Shown once their skill is earned. What it actually gets you. */
  gives: string;
}

const LINES: Record<string, CrewLine> = {
  deja: { id: 'deja', taught: 'How to read infrastructure', gives: 'You can case a place and take it apart.' },
  files: { id: 'files', taught: 'How to trace a system', gives: 'You can read a network instead of guessing at it.' },
  milo: { id: 'milo', taught: 'When not to take the easy tool', gives: 'You know what the shortcut costs. That’s the whole skill.' },
  bishop: { id: 'bishop', taught: 'A way into the resistance', gives: 'Grown-ups who have been doing this since before you were born.' },
};

export function Crew({ onClose }: { onClose: () => void }) {
  const save = useSave();
  const compromised = save.skills.resistanceIntel.compromised;

  return (
    <div className="crew lang-b" role="dialog" aria-label="Who you know">
      <header className="crew__head">
        <h2 className="crew__title">Who you know</h2>
        <button className="crew__close" onClick={onClose}>
          Done
        </button>
      </header>

      <p className="crew__standfirst">
        Everything you can do, somebody taught you.
      </p>

      <ul className="crew__list">
        {MENTORS.map((mentor) => {
          const progress = progressOf(save, mentor);
          const line = LINES[mentor.id];
          /*
           * The one conditional on this screen. Bishop's entry is the same
           * entry — it just stops meaning what it meant, which is the point.
           */
          const soured = mentor.id === 'bishop' && compromised;

          return (
            <li key={mentor.id} className={`crew__row ${soured ? 'crew__row--soured' : ''}`}>
              <div className="crew__row-head">
                <b>{crewName(save.player.flags, progress.name)}</b>
                <span className="crew__trust">
                  {progress.trust > 0 ? `trust ${progress.trust}` : 'barely knows you'}
                </span>
              </div>

              {progress.unlocked ? (
                <>
                  <p className="crew__taught">
                    {line?.taught} <em>· {mentor.teaches}</em>
                  </p>
                  <p className="crew__gives">{soured ? 'You don’t know what this is any more.' : line?.gives}</p>
                </>
              ) : (
                <p className="crew__pending">
                  {progress.beat > 1 ? 'Partway. They haven’t decided about you yet.' : 'Not yet.'}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Ellen is outside the template by design (module 06). She belongs on
          this screen anyway — she is the reason any of it is personal. */}
      {save.relationships.nova && (
        <div className="crew__nova">
          <b>{crewName(save.player.flags, 'Ellen')}</b>
          <p>Not part of any of this. The reason for all of it.</p>
        </div>
      )}
    </div>
  );
}
