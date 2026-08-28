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
  /*
   * One or two per district, tiered by how far into the map's own
   * gradient the district sits: the residential and commons blocks the
   * player covers first carry Tier 1-2, and the tiers climb with the
   * surveillance density toward the Civic Zone, The Works and Southside's
   * substation — which is also where `world/coverage.ts` re-derives the
   * heaviest camera loads, since a box feeds whichever cameras are
   * physically nearest it.
   */
  // Tier 1 — The Heights, Main Street, Liberty Park and The Blocks: the
  // earliest ground a player actually covers.
  { id: 'junction_1', x: 150, y: 244, tier: 1 },
  { id: 'junction_2', x: 356, y: 300, tier: 1 },
  { id: 'junction_3', x: 660, y: 172, tier: 1 },
  { id: 'junction_4', x: 660, y: 952, tier: 1 },
  { id: 'junction_5', x: 872, y: 952, tier: 1 },
  { id: 'junction_6', x: 696, y: 560, tier: 1 },
  // Tier 2 — Old Market's own working edge, the Plaza's lot, Liberty
  // Park's east side, and the Main Street shopfronts.
  { id: 'junction_7', x: 128, y: 546, tier: 2 },
  { id: 'junction_8', x: 1300, y: 1004, tier: 2 },
  { id: 'junction_9', x: 1064, y: 692, tier: 2 },
  { id: 'junction_10', x: 866, y: 196, tier: 2 },
  // Tier 3 — the Civic Zone's outer edge, The Works' own street, The
  // Blocks' back alleys, and Southside's park-and-ride.
  { id: 'junction_11', x: 1128, y: 240, tier: 3 },
  { id: 'junction_12', x: 1500, y: 552, tier: 3 },
  { id: 'junction_13', x: 704, y: 890, tier: 3 },
  { id: 'junction_14', x: 220, y: 792, tier: 3 },
  // Tier 4 — deeper in: the Data Centre's own fence line, the Annex, and
  // the Plaza's goods-in lane.
  { id: 'junction_15', x: 1408, y: 196, tier: 4 },
  { id: 'junction_16', x: 1408, y: 780, tier: 4 },
  // Tier 5 — the two boxes worth the trip, and the only pool the top-line
  // plans can come out of: the Scrapyard's own corner of The Works, and
  // Substation 9, which is the whole reason Southside has an identity
  // beyond a bus timetable.
  { id: 'junction_17', x: 1552, y: 736, tier: 5 },
  { id: 'junction_18', x: 424, y: 918, tier: 5 },
  /*
   * Added for the GPS line's three build plans — one per tier the plans
   * actually occupy, so `junctionboxes.test.ts`'s own counting argument
   * ("at least as many boxes as plans") still holds. Placed in the three
   * districts that were carrying the thinnest coverage of their own tier:
   * Southside had exactly one box in the whole district; The Heights had
   * none above tier 1; Old Market had one at tier 2 and none at tier 3.
   */
  { id: 'junction_19', x: 60, y: 960, tier: 1 },
  { id: 'junction_20', x: 420, y: 290, tier: 2 },
  { id: 'junction_21', x: 150, y: 510, tier: 3 },
];
