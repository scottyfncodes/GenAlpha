/**
 * Junction boxes: the physical source of every blueprint (`content/
 * blueprints.ts`), and the network that carries the town's cameras back to
 * SafeTrace (`world/coverage.ts`). Same shape as `CameraNode`
 * (`world/collectibles.ts`) on purpose — a fixed point, a Heat cost shown
 * before it's spent, a respawn window — because it's the same kind of
 * object: street furniture worth taking apart, not a building with a
 * different paint job.
 *
 * A box no longer names what's inside it. It used to carry a
 * `blueprintItemId`, one fixed plan per box, listed on the prompt before the
 * player had spent anything — which meant a box was a vending machine and
 * the only decision was whether today was the day. Now the tier is the whole
 * of what's knowable in advance: it sets the Heat price, the time the box
 * stays dark, and *which pool* the contents come out of, and that's all the
 * player gets until the lid is off. See `systems/materials.ts`
 * `rollJunctionBoxLoot` for what actually comes out.
 *
 * `tier` is still what scales the risk: a Tier 5 box costs more Heat and
 * stays dark longer than a Tier 1 one, per the build note that the
 * higher-level the plan inside, the higher the price for going after it.
 */
export interface JunctionBoxNode {
  id: string;
  x: number;
  y: number;
  tier: 1 | 2 | 3 | 4 | 5;
}

/** Heat cost and respawn window, purely a function of tier — every box at
 * the same tier costs the same to crack, so the number on the prompt is
 * something a player can learn once and read off any box after that. */
export const JUNCTION_BOX_RISK: Record<JunctionBoxNode['tier'], { heatCost: number; respawnDays: number }> = {
  1: { heatCost: 3, respawnDays: 4 },
  2: { heatCost: 5, respawnDays: 5 },
  3: { heatCost: 7, respawnDays: 6 },
  4: { heatCost: 9, respawnDays: 7 },
  5: { heatCost: 12, respawnDays: 9 },
};

export const JUNCTION_BOX_NODES: JunctionBoxNode[] = [
  // Tier 1 — spread through the residential/civic core, the earliest ground
  // a player actually covers.
  { id: 'junction_1', x: 176, y: 320, tier: 1 },
  { id: 'junction_2', x: 460, y: 150, tier: 1 },
  { id: 'junction_3', x: 380, y: 460, tier: 1 },
  { id: 'junction_4', x: 230, y: 460, tier: 1 },
  // Tier 2 — downtown, once there's a reason to be there.
  { id: 'junction_5', x: 600, y: 305, tier: 2 },
  { id: 'junction_6', x: 760, y: 320, tier: 2 },
  // Tier 3 — the Annex's working edge.
  { id: 'junction_7', x: 900, y: 330, tier: 3 },
  { id: 'junction_8', x: 870, y: 462, tier: 3 },
  // Tier 4 — deeper into the Annex, where the story keeps warning it's
  // watched.
  { id: 'junction_9', x: 1080, y: 325, tier: 4 },
  { id: 'junction_10', x: 1100, y: 480, tier: 4 },
  // Tier 5 — the far edge of the map, the last thing worth the trip, and
  // the only pool the two top-line plans can come out of.
  { id: 'junction_11', x: 1200, y: 180, tier: 5 },
  { id: 'junction_12', x: 1220, y: 600, tier: 5 },
  // The southern spread — same tier logic, placed so the low tiers stay
  // reachable early and the high ones sit where the story already warns
  // about being watched.
  { id: 'junction_13', x: 300, y: 570, tier: 1 },
  { id: 'junction_14', x: 740, y: 490, tier: 2 },
  { id: 'junction_15', x: 1000, y: 560, tier: 3 },
  { id: 'junction_16', x: 500, y: 650, tier: 1 },
  { id: 'junction_17', x: 950, y: 600, tier: 2 },
  { id: 'junction_18', x: 1220, y: 720, tier: 3 },
];
