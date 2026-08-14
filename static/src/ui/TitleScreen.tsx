import { useState } from 'react';
import { GenAMark } from './GenAMark';
import { TitleEye } from './TitleEye';
import { hasSave } from '../state/persistence';
import { backupNameFor, collidingCharacter } from '../systems/names';
import './title-screen.css';

/**
 * The title screen, in its claimed state from the first frame — no
 * Language A veneer to rupture through, just the mark, the eye, and the
 * menu. (There used to be a two-stage clean-then-broken reveal here; it's
 * gone, along with the crack effect that went with it, in favour of
 * opening straight on the thing that mattered.)
 */
export function TitleScreen({ onStart, onContinue }: { onStart: (name: string) => void; onContinue: () => void }) {
  const [name, setName] = useState('');
  const [naming, setNaming] = useState(false);
  const canContinue = hasSave();
  /** Live, not just at submit — the player should know *before* they hit
   * Start that this is going to rename somebody, not find out three scenes
   * in when a stranger called Robyn shows up expecting to be Ellen. */
  const collision = collidingCharacter(name);

  return (
    <main className="title title--claimed">
      <TitleEye visible />
      <div className="title__scanlines" aria-hidden="true" />
      <div className="title__viewfinder" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <p className="title__rec" aria-hidden="true">
        <span className="title__rec-dot" /> REC
      </p>

      <div className="title__content">
        {/*
          It's also literally the A in the game's own name — "Gen A" reads
          as Gen Alpha to the adult world (GenAMark.tsx's own framing) and
          this is that joke stated once, in the packaging, the one place
          it's allowed to be stated at all. `act3.test.ts` still fails if a
          line of dialogue ever names the mark — that rule is about the
          *story* explaining itself, not about whether the title screen gets
          to wink. Screen readers get "Gen Alpha" cleanly either way: the
          mark and the split word are `aria-hidden`, the label sits on the h1.
        */}
        <h1 className="title__word" aria-label="Gen Alpha">
          {/* Stacked, not inline — at this font-size the letter-spacing
              alone makes "Gen Alpha" run wider than any reasonable
              viewport, and letting it wrap on its own splits the mark onto
              a line by itself. Two short lines, each its own atomic unit,
              never breaks unpredictably. */}
          <span className="title__word-line" aria-hidden="true">Gen</span>
          <span className="title__word-line title__word-line--alpha" aria-hidden="true">
            <GenAMark state="claiming" size={72} />
            lpha
          </span>
        </h1>

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
      </div>
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
