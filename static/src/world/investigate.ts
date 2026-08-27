/**
 * "Patrol + sabotage": take something out and whatever's closest comes to
 * look, the way `world/pursuit.ts` `gravitate` already lets Heat pull a
 * patrol toward the player from further out than a real sighting reaches.
 * Same shape, different trigger — this fires off a fixed point (wherever
 * the camera, junction box or EMP'd housing actually was), not off the
 * player's own live position, and it isn't gated on Heat tier at all: a van
 * that happens to already be nearby responds to a housing going dark
 * whether the town's watching closely today or not.
 *
 * Deliberately short and deliberately local — one van or officer, only if
 * one was already close enough to plausibly notice, and only for a few
 * seconds before it gives up and resumes its own beat. This is the small
 * systemic chain the gameplay pass asks for, not a second chase mechanic:
 * by the time it fires the player has usually already left the spot, so
 * what it mostly buys is the sight of a van peeling off toward the alley
 * you just came out of — not a fight.
 */

export interface InvestigateAlert {
  x: number;
  y: number;
  startedAtMs: number;
}

/** How long a patrol keeps heading for the spot before giving it up as a
 * false alarm and resuming its own beat. */
export const INVESTIGATE_DURATION_MS = 9000;

/** Only a patrol already within this of the event responds at all — the
 * "already close enough to plausibly notice" gate, so a sabotage on one
 * side of the map doesn't summon a van from the other. */
export const INVESTIGATE_TRIGGER_RADIUS = 260;

/** Fraction of the remaining distance closed per second — slower than an
 * actual chase (`Overworld.tsx`'s own chase step), since this is "heading
 * over to look", not "coming for you". */
export const INVESTIGATE_PULL_PER_SEC = 0.5;

export function isInvestigateActive(alert: InvestigateAlert | null, nowMs: number): alert is InvestigateAlert {
  return alert !== null && nowMs - alert.startedAtMs < INVESTIGATE_DURATION_MS;
}

/**
 * Nudge `pos` toward the alert's own fixed location, only if it's already
 * within `INVESTIGATE_TRIGGER_RADIUS` — otherwise `pos` passes through
 * unchanged, same "outside the radius, nothing happens" contract
 * `pursuit.ts` `gravitate` already uses.
 */
export function investigate(
  pos: { x: number; y: number },
  alert: InvestigateAlert,
  dt: number,
): { x: number; y: number } {
  const dx = alert.x - pos.x;
  const dy = alert.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= 0 || dist > INVESTIGATE_TRIGGER_RADIUS) return pos;

  const step = Math.min(1, INVESTIGATE_PULL_PER_SEC * dt);
  return { x: pos.x + dx * step, y: pos.y + dy * step };
}
