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
      */}
      <Glitch active={stage === 'rupture'} intensity={2}>
        <div className="title__lockup">
          <GenAMark state={stage === 'claimed' ? 'claiming' : 'clean'} size={72} />
          <h1 className="title__word">STATIC</h1>
        </div>
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
