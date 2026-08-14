/**
 * Where a sabotaged point object (camera, junction box, street hack) turns
 * back up once SafeTrace's had time to replace it — never the exact spot it
 * got taken apart, and never a brand-new coordinate no connectivity pass
 * has ever checked either. It reappears at one of its own siblings'
 * positions instead: same category for a camera, same tier for a junction
 * box, so a respawn never quietly makes a tier's own trip harder or easier
 * than its own numbers already promise. Overworld.tsx only actually shows
 * the new spot once the old one has scrolled off-screen — this module just
 * decides *which* spot, given that it's time.
 */
export interface RelocatableNode {
  id: string;
  x: number;
  y: number;
}

/** A stable, deterministic index from a text seed — same trick `noise()`
 * (world/draw.ts) uses for "same input, same output, looks random" visuals,
 * applied here to which sibling slot a respawn lands in rather than a
 * pixel. Seeding on `collectedOnDay` (which is different every time the
 * same node is taken down again) is what keeps successive respawns from
 * always picking the same neighbour. */
function seededIndex(seed: string, len: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % len;
}

/**
 * `siblings` should already be scoped to whatever group this node is
 * allowed to reappear within (every camera; a junction box's own tier).
 * `used` is the set of `"x,y"` positions already claimed by another node
 * resolved earlier in the same frame, so two respawns never land on each
 * other, and a respawn never lands on a spot something un-relocated is
 * still actively occupying. Falls back to the node's own original spot if
 * every sibling is somehow already spoken for.
 */
export function relocatedPosition(
  node: RelocatableNode,
  siblings: RelocatableNode[],
  collectedOnDay: number,
  used: ReadonlySet<string>,
): { x: number; y: number } {
  const ownKey = `${node.x},${node.y}`;
  const candidates = siblings.filter((s) => `${s.x},${s.y}` !== ownKey && !used.has(`${s.x},${s.y}`));
  if (candidates.length === 0) return { x: node.x, y: node.y };
  const chosen = candidates[seededIndex(`${node.id}:${collectedOnDay}`, candidates.length)];
  return { x: chosen.x, y: chosen.y };
}

/** Whether a point sits within the camera's current viewport, with a small
 * margin — a node has to have actually scrolled *off* screen before its
 * respawn is allowed to show at a new spot, not just crossed the exact
 * pixel edge. */
export function isOnScreen(
  x: number,
  y: number,
  camX: number,
  camY: number,
  viewWidth: number,
  viewHeight: number,
  margin = 24,
): boolean {
  return x >= camX - margin && x <= camX + viewWidth + margin && y >= camY - margin && y <= camY + viewHeight + margin;
}
