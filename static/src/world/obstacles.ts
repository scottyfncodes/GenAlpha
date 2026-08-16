/**
 * Generic maze filler. These are scenery, not places — no scene, no blurb, no
 * language, nothing `locationAt` will ever match. They exist purely to turn
 * the town from a scatter of named buildings into a walkable grid dense
 * enough to feel like a maze, per the build note: more corridors, a Pac-Man
 * read to the layout.
 *
 * Drawn as natural terrain and street furniture (trees, bushes, rocks,
 * hedges, chain-link fence, parked cars, bins — see draw.ts), not as unnamed
 * buildings: a wall of scenery with no name and no windows lit read as a
 * mistake, not as a place. `kind` picks which; assigned by each footprint's
 * proportions (tall reads as a tree, wide and flat as a hedge) and by
 * district — the Warehouse District gets fence and rock, the two
 * residential districts get hedge and bush, Riverside Park gets the
 * heaviest tree cover in town — rather than at random, so the town's edges
 * look considered rather than rolled.
 *
 * Tree placement isn't just texture, past the district-flavour pass:
 * `world/draw.ts`'s four `alley`-tier road segments (the district
 * redesign's own shortcuts) each carry a deliberate cluster of trees around
 * them, so `systems/pursuit.ts`'s `underTreeCover()` concealment is real the
 * moment a player actually cuts through one, not just implied by the map
 * looking quieter there.
 *
 * `'building'` is the one exception to "not a building": a background one,
 * deliberately unlit and unlabelled (`draw.ts`'s `drawDecorativeBuilding`
 * paints it in a duller, receding palette) so the town reads as a filled-in
 * place without a background block competing with an actual, interactive
 * location for the player's attention.
 *
 * Coordinates were chosen against `scripts/check-connectivity.mjs` — every
 * open cell reachable from spawn, every named location's doorway reachable —
 * rather than by eye. Re-run it (`node scripts/check-connectivity.mjs`)
 * before touching any of these; a maze that quietly seals off a location is
 * worse than no maze at all.
 */
export type ObstacleKind = 'tree' | 'bush' | 'rock' | 'hedge' | 'fence' | 'car' | 'bin' | 'building' | 'crate' | 'barrel';

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: ObstacleKind;
  /**
   * Absent on everything ordinary — this piece of scenery has always been
   * there. Set only on the handful of fence segments added as the story's
   * `EscalationStage` (see `world/escalation.ts`) climbs, so the town's
   * perimeter security visibly grows over the course of the game rather
   * than sitting at its endgame density from day one.
   */
  minStage?: 1 | 2 | 3;
}

export const OBSTACLES: Obstacle[] = [
  // The 16 fixed hidden-pickup ids (`world/collectibles.ts` `HIDDEN_PICKUPS`
  // names each of these by id, not by position) — spread across every
  // district rather than clustered in one, the same "more variety, spread
  // wide" the pickup table's own comment already asks for.
  { id: 'filler_2', x: 300, y: 147, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_4', x: 52, y: 248, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_10', x: 588, y: 288, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_12', x: 952, y: 288, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_16', x: 768, y: 448, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_45', x: 992, y: 628, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_46', x: 316, y: 448, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_47', x: 52, y: 638, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_48', x: 1242, y: 216, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_49', x: 1537, y: 311, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_50', x: 1318, y: 588, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_51', x: 92, y: 988, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_52', x: 742, y: 838, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_53', x: 942, y: 988, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_54', x: 1274, y: 888, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_55', x: 1492, y: 1018, w: 16, h: 24, kind: 'bush' },

  // The alley shortcuts' own tree cover — West End (Repair Shop <-> Wash &
  // Fold), the Warehouse back cut behind Annex Fence, the Downtown side
  // alley off the plaza. Residential North's own alley (behind Ellen's) is
  // planted separately below, as part of that district's own landscaping
  // pass rather than lumped in here.
  { id: 'filler_1', x: 173, y: 413, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_3', x: 187, y: 469, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_5', x: 1358, y: 451, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_6', x: 1352, y: 396, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_7', x: 799, y: 154, w: 20, h: 40, kind: 'tree' },

  /*
   * Residential North, landscaped rather than scattered. Three things a
   * real block actually has:
   *  - Street trees in a regular rhythm along the main road's own north
   *    verge (y:210-230) — the single strongest "this is a street" signal
   *    a top-down block can give, and the thing the old scatter never did.
   *  - A low yard-front hedge for Home and for Ellen's, each broken by a
   *    gap for the walkway to its own door — a boundary that belongs to a
   *    specific building, not a hedge floating in open grass.
   *  - The Garage's own pair of foundation bushes, and three trees flanking
   *    the open (east) side of the rear alley behind Ellen's — the alley's
   *    west side is the house's own wall, so there's nowhere to plant one
   *    there.
   * Replaces the old filler_8/9/11/13 (alley trees, irregular and two of
   * them actually inside the alley's own walkable width) and filler_14/15/
   * 17/18/19/20/21/22 (hedges and bushes with no relationship to any
   * building) plus filler_23/24/25 (loose trees with no placement logic,
   * despite being grouped under the "Downtown" comment below).
   */
  { id: 'filler_132', x: 20, y: 155, w: 20, h: 40, kind: 'tree' }, // street tree
  { id: 'filler_133', x: 80, y: 155, w: 20, h: 40, kind: 'tree' }, // street tree
  { id: 'filler_134', x: 240, y: 155, w: 20, h: 40, kind: 'tree' }, // street tree
  { id: 'filler_135', x: 260, y: 155, w: 20, h: 40, kind: 'tree' }, // street tree
  { id: 'filler_136', x: 320, y: 155, w: 20, h: 40, kind: 'tree' }, // street tree
  { id: 'filler_137', x: 420, y: 155, w: 20, h: 40, kind: 'tree' }, // street tree
  { id: 'filler_138', x: 365, y: 45, w: 20, h: 40, kind: 'tree' }, // rear alley, east side
  { id: 'filler_139', x: 365, y: 95, w: 20, h: 40, kind: 'tree' }, // rear alley, east side
  { id: 'filler_140', x: 365, y: 145, w: 20, h: 40, kind: 'tree' }, // rear alley, east side
  { id: 'filler_141', x: 40, y: 138, w: 45, h: 8, kind: 'hedge' }, // Home's yard front, left of the walk
  { id: 'filler_142', x: 130, y: 138, w: 40, h: 8, kind: 'hedge' }, // Home's yard front, right of the walk
  { id: 'filler_143', x: 220, y: 142, w: 50, h: 8, kind: 'hedge' }, // Ellen's yard front, left of the walk
  { id: 'filler_144', x: 298, y: 142, w: 48, h: 8, kind: 'hedge' }, // Ellen's yard front, right of the walk
  { id: 'filler_145', x: 126, y: 201, w: 10, h: 8, kind: 'bush' }, // Garage, foundation planting
  { id: 'filler_146', x: 162, y: 201, w: 10, h: 8, kind: 'bush' }, // Garage, foundation planting

  /*
   * Downtown — the civic quad School and Library actually form together,
   * landscaped as one rather than each getting a random handful of trees.
   *  - filler_33 already sat right at School's own south-west corner; it
   *    reads as a real entrance planting once it's mirrored across the
   *    building's own centre line instead of standing alone.
   *  - Library gets the same symmetric pair, flanking the pedimented
   *    entrance its own code comment already calls out as the one building
   *    in town "dressed up to look civic on purpose".
   *  - The old scatter's real problem was the four trees with no logic at
   *    all (filler_26/29/30 bunched loosely on the district's east side,
   *    filler_32 alone on the west) — replaced with two deliberate lines,
   *    east and west, reading as the planted buffer between Downtown and
   *    its neighbours rather than debris.
   * filler_27 (near Marlow Street) and filler_31 (near Town Square) were
   * already close enough to a real building to keep as they were.
   */
  { id: 'filler_33', x: 560, y: 178, w: 22, h: 42, kind: 'tree' }, // School, entrance planting (west)
  { id: 'filler_147', x: 746, y: 165, w: 22, h: 40, kind: 'tree' }, // School, entrance planting (east) — mirrors filler_33
  { id: 'filler_148', x: 826, y: 156, w: 20, h: 40, kind: 'tree' }, // Library, entrance planting (west)
  { id: 'filler_149', x: 942, y: 156, w: 20, h: 40, kind: 'tree' }, // Library, entrance planting (east)
  { id: 'filler_150', x: 535, y: 60, w: 20, h: 40, kind: 'tree' }, // west edge line, toward the Crossroads
  { id: 'filler_151', x: 535, y: 150, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_152', x: 535, y: 240, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_153', x: 1050, y: 60, w: 20, h: 40, kind: 'tree' }, // east edge line, toward the Warehouse District
  { id: 'filler_154', x: 1050, y: 150, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_155', x: 1050, y: 240, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_27', x: 980, y: 265, w: 22, h: 42, kind: 'tree' },
  { id: 'filler_31', x: 809, y: 278, w: 22, h: 42, kind: 'tree' },
  /*
   * The one piece of scenery in town that isn't there from day one — new
   * fencing near the Downtown Crossroads, matching Town Square's own
   * `hunted`-tier ambient line about "two more cameras on the bandstand
   * than there were last week." `minStage` keeps it off the map entirely
   * until the story's actually gone on long enough to earn it (see
   * `world/escalation.ts`).
   */
  { id: 'filler_58', x: 610, y: 316, w: 60, h: 16, kind: 'fence', minStage: 2 },

  // West End — older homes, small shops.
  { id: 'filler_34', x: 340, y: 573, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_35', x: 25, y: 562, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_36', x: 422, y: 564, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_37', x: 200, y: 560, w: 80, h: 18, kind: 'hedge' },
  { id: 'filler_38', x: 76, y: 396, w: 80, h: 18, kind: 'hedge' },
  { id: 'filler_39', x: 384, y: 663, w: 80, h: 18, kind: 'hedge' },
  { id: 'filler_40', x: 185, y: 690, w: 80, h: 18, kind: 'hedge' },
  { id: 'filler_41', x: 55, y: 609, w: 90, h: 18, kind: 'fence' },
  { id: 'filler_42', x: 239, y: 623, w: 90, h: 18, kind: 'fence' },

  // Riverside Park — the heaviest tree cover in town, on purpose: the
  // "open during the day, fewer eyes at night" district needed real canopy
  // to earn that read rather than just saying it.
  { id: 'filler_43', x: 821, y: 681, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_44', x: 569, y: 589, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_56', x: 544, y: 392, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_57', x: 584, y: 396, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_59', x: 542, y: 649, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_61', x: 1039, y: 620, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_63', x: 867, y: 683, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_64', x: 530, y: 549, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_65', x: 737, y: 686, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_66', x: 773, y: 674, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_67', x: 1055, y: 418, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_68', x: 766, y: 632, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_69', x: 541, y: 703, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_71', x: 653, y: 662, w: 26, h: 22, kind: 'rock' },
  { id: 'filler_72', x: 842, y: 639, w: 26, h: 22, kind: 'rock' },
  { id: 'filler_73', x: 989, y: 659, w: 26, h: 22, kind: 'rock' },

  // Warehouse District — the whole east column, fenced and industrial.
  { id: 'filler_74', x: 1320, y: 20, w: 100, h: 18, kind: 'fence' },
  { id: 'filler_75', x: 1148, y: 34, w: 100, h: 18, kind: 'fence' },
  { id: 'filler_76', x: 1373, y: 163, w: 100, h: 18, kind: 'fence' },
  { id: 'filler_77', x: 1148, y: 283, w: 100, h: 18, kind: 'fence' },
  { id: 'filler_78', x: 1171, y: 675, w: 100, h: 18, kind: 'fence' },
  { id: 'filler_79', x: 1148, y: 709, w: 100, h: 18, kind: 'fence' },
  { id: 'filler_80', x: 1515, y: 240, w: 28, h: 24, kind: 'rock' },
  { id: 'filler_81', x: 1543, y: 127, w: 28, h: 24, kind: 'rock' },
  { id: 'filler_82', x: 1556, y: 67, w: 28, h: 24, kind: 'rock' },
  { id: 'filler_83', x: 1264, y: 29, w: 28, h: 24, kind: 'rock' },
  { id: 'filler_84', x: 1540, y: 488, w: 18, h: 12, kind: 'car' },
  { id: 'filler_85', x: 1391, y: 313, w: 18, h: 12, kind: 'car' },
  { id: 'filler_86', x: 1397, y: 223, w: 18, h: 12, kind: 'car' },
  { id: 'filler_87', x: 1438, y: 711, w: 16, h: 16, kind: 'bin' },
  { id: 'filler_88', x: 1470, y: 405, w: 16, h: 16, kind: 'bin' },
  { id: 'filler_89', x: 1476, y: 245, w: 16, h: 16, kind: 'bin' },
  { id: 'filler_90', x: 1163, y: 255, w: 16, h: 16, kind: 'bin' },

  // Warehouse District debris — crates and a barrel scattered near the
  // district's own named yards (deja_jobsite's cable spools, Fenwick Lot's
  // loading bays, the Annex, Rail Spur's boxcar, the Scrapyard), so the
  // ground finally backs up what the district's own ambient text has always
  // claimed about it.
  { id: 'filler_123', x: 1225, y: 200, w: 16, h: 16, kind: 'crate' },
  { id: 'filler_124', x: 1270, y: 230, w: 16, h: 16, kind: 'barrel' },
  { id: 'filler_125', x: 1500, y: 270, w: 16, h: 16, kind: 'crate' },
  { id: 'filler_126', x: 1455, y: 280, w: 16, h: 16, kind: 'crate' },
  { id: 'filler_127', x: 1355, y: 340, w: 16, h: 16, kind: 'barrel' },
  { id: 'filler_128', x: 1325, y: 600, w: 16, h: 16, kind: 'crate' },
  { id: 'filler_129', x: 1325, y: 630, w: 16, h: 16, kind: 'crate' },
  { id: 'filler_130', x: 1545, y: 610, w: 16, h: 16, kind: 'barrel' },
  { id: 'filler_131', x: 1555, y: 700, w: 16, h: 16, kind: 'crate' },

  // Transit Hub — buses, benches, fences around the depot lot.
  { id: 'filler_91', x: 31, y: 796, w: 70, h: 16, kind: 'hedge' },
  { id: 'filler_92', x: 87, y: 1026, w: 70, h: 16, kind: 'hedge' },
  { id: 'filler_93', x: 228, y: 845, w: 70, h: 16, kind: 'hedge' },
  { id: 'filler_94', x: 335, y: 787, w: 18, h: 12, kind: 'car' },
  { id: 'filler_95', x: 292, y: 941, w: 18, h: 12, kind: 'car' },
  { id: 'filler_96', x: 327, y: 1024, w: 18, h: 12, kind: 'car' },
  { id: 'filler_97', x: 263, y: 1051, w: 18, h: 12, kind: 'car' },
  { id: 'filler_98', x: 304, y: 981, w: 90, h: 16, kind: 'fence' },
  { id: 'filler_99', x: 314, y: 1080, w: 90, h: 16, kind: 'fence' },
  { id: 'filler_100', x: 382, y: 876, w: 90, h: 70, kind: 'building' },

  // South Residential — family homes, quieter streets.
  { id: 'filler_101', x: 767, y: 831, w: 80, h: 18, kind: 'hedge' },
  { id: 'filler_102', x: 976, y: 989, w: 80, h: 18, kind: 'hedge' },
  { id: 'filler_103', x: 791, y: 1057, w: 80, h: 18, kind: 'hedge' },
  { id: 'filler_104', x: 839, y: 999, w: 80, h: 18, kind: 'hedge' },
  { id: 'filler_105', x: 1004, y: 821, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_106', x: 673, y: 991, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_107', x: 708, y: 976, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_108', x: 1003, y: 1022, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_109', x: 949, y: 812, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_110', x: 962, y: 1018, w: 16, h: 24, kind: 'bush' },

  // Commercial Strip — storefronts, parking lots.
  { id: 'filler_111', x: 1132, y: 896, w: 18, h: 12, kind: 'car' },
  { id: 'filler_112', x: 1158, y: 1083, w: 18, h: 12, kind: 'car' },
  { id: 'filler_113', x: 1139, y: 1042, w: 18, h: 12, kind: 'car' },
  { id: 'filler_114', x: 1427, y: 821, w: 18, h: 12, kind: 'car' },
  { id: 'filler_115', x: 1468, y: 845, w: 18, h: 12, kind: 'car' },
  { id: 'filler_116', x: 1575, y: 813, w: 16, h: 16, kind: 'bin' },
  { id: 'filler_117', x: 1524, y: 829, w: 16, h: 16, kind: 'bin' },
  { id: 'filler_118', x: 1289, y: 1041, w: 16, h: 16, kind: 'bin' },
  { id: 'filler_119', x: 1526, y: 988, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_120', x: 1139, y: 799, w: 20, h: 40, kind: 'tree' },

  // The map's own edges — a little scenery so the town doesn't feel like
  // it stops at nothing.
  { id: 'filler_121', x: 2, y: 40, w: 20, h: 88, kind: 'hedge' },
  { id: 'filler_122', x: 1578, y: 400, w: 20, h: 200, kind: 'hedge' },
];
