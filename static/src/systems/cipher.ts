import { mulberry32 } from './rng';

/**
 * "Cipher" — the second hacking mechanic, alongside Trace (systems/trace.ts).
 * Same contract: pure logic, no React, no styling, no Heat writes, one config
 * object drives every mission that uses it.
 *
 * Where Trace is spatial (read the map, don't step on a trap), Cipher is a
 * closed-room deduction puzzle: guess the code, get back only how many
 * symbols are exactly right and how many are right but misplaced — the
 * classic peg-count feedback, never *which* positions. That's what keeps it
 * a real puzzle instead of a five-guess Wordle clone wearing a terminal skin.
 */

export type CipherStatus = 'active' | 'won' | 'burned' | 'backed_out';

export interface CipherConfig {
  missionId: string;
  codeLength: number;
  symbolCount: number;
  /** The tier's unmodified guess budget — travels alongside `guessBudget` for
   * the same reason Trace carries `baseCounterBudget`: a tightened budget has
   * to render as a visibly shorter bar, not a silently smaller number. */
  baseGuessBudget: number;
  guessBudget: number;
  seed: number;
  /** Tier 3+: the code can repeat a symbol, which roughly doubles the search
   * space for the same code length. */
  allowRepeats: boolean;
}

export interface CipherGuess {
  symbols: number[];
  /** Right symbol, right slot. */
  locked: number;
  /** Right symbol, wrong slot. */
  partial: number;
}

export interface CipherState {
  config: CipherConfig;
  code: number[];
  /** The guess being built. `null` slots are still unset. */
  current: (number | null)[];
  guesses: CipherGuess[];
  guessesUsed: number;
  status: CipherStatus;
}

export function createCipher(config: CipherConfig): CipherState {
  const rng = mulberry32(config.seed);
  const code: number[] = [];
  const pool = Array.from({ length: config.symbolCount }, (_, i) => i);
  for (let i = 0; i < config.codeLength; i++) {
    if (config.allowRepeats) {
      code.push(Math.floor(rng() * config.symbolCount));
    } else {
      const pick = Math.floor(rng() * pool.length);
      code.push(pool.splice(pick, 1)[0]);
    }
  }
  return {
    config,
    code,
    current: Array(config.codeLength).fill(null),
    guesses: [],
    guessesUsed: 0,
    status: 'active',
  };
}

/** Right symbol/right slot vs. right symbol/wrong slot — a multiset match,
 * never tied back to which position produced it. */
function scoreGuess(code: number[], guess: number[]): { locked: number; partial: number } {
  const codeRest: number[] = [];
  const guessRest: number[] = [];
  let locked = 0;
  for (let i = 0; i < code.length; i++) {
    if (code[i] === guess[i]) locked++;
    else {
      codeRest.push(code[i]);
      guessRest.push(guess[i]);
    }
  }
  const used = Array(codeRest.length).fill(false);
  let partial = 0;
  for (const g of guessRest) {
    const idx = codeRest.findIndex((c, i) => c === g && !used[i]);
    if (idx !== -1) {
      used[idx] = true;
      partial++;
    }
  }
  return { locked, partial };
}

export function setSymbol(state: CipherState, index: number, symbol: number): CipherState {
  if (state.status !== 'active') return state;
  if (index < 0 || index >= state.current.length) return state;
  const current = [...state.current];
  current[index] = symbol;
  return { ...state, current };
}

export function canSubmit(state: CipherState): boolean {
  return state.status === 'active' && state.current.every((s) => s !== null);
}

/** Lock in the current guess: score it, bank it, pay a guess, check the door. */
export function submitGuess(state: CipherState): CipherState {
  if (!canSubmit(state)) return state;
  const symbols = state.current as number[];
  const { locked, partial } = scoreGuess(state.code, symbols);
  const guesses = [...state.guesses, { symbols, locked, partial }];
  const guessesUsed = state.guessesUsed + 1;
  const won = locked === state.config.codeLength;
  const status: CipherStatus = won ? 'won' : guessesUsed >= state.config.guessBudget ? 'burned' : 'active';
  return {
    ...state,
    guesses,
    guessesUsed,
    status,
    current: Array(state.config.codeLength).fill(null),
  };
}

/** Back out mid-cipher: soft fail. Nothing to bank — a guess's feedback isn't
 * reusable against a different mission's code the way a Trace pulse is. */
export function backOut(state: CipherState): CipherState {
  return { ...state, status: 'backed_out' };
}
