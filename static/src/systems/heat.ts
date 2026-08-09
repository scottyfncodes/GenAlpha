import type { HeatState, ThresholdTier } from '../state/schema';

/**
 * Heat System (module 02). Heat is weather, not a health bar.
 * GUARDRAIL: there is no hard fail state from Heat. 'hunted' triggers a forced
 * story beat; it never ends a run. Nothing in this file should ever return a
 * "game over" — if a future system wants one, flag it instead of adding it.
 *
 * The clock is `world.day`, never wall-clock time. Closing the tab for a week
 * must not decay Heat, because the fiction didn't move.
 */

export const HEAT_TIERS: { tier: ThresholdTier; min: number; max: number; label: string }[] = [
  { tier: 'clear', min: 0, max: 24, label: 'Nobody’s looking.' },
  { tier: 'watched', min: 25, max: 49, label: 'Someone’s talking about you.' },
  { tier: 'flagged', min: 50, max: 74, label: 'Doors are closing.' },
  { tier: 'hunted', min: 75, max: 100, label: 'Lie low.' },
];

export const TIER_ORDER: ThresholdTier[] = ['clear', 'watched', 'flagged', 'hunted'];

export const HISTORY_CAP = 20;
export const PASSIVE_DECAY_PER_DAY = 2;
export const LIE_LOW_DECAY = 12; // spec range −10 to −15
/**
 * Walking in the door is not the same choice as Lie Low — no day spent, no
 * button pressed, just a smaller, automatic relief for actually being home.
 * Once per in-fiction day (`GameContext.tsx`'s `SET_LOCATION`, guarded by
 * `HOME_RELIEF_FLAG`), so it can't be farmed by walking in and out.
 */
export const HOME_RELIEF_DECAY = 5;
export const HOME_RELIEF_FLAG = 'home_relief_day';

export function tierFor(current: number): ThresholdTier {
  const band = HEAT_TIERS.find((t) => current >= t.min && current <= t.max);
  return band ? band.tier : 'clear';
}

export function tierLabel(tier: ThresholdTier): string {
  return HEAT_TIERS.find((t) => t.tier === tier)?.label ?? '';
}

export function atLeast(tier: ThresholdTier, floor: ThresholdTier): boolean {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(floor);
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Apply a Heat delta. Callers must have shown the player the cost first —
 * "always visible, always explained" (Heat System guardrail 2).
 * Only story-significant events are logged to history; the log exists for
 * narrative callbacks, not mechanics.
 */
export function applyHeat(
  heat: HeatState,
  args: { eventId: string; delta: number; logToHistory?: boolean },
): HeatState {
  const current = clamp(heat.current + args.delta);
  const history = args.logToHistory
    ? [
        ...heat.history,
        { eventId: args.eventId, delta: args.delta, timestamp: new Date().toISOString() },
      ].slice(-HISTORY_CAP)
    : heat.history;

  return { ...heat, current, threshold_tier: tierFor(current), history };
}

/**
 * Passive decay, resolved against the in-fiction clock. Idempotent: calling it
 * twice for the same day is a no-op, which is what makes it safe to run on load
 * and on every day advance without double-counting.
 */
export function decayTo(heat: HeatState, day: number): HeatState {
  const elapsed = day - heat.lastDecayDay;
  if (elapsed <= 0) return heat;
  if (heat.current <= 0) return { ...heat, lastDecayDay: day };
  const current = clamp(heat.current - PASSIVE_DECAY_PER_DAY * elapsed);
  return { ...heat, current, threshold_tier: tierFor(current), lastDecayDay: day };
}

/** The explicit "lie low" action — a real choice that costs time, not a reset button. */
export function lieLow(heat: HeatState, day: number, amount = LIE_LOW_DECAY): HeatState {
  const current = clamp(heat.current - amount);
  return { ...heat, current, threshold_tier: tierFor(current), lastDecayDay: day };
}

/**
 * Whether the player can lie low right now, and why not if they can't.
 *
 * Module 02: the explicit action is "a genuine choice, not a free reset
 * button", and at `hunted` it "may be unavailable without first resolving a
 * forced story beat". So the top tier doesn't block play — it redirects the
 * player at a scene that is already waiting for them at home.
 *
 * Returns null when it's available, which is the same shape as the market's
 * `unavailableReason`: the UI never has to decide, and never shows a dead
 * control without the reason next to it.
 */
export function lieLowBlocked(heat: HeatState, breatherDone: boolean): string | null {
  if (heat.current <= 0) return 'Nobody’s looking. There’s nothing to wait out.';
  if (heat.threshold_tier === 'hunted' && !breatherDone) {
    return 'Too late for that tonight. The kitchen light is on.';
  }
  return null;
}
