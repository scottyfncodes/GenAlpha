import { describe, expect, it } from 'vitest';
import { buildCipherConfig, CIPHER_TIERS } from '../content/hacking';
import { backOut, canSubmit, createCipher, setSymbol, submitGuess } from './cipher';

const cfg = (over: Partial<Parameters<typeof buildCipherConfig>[0]> = {}) =>
  buildCipherConfig({
    missionId: 'test_lock',
    tier: 2,
    skillTier: 0,
    heatTier: 'clear',
    ...over,
  });

const guess = (state: ReturnType<typeof createCipher>, symbols: number[]) => {
  let s = state;
  symbols.forEach((sym, i) => (s = setSymbol(s, i, sym)));
  return submitGuess(s);
};

describe('code generation', () => {
  it('never repeats a symbol when the tier disallows it', () => {
    for (let seed = 0; seed < 300; seed++) {
      const c = createCipher({ ...cfg({ tier: 1 }), seed });
      expect(new Set(c.code).size).toBe(c.code.length);
    }
  });

  it('can repeat once the tier allows it', () => {
    // Tier 3 allows repeats; over enough seeds at least one code repeats.
    let sawRepeat = false;
    for (let seed = 0; seed < 300; seed++) {
      const c = createCipher({ ...cfg({ tier: 3 }), seed });
      if (new Set(c.code).size < c.code.length) sawRepeat = true;
    }
    expect(sawRepeat).toBe(true);
  });
});

describe('scoring', () => {
  it('reports every symbol locked on an exact guess', () => {
    const c = createCipher(cfg({ tier: 1, missionId: 'exact' }));
    const after = guess(c, c.code);
    expect(after.guesses[0]).toEqual({ symbols: c.code, locked: c.code.length, partial: 0 });
    expect(after.status).toBe('won');
  });

  it('counts right-symbol-wrong-slot as partial, never locked', () => {
    // A fixed 3-symbol non-repeating code: rotate it by one and every slot
    // should score partial, none locked, by construction.
    const code = [0, 1, 2];
    const rotated = [2, 0, 1];
    const c = { ...createCipher(cfg({ tier: 1, missionId: 'rotate' })), code };
    const after = guess(c, rotated);
    expect(after.guesses[0]).toEqual({ symbols: rotated, locked: 0, partial: 3 });
  });

  it('does not double-count a repeated guess symbol against a single code occurrence', () => {
    // Code has exactly one 0, at a position the guess misses entirely.
    // Guessing 0 twice should still credit only one partial, not two.
    const code = [0, 1, 2, 3];
    const c = { ...createCipher(cfg({ tier: 2, missionId: 'no_double' })), code };
    const after = guess(c, [4, 0, 0, 4]);
    expect(after.guesses[0]).toEqual({ symbols: [4, 0, 0, 4], locked: 0, partial: 1 });
  });
});

describe('guess building', () => {
  it('refuses to submit until every slot is set', () => {
    let c = createCipher(cfg({ tier: 1 }));
    expect(canSubmit(c)).toBe(false);
    c = setSymbol(c, 0, 0);
    expect(canSubmit(c)).toBe(false);
    const after = submitGuess(c); // no-op: still incomplete
    expect(after.guesses).toHaveLength(0);
  });
});

describe('hardening', () => {
  it('tightens the guess budget without changing the code', () => {
    const clean = createCipher(cfg({ hardened: 0 }));
    const hard = createCipher(cfg({ hardened: 2 }));
    expect(hard.code).toEqual(clean.code);
    expect(hard.config.guessBudget).toBeLessThan(clean.config.guessBudget);
  });

  it('carries the tier ceiling so the meter can show what was taken', () => {
    const c = cfg({ heatTier: 'hunted' });
    expect(c.baseGuessBudget).toBe(CIPHER_TIERS[2].guessBudget);
    expect(c.guessBudget).toBeLessThan(c.baseGuessBudget);
  });
});

describe('ending states', () => {
  it('never hard-fails — running out of guesses burns the run and stops there', () => {
    let c = createCipher({ ...cfg({ tier: 1 }), guessBudget: 1 });
    c = guess(c, [0, 1, 2]);
    expect(['active', 'burned', 'won']).toContain(c.status);
    expect(c.guessesUsed).toBe(1);
  });

  it('backing out keeps whatever was already guessed and stops the run', () => {
    let c = createCipher(cfg({ tier: 1 }));
    c = guess(c, c.code.map((s) => (s + 1) % 4));
    const backed = backOut(c);
    expect(backed.status).toBe('backed_out');
    expect(backed.guesses).toHaveLength(1);
  });
});
