import type { ThresholdTier } from '../state/schema';
import type { EscalationStage } from './escalation';

/**
 * SafeTrace's patrol vans (the contractor already named throughout the story —
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
 * Rewritten for the district redesign: routes run `draw.ts`'s new road
 * hierarchy (`ROAD_SEGMENTS`) — the major arterial pair, the secondary
 * pair, and each district's own local street — rather than the old uniform
 * grid, so a van driving the Downtown Crossroads reads as a different beat
 * from one circling the Warehouse District's own perimeter. Every waypoint
 * sits clear of every location and solid obstacle rect (checked the same
 * way `scripts/check-connectivity.mjs` checks everything else that has to
 * share the map with a building), so a van is never asked to drive through
 * a wall.
 */
export const PATROL_ROUTES: PatrolRoute[] = [
  {
    // The major E-W arterial, straight across Downtown — the fastest,
    // most watched route in town, and the one every other beat below is a
    // quieter alternative to.
    id: 'midtown_sweep',
    loop: false,
    points: [
      { x: 520, y: 364 },
      { x: 1040, y: 364 },
    ],
  },
  {
    // The major N-S spine, the length of Residential North and West End —
    // the western half of town's own main street.
    id: 'west_beat',
    loop: false,
    points: [
      { x: 500, y: 40 },
      { x: 500, y: 700 },
    ],
  },
  {
    // Downtown's own local street, School and Library's south flank, past
    // the Marlow Street unit.
    id: 'downtown_watch',
    loop: false,
    points: [
      { x: 570, y: 230 },
      { x: 1000, y: 230 },
    ],
  },
  {
    // A tight loop around Town Square itself — the Downtown Crossroads'
    // own civic centre, circled from the road rather than the plaza.
    id: 'center_loop',
    loop: true,
    points: [
      { x: 600, y: 220 },
      { x: 790, y: 220 },
      { x: 790, y: 300 },
      { x: 600, y: 300 },
    ],
  },
  {
    // A loop around the whole Warehouse District's own perimeter — the one
    // district worth circling deliberately, since it's the one the story
    // keeps warning is watched, and now the one with real depth to circle.
    id: 'warehouse_loop',
    loop: true,
    points: [
      { x: 1140, y: 10 },
      { x: 1590, y: 10 },
      { x: 1590, y: 720 },
      { x: 1140, y: 720 },
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

const AMBIENT_SPEED = 40;
const AMBIENT_DETECTION_RADIUS = 24;

/**
 * `stage` (see `world/escalation.ts`) adds routes on top of the Heat tier's
 * own count, capped at how many beats exist — `clear` is the tier with the
 * most headroom (it runs zero on its own), so this is where the police
 * state's slow creep actually shows: a van on the street during an
 * otherwise quiet walk, later in the story, that wasn't there in week one.
 */
export function patrolTuning(tier: ThresholdTier, stage: EscalationStage = 0): PatrolTuning {
  const base = TUNING[tier];
  const escalatedActiveRoutes = Math.min(PATROL_ROUTES.length, base.activeRoutes + stage);
  if (escalatedActiveRoutes <= 0) return base;
  return {
    ...base,
    activeRoutes: escalatedActiveRoutes,
    speed: base.speed || AMBIENT_SPEED,
    detectionRadius: (base.detectionRadius || AMBIENT_DETECTION_RADIUS) + stage * 2,
  };
}

export function activeRoutes(tier: ThresholdTier, stage: EscalationStage = 0): PatrolRoute[] {
  return PATROL_ROUTES.slice(0, patrolTuning(tier, stage).activeRoutes);
}
