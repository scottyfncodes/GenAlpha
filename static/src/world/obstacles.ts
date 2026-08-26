/**
 * Generic maze filler. These are scenery, not places — no scene, no blurb, no
 * language, nothing `locationAt` will ever match. They exist purely to turn
 * the town from a scatter of named buildings into a walkable grid dense
 * enough to feel like a maze, per the build note: more corridors, a Pac-Man
 * read to the layout.
 *
 * Drawn as natural terrain, street furniture and surveillance hardware
 * (trees, bushes, rocks, hedges, chain-link fence, parked cars, bins,
 * plate scanners, security gates — see draw.ts), not as unnamed buildings:
 * a wall of scenery with no name and no windows lit read as a mistake, not
 * as a place. `kind` picks which; assigned by each footprint's proportions
 * (tall reads as a tree, wide and flat as a hedge) and by district — The
 * Works gets fence, gate and crate, the two residential districts get hedge
 * and bush, Liberty Park gets the heaviest tree cover in town — rather than
 * at random, so the town's edges look considered rather than rolled.
 *
 * Tree placement isn't just texture, past the district-flavour pass:
 * `world/draw.ts`'s `alley`-tier road segments (the 3x3 redesign's own
 * shortcuts, one per built-up district) each carry a deliberate cluster of
 * trees at their mouths, so `systems/pursuit.ts`'s `underTreeCover()`
 * concealment is real the moment a player actually cuts through one, not
 * just implied by the map looking quieter there.
 *
 * `'building'`, `'tower'` and `'billboard'` are the exceptions to "not a
 * building": background scenery, deliberately unlit/unlabelled/uninteractive
 * (`draw.ts`'s `drawDecorativeBuilding`/`drawSafeTraceTower`/`drawBillboard`
 * paint them without a doorway prompt), so the town reads as a filled-in
 * place without competing with an actual, interactive location for the
 * player's attention. Unlike a plain `'building'` filler, the tower and the
 * billboard are each singular, hand-placed district landmarks — one per
 * district, not a repeatable texture — so their id and colour are chosen
 * deliberately rather than by the noise-seeded variety the rest of this file
 * uses.
 *
 * `'bench'`, `'playground'` and `'truck'` are the world-life layer: the
 * three props the district brief names that nothing already here could
 * stand in for. A bench is the cheapest possible "somebody sits here" and
 * turns up wherever people wait (the park, the square, the depot); a
 * playground is Liberty Park's own argument for existing — the commons has
 * to be a place children are taken, not a lawn with a fountain on it; a
 * truck is the vehicle a district works with rather than commutes in, so
 * it reads as a delivery on Main Street, a shipment in The Works and a
 * maintenance crew in Southside without three separate sprites.
 *
 * `'scanner'` and `'gate'` are the surveillance layer the 3x3 redesign adds
 * on top of the camera network (`world/collectibles.ts`). A camera watches
 * a place; a plate scanner watches a *road*, which is why they only ever
 * stand on a verge facing traffic, and why their density climbs toward the
 * Civic Zone the same way the camera table's does. A security gate is the
 * thing a scanner is usually protecting — and every gate on this map has a
 * way past it within a few metres (a fence gap, a service alley, an
 * unwatched back corner), because a route the player cannot take is set
 * dressing, not a route.
 *
 * Coordinates were chosen against `scripts/check-connectivity.mjs` — every
 * open cell reachable from spawn, every named location's doorway reachable —
 * rather than by eye. Re-run it (`npx tsx scripts/check-connectivity.mjs`)
 * before touching any of these; a maze that quietly seals off a location is
 * worse than no maze at all.
 */
export type ObstacleKind =
  | 'tree'
  | 'bush'
  | 'rock'
  | 'hedge'
  | 'fence'
  | 'car'
  | 'bin'
  | 'building'
  | 'crate'
  | 'barrel'
  | 'tower'
  | 'billboard'
  | 'scanner'
  | 'gate'
  | 'bench'
  | 'playground'
  | 'truck';

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: ObstacleKind;
  /**
   * Absent on everything ordinary — this piece of scenery has always been
   * there. Set only on the handful of fence and scanner pieces added as the
   * story's `EscalationStage` (see `world/escalation.ts`) climbs, so the
   * town's perimeter security visibly grows over the course of the game
   * rather than sitting at its endgame density from day one.
   */
  minStage?: 1 | 2 | 3;
}

export const OBSTACLES: Obstacle[] = [
  /* ================================================================ *
   * The 16 fixed hidden-pickup ids (`world/collectibles.ts`
   * `HIDDEN_PICKUPS` names each of these by id, not by position) —
   * spread across all nine districts rather than clustered in one, the
   * same "more variety, spread wide" the pickup table's own comment
   * already asks for. Every one is quietly excluded from collision, so
   * these are the only bushes on the map a player can walk into.
   * ================================================================ */
  { id: 'filler_2', x: 296, y: 252, w: 16, h: 24, kind: 'bush' }, // 1. The Heights
  { id: 'filler_4', x: 52, y: 300, w: 16, h: 24, kind: 'bush' }, // 1. The Heights
  { id: 'filler_10', x: 592, y: 320, w: 16, h: 24, kind: 'bush' }, // 2. Main Street
  { id: 'filler_12', x: 1000, y: 300, w: 16, h: 24, kind: 'bush' }, // 2. Main Street
  { id: 'filler_48', x: 1440, y: 196, w: 16, h: 24, kind: 'bush' }, // 3. Civic Zone
  { id: 'filler_46', x: 372, y: 610, w: 16, h: 24, kind: 'bush' }, // 4. Old Market
  { id: 'filler_47', x: 200, y: 700, w: 16, h: 24, kind: 'bush' }, // 4. Old Market
  { id: 'filler_16', x: 640, y: 592, w: 16, h: 24, kind: 'bush' }, // 5. Liberty Park
  { id: 'filler_45', x: 1030, y: 656, w: 16, h: 24, kind: 'bush' }, // 5. Liberty Park
  { id: 'filler_49', x: 1560, y: 700, w: 16, h: 24, kind: 'bush' }, // 6. The Works
  { id: 'filler_50', x: 1200, y: 700, w: 16, h: 24, kind: 'bush' }, // 6. The Works
  { id: 'filler_51', x: 92, y: 1000, w: 16, h: 24, kind: 'bush' }, // 7. Southside
  { id: 'filler_52', x: 620, y: 1000, w: 16, h: 24, kind: 'bush' }, // 8. The Blocks
  { id: 'filler_53', x: 940, y: 1000, w: 16, h: 24, kind: 'bush' }, // 8. The Blocks
  { id: 'filler_54', x: 1148, y: 1064, w: 16, h: 24, kind: 'bush' }, // 9. The Plaza
  { id: 'filler_55', x: 1560, y: 1000, w: 16, h: 24, kind: 'bush' }, // 9. The Plaza

  /* ================================================================ *
   * 1. THE HEIGHTS — landscaped rather than scattered. Three things a
   * real block actually has:
   *  - Street trees in a regular rhythm along the district street's own
   *    north verge — the single strongest "this is a street" signal a
   *    top-down block can give.
   *  - A low yard-front hedge for Home and for Ellen's, each broken by a
   *    gap for the walkway to its own door — a boundary that belongs to a
   *    specific building, not a hedge floating in open grass.
   *  - The Garage's own pair of foundation bushes, and three trees
   *    flanking the open (east) side of the rear alley behind Ellen's —
   *    the alley's west side is the house's own wall, so there's nowhere
   *    to plant one there.
   * Not a single camera on this block at stage 0, by design: it is the
   * one district the surveillance gradient starts from.
   * ================================================================ */
  { id: 'filler_132', x: 20, y: 160, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_133', x: 80, y: 160, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_134', x: 240, y: 160, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_135', x: 288, y: 160, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_136', x: 320, y: 160, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_137', x: 424, y: 160, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_138', x: 364, y: 46, w: 20, h: 40, kind: 'tree' }, // rear alley, east side
  { id: 'filler_139', x: 364, y: 96, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_140', x: 364, y: 146, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_141', x: 40, y: 140, w: 45, h: 8, kind: 'hedge' }, // Home's yard front, left of the walk
  { id: 'filler_142', x: 130, y: 140, w: 40, h: 8, kind: 'hedge' }, // Home's yard front, right of the walk
  { id: 'filler_143', x: 220, y: 144, w: 50, h: 8, kind: 'hedge' }, // Ellen's yard front, left of the walk
  { id: 'filler_144', x: 298, y: 144, w: 48, h: 8, kind: 'hedge' }, // Ellen's yard front, right of the walk
  { id: 'filler_145', x: 126, y: 202, w: 10, h: 8, kind: 'bush' }, // Garage, foundation planting
  { id: 'filler_146', x: 162, y: 202, w: 10, h: 8, kind: 'bush' },
  // The south half of the block: two more houses nobody in the story has
  // ever knocked on, a shared hedge line between their yards, and the
  // residents' own parked cars on the district street.
  { id: 'heights_house_a', x: 36, y: 254, w: 104, h: 72, kind: 'building' },
  { id: 'heights_house_b', x: 196, y: 254, w: 108, h: 72, kind: 'building' },
  { id: 'heights_hedge_a', x: 152, y: 258, w: 8, h: 64, kind: 'hedge' },
  { id: 'heights_hedge_b', x: 320, y: 258, w: 8, h: 64, kind: 'hedge' },
  { id: 'heights_car_1', x: 200, y: 234, w: 18, h: 12, kind: 'car' },
  { id: 'heights_car_2', x: 232, y: 234, w: 18, h: 12, kind: 'car' },
  { id: 'heights_car_3', x: 356, y: 234, w: 18, h: 12, kind: 'car' },
  { id: 'heights_bin_1', x: 186, y: 190, w: 16, h: 16, kind: 'bin' },

  /* ================================================================ *
   * 2. MAIN STREET — the town's shopfront. The civic quad the School and
   * Library used to form together is gone (the Library moved to the Civic
   * Zone); what's left is a high street, so the logic here is frontage
   * furniture — planters, bike parking, bins in the service alley, cars
   * nose-in along the kerb — rather than the planted buffers a civic
   * campus wanted.
   * ================================================================ */
  { id: 'filler_33', x: 534, y: 60, w: 22, h: 42, kind: 'tree' }, // School, entrance planting (west)
  { id: 'filler_147', x: 534, y: 112, w: 22, h: 42, kind: 'tree' },
  { id: 'filler_150', x: 940, y: 20, w: 20, h: 40, kind: 'tree' }, // between the market and the café
  { id: 'filler_151', x: 806, y: 130, w: 20, h: 40, kind: 'tree' }, // the alley's south mouth, market side
  { id: 'filler_152', x: 1064, y: 44, w: 18, h: 36, kind: 'tree' }, // the alley's south mouth, school side
  { id: 'main_bin_1', x: 786, y: 40, w: 16, h: 16, kind: 'bin' }, // the alley itself — the shops' bins
  { id: 'main_bin_2', x: 786, y: 62, w: 16, h: 16, kind: 'bin' },
  { id: 'main_car_1', x: 580, y: 204, w: 18, h: 12, kind: 'car' },
  { id: 'main_car_2', x: 790, y: 210, w: 18, h: 12, kind: 'car' },
  { id: 'main_car_3', x: 828, y: 204, w: 18, h: 12, kind: 'car' },
  { id: 'main_car_4', x: 980, y: 204, w: 18, h: 12, kind: 'car' },
  { id: 'main_car_5', x: 1012, y: 204, w: 18, h: 12, kind: 'car' },
  { id: 'main_hedge_1', x: 966, y: 128, w: 94, h: 8, kind: 'hedge' },
  { id: 'main_truck_1', x: 980, y: 150, w: 40, h: 22, kind: 'truck' }, // a delivery at the market's back
  { id: 'main_bench_1', x: 690, y: 168, w: 22, h: 8, kind: 'bench' },
  { id: 'main_bench_2', x: 736, y: 320, w: 22, h: 8, kind: 'bench' }, // the café's own terrace boundary
  { id: 'filler_27', x: 990, y: 226, w: 22, h: 42, kind: 'tree' },
  { id: 'filler_31', x: 836, y: 292, w: 22, h: 42, kind: 'tree' },
  // Main Street's own block-corner unit, unlit and unnamed — the shutter
  // Town Square's `trustAmbient` line is talking about is Marlow Street's;
  // this is the one further down that nobody has opened.
  { id: 'main_unit_a', x: 546, y: 226, w: 52, h: 84, kind: 'building' },
  { id: 'main_unit_b', x: 986, y: 282, w: 74, h: 52, kind: 'building' },
  /*
   * The one piece of scenery in town that isn't there from day one — new
   * fencing at the Downtown Crossroads, matching Town Square's own
   * `hunted`-tier ambient line about "two more cameras on the bandstand
   * than there were last week." `minStage` keeps it off the map entirely
   * until the story's actually gone on long enough to earn it.
   */
  { id: 'filler_58', x: 664, y: 316, w: 60, h: 16, kind: 'fence', minStage: 2 },
  // Plate scanners on the Crossroads' own approaches. Two at stage 0 —
  // the busiest corner in town already reads every plate that crosses it —
  // and a third that goes up as the rollout advances.
  { id: 'scanner_crossroads_n', x: 466, y: 300, w: 10, h: 16, kind: 'scanner' },
  { id: 'scanner_crossroads_s', x: 528, y: 296, w: 10, h: 16, kind: 'scanner' },
  { id: 'scanner_main_street', x: 866, y: 164, w: 10, h: 16, kind: 'scanner', minStage: 2 },

  /* ================================================================ *
   * 3. CIVIC ZONE — the densest surveillance on the map, and the only
   * district where the hardware is the landscaping. A fenced compound
   * around the Data Centre with one gated vehicle entrance (and one gap
   * in the fence line at its north-east corner that nobody has fixed),
   * clipped municipal hedging in front of City Hall, plate scanners on
   * both approaches to the block, and the SafeTrace Tower standing in the
   * gap between the two — the coldest silhouette in Bellhaven, moved here
   * from Downtown because this is the district it was always describing.
   * ================================================================ */
  { id: 'safetrace_tower', x: 1336, y: 8, w: 50, h: 168, kind: 'tower' },
  { id: 'civic_hedge_w', x: 1132, y: 44, w: 8, h: 120, kind: 'hedge' }, // City Hall, clipped municipal border
  { id: 'civic_hedge_s', x: 1150, y: 172, w: 76, h: 8, kind: 'hedge' }, // broken by the walk up the steps
  { id: 'civic_hedge_s2', x: 1256, y: 172, w: 74, h: 8, kind: 'hedge' },
  { id: 'civic_tree_1', x: 1160, y: 0, w: 18, h: 20, kind: 'tree' },
  { id: 'civic_tree_2', x: 1296, y: 0, w: 18, h: 20, kind: 'tree' },
  // The Data Centre's compound: a fence on three sides, a vehicle gate on
  // the fourth, and a deliberate gap at the north-east corner.
  { id: 'civic_fence_w', x: 1390, y: 26, w: 8, h: 140, kind: 'fence' },
  { id: 'civic_fence_n', x: 1402, y: 22, w: 120, h: 8, kind: 'fence' },
  { id: 'civic_fence_e', x: 1584, y: 26, w: 8, h: 96, kind: 'fence' },
  { id: 'civic_gate', x: 1420, y: 164, w: 46, h: 12, kind: 'gate' },
  { id: 'civic_fence_s', x: 1500, y: 164, w: 82, h: 8, kind: 'fence' },
  { id: 'civic_bollard', x: 1400, y: 164, w: 12, h: 12, kind: 'rock' },
  // The service cut between the Library and the Records Office — the one
  // route through this block that isn't overlooked, planted at both ends
  // so cutting through it is real cover and not just a narrower street.
  { id: 'civic_alley_tree_n', x: 1318, y: 250, w: 14, h: 34, kind: 'tree' },
  { id: 'civic_alley_tree_s', x: 1362, y: 250, w: 14, h: 34, kind: 'tree' },
  { id: 'civic_bin_1', x: 1338, y: 260, w: 16, h: 16, kind: 'bin' },
  { id: 'civic_bin_2', x: 1338, y: 284, w: 16, h: 16, kind: 'bin' },
  // Plate scanners: four here at stage 0, more than the rest of the map
  // put together, on every approach to the block.
  { id: 'scanner_civic_w', x: 1120, y: 160, w: 10, h: 16, kind: 'scanner' },
  { id: 'scanner_civic_e', x: 1588, y: 204, w: 10, h: 16, kind: 'scanner' },
  { id: 'scanner_civic_hall', x: 1234, y: 168, w: 8, h: 12, kind: 'scanner' },
  { id: 'scanner_civic_gate', x: 1470, y: 166, w: 10, h: 16, kind: 'scanner' },
  { id: 'scanner_civic_s', x: 1348, y: 326, w: 10, h: 16, kind: 'scanner', minStage: 1 },
  { id: 'civic_car_1', x: 1200, y: 330, w: 18, h: 12, kind: 'car' },
  { id: 'civic_car_2', x: 1240, y: 330, w: 18, h: 12, kind: 'car' },
  { id: 'civic_car_3', x: 1440, y: 330, w: 18, h: 12, kind: 'car' },

  /* ================================================================ *
   * 4. OLD MARKET — the strip. The four frontages sit flush against
   * their own street with no front yards, the way older-neighbourhood
   * shopfronts actually do, so the logic here isn't yard hedging: it's
   * the service yard behind the row, the bins and crates the market
   * table runs out of, and street trees filling the real open frontage
   * at either end of the row. The cut-through between the Repair Shop
   * and Wash & Fold is planted at both mouths — this is the district
   * whose whole identity is the back way.
   * ================================================================ */
  { id: 'filler_1', x: 276, y: 400, w: 14, h: 34, kind: 'tree' }, // alley mouth, repair-shop side
  { id: 'filler_3', x: 320, y: 400, w: 14, h: 34, kind: 'tree' }, // alley mouth, laundromat side
  { id: 'filler_5', x: 276, y: 530, w: 16, h: 36, kind: 'tree' }, // alley's south mouth
  { id: 'filler_6', x: 320, y: 530, w: 16, h: 36, kind: 'tree' },
  { id: 'filler_156', x: 4, y: 486, w: 20, h: 40, kind: 'tree' }, // street tree, west end of the row
  { id: 'filler_157', x: 440, y: 420, w: 20, h: 40, kind: 'tree' }, // street tree, east end of the row
  { id: 'filler_158', x: 440, y: 476, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_160', x: 148, y: 392, w: 126, h: 8, kind: 'fence' }, // Repair Shop, service-yard fence
  { id: 'filler_162', x: 336, y: 394, w: 92, h: 8, kind: 'hedge' }, // Wash & Fold, back hedge
  { id: 'market_bin_1', x: 200, y: 574, w: 16, h: 16, kind: 'bin' }, // the lot's own three bins
  { id: 'market_bin_2', x: 200, y: 598, w: 16, h: 16, kind: 'bin' },
  { id: 'market_bin_3', x: 200, y: 622, w: 16, h: 16, kind: 'bin' },
  { id: 'market_crate_1', x: 360, y: 570, w: 16, h: 16, kind: 'crate' },
  { id: 'market_crate_2', x: 384, y: 570, w: 16, h: 16, kind: 'crate' },
  { id: 'market_crate_3', x: 360, y: 592, w: 16, h: 16, kind: 'crate' },
  { id: 'market_barrel_1', x: 408, y: 578, w: 16, h: 16, kind: 'barrel' },
  { id: 'market_car_1', x: 60, y: 534, w: 18, h: 12, kind: 'car' },
  { id: 'market_car_2', x: 92, y: 534, w: 18, h: 12, kind: 'car' },
  { id: 'market_car_3', x: 360, y: 534, w: 18, h: 12, kind: 'car' },
  { id: 'market_fence_lot', x: 24, y: 684, w: 168, h: 8, kind: 'fence' }, // the lot's south boundary
  { id: 'market_gate_lot', x: 200, y: 684, w: 44, h: 12, kind: 'gate' }, // …and the gate everybody walks around
  { id: 'market_unit_a', x: 24, y: 700, w: 96, h: 34, kind: 'building' },
  { id: 'market_unit_b', x: 380, y: 656, w: 88, h: 74, kind: 'building' },
  { id: 'scanner_market', x: 452, y: 528, w: 10, h: 16, kind: 'scanner', minStage: 1 },

  /* ================================================================ *
   * 5. LIBERTY PARK — the heaviest tree cover in town, on purpose: the
   * "open during the day, fewer eyes at night" district needs real canopy
   * to earn that read rather than just saying it, and it is the one block
   * the surveillance gradient deliberately falls away toward. The Green
   * carries its own full landscaping (see `drawGreen`, including the
   * fountain and the banner); everything here is the ground around it.
   * ================================================================ */
  { id: 'filler_43', x: 828, y: 690, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_44', x: 548, y: 556, w: 24, h: 44, kind: 'tree' }, // Ballpark, south-west shade tree
  { id: 'filler_183', x: 652, y: 556, w: 24, h: 44, kind: 'tree' }, // Ballpark, south-east shade tree — mirrors filler_44
  { id: 'filler_56', x: 542, y: 388, w: 22, h: 34, kind: 'tree' },
  { id: 'filler_57', x: 596, y: 388, w: 22, h: 34, kind: 'tree' },
  { id: 'filler_59', x: 540, y: 668, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_61', x: 1032, y: 620, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_63', x: 852, y: 688, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_64', x: 1032, y: 412, w: 24, h: 44, kind: 'tree' },
  { id: 'park_tree_1', x: 1032, y: 480, w: 24, h: 44, kind: 'tree' },
  { id: 'park_tree_2', x: 988, y: 700, w: 24, h: 40, kind: 'tree' },
  { id: 'park_tree_3', x: 700, y: 692, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_65', x: 744, y: 690, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_66', x: 796, y: 664, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_67', x: 1040, y: 556, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_68', x: 556, y: 600, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_69', x: 556, y: 720, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_71', x: 700, y: 640, w: 26, h: 22, kind: 'rock' },
  { id: 'filler_72', x: 856, y: 632, w: 26, h: 22, kind: 'rock' },
  { id: 'filler_73', x: 1044, y: 700, w: 26, h: 22, kind: 'rock' },
  { id: 'park_bench_hedge', x: 706, y: 612, w: 74, h: 8, kind: 'hedge' },
  { id: 'park_bin_1', x: 866, y: 608, w: 16, h: 16, kind: 'bin' },
  /*
   * The playground, and the reason this district is called the commons
   * rather than the lawn: Liberty Park only argues against the Civic Zone
   * if it is somewhere people bring children. Sited on the open ground
   * between the Ballpark and the Treehouse, off the Green's own formal
   * axis — a park's play area is never on the ornamental garden's
   * centreline, it's round the side where the noise doesn't matter.
   */
  { id: 'park_playground', x: 596, y: 626, w: 76, h: 48, kind: 'playground' },
  { id: 'park_bench_1', x: 700, y: 604, w: 22, h: 8, kind: 'bench' },
  { id: 'park_bench_2', x: 830, y: 604, w: 22, h: 8, kind: 'bench' },
  { id: 'park_bench_3', x: 770, y: 704, w: 22, h: 8, kind: 'bench' },
  { id: 'park_bench_4', x: 1064, y: 612, w: 8, h: 22, kind: 'bench' },
  { id: 'park_bin_2', x: 676, y: 690, w: 16, h: 16, kind: 'bin' },
  { id: 'park_bin_3', x: 1006, y: 604, w: 16, h: 16, kind: 'bin' },

  /* ================================================================ *
   * 6. THE WORKS — fenced and industrial, the one district where the
   * fence line is the point. Every yard here has a boundary and every
   * boundary has a way through it: a gate that is bolted, a gate that
   * isn't, and the gap in the Annex fence line the story has been
   * talking about since Act 1. Debris (crates, barrels, spools) backs up
   * what the district's own ambient text has always claimed about it.
   * ================================================================ */
  { id: 'filler_74', x: 1148, y: 386, w: 120, h: 10, kind: 'fence' },
  { id: 'filler_75', x: 1308, y: 386, w: 114, h: 10, kind: 'fence' },
  { id: 'works_gate_n', x: 1440, y: 386, w: 46, h: 12, kind: 'gate' },
  { id: 'filler_76', x: 1502, y: 386, w: 90, h: 10, kind: 'fence' },
  { id: 'filler_77', x: 1520, y: 400, w: 8, h: 100, kind: 'fence' }, // the Annex fence line itself…
  { id: 'filler_78', x: 1520, y: 552, w: 8, h: 66, kind: 'fence' }, // …with the gap the story keeps re-opening
  { id: 'filler_79', x: 1148, y: 700, w: 130, h: 12, kind: 'fence', minStage: 1 },
  { id: 'works_gate_scrap', x: 1342, y: 700, w: 46, h: 14, kind: 'gate' },
  { id: 'filler_80', x: 1552, y: 556, w: 28, h: 24, kind: 'rock' },
  { id: 'filler_81', x: 1552, y: 500, w: 28, h: 24, kind: 'rock' },
  { id: 'filler_83', x: 1552, y: 660, w: 28, h: 24, kind: 'rock' },
  { id: 'filler_84', x: 1552, y: 640, w: 18, h: 12, kind: 'car' },
  { id: 'filler_85', x: 1150, y: 548, w: 18, h: 12, kind: 'car' },
  { id: 'filler_86', x: 1250, y: 548, w: 18, h: 12, kind: 'car' },
  { id: 'filler_87', x: 1420, y: 548, w: 16, h: 16, kind: 'bin' },
  { id: 'filler_88', x: 1444, y: 548, w: 16, h: 16, kind: 'bin' },
  { id: 'filler_89', x: 1468, y: 548, w: 16, h: 16, kind: 'bin' },
  { id: 'filler_90', x: 1288, y: 712, w: 16, h: 16, kind: 'bin' },
  { id: 'filler_123', x: 1268, y: 560, w: 16, h: 16, kind: 'crate' },
  { id: 'filler_124', x: 1240, y: 560, w: 16, h: 16, kind: 'barrel' },
  { id: 'filler_125', x: 1348, y: 546, w: 16, h: 16, kind: 'crate' },
  { id: 'filler_126', x: 1372, y: 546, w: 16, h: 16, kind: 'crate' },
  { id: 'filler_127', x: 1396, y: 546, w: 16, h: 16, kind: 'barrel' },
  { id: 'filler_128', x: 1552, y: 600, w: 16, h: 16, kind: 'crate' },
  { id: 'filler_129', x: 1552, y: 700, w: 16, h: 16, kind: 'crate' },
  { id: 'filler_130', x: 1544, y: 620, w: 16, h: 16, kind: 'barrel' },
  { id: 'filler_131', x: 1496, y: 700, w: 16, h: 16, kind: 'crate' },
  // Employee parking along the district street, and the trucks the docks
  // exist for — backed onto the Utility Yard's and the Scrapyard's own
  // aprons rather than parked decoratively in open ground.
  { id: 'works_truck_1', x: 1200, y: 548, w: 40, h: 22, kind: 'truck' },
  { id: 'works_truck_2', x: 1430, y: 700, w: 40, h: 22, kind: 'truck' },
  { id: 'works_pallet_1', x: 1290, y: 428, w: 16, h: 16, kind: 'crate' },
  { id: 'works_pallet_2', x: 1290, y: 450, w: 16, h: 16, kind: 'crate' },
  { id: 'works_pallet_3', x: 1290, y: 660, w: 16, h: 16, kind: 'crate' },
  { id: 'works_alley_tree_n', x: 1290, y: 392, w: 16, h: 32, kind: 'tree' },
  { id: 'works_alley_tree_s', x: 1290, y: 616, w: 16, h: 32, kind: 'tree' },
  { id: 'scanner_works_gate', x: 1330, y: 398, w: 10, h: 16, kind: 'scanner' },
  { id: 'scanner_works_row', x: 1130, y: 548, w: 10, h: 16, kind: 'scanner', minStage: 1 },

  /* ================================================================ *
   * 7. SOUTHSIDE — a park-and-ride and a substation, not a
   * neighbourhood: the depot's own platform and shelter (drawn by
   * `drawTransit`) and the transformer yard are the whole point, so the
   * logic here is a boundary hedge behind the depot, an actual parking
   * row beside it, and a real fenced compound around the substation with
   * a gate on the lane. South of the district street, a couple of
   * service units and the lot boundary the map has always had.
   * ================================================================ */
  { id: 'filler_164', x: 40, y: 816, w: 160, h: 8, kind: 'hedge' }, // Bus Depot, north boundary
  { id: 'filler_165', x: 244, y: 940, w: 18, h: 12, kind: 'car' }, // park-and-ride row
  { id: 'filler_166', x: 276, y: 940, w: 18, h: 12, kind: 'car' },
  { id: 'filler_167', x: 308, y: 940, w: 18, h: 12, kind: 'car' },
  { id: 'filler_168', x: 340, y: 940, w: 18, h: 12, kind: 'car' },
  { id: 'sub_fence_n', x: 250, y: 808, w: 158, h: 8, kind: 'fence' },
  { id: 'sub_fence_w', x: 242, y: 808, w: 8, h: 90, kind: 'fence' },
  { id: 'sub_fence_e', x: 408, y: 808, w: 8, h: 90, kind: 'fence' },
  { id: 'sub_gate', x: 244, y: 922, w: 44, h: 12, kind: 'gate' },
  { id: 'sub_fence_s1', x: 296, y: 922, w: 50, h: 8, kind: 'fence' },
  { id: 'sub_fence_s2', x: 356, y: 922, w: 52, h: 8, kind: 'fence' },
  // The maintenance fleet — the vehicles that keep the transit and utility
  // systems running, which is the half of this district's identity a bus
  // depot on its own never carried.
  { id: 'southside_truck_1', x: 236, y: 968, w: 40, h: 22, kind: 'truck' },
  { id: 'southside_truck_2', x: 300, y: 992, w: 22, h: 40, kind: 'truck' },
  { id: 'southside_bench_1', x: 210, y: 856, w: 8, h: 22, kind: 'bench' },
  { id: 'sub_barrel_1', x: 420, y: 850, w: 16, h: 16, kind: 'barrel' },
  { id: 'sub_crate_1', x: 420, y: 874, w: 16, h: 16, kind: 'crate' },
  { id: 'filler_98', x: 60, y: 990, w: 120, h: 16, kind: 'fence' },
  { id: 'filler_99', x: 314, y: 1064, w: 90, h: 16, kind: 'fence' },
  { id: 'filler_100', x: 200, y: 992, w: 92, h: 72, kind: 'building' },
  { id: 'southside_unit_a', x: 20, y: 1020, w: 110, h: 62, kind: 'building' },
  { id: 'southside_tree_1', x: 428, y: 800, w: 20, h: 40, kind: 'tree' },
  { id: 'southside_tree_2', x: 428, y: 968, w: 20, h: 40, kind: 'tree' },
  { id: 'southside_bin_1', x: 210, y: 800, w: 16, h: 16, kind: 'bin' },
  { id: 'scanner_depot', x: 24, y: 968, w: 10, h: 16, kind: 'scanner', minStage: 2 },

  /* ================================================================ *
   * 8. THE BLOCKS — three named houses along the north side and a
   * terrace of unnamed ones along the south, with two back alleys
   * between them: the only district on the map where the shortcut runs
   * through where people actually live, which is exactly why it's the
   * one the story keeps saying is worth protecting. Front hedging, bins
   * out on collection day, and residents' cars along the kerb.
   * ================================================================ */
  { id: 'filler_169', x: 556, y: 816, w: 8, h: 86, kind: 'hedge' }, // Casey's, west side yard
  { id: 'blocks_hedge_1', x: 566, y: 908, w: 118, h: 8, kind: 'hedge' },
  { id: 'blocks_hedge_2', x: 726, y: 908, w: 120, h: 8, kind: 'hedge' },
  { id: 'blocks_hedge_3', x: 888, y: 908, w: 144, h: 8, kind: 'hedge' },
  { id: 'filler_170', x: 528, y: 830, w: 20, h: 40, kind: 'tree' }, // street tree, west of Casey's
  { id: 'filler_171', x: 1040, y: 830, w: 20, h: 40, kind: 'tree' }, // street tree, east of Kestrel Row
  { id: 'filler_172', x: 560, y: 968, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_173', x: 940, y: 962, w: 20, h: 36, kind: 'tree' },
  { id: 'filler_174', x: 1040, y: 956, w: 20, h: 36, kind: 'tree' },
  { id: 'blocks_bin_1', x: 696, y: 800, w: 16, h: 16, kind: 'bin' }, // the alleys' own bins
  { id: 'blocks_bin_2', x: 696, y: 824, w: 16, h: 16, kind: 'bin' },
  { id: 'blocks_bin_3', x: 858, y: 800, w: 16, h: 16, kind: 'bin' },
  { id: 'blocks_car_1', x: 590, y: 944, w: 18, h: 12, kind: 'car' },
  { id: 'blocks_car_2', x: 622, y: 944, w: 18, h: 12, kind: 'car' },
  { id: 'blocks_car_3', x: 760, y: 944, w: 18, h: 12, kind: 'car' },
  { id: 'blocks_car_4', x: 920, y: 944, w: 18, h: 12, kind: 'car' },
  { id: 'blocks_car_5', x: 952, y: 944, w: 18, h: 12, kind: 'car' },
  { id: 'blocks_terrace_s1', x: 640, y: 1000, w: 150, h: 74, kind: 'building' },
  { id: 'blocks_terrace_s2', x: 812, y: 1000, w: 110, h: 74, kind: 'building' },
  { id: 'blocks_terrace_s3', x: 976, y: 1000, w: 88, h: 74, kind: 'building' },

  /* ================================================================ *
   * 9. THE PLAZA — a retail park, which means the ground plan is mostly
   * parking. Two rows either side of the lot spine, a cart corral, the
   * goods-in lane behind MegaMart, and the billboard: the loudest single
   * object in Bellhaven, kept in the one clean run of open ground along
   * the district's south edge that's actually wide enough for it.
   * ================================================================ */
  { id: 'plaza_car_1', x: 1200, y: 790, w: 18, h: 12, kind: 'car' },
  { id: 'plaza_car_2', x: 1232, y: 790, w: 18, h: 12, kind: 'car' },
  { id: 'plaza_car_3', x: 1264, y: 790, w: 18, h: 12, kind: 'car' },
  { id: 'plaza_car_4', x: 1318, y: 790, w: 18, h: 12, kind: 'car' },
  { id: 'plaza_car_5', x: 1350, y: 790, w: 18, h: 12, kind: 'car' },
  { id: 'plaza_car_6', x: 1382, y: 790, w: 18, h: 12, kind: 'car' },
  { id: 'filler_175', x: 1180, y: 906, w: 18, h: 12, kind: 'car' }, // Sal's frontage
  { id: 'filler_176', x: 1212, y: 906, w: 18, h: 12, kind: 'car' },
  { id: 'filler_177', x: 1320, y: 906, w: 18, h: 12, kind: 'car' }, // the Arcade's frontage
  { id: 'filler_178', x: 1352, y: 906, w: 18, h: 12, kind: 'car' },
  { id: 'filler_179', x: 1180, y: 944, w: 18, h: 12, kind: 'car' }, // Convenience Store frontage
  { id: 'filler_180', x: 1212, y: 944, w: 18, h: 12, kind: 'car' },
  { id: 'filler_181', x: 1330, y: 944, w: 18, h: 12, kind: 'car' }, // Pharmacy frontage
  { id: 'filler_182', x: 1362, y: 944, w: 18, h: 12, kind: 'car' },
  { id: 'plaza_car_7', x: 1496, y: 944, w: 18, h: 12, kind: 'car' },
  { id: 'plaza_car_8', x: 1514, y: 944, w: 18, h: 12, kind: 'car' },
  { id: 'plaza_corral', x: 1440, y: 952, w: 40, h: 10, kind: 'fence' }, // the cart corral
  { id: 'plaza_truck_1', x: 1470, y: 782, w: 40, h: 22, kind: 'truck' }, // MegaMart, goods in
  { id: 'filler_116', x: 1424, y: 786, w: 16, h: 16, kind: 'bin' },
  { id: 'filler_117', x: 1448, y: 786, w: 16, h: 16, kind: 'bin' }, // MegaMart's goods-in bins
  { id: 'filler_118', x: 1290, y: 1074, w: 16, h: 16, kind: 'bin' },
  { id: 'filler_119', x: 1540, y: 976, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_120', x: 1140, y: 800, w: 20, h: 40, kind: 'tree' },
  { id: 'plaza_tree_1', x: 1140, y: 1000, w: 20, h: 40, kind: 'tree' },
  { id: 'plaza_hedge_1', x: 1170, y: 1046, w: 108, h: 8, kind: 'hedge' },
  { id: 'commercial_billboard', x: 1330, y: 1044, w: 130, h: 50, kind: 'billboard' },
  { id: 'scanner_plaza_lot', x: 1288, y: 780, w: 10, h: 16, kind: 'scanner' },
  { id: 'scanner_plaza_mart', x: 1594, y: 900, w: 10, h: 16, kind: 'scanner', minStage: 1 },

  // The map's own edges — a little scenery so the town doesn't feel like
  // it stops at nothing.
  { id: 'filler_121', x: 2, y: 40, w: 20, h: 88, kind: 'hedge' },
  { id: 'filler_122', x: 1584, y: 600, w: 14, h: 120, kind: 'hedge' },
];
