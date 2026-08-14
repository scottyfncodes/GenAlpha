/**
 * The flight itself. Pure logic, no React — same split
 * `systems/droneshoot.ts` uses for the takedown shot: the minigame
 * component owns spawning and animation, this owns the handful of checks
 * that actually decide the outcome, so they can be tested without a DOM.
 */

/** The play field every flight position is expressed in — taller than the
 * takedown booth's, since this scrolls rather than sitting still. */
export const FLIGHT_BOUNDS = { w: 240, h: 380 };

export interface FlightEntity {
  x: number;
  y: number;
  /** Collision radius. */
  r: number;
}

/** Simple circle-circle overlap — the one check both "did an obstacle hit
 * the drone" and "did the drone's own fire hit an obstacle" reduce to. */
export function collides(a: FlightEntity, b: FlightEntity): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= a.r + b.r;
}

/** How far through the flight the drone is, 0–100 — a straight function of
 * elapsed time, since the whole sortie is a fixed-length auto-scroll. */
export function progressPct(elapsedMs: number, durationMs: number): number {
  return Math.min(100, Math.max(0, (elapsedMs / durationMs) * 100));
}

/** Whether the drone has taken enough hits to be shot down. */
export function isShotDown(hits: number, maxHits: number): boolean {
  return hits >= maxHits;
}
