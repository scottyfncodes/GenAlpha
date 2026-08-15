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

  // The four alley shortcuts' own tree cover — West End (Repair Shop <->
  // Wash & Fold), the Warehouse back cut behind Annex Fence, the Downtown
  // side alley off the plaza, and Residential North's rear yards.
  { id: 'filler_1', x: 173, y: 413, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_3', x: 187, y: 469, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_5', x: 1358, y: 451, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_6', x: 1352, y: 396, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_7', x: 799, y: 154, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_8', x: 358, y: 101, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_9', x: 368, y: 35, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_11', x: 332, y: 161, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_13', x: 363, y: 148, w: 20, h: 40, kind: 'tree' },

  // Residential North — hedges and trees framing home, the Garage, Ellen's.
  { id: 'filler_14', x: 235, y: 272, w: 90, h: 20, kind: 'hedge' },
  { id: 'filler_15', x: 190, y: 159, w: 90, h: 20, kind: 'hedge' },
  { id: 'filler_17', x: 214, y: 246, w: 90, h: 20, kind: 'hedge' },
  { id: 'filler_18', x: 235, y: 314, w: 90, h: 20, kind: 'hedge' },
  { id: 'filler_19', x: 54, y: 162, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_20', x: 405, y: 52, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_21', x: 108, y: 265, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_22', x: 444, y: 105, w: 16, h: 24, kind: 'bush' },

  // Downtown — the school, the library, the plaza, tree-lined throughout.
  { id: 'filler_23', x: 188, y: 279, w: 22, h: 42, kind: 'tree' },
  { id: 'filler_24', x: 388, y: 87, w: 22, h: 42, kind: 'tree' },
  { id: 'filler_25', x: 428, y: 160, w: 22, h: 42, kind: 'tree' },
  { id: 'filler_26', x: 1044, y: 84, w: 22, h: 42, kind: 'tree' },
  { id: 'filler_27', x: 980, y: 265, w: 22, h: 42, kind: 'tree' },
  { id: 'filler_28', x: 538, y: 263, w: 22, h: 42, kind: 'tree' },
  { id: 'filler_29', x: 1042, y: 167, w: 22, h: 42, kind: 'tree' },
  { id: 'filler_30', x: 1001, y: 65, w: 22, h: 42, kind: 'tree' },
  { id: 'filler_31', x: 809, y: 278, w: 22, h: 42, kind: 'tree' },
  { id: 'filler_32', x: 528, y: 128, w: 22, h: 42, kind: 'tree' },
  { id: 'filler_33', x: 560, y: 178, w: 22, h: 42, kind: 'tree' },
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
  { id: 'filler_60', x: 948, y: 510, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_61', x: 1039, y: 620, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_62', x: 1040, y: 530, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_63', x: 867, y: 683, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_64', x: 530, y: 549, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_65', x: 737, y: 686, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_66', x: 773, y: 674, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_67', x: 1055, y: 418, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_68', x: 766, y: 632, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_69', x: 541, y: 703, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_70', x: 967, y: 424, w: 16, h: 24, kind: 'bush' },
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
