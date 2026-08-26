import type { ThresholdTier } from '../state/schema';
import type { PatrolRoute } from './patrols';
import type { EscalationStage } from './escalation';

/**
 * FLACK Phase Two — the rollout Act 1's opening headline already named
 * ("PHASE TWO ON TRACK FOR SUMMER") before it meant anything. Ground patrols
 * stick to the road grid; a drone doesn't, so routes here are free to cross
 * straight over rooftops rather than following `draw.ts`'s street
 * centrelines. Same `PatrolRoute` shape as `patrols.ts` on purpose — a
 * drone's position is walked with the exact same `stepPatrol`/
 * `patrolPosition` helpers Overworld.tsx already has, just airborne.
 */
export const DRONE_ROUTES: PatrolRoute[] = [
  {
    // A long diagonal sweep across the middle of the 3x3 — The Heights
    // down through the Crossroads and into Liberty Park — the first one
    // active, and the one most likely to cross paths with an ordinary
    // walk.
    id: 'drone_diagonal',
    loop: false,
    points: [
      { x: 250, y: 180 },
      { x: 900, y: 600 },
    ],
  },
  {
    // A racetrack over the Civic Zone. The block with the most cameras
    // in it also gets the one drone loop that never leaves a district:
    // there is no route into City Hall that isn't overflown.
    id: 'drone_civic_loop',
    loop: true,
    points: [
      { x: 1130, y: 40 },
      { x: 1590, y: 40 },
      { x: 1590, y: 320 },
      { x: 1130, y: 320 },
    ],
  },
  {
    // The Works' perimeter, from above — a second, wider ring around the
    // ground patrol's own `works_beat`.
    id: 'drone_works_ring',
    loop: true,
    points: [
      { x: 1130, y: 400 },
      { x: 1590, y: 400 },
      { x: 1590, y: 720 },
      { x: 1130, y: 720 },
    ],
  },
  {
    // A there-and-back over Southside and the river edge, so the
    // south-west corner isn't dead airspace once Phase Two is fully live.
    id: 'drone_south_sweep',
    loop: false,
    points: [
      { x: 100, y: 800 },
      { x: 520, y: 1000 },
    ],
  },
  {
    // Liberty Park, last and slowest. A drone over the commons is the
    // one image in this game that argues its own thesis without a line
    // of dialogue, so it only ever appears at the top of the rollout.
    id: 'drone_park_loop',
    loop: true,
    points: [
      { x: 600, y: 420 },
      { x: 1040, y: 420 },
      { x: 1040, y: 700 },
      { x: 600, y: 700 },
    ],
  },
];

export interface DroneTuning {
  activeRoutes: number;
  speed: number;
  detectionRadius: number;
  cooldownMs: number;
  heatOnSpot: number;
}

/**
 * `clear`/`watched` fly zero routes — Phase Two isn't live yet, same
 * "surveillance doesn't start until the plot thickens" pacing `patrols.ts`
 * already uses for ground vans. No `hunting` tier here: a drone that
 * spots you calls it in, it doesn't chase — the ground vans already own
 * that job.
 */
const TUNING: Record<ThresholdTier, DroneTuning> = {
  clear: { activeRoutes: 0, speed: 0, detectionRadius: 0, cooldownMs: 6000, heatOnSpot: 0 },
  watched: { activeRoutes: 0, speed: 0, detectionRadius: 0, cooldownMs: 6000, heatOnSpot: 0 },
  flagged: { activeRoutes: 2, speed: 60, detectionRadius: 34, cooldownMs: 5000, heatOnSpot: 2 },
  hunted: { activeRoutes: 4, speed: 80, detectionRadius: 42, cooldownMs: 4000, heatOnSpot: 3 },
};

/** Speed/detection a stage-activated drone flies at when the tier it's
 * borrowing a slot from doesn't have its own values to use — `clear` and
 * `watched` are 0 on both, on purpose, since there's normally nothing
 * flying to give them one. */
const AMBIENT_SPEED = 45;
const AMBIENT_DETECTION_RADIUS = 26;

/**
 * `stage` (see `world/escalation.ts`) adds routes on top of whatever the
 * Heat tier alone would activate, capped at how many routes actually exist
 * — the town's baseline surveillance creeping up over the course of the
 * story, on top of (never instead of) the moment-to-moment tier system
 * already tuned above. `flagged`/`hunted` are already close to every route
 * flying, so stage mostly widens how far each one can see instead; `clear`/
 * `watched` are the tiers with real headroom, so a late-game walk that
 * would have been silent on day one now has something in the sky.
 */
export function droneTuning(tier: ThresholdTier, stage: EscalationStage = 0): DroneTuning {
  const base = TUNING[tier];
  const activeRoutes = Math.min(DRONE_ROUTES.length, base.activeRoutes + stage);
  if (activeRoutes <= 0) return base;
  return {
    ...base,
    activeRoutes,
    speed: base.speed || AMBIENT_SPEED,
    detectionRadius: (base.detectionRadius || AMBIENT_DETECTION_RADIUS) + stage * 2,
  };
}

export function activeDroneRoutes(tier: ThresholdTier, stage: EscalationStage = 0): PatrolRoute[] {
  return DRONE_ROUTES.slice(0, droneTuning(tier, stage).activeRoutes);
}

/** How close the player has to be to take a shot at a drone — tighter than
 * the radius it spots *them* at, since disabling one is a decision made at
 * close range, not a passive walk-by. */
export const DRONE_TAKEDOWN_RADIUS = 30;

export interface DroneTakedownResult {
  itemId: string;
  quantity: number;
  heatCost: number;
  respawnDays: number;
}

/**
 * What landing the shot pays out, purely a function of which tool tier the
 * player has built (`systems/market.ts` `droneToolTier`) — the same
 * "the choice already happened at the workbench" logic `JUNCTION_BOX_RISK`
 * applies to a box's tier. The shot itself still has to connect
 * (`systems/droneshoot.ts`); this is only the reward for actually landing
 * it. A slingshot only stuns it — cheap parts, real Heat, back up fast. An
 * EMP gun kills it outright — the best haul, no Heat at all, and SafeTrace
 * needs a week to replace it.
 */
export const DRONE_TAKEDOWN_BY_TOOL_TIER: Record<1 | 2 | 3, DroneTakedownResult> = {
  1: { itemId: 'battery_pack', quantity: 1, heatCost: 2, respawnDays: 3 },
  2: { itemId: 'motor_kit', quantity: 1, heatCost: 1, respawnDays: 5 },
  3: { itemId: 'graphics_card', quantity: 1, heatCost: 0, respawnDays: 7 },
};
