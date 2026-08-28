import { useState } from 'react';
import { GenAMark } from './GenAMark';
import { TitleEye } from './TitleEye';
import { hasSave } from '../state/persistence';
import { backupNameFor, collidingCharacter } from '../systems/names';
import './title-screen.css';

/**
 * The title screen: a municipal camera is pointed at the player, and the
 * game's name is underneath it.
 *
 * Composed as a real vertical stack rather than a pile of layers. The old
 * version stretched the eye across the whole viewport and put the wordmark
 * on top of it, which on a phone meant the one good idea on the screen —
 * the thing watching you — was a pale ellipse hidden behind three-inch
 * letters. Reading order is now the design order, top to bottom:
 *
 *   camera · GEN ALPHA · tagline · New game · Continue · feed metadata
 *
 * The surveillance framing (scanlines, viewfinder brackets, REC, the feed
 * strip along the bottom) is chrome around that stack, never inside it.
 * None of it is decoration for its own sake: the whole screen is one
 * camera's output, and the player is what it is pointed at.
 */
export function TitleScreen({
  onStart,
  onContinue,
}: {
  onStart: (name: string, handle: string) => void;
  onContinue: () => void;
}) {
  /**
   * The one identity the player builds on this screen — everybody in
   * Bellhaven calls them this, adults included. There used to be a second,
   * typed-first "real name" field (what adults call you) with the hacker
   * name as a second, peer-facing identity underneath it; that distinction
   * is gone, and `onStart` gets called with this same value for both of its
   * arguments so `PlayerState.name`/`.handle` — and every scene that reads
   * either — carry on working unchanged (`systems/scenes.ts`'s own
   * adult-vs-peer speaker check just resolves to the same string either way
   * now).
   */
  const [handle, setHandle] = useState('');
  const [naming, setNaming] = useState(false);
  const canContinue = hasSave();
  /** Live, not just at submit — the player should know *before* they hit
   * Start that this is going to rename somebody, not find out three scenes
   * in when a stranger called Robyn shows up expecting to be Ellen. Still
   * worth checking even though this is a "hacker name": nothing stops a
   * player typing an existing character's own name into it. */
  const collision = collidingCharacter(handle);
  const canStart = Boolean(handle.trim());

  return (
    <main className={`title title--claimed ${naming ? 'title--naming' : ''}`}>
      <div className="title__scanlines" aria-hidden="true" />
      <div className="title__viewfinder" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <p className="title__rec" aria-hidden="true">
        <span className="title__rec-dot" /> REC
      </p>

      <div className="title__content">
        <TitleEye visible />
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

        {/*
          One line, and it is the game's argument rather than its plot. The
          brief for this screen was explicit that the title should not try
          to explain the ideology — a tagline can carry a thesis, it cannot
          carry an essay. Set on a torn red bar because it is the one piece
          of type on this screen that the resistance wrote rather than the
          council.
        */}
        <p className="title__tagline">Privacy isn’t given. It’s taken back.</p>

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
              <label htmlFor="handle">Hacker name</label>
              <input
                id="handle"
                className="title__handle-value"
                value={handle}
                maxLength={16}
                autoFocus
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canStart && onStart(handle.trim(), handle.trim())}
              />
              {collision && (
                <p className="title__namenote">
                  There’s already {article(collision)} {collision} in Bellhaven — they’ll go by{' '}
                  {backupNameFor(collision)} in your game.
                </p>
              )}

              <button
                className="title__btn title__btn--primary"
                disabled={!canStart}
                onClick={() => onStart(handle.trim(), handle.trim())}
              >
                Start
              </button>
            </div>
          )}
        </div>
      </div>
      {/*
        The feed's own status strip, pinned to the bottom edge: the camera
        ID in full, and a signal meter. Deliberately the last thing in the
        reading order and the quietest thing on the screen — it is the
        furniture of the surveillance frame, not a seventh thing competing
        for attention with the six above it.
      */}
      <div className="title__feed" aria-hidden="true">
        <span className="title__feed-id">CAM 04 · BELLHAVEN MUNICIPAL NETWORK</span>
        <span className="title__signal">
          <i /><i /><i /><i />
        </span>
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
