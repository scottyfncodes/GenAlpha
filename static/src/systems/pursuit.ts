import type { ThresholdTier } from '../state/schema';

/**
 * The dragnet effect: the higher Heat climbs, the more a van, a drone or an
 * officer on foot drifts off its own scripted beat and toward wherever the
 * player actually is — not just reacting once they're spotted at close
 * range (`patrols.ts`'s own chase mechanic already does that), but closing
 * the gap from further out before a sighting ever happens. `clear` and
 * `watched` pull nothing — a fixed beat, same pacing every hazard on this
 * map already opens with. It only starts at `flagged`, and is strongest at
 * `hunted`, same quarterly-threshold shape the chase mechanic uses.
 *
 * Pure and stateless: given a patrol's current position, the player's, and
 * how much time passed, this returns where the patrol ends up — the caller
 * (Overworld.tsx) still owns whether gravity applies at all this frame
 * (suppressed entirely while the player is out of sight in a safe
 * location, see `UNSEEN_COOLDOWN_MS` below).
 */

/** How far outside its own detection radius a patrol can still be pulled
 * from — the radius of the wider, softer net that closes in as Heat climbs,
 * on top of (not instead of) the hard chase a real sighting triggers. */
export const GRAVITY_RADIUS: Record<ThresholdTier, number> = {
  clear: 0,
  watched: 0,
  flagged: 90,
  hunted: 160,
};

/** Fraction of the remaining distance to the player closed per second,
 * once within `GRAVITY_RADIUS` — small enough to read as "drifting toward
 * a general area", not a second chase mechanic. */
export const GRAVITY_PULL_PER_SEC: Record<ThresholdTier, number> = {
  clear: 0,
  watched: 0,
  flagged: 0.16,
  hunted: 0.32,
};

/** Nudge `pos` toward `player` by this frame's share of the pull, if
 * they're within gravity range for the current tier — otherwise `pos`
 * passes through unchanged. */
export function gravitate(
  pos: { x: number; y: number },
  player: { x: number; y: number },
  tier: ThresholdTier,
  dt: number,
): { x: number; y: number } {
  const radius = GRAVITY_RADIUS[tier];
  const pull = GRAVITY_PULL_PER_SEC[tier];
  if (radius <= 0 || pull <= 0) return pos;

  const dx = player.x - pos.x;
  const dy = player.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= 0 || dist > radius) return pos;

  const step = Math.min(1, pull * dt);
  return { x: pos.x + dx * step, y: pos.y + dy * step };
}

/**
 * The payoff for actually staying out of sight, above and beyond the
 * ordinary day-based decay (`heat.ts` `decayTo`) — continuous seconds with
 * nobody's detection radius touching the player before Heat starts to
 * passively ease off on its own. A `canLieLow` location (home, the arcade,
 * the treehouse, …) counts as sight-proof immediately rather than making
 * the player wait it out — the other half of "stay hidden, or get inside".
 */
export const UNSEEN_COOLDOWN_MS = 20000;
/** How often, once the cooldown's been earned, a relief tick fires. */
export const UNSEEN_TICK_MS = 4000;
/** Heat eased off per tick — gentle; this rewards not being seen, it isn't
 * a substitute for Lie Low's real, deliberate relief. */
export const UNSEEN_RELIEF_PER_TICK = 1;

/** How far a tree's canopy reaches past its own trunk rect — a drone looks
 * straight down, so standing anywhere under the leaves (not just on the
 * trunk pixel) is cover, the same way it would be for real. */
const TREE_COVER_MARGIN = 8;

/**
 * Whether the player is currently standing under a tree's canopy — the one
 * thing on this map a drone's own downward-looking eye can't see through.
 * Ground-level threats (a van, an officer on foot) aren't fooled by it,
 * only the drone loop reads this.
 */
export function underTreeCover(
  pos: { x: number; y: number },
  obstacles: { x: number; y: number; w: number; h: number; kind: string }[],
): boolean {
  return obstacles.some(
    (o) =>
      o.kind === 'tree' &&
      pos.x >= o.x - TREE_COVER_MARGIN &&
      pos.x <= o.x + o.w + TREE_COVER_MARGIN &&
      pos.y >= o.y - TREE_COVER_MARGIN &&
      pos.y <= o.y + o.h + TREE_COVER_MARGIN,
  );
}
