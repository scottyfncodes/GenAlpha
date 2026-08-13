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

/*
 * Rewritten for the district redesign: routes now run the actual road grid
 * (drawRoads' vertical/horizontal centrelines) rather than cutting across
 * open ground, so a van reads as driving a beat rather than sliding through
 * a field. Each one was walked back through the same flood-fill/overlap
 * script as the maze filler before being finalised here.
 */
export const PATROL_ROUTES: PatrolRoute[] = [
  {
    // The main street: downtown's civic-core frontage, school to the Annex
    // approach.
    id: 'midtown_sweep',
    loop: false,
    points: [
      { x: 332, y: 164 },
      { x: 812, y: 164 },
    ],
  },
  {
    // The residential edge, between the little home/Ellen's/Casey's cluster
    // and the road.
    id: 'west_beat',
    loop: false,
    points: [
      { x: 172, y: 164 },
      { x: 172, y: 468 },
    ],
  },
  {
    // Along the school and library's south flank.
    id: 'downtown_watch',
    loop: false,
    points: [
      { x: 492, y: 316 },
      { x: 800, y: 316 },
    ],
  },
  {
    // A tight loop around the Town Square.
    id: 'center_loop',
    loop: true,
    points: [
      { x: 492, y: 336 },
      { x: 492, y: 488 },
      { x: 712, y: 488 },
      { x: 712, y: 336 },
    ],
  },
  {
    // A loop around the whole Annex — the one district worth circling
    // deliberately, since it's the one the story keeps warning is watched.
    id: 'annex_loop',
    loop: true,
    points: [
      { x: 812, y: 164 },
      { x: 1200, y: 164 },
      { x: 1200, y: 495 },
      { x: 812, y: 495 },
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
  /**
   * ADDED for the quarterly-threshold escalation: at `flagged` and `hunted`,
   * a van that spots the player abandons its route and drives at them
   * instead of past them, for as long as they stay within chase range
   * (Overworld.tsx `CHASE_RADIUS`). `clear`/`watched` stay passive — a fixed
   * beat, the same "dodging surveillance doesn't start until the plot
   * thickens" pacing already governs when routes go active at all.
   */
  hunting: boolean;
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
  clear: { activeRoutes: 0, speed: 40, detectionRadius: 28, cooldownMs: 6000, heatOnSpot: 1, hunting: false },
  watched: { activeRoutes: 3, speed: 55, detectionRadius: 36, cooldownMs: 5000, heatOnSpot: 2, hunting: false },
  flagged: { activeRoutes: 4, speed: 70, detectionRadius: 44, cooldownMs: 4000, heatOnSpot: 3, hunting: true },
  hunted: { activeRoutes: 5, speed: 85, detectionRadius: 52, cooldownMs: 3000, heatOnSpot: 4, hunting: true },
};

export function patrolTuning(tier: ThresholdTier): PatrolTuning {
  return TUNING[tier];
}

export function activeRoutes(tier: ThresholdTier): PatrolRoute[] {
  return PATROL_ROUTES.slice(0, patrolTuning(tier).activeRoutes);
}
