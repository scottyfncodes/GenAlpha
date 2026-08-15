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
  // Tier 1 — spread through the residential districts and the civic core,
  // the earliest ground a player actually covers: Residential North, West
  // End, Downtown, Transit Hub, South Residential, Riverside Park.
  { id: 'junction_1', x: 150, y: 280, tier: 1 },
  { id: 'junction_2', x: 150, y: 600, tier: 1 },
  { id: 'junction_3', x: 659, y: 172, tier: 1 },
  { id: 'junction_4', x: 240, y: 837, tier: 1 },
  { id: 'junction_5', x: 650, y: 1000, tier: 1 },
  { id: 'junction_6', x: 650, y: 450, tier: 1 },
  // Tier 2 — West End's own working edge, the Commercial Strip, the
  // Warehouse District's Row 1, and Riverside Park's own eastern half.
  { id: 'junction_7', x: 370, y: 600, tier: 2 },
  { id: 'junction_8', x: 1161, y: 1010, tier: 2 },
  { id: 'junction_9', x: 1200, y: 250, tier: 2 },
  { id: 'junction_10', x: 850, y: 600, tier: 2 },
  // Tier 3 — Downtown's own eastern reach, the Warehouse District's far
  // corner, South Residential, and Transit Hub's own south side.
  { id: 'junction_11', x: 902, y: 284, tier: 3 },
  { id: 'junction_12', x: 1450, y: 250, tier: 3 },
  { id: 'junction_13', x: 893, y: 990, tier: 3 },
  { id: 'junction_14', x: 305, y: 961, tier: 3 },
  // Tier 4 — deeper into the Warehouse District and the Commercial Strip,
  // where the story keeps warning it's watched.
  { id: 'junction_15', x: 1250, y: 550, tier: 4 },
  { id: 'junction_16', x: 1450, y: 850, tier: 4 },
  // Tier 5 — the Warehouse District's own far edge, the last thing worth
  // the trip, and the only pool the two top-line plans can come out of.
  { id: 'junction_17', x: 1557, y: 160, tier: 5 },
  { id: 'junction_18', x: 1550, y: 650, tier: 5 },
];
