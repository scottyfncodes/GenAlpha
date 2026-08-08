import type { ThresholdTier } from '../state/schema';

/**
 * Helio's patrol vans (the contractor already named throughout the story —
 * see `content/heist.ts`, and the "van idles at the end of the block" ambient
 * line already on `camera_pole_5th` at `hunted`). Ghosts on a fixed beat, in
 * the Pac-Man sense the build note asked for: each route is a closed loop or
 * a there-and-back sweep, walked at constant speed, no pursuit AI. Every
 * route was checked against the same connectivity script as the maze filler
 * so a van is never asked to drive through a wall.
 *
 * Being seen is Heat, not a fail state — `overlapsPatrol` in Overworld.tsx
 * feeds `ADD_HEAT` on a cooldown, the same action the debug drawer already
 * uses, and nothing about a sighting can end the game. That is the existing
 * "nothing hard-fails" rule applied to a new hazard, not an exception to it.
 */
export interface PatrolRoute {
  id: string;
  points: { x: number; y: number }[];
  /** true loops back to the start; false ping-pongs there and back. */
  loop: boolean;
}

export const PATROL_ROUTES: PatrolRoute[] = [
  {
    id: 'midtown_sweep',
    loop: false,
    points: [
      { x: 240, y: 428 },
      { x: 700, y: 428 },
    ],
  },
  {
    id: 'west_beat',
    loop: false,
    points: [
      { x: 140, y: 176 },
      { x: 140, y: 384 },
    ],
  },
  {
    id: 'library_beat',
    loop: false,
    points: [
      { x: 756, y: 24 },
      { x: 756, y: 260 },
    ],
  },
  {
    id: 'center_east_loop',
    loop: true,
    points: [
      { x: 284, y: 428 },
      { x: 284, y: 524 },
      { x: 540, y: 524 },
      { x: 540, y: 428 },
    ],
  },
  {
    id: 'se_loop',
    loop: true,
    points: [
      { x: 692, y: 460 },
      { x: 692, y: 636 },
      { x: 940, y: 636 },
      { x: 940, y: 460 },
    ],
  },
];

/**
 * "The town gets more careful around you without a single new asset" — the
 * same Heat System guardrail the locations' ambient text already leans on.
 * More routes go active, vans move faster, the radius they can spot you at
 * widens, and a sighting costs a little more, purely by reading the tier
 * already computed for the HUD. Nothing here is a new mechanic, only the
 * existing one made visible in a second place.
 */
export interface PatrolTuning {
  activeRoutes: number;
  speed: number;
  detectionRadius: number;
  cooldownMs: number;
  heatOnSpot: number;
}

/**
 * `clear` runs zero active routes on purpose — per the build note, dodging
 * surveillance doesn't start until the plot thickens. A brand-new save is
 * always at `clear`, so the opening of the game (the terminal check, the
 * walk to school, beat one and two) plays with an empty street. The vans are
 * still there, still walking their beats underneath, so the transition into
 * `watched` doesn't spawn them fresh — the town was already like this, the
 * player just hadn't given it a reason to look yet.
 */
const TUNING: Record<ThresholdTier, PatrolTuning> = {
  clear: { activeRoutes: 0, speed: 40, detectionRadius: 28, cooldownMs: 6000, heatOnSpot: 1 },
  watched: { activeRoutes: 3, speed: 55, detectionRadius: 36, cooldownMs: 5000, heatOnSpot: 2 },
  flagged: { activeRoutes: 4, speed: 70, detectionRadius: 44, cooldownMs: 4000, heatOnSpot: 3 },
  hunted: { activeRoutes: 5, speed: 85, detectionRadius: 52, cooldownMs: 3000, heatOnSpot: 4 },
};

export function patrolTuning(tier: ThresholdTier): PatrolTuning {
  return TUNING[tier];
}

export function activeRoutes(tier: ThresholdTier): PatrolRoute[] {
  return PATROL_ROUTES.slice(0, patrolTuning(tier).activeRoutes);
}
