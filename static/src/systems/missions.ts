import type { MissionRecord, SaveState, ThresholdTier } from '../state/schema';
import { applyHeat, decayTo } from './heat';
import { addCash, eventsFromRun, heatReliefFor, startEvent, tickMarket } from './market';
import { burn, burnRoll, tickSafehouses } from './safehouse';

/**
 * The shared contract between the two minigames and the save state: what a run
 * costs in Heat, what a failure does to the target, and when it can be retried.
 * Both mechanics resolve through here so the Heat table (module 02) lives in
 * exactly one place.
 */

export type MissionKind = 'hacking' | 'sabotage';
export type RunOutcome = 'clean' | 'messy' | 'failed' | 'aborted';

export const HEAT_COST: Record<MissionKind, Record<RunOutcome, number>> = {
  // Hacking: +3 to +8 per attempt, failures cost more than clean successes.
  hacking: { clean: 3, messy: 5, failed: 8, aborted: 3 },
  // Sabotage: +5 to +12 — the physical world leaves more evidence.
  sabotage: { clean: 5, messy: 9, failed: 12, aborted: 5 },
};

export interface RunResult {
  missionId: string;
  kind: MissionKind;
  outcome: RunOutcome;
  /** Trace only: revealed nodes to bank for a retry. */
  bankedIntel?: number[];
}

export function heatFor(kind: MissionKind, outcome: RunOutcome): number {
  return HEAT_COST[kind][outcome];
}

/**
 * Briefings must preview this before the player commits — "always visible,
 * always explained" (Heat System guardrail 2). Range, because the outcome
 * isn't known yet.
 *
 * `relief` is gear the player is carrying (module 03's burner phone). It is
 * subtracted here as well as at the charge so the briefing shows the number
 * the player will actually pay — a discount they weren't told about is the
 * same broken contract as a cost they weren't told about, just friendlier.
 */
export function heatPreview(kind: MissionKind, relief = 0): [number, number] {
  const table = HEAT_COST[kind];
  return [Math.max(1, table.clean - relief), Math.max(1, table.failed - relief)];
}

export function nextRecord(prev: MissionRecord | undefined, result: RunResult, day: number): MissionRecord {
  const base: MissionRecord = prev ?? { status: 'available', attempts: 0, hardened: 0 };
  const attempts = base.attempts + 1;

  // A completed hacking run against a target counts as prep for the physical
  // side of the same target — the optional cross-skill synergy from module 05.
  const prepped = base.prepped || (result.kind === 'hacking' && result.outcome !== 'failed');

  if (result.outcome === 'clean' || result.outcome === 'messy') {
    return {
      ...base,
      status: 'complete',
      attempts,
      prepped,
      bankedIntel: undefined,
      cooldownUntilDay: undefined,
    };
  }
  if (result.outcome === 'aborted') {
    return { ...base, status: 'available', attempts, prepped, bankedIntel: result.bankedIntel };
  }
  /**
   * Failed: the target is alerted and hardens. Retry is delayed, never denied.
   * Banked intel is deliberately dropped here — hardening tightens the budget
   * but the map itself is stable, so intel from a burned run stays valid. What
   * we don't do is silently carry intel across a regenerated grid.
   */
  return {
    ...base,
    status: 'failed',
    attempts,
    prepped,
    hardened: base.hardened + 1,
    cooldownUntilDay: day + 1,
    bankedIntel: result.bankedIntel,
  };
}

export function isOnCooldown(record: MissionRecord | undefined, day: number): boolean {
  return Boolean(record?.cooldownUntilDay && day < record.cooldownUntilDay);
}

/**
 * Heat's threshold_tier nudges both minigames the same way: a visibly smaller
 * budget, never a hidden stat change (modules 02/04/05).
 */
export function budgetNudge(tier: ThresholdTier): number {
  return tier === 'hunted' ? -2 : tier === 'flagged' ? -1 : 0;
}

/**
 * Heat has been pure downside — a cost the player minimizes and nothing more.
 * Hazard pay gives operating hot an actual upside: a landed run (clean or
 * messy — not failed, not aborted) pays a cash bonus scaled to the tier the
 * player was in when they took the job. Doesn't touch the Heat table itself,
 * so a briefing's cost preview stays exactly what it always was; this is
 * counted and shown separately (MissionBriefing's "Hazard pay" line).
 */
export const HAZARD_BONUS: Record<ThresholdTier, number> = {
  clear: 0,
  watched: 6,
  flagged: 14,
  hunted: 25,
};

export function hazardBonusFor(tier: ThresholdTier): number {
  return HAZARD_BONUS[tier];
}

export function missionRecord(save: SaveState, missionId: string): MissionRecord | undefined {
  return save.missions[missionId];
}

/** Sabotage reads this to offer the hidden casing detail (module 05, Tier 4). */
export function isPrepped(record: MissionRecord | undefined): boolean {
  return Boolean(record?.prepped);
}

/**
 * Everything a finished run does to the save, in one pure place.
 *
 * The day advance is the load-bearing part. Module 02 defines an in-game "day"
 * as a mission cycle — decay is "per return to the overworld/hub after a
 * mission, or per explicit lie low" — and until this existed, the only things
 * that moved `world.day` were two debug buttons that drop out of a production
 * build. That made passive decay and every mission cooldown unreachable code
 * in the shipped game: Heat only ever climbed, and a hardened target would
 * have stayed on cooldown forever once Act 2 started gating on it.
 *
 * Order matters and is deliberate:
 *   1. Heat gain lands first, so the player sees the cost they were shown.
 *   2. Decay resolves against the NEW day, so a run nets gain minus two.
 *   3. The cooldown is measured from the new day too, so a failed run is
 *      still cooling on the day it failed rather than clearing instantly.
 */
export function resolveRun(
  state: SaveState,
  result: RunResult,
  toolsUsed: string[] = [],
  skinId?: string,
): SaveState {
  const day = state.world.day + 1;
  const relief = heatReliefFor(state, result.kind);
  const gained = applyHeat(state.heat, {
    eventId: `${result.missionId}:${result.outcome}`,
    delta: Math.max(1, heatFor(result.kind, result.outcome) - relief),
    logToHistory: true,
  });

  // Hazard pay: the tier the player was actually operating in when they took
  // the job, not the tier this run's own Heat gain just pushed them into —
  // the risk that earned the bonus is the one they walked in carrying.
  const landed = result.outcome === 'clean' || result.outcome === 'messy';
  const withHazardPay = landed
    ? addCash({ ...state, heat: gained }, hazardBonusFor(state.heat.threshold_tier))
    : { ...state, heat: gained };

  const spent = new Set(toolsUsed);
  const inventory = withHazardPay.economy.inventory
    .map((i) => (spent.has(i.itemId) ? { ...i, quantity: i.quantity - 1 } : i))
    .filter((i) => i.quantity > 0);

  /*
   * A job that goes wrong while the town is already watching can cost the
   * player their base (module 03's Reinforced Lock halves it). Rolled against
   * the state *before* the day advances, so the seed is the day the job
   * happened on rather than the morning after.
   */
  const burned = result.outcome === 'failed' && burnRoll(state, result.missionId);

  const settled: SaveState = {
    ...withHazardPay,
    heat: decayTo(gained, day),
    world: { ...state.world, day },
    missions: {
      ...state.missions,
      [result.missionId]: nextRecord(state.missions[result.missionId], result, day),
    },
    economy: { ...withHazardPay.economy, inventory },
  };

  /*
   * The market moves because the player moved. Module 03 hangs two of its five
   * event triggers on sabotage outcomes, so this is where the economy stops
   * being a shop and starts being a system: a clean job downtown puts gear
   * prices up for three days and the player can watch it happen.
   *
   * `tickMarket` runs last and unconditionally, because the day advanced —
   * expiring an event is not optional just because nothing new started.
   */
  const withMarket = tickMarket(
    eventsFromRun(result.kind, result.outcome, skinId).reduce(
      (acc, eventId) => startEvent(acc, eventId),
      settled,
    ),
  );

  // Burned places come back on their own, so the tick runs every day either way.
  return tickSafehouses(burned ? burn(withMarket, day) : withMarket);
}
