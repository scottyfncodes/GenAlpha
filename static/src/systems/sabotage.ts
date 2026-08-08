/**
 * "Casing & the Window" — the one sabotage mechanic (module 05). Where Trace is
 * reading a system, this is planning under a clock: the tension is preparation
 * versus improvisation, never reflexes.
 *
 * Pure logic, same as trace.ts. Every sabotage mission is a data object fed to
 * this code — casing details and window options are authored as arrays, not
 * written as bespoke mission code.
 */

export type SabotagePhase = 'casing' | 'window' | 'resolved';
export type SabotageStatus = 'active' | 'won' | 'spotted' | 'aborted';

export interface CasingDetail {
  id: string;
  label: string;
  /** What examining it tells the player, in fiction. */
  finding: string;
  /** Hidden until Files' hacking is used to prep (Tier 4 cross-module hook). */
  hiddenUnlessPrepped?: boolean;
}

export interface WindowOption {
  id: string;
  text: string;
  /** Alertness added if taken. Blind options are faster but cost more. */
  risk: number;
  /** Safer variant, only offered if this casing detail was examined. */
  requiresCasingDetail?: string;
  /** Consumes an inventory item; neutralises the beat outright. */
  requiresTool?: string;
  /** Shown after the choice — this is where the mission gets its texture. */
  outcome: string;
}

export interface WindowBeat {
  id: string;
  prompt: string;
  /** Seconds on the clock. Hesitating past it forces the blind option. */
  seconds: number;
  options: WindowOption[];
}

export interface SabotageConfig {
  missionId: string;
  skinId: string;
  title: string;
  brief: string;
  casingDetails: CasingDetail[];
  windowBeats: WindowBeat[];
  alertnessBudget: number;
  /**
   * The tier's unmodified budget, before Heat and hardening. Carried so the
   * Alertness meter can render a visibly shorter bar instead of quietly
   * shrinking a number (module 02's legible-nudge rule).
   */
  baseAlertnessBudget: number;
  /** Set true when the player prepped with a hacking run first (Tier 4). */
  prepped?: boolean;
}

export interface SabotageState {
  config: SabotageConfig;
  phase: SabotagePhase;
  examined: string[];
  beatIndex: number;
  alertness: number;
  status: SabotageStatus;
  log: string[];
  toolsUsed: string[];
}

/**
 * Authoring invariant: every beat needs at least one option with no casing or
 * tool requirement, or a player who skipped casing gets a beat with no legal
 * move. Cheap to check, impossible to spot by reading content. Returns the
 * offending beat ids so a test can name them.
 */
export function unreachableBeats(config: SabotageConfig): string[] {
  return config.windowBeats
    .filter((b) => !b.options.some((o) => !o.requiresCasingDetail && !o.requiresTool))
    .map((b) => b.id);
}

export function createSabotage(config: SabotageConfig): SabotageState {
  return {
    config,
    phase: 'casing',
    examined: [],
    beatIndex: 0,
    alertness: 0,
    status: 'active',
    log: [],
    toolsUsed: [],
  };
}

/** Casing costs nothing but time — no clock, no Heat. This is the reward space. */
export function examine(state: SabotageState, detailId: string): SabotageState {
  if (state.phase !== 'casing' || state.examined.includes(detailId)) return state;
  return { ...state, examined: [...state.examined, detailId] };
}

export function availableDetails(state: SabotageState): CasingDetail[] {
  return state.config.casingDetails.filter((d) => !d.hiddenUnlessPrepped || state.config.prepped);
}

export function openWindow(state: SabotageState): SabotageState {
  return { ...state, phase: 'window' };
}

/** Options unlocked by casing are safer; going in blind is always possible. */
export function optionsFor(state: SabotageState, inventory: string[]): WindowOption[] {
  const beat = state.config.windowBeats[state.beatIndex];
  if (!beat) return [];
  return beat.options.filter((o) => {
    if (o.requiresCasingDetail && !state.examined.includes(o.requiresCasingDetail)) return false;
    if (o.requiresTool && !inventory.includes(o.requiresTool)) return false;
    return true;
  });
}

export function choose(state: SabotageState, optionId: string): SabotageState {
  const beat = state.config.windowBeats[state.beatIndex];
  if (!beat || state.phase !== 'window') return state;
  const option = beat.options.find((o) => o.id === optionId);
  if (!option) return state;

  const alertness = state.alertness + option.risk;
  const beatIndex = state.beatIndex + 1;
  const log = [...state.log, option.outcome];
  const toolsUsed = option.requiresTool ? [...state.toolsUsed, option.requiresTool] : state.toolsUsed;

  // Soft fail: spotted, forced retreat. Never a hard fail, never a game over.
  if (alertness >= state.config.alertnessBudget) {
    return { ...state, alertness, log, toolsUsed, phase: 'resolved', status: 'spotted' };
  }
  if (beatIndex >= state.config.windowBeats.length) {
    return { ...state, alertness, log, toolsUsed, beatIndex, phase: 'resolved', status: 'won' };
  }
  return { ...state, alertness, log, toolsUsed, beatIndex };
}

/**
 * The clock running out doesn't fail you — it takes the choice away, and what
 * it takes is always the worst option you could actually have picked. Selecting
 * from the beat's full option list would force a tool you don't carry or a
 * detail you never cased.
 */
export function hesitate(state: SabotageState, inventory: string[]): SabotageState {
  const beat = state.config.windowBeats[state.beatIndex];
  if (!beat) return state;
  const reachable = optionsFor(state, inventory);
  const blind = [...reachable].sort((a, b) => b.risk - a.risk)[0];
  if (!blind) return abort(state);
  return choose(state, blind.id);
}

export function abort(state: SabotageState): SabotageState {
  return { ...state, phase: 'resolved', status: 'aborted' };
}
