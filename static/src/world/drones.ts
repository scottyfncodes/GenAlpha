import type { ThresholdTier } from '../state/schema';
import type { PatrolRoute } from './patrols';

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
    // A long diagonal sweep across the civic core — the first one active,
    // and the one most likely to cross paths with an ordinary walk.
    id: 'drone_diagonal',
    loop: false,
    points: [
      { x: 120, y: 120 },
      { x: 700, y: 500 },
    ],
  },
  {
    // A tight racetrack loop over the town square — the town's most
    // watched public space, watched from above too now.
    id: 'drone_square_loop',
    loop: true,
    points: [
      { x: 460, y: 300 },
      { x: 740, y: 300 },
      { x: 740, y: 520 },
      { x: 460, y: 520 },
    ],
  },
  {
    // The Annex perimeter, from above — a second, wider ring around the
    // ground patrol's own annex loop.
    id: 'drone_annex_ring',
    loop: true,
    points: [
      { x: 780, y: 120 },
      { x: 1250, y: 120 },
      { x: 1250, y: 520 },
      { x: 780, y: 520 },
    ],
  },
  {
    // A there-and-back over the residential streets on the far side of
    // town, so the west edge isn't dead airspace once Phase Two is fully live.
    id: 'drone_west_sweep',
    loop: false,
    points: [
      { x: 100, y: 600 },
      { x: 500, y: 700 },
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

export function droneTuning(tier: ThresholdTier): DroneTuning {
  return TUNING[tier];
}

export function activeDroneRoutes(tier: ThresholdTier): PatrolRoute[] {
  return DRONE_ROUTES.slice(0, droneTuning(tier).activeRoutes);
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
 * EMP gun kills it outright — the best haul, no Heat at all, and Helio
 * needs a week to replace it.
 */
export const DRONE_TAKEDOWN_BY_TOOL_TIER: Record<1 | 2 | 3, DroneTakedownResult> = {
  1: { itemId: 'battery_pack', quantity: 1, heatCost: 2, respawnDays: 3 },
  2: { itemId: 'motor_kit', quantity: 1, heatCost: 1, respawnDays: 5 },
  3: { itemId: 'graphics_card', quantity: 1, heatCost: 0, respawnDays: 7 },
};
