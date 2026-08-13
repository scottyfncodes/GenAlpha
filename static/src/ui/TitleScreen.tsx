import { useEffect, useState } from 'react';
import { Glitch } from './Glitch';
import { GenAMark } from './GenAMark';
import { hasSave } from '../state/persistence';
import { backupNameFor, collidingCharacter } from '../systems/names';
import './title-screen.css';

type Stage = 'official' | 'rupture' | 'claimed';

/**
 * The title screen performs the whole thesis before a line of dialogue:
 * Language A (clean, corporate, safe) → glitch → Language B (hand-cut,
 * urgent). Cheap to build, states the premise, per Style Guide 07.
 */
export function TitleScreen({ onStart, onContinue }: { onStart: (name: string) => void; onContinue: () => void }) {
  const [stage, setStage] = useState<Stage>('official');
  const [name, setName] = useState('');
  const [naming, setNaming] = useState(false);
  const canContinue = hasSave();
  /** Live, not just at submit — the player should know *before* they hit
   * Start that this is going to rename somebody, not find out three scenes
   * in when a stranger called Robyn shows up expecting to be Ellen. */
  const collision = collidingCharacter(name);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const a = window.setTimeout(() => setStage('rupture'), reduce ? 200 : 1900);
    const b = window.setTimeout(() => setStage('claimed'), reduce ? 400 : 2600);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  return (
    <main className={`title title--${stage}`}>
      {/*
        The mark performs the same transition the title does, in the same
        two seconds: a council logo before the rupture, a claimed one after.
        Nothing says so. By the time the player sees it on a wall in Act 2
        they have already watched it change once and not been told why.

        It's also, now, literally the A in the game's own name — "Gen A"
        reads as Gen Alpha to the adult world (GenAMark.tsx's own framing)
        and this is that joke stated once, in the packaging, the one place
        it's allowed to be stated at all. `act3.test.ts` still fails if a
        line of dialogue ever names the mark — that rule is about the
        *story* explaining itself, not about whether the title screen gets
        to wink. Screen readers get "Gen Alpha" cleanly either way: the
        mark and the split word are `aria-hidden`, the label sits on the h1.
      */}
      <Glitch active={stage === 'rupture'} intensity={2}>
        <h1 className="title__word" aria-label="Gen Alpha">
          {/* Stacked, not inline — at this font-size the letter-spacing
              alone makes "Gen Alpha" run wider than any reasonable
              viewport, and letting it wrap on its own splits the mark onto
              a line by itself. Two short lines, each its own atomic unit,
              never breaks unpredictably. */}
          <span className="title__word-line" aria-hidden="true">Gen</span>
          <span className="title__word-line title__word-line--alpha" aria-hidden="true">
            <GenAMark state={stage === 'claimed' ? 'claiming' : 'clean'} size={72} />
            lpha
          </span>
        </h1>
      </Glitch>

      <p className="title__tag">
        {stage === 'claimed' ? 'Somebody is watching the town. Somebody else is watching them.' : 'Bellhaven Community Safety Initiative'}
      </p>

      {stage === 'claimed' && (
        <div className="title__menu">
          {!naming ? (
            <>
              <button className="title__btn title__btn--primary" onClick={() => setNaming(true)}>
                New game
              </button>
              {canContinue && (
                <button className="title__btn" onClick={onContinue}>
                  Continue
                </button>
              )}
            </>
          ) : (
            <div className="title__naming">
              <label htmlFor="name">What do people call you?</label>
              <input
                id="name"
                value={name}
                maxLength={16}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && onStart(name.trim())}
              />
              {collision && (
                <p className="title__namenote">
                  There’s already {article(collision)} {collision} in Bellhaven — they’ll go by{' '}
                  {backupNameFor(collision)} in your game.
                </p>
              )}
              <button
                className="title__btn title__btn--primary"
                disabled={!name.trim()}
                onClick={() => onStart(name.trim())}
              >
                Start
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

/** "a Deja" vs "an Ellen" — every reserved name is a proper noun, so this
 * only ever has to handle a plain leading-letter check, not the harder
 * general-English cases (a "European", an "hour") that come up with common
 * nouns. */
function article(word: string): 'a' | 'an' {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}
