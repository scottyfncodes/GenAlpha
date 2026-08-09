import { useEffect, useState } from 'react';
import {
  backOut,
  canSubmit,
  createCipher,
  setSymbol,
  submitGuess,
  type CipherConfig,
  type CipherState,
} from '../../systems/cipher';
import { SKINS, type SkinId } from '../../content/skins';
import { RiskMeter } from '../RiskMeter';
import type { RunOutcome } from '../../systems/missions';
import './cipher.css';
import { play } from '../../systems/audio';

/** Six glyphs is the most any tier asks for (content/hacking.ts CIPHER_TIERS).
 * Shape-coded rather than colour-coded so it reads the same under any theme. */
const GLYPHS = ['▲', '▼', '◆', '●', '■', '◇'];

/**
 * The second hacking component. Same job as TraceMinigame — every Cipher
 * mission renders this with a different config and skin, no bespoke screens —
 * but the puzzle is a closed room instead of a map: guess the code, read back
 * only how many symbols landed and how many are just present, never which.
 */
export function CipherMinigame({
  config,
  skinId,
  onResolve,
}: {
  config: CipherConfig;
  skinId: SkinId;
  onResolve: (outcome: RunOutcome, intel: number[]) => void;
}) {
  const skin = SKINS[skinId];
  const [state, setState] = useState<CipherState>(() => createCipher(config));
  const glyphs = GLYPHS.slice(0, config.symbolCount);

  const done = state.status !== 'active';

  const cycle = (index: number) => {
    if (state.status !== 'active') return;
    const cur = state.current[index];
    const next = cur === null ? 0 : (cur + 1) % config.symbolCount;
    setState((s) => setSymbol(s, index, next));
  };

  const submit = () => {
    if (!canSubmit(state)) return;
    setState(submitGuess(state));
  };

  // Effect-based, not inside the setState updater above — the same reasoning
  // as TraceMinigame's Cue component: StrictMode can invoke a setState
  // updater twice to check for impurity, and a sound is not idempotent.
  useEffect(() => {
    if (state.guessesUsed === 0) return;
    // A ping for every read completing, regardless of outcome — the verdict
    // is the pip row underneath it, not this.
    play('reveal');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.guessesUsed]);

  const finish = () => {
    if (state.status === 'won') {
      // Half the budget or less to close it out reads as a clean read; more
      // than that got there, but it took the system noticing you were poking.
      const messy = state.guessesUsed > state.config.guessBudget / 2;
      if (!messy) play('clear');
      onResolve(messy ? 'messy' : 'clean', []);
    } else if (state.status === 'backed_out') {
      onResolve('aborted', []);
    } else {
      onResolve('failed', []);
    }
  };

  return (
    <div className="cipher">
      <header className="cipher__head">
        <div>
          <p className="cipher__framing">{skin.framing}</p>
          <h2 className="cipher__title">{skin.title}</h2>
        </div>
        <span className="cipher__length">{config.codeLength}-symbol lock</span>
      </header>

      <RiskMeter
        label="Guesses"
        value={state.guessesUsed}
        max={state.config.guessBudget}
        ceiling={state.config.baseGuessBudget}
      />

      <div className="cipher__slots" role="group" aria-label="Current guess">
        {state.current.map((symbol, i) => (
          <button
            key={i}
            className={`cipher__slot ${symbol !== null ? 'cipher__slot--set' : ''}`}
            onClick={() => cycle(i)}
            disabled={done}
            aria-label={symbol !== null ? `slot ${i + 1}: ${glyphs[symbol]}` : `slot ${i + 1}: unset`}
          >
            {symbol !== null ? glyphs[symbol] : '·'}
          </button>
        ))}
      </div>

      <p className="cipher__hint">Tap a slot to cycle it. Read a guess to lock it in.</p>

      {!done && (
        <div className="cipher__actions">
          <button className="cipher__submit" onClick={submit} disabled={!canSubmit(state)}>
            Read the guess
          </button>
          <button className="cipher__bail" onClick={() => setState(backOut(state))}>
            Back out
          </button>
        </div>
      )}

      <ol className="cipher__history" aria-label="Past guesses">
        {[...state.guesses].reverse().map((g, i) => (
          <li key={state.guesses.length - i}>
            <span className="cipher__row">
              {g.symbols.map((s, j) => (
                <em key={j}>{glyphs[s]}</em>
              ))}
            </span>
            <span className="cipher__pips">
              {Array.from({ length: g.locked }).map((_, j) => (
                <i key={`l${j}`} className="cipher__pip cipher__pip--locked" />
              ))}
              {Array.from({ length: g.partial }).map((_, j) => (
                <i key={`p${j}`} className="cipher__pip cipher__pip--partial" />
              ))}
            </span>
          </li>
        ))}
      </ol>

      {done && (
        <div className="cipher__result">
          <h3>
            {state.status === 'won' && 'Cracked.'}
            {state.status === 'burned' && 'Locked out.'}
            {state.status === 'backed_out' && 'You backed out.'}
          </h3>
          <p>
            {state.status === 'won' && 'The code holds no more secrets. Whatever it was guarding is yours now.'}
            {state.status === 'burned' &&
              'Out of reads before you closed it. It knows something tried — tighter next time, not closed.'}
            {state.status === 'backed_out' && 'Nothing spent, nothing learned. The lock will look the same when you come back.'}
          </p>
          <button className="cipher__go" onClick={finish}>Continue</button>
        </div>
      )}
    </div>
  );
}
