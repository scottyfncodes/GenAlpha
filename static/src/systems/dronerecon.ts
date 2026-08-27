import type { PlayerDroneTier } from '../world/playerdrone';

/**
 * Recon, rewritten. The old flight was a fourteen-second dodge-em-up with
 * nothing to look at — "survive" was the whole verb, and it was exactly the
 * same verb `KAMIKAZE_FLIGHT_MS` already used for a one-way strike. This is
 * the other half of "I GOT A DRONE": the airframe comes home either way, so
 * a sortie should be spent looking at the block from above, not dodging
 * static in a tube.
 *
 * `ui/minigames/DroneRecon.tsx` owns spawning, drawing and the drag control;
 * this owns the handful of checks that decide what a flight actually finds
 * and what that's worth, same split `droneflight.ts`/`droneshoot.ts` already
 * use — pure, no DOM, testable without a canvas.
 */

export type ReconPoiKind = 'camera' | 'junction' | 'patrol';

export interface ReconPoi {
  id: string;
  kind: ReconPoiKind;
  x: number;
  y: number;
  label: string;
}

/** How far out from the player's own position a sortie covers — the block
 * you're standing in, not a satellite pass over the whole town. Scouting is
 * about *this* street, which is also what keeps the flight legible on a
 * phone screen instead of needing the whole 3x3 rendered at once. */
export const RECON_SCAN_RADIUS = 260;

/** How close the drone itself has to get to a POI already in scan range to
 * actually resolve it from a "something's there" blip into a named find —
 * tighter than the scan radius, so flying the field is still the point. */
export const RECON_REVEAL_RADIUS = 46;

interface NamedPoint {
  id: string;
  x: number;
  y: number;
}

interface JunctionLike extends NamedPoint {
  tier: 1 | 2 | 3 | 4 | 5;
}

interface RouteLike {
  id: string;
  points: { x: number; y: number }[];
}

/**
 * What a flight launched from `center` has in play — every camera, junction
 * box and active patrol beat within `RECON_SCAN_RADIUS`. A route contributes
 * at most one POI (its nearest in-range point): a beat is spotted or it
 * isn't, the player doesn't have to find every waypoint on it.
 */
export function poisInRange(
  center: { x: number; y: number },
  cameras: NamedPoint[],
  junctions: JunctionLike[],
  patrolRoutes: RouteLike[],
): ReconPoi[] {
  const pois: ReconPoi[] = [];
  for (const c of cameras) {
    if (Math.hypot(c.x - center.x, c.y - center.y) <= RECON_SCAN_RADIUS) {
      pois.push({ id: c.id, kind: 'camera', x: c.x, y: c.y, label: 'FLACK camera' });
    }
  }
  for (const j of junctions) {
    if (Math.hypot(j.x - center.x, j.y - center.y) <= RECON_SCAN_RADIUS) {
      pois.push({ id: j.id, kind: 'junction', x: j.x, y: j.y, label: `Tier ${j.tier} junction box` });
    }
  }
  for (const r of patrolRoutes) {
    const near = r.points.find((p) => Math.hypot(p.x - center.x, p.y - center.y) <= RECON_SCAN_RADIUS);
    if (near) pois.push({ id: `patrol_${r.id}`, kind: 'patrol', x: near.x, y: near.y, label: 'Patrol beat' });
  }
  return pois;
}

/** Whether the drone, at `dronePos`, has actually gotten close enough to
 * `poi` to make it out. */
export function isRevealed(dronePos: { x: number; y: number }, poi: ReconPoi): boolean {
  return Math.hypot(dronePos.x - poi.x, dronePos.y - poi.y) <= RECON_REVEAL_RADIUS;
}

/**
 * Heat relief for a clean flight — a flat baseline (never worse than doing
 * nothing) plus a real bonus per POI actually found, both scaled by
 * airframe tier the same way the flat reward this replaces was. A thorough
 * scout of a busy block now outpays the old fixed number; a flight that
 * finds nothing still lands softer than a scrubbed one.
 */
const BASE_RELIEF: Record<PlayerDroneTier, number> = { 1: 2, 2: 3, 3: 4 };
const PER_POI_RELIEF: Record<PlayerDroneTier, number> = { 1: 2, 2: 3, 3: 4 };

export function reconHeatRelief(tier: PlayerDroneTier, discoveredCount: number): number {
  return BASE_RELIEF[tier] + PER_POI_RELIEF[tier] * Math.max(0, discoveredCount);
}

/**
 * Tier 2 airframes and up can put a scouted camera to sleep from the air —
 * the "upgrades unlock a verb, not just a bigger number" pass. It costs Heat
 * (`RECON_EMP_HEAT_COST`, `systems/materials.ts`) and shares the camera's
 * own cooldown log, but it never touches the drone or the player's stock of
 * bolt cutters: this is disruption, not a dismantle, so it pays no parts.
 */
export function canEmpFromAir(tier: PlayerDroneTier): boolean {
  return tier >= 2;
}
