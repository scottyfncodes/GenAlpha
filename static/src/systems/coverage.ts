import type { SaveState } from '../state/schema';
import { CAMERA_NODES, type CameraNode } from '../world/collectibles';
import { CAMERA_FEED } from '../world/coverage';
import { JUNCTION_BOX_NODES, JUNCTION_BOX_RISK } from '../world/junctionboxes';
import { escalationStage } from '../world/escalation';
import { MAP_HEIGHT, MAP_WIDTH } from '../world/locations';
import { onCooldown } from './materials';

/**
 * SafeTrace's own scoreboard. Heat is how much attention *you* have drawn;
 * coverage is how much of the town the cameras can see, whether or not
 * anybody is currently looking for you. The two move independently on
 * purpose — lying low does nothing for coverage, and a clean week for the
 * player is a week the rollout spent winning.
 *
 * GUARDRAIL, inherited from `systems/heat.ts` and confirmed with the author:
 * hitting 100% is a *severe forced consequence*, never a game over. Nothing
 * in this file ends a run. `resolveSweep` burns days, spikes Heat and puts
 * the whole network back up — it never returns a terminal state, and it
 * never takes a choice away permanently.
 *
 * Coverage is a pure function of the save: the day (which decides how many
 * cameras exist), the cooldown log (which decides which of them are
 * currently dark), and the sweep count (which decides how hard SafeTrace has
 * tuned the ones that are up). Same rule as everything else here — the clock
 * is `world.day`, never wall-clock time.
 */

/**
 * Sampling resolution for the area calculation, in map pixels. The map is
 * 1280x800, so 8px cells make a 160x100 grid — 16,000 samples, fine enough
 * that a camera's contribution is accurate to well under a percentage point,
 * cheap enough to recompute on demand rather than cache and invalidate.
 *
 * Sampling beats a closed-form union of circles here for the reason that
 * usually decides it: the circles overlap, overlaps overlap, and the exact
 * formula for that is a genuine mess, while counting cells is obviously
 * correct and trivially testable.
 */
export const COVERAGE_CELL = 8;
const GRID_W = Math.ceil(MAP_WIDTH / COVERAGE_CELL);
const GRID_H = Math.ceil(MAP_HEIGHT / COVERAGE_CELL);
const TOTAL_CELLS = GRID_W * GRID_H;

/**
 * How much every camera's reach grows per lockdown sweep already survived.
 * This is the permanent half of the consequence: the town that just swept
 * itself doesn't go back to how it was, it comes back tuned tighter, so the
 * second time is harder to hold off than the first. Small enough that one
 * sweep isn't a spiral; real enough that three are a different game.
 */
export const SWEEP_HARDENING_PER_SWEEP = 0.08;

/** Coverage at or above this triggers the sweep. */
export const COVERAGE_SWEEP_AT = 100;

/**
 * ...and the sweep won't fire again until coverage has first dropped back
 * below this. A plain "fire at 100" with no latch would re-fire every single
 * time the player did anything at all while pinned at the top, which is a
 * loop, not a consequence. Clearing the network is what re-arms it, and
 * clearing the network is exactly the work the sweep is meant to force.
 */
export const COVERAGE_SWEEP_REARM_BELOW = 85;

/** Days the sweep itself eats. The player doesn't act during it. */
export const SWEEP_DAYS = 3;

/** Where Heat lands when the sweep ends — the bottom of `hunted`, so the
 * forced beat the top Heat tier already owns is waiting on the other side. */
export const SWEEP_HEAT_FLOOR = 75;

/** Every camera that physically exists on the given day. */
export function camerasAtDay(day: number): CameraNode[] {
  const stage = escalationStage(day);
  return CAMERA_NODES.filter((n) => n.stage <= stage);
}

/** Whether the junction box carrying this camera is currently standing.
 * A camera whose box is down is still bolted to its pole and still looks
 * exactly the same — it just isn't reporting to anyone. */
export function feedIsUp(save: SaveState, cameraId: string): boolean {
  const boxId = CAMERA_FEED[cameraId];
  const box = JUNCTION_BOX_NODES.find((b) => b.id === boxId);
  if (!box) return true;
  return !onCooldown(save, box.id, JUNCTION_BOX_RISK[box.tier].respawnDays);
}

/**
 * The cameras actually contributing coverage right now: standing (not
 * sabotaged, or long enough ago that SafeTrace has replaced it) *and*
 * connected (its junction box intact). Either hit takes a camera off this
 * list, which is what makes the two targets genuinely alternative routes to
 * the same result rather than one being strictly better.
 */
export function activeCameras(save: SaveState): CameraNode[] {
  return camerasAtDay(save.world.day).filter(
    (n) => !onCooldown(save, n.id, n.respawnDays) && feedIsUp(save, n.id),
  );
}

/**
 * What fraction of the town those cameras can see, 0-100.
 *
 * Positions are read from the authored node table rather than from wherever
 * a respawn has since moved a node to. That isn't an approximation being
 * waved through: `world/relocate.ts` only ever moves a node onto *another
 * node's* coordinates, so the set of occupied positions is a permutation of
 * the authored set and the union area is the same either way. Computing off
 * the static table is what keeps this a pure function of the save instead of
 * something that needs the overworld's per-frame relocation bookkeeping.
 */
export function coveragePercent(save: SaveState): number {
  return coverageOf(activeCameras(save), save.world.surveillance.sweeps);
}

/** The same calculation over an explicit camera list — exported so tests and
 * the sweep's own "what would coverage be if we put everything back up"
 * check can ask the question without staging a save to match. */
export function coverageOf(cameras: CameraNode[], sweeps = 0): number {
  if (cameras.length === 0) return 0;
  const hardening = 1 + SWEEP_HARDENING_PER_SWEEP * sweeps;
  const seen = new Uint8Array(TOTAL_CELLS);

  for (const camera of cameras) {
    const radius = camera.coverageRadius * hardening;
    const r2 = radius * radius;
    // Only the camera's own bounding box, so cost scales with what it
    // actually covers rather than with the size of the map.
    const minGx = Math.max(0, Math.floor((camera.x - radius) / COVERAGE_CELL));
    const maxGx = Math.min(GRID_W - 1, Math.floor((camera.x + radius) / COVERAGE_CELL));
    const minGy = Math.max(0, Math.floor((camera.y - radius) / COVERAGE_CELL));
    const maxGy = Math.min(GRID_H - 1, Math.floor((camera.y + radius) / COVERAGE_CELL));

    for (let gy = minGy; gy <= maxGy; gy++) {
      // Cell centre, so a disc isn't systematically over- or under-counted
      // at its edge the way sampling from a corner would be.
      const dy = (gy + 0.5) * COVERAGE_CELL - camera.y;
      const dy2 = dy * dy;
      for (let gx = minGx; gx <= maxGx; gx++) {
        const dx = (gx + 0.5) * COVERAGE_CELL - camera.x;
        if (dx * dx + dy2 <= r2) seen[gy * GRID_W + gx] = 1;
      }
    }
  }

  let covered = 0;
  for (let i = 0; i < TOTAL_CELLS; i++) covered += seen[i];
  return Math.round((covered / TOTAL_CELLS) * 100);
}

export type CoverageTier = 'partial' | 'heavy' | 'critical';

/**
 * Three bands, mirroring how `heat.ts` turns a number into something a
 * player can read at a glance. The labels are SafeTrace's framing, not the
 * player's — this is the company's progress bar, and it is winning.
 */
export function coverageTier(percent: number): CoverageTier {
  if (percent >= 90) return 'critical';
  if (percent >= 70) return 'heavy';
  return 'partial';
}

export function coverageLabel(tier: CoverageTier): string {
  switch (tier) {
    case 'critical':
      return 'Almost nowhere left to stand.';
    case 'heavy':
      return 'Most of town, most of the time.';
    default:
      return 'There are still gaps.';
  }
}

/**
 * Whether the town has just topped out and the sweep should fire. Both
 * halves matter: coverage is maxed, *and* the latch is armed (see
 * `COVERAGE_SWEEP_REARM_BELOW`).
 */
export function sweepDue(save: SaveState): boolean {
  return save.world.surveillance.armed && coveragePercent(save) >= COVERAGE_SWEEP_AT;
}

/**
 * Re-arm the latch once the player has pushed coverage back down. Called on
 * the same beats `sweepDue` is; keeping the two together is what stops the
 * arming rule from drifting away from the firing rule.
 */
export function rearmIfClear(save: SaveState): SaveState {
  const { surveillance } = save.world;
  if (surveillance.armed || coveragePercent(save) >= COVERAGE_SWEEP_REARM_BELOW) return save;
  return { ...save, world: { ...save.world, surveillance: { ...surveillance, armed: true } } };
}

/**
 * Every camera and junction box back up, all at once — the sweep's real
 * teeth. A player arrives at 100% having usually just spent a week's Heat
 * putting holes in the network; this closes all of them in one night, and
 * the days it costs are days the rollout keeps advancing. Nothing else in
 * the cooldown log is touched: a sweep is SafeTrace repairing its own
 * hardware, not the town confiscating what's in a bush.
 */
export function repairNetwork(save: SaveState): SaveState {
  const networkIds = new Set<string>([
    ...CAMERA_NODES.map((n) => n.id),
    ...JUNCTION_BOX_NODES.map((n) => n.id),
  ]);
  const collectedNodes = save.world.collectedNodes.filter((c) => !networkIds.has(c.nodeId));
  if (collectedNodes.length === save.world.collectedNodes.length) return save;
  return { ...save, world: { ...save.world, collectedNodes } };
}

/** Bank the sweep: one more on the permanent counter, the latch dropped
 * until coverage comes back down, and the day it happened. */
export function markSwept(save: SaveState, day: number): SaveState {
  const { surveillance } = save.world;
  return {
    ...save,
    world: {
      ...save.world,
      surveillance: { sweeps: surveillance.sweeps + 1, armed: false, lastSweepDay: day },
    },
  };
}
