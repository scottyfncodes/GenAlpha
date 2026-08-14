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
 * district (the Annex gets fence, not hedge — the one place in town that's
 * actually fenced) rather than at random, so the town's edges look
 * considered rather than rolled.
 *
 * `'building'` is the one exception to "not a building": a background one,
 * deliberately unlit and unlabelled (`draw.ts`'s `drawDecorativeBuilding`
 * paints it in a duller, receding palette) so the town reads as a filled-in
 * place without a background block competing with an actual, interactive
 * location for the player's attention.
 *
 * Coordinates were chosen against a flood-fill connectivity check (every open
 * cell reachable from spawn, every named location's doorway reachable) rather
 * than by eye — a maze that quietly seals off a location is worse than no
 * maze at all. See the design script in the build notes if these ever need
 * to move; re-run the same check before touching them.
 */
export type ObstacleKind = 'tree' | 'bush' | 'rock' | 'hedge' | 'fence' | 'car' | 'bin' | 'building';

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
  // The residential quarter — hedges and bushes framing the little
  // neighbourhood of home / Ellen's / Casey's.
  { id: 'filler_1', x: 16, y: 296, w: 96, h: 32, kind: 'hedge' },
  { id: 'filler_2', x: 168, y: 296, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_3', x: 16, y: 448, w: 100, h: 24, kind: 'hedge' },
  { id: 'filler_4', x: 168, y: 400, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_5', x: 320, y: 200, w: 20, h: 40, kind: 'tree' },
  // Downtown civic core — trees lining the school, the square, the library.
  { id: 'filler_6', x: 452, y: 40, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_7', x: 452, y: 340, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_8', x: 852, y: 40, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_9', x: 632, y: 200, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_10', x: 700, y: 344, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_11', x: 70, y: 486, w: 110, h: 16, kind: 'hedge' },
  // The recreation strip — park trees, arcade-alley clutter.
  { id: 'filler_12', x: 140, y: 528, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_13', x: 300, y: 460, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_14', x: 250, y: 430, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_15', x: 1060, y: 60, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_16', x: 1100, y: 120, w: 16, h: 24, kind: 'bush' },
  // Industrial Annex — rubble and rock, chain-link along the district's
  // own edge.
  { id: 'filler_17', x: 812, y: 296, w: 96, h: 20, kind: 'fence' },
  { id: 'filler_18', x: 992, y: 296, w: 100, h: 20, kind: 'fence' },
  { id: 'filler_19', x: 828, y: 464, w: 28, h: 24, kind: 'rock' },
  { id: 'filler_20', x: 1004, y: 464, w: 28, h: 24, kind: 'rock' },
  // The map's own edges — a little scenery so the town doesn't feel like
  // it stops at nothing.
  { id: 'filler_21', x: 0, y: 40, w: 20, h: 88, kind: 'hedge' },
  { id: 'filler_22', x: 1256, y: 400, w: 20, h: 200, kind: 'hedge' },
  { id: 'filler_23', x: 400, y: 700, w: 24, h: 44, kind: 'tree' },
  { id: 'filler_24', x: 900, y: 700, w: 24, h: 44, kind: 'tree' },

  /*
   * The fill-out pass: background buildings and street furniture in the
   * blocks that were open ground before — a north strip above the
   * residential/downtown row, a bridge of buildings between the residential
   * quarter and downtown/the square, and a south row the map never used at
   * all. Same flood-fill/overlap script as everything above; the reachable
   * fraction of open ground barely moved (this only ever fills space that
   * was already empty, never narrows a corridor to nothing).
   */
  { id: 'deco_1', x: 60, y: 660, w: 110, h: 80, kind: 'building' },
  { id: 'deco_2', x: 260, y: 664, w: 100, h: 76, kind: 'building' },
  { id: 'deco_3', x: 620, y: 664, w: 110, h: 80, kind: 'building' },
  { id: 'deco_4', x: 960, y: 664, w: 110, h: 80, kind: 'building' },
  { id: 'deco_5', x: 1090, y: 664, w: 110, h: 80, kind: 'building' },
  { id: 'deco_6', x: 60, y: 40, w: 100, h: 76, kind: 'building' },
  { id: 'deco_8', x: 360, y: 50, w: 80, h: 66, kind: 'building' },
  { id: 'deco_10', x: 1010, y: 44, w: 40, h: 70, kind: 'building' },
  { id: 'deco_11', x: 360, y: 190, w: 110, h: 80, kind: 'building' },
  { id: 'deco_12', x: 520, y: 190, w: 100, h: 76, kind: 'building' },
  { id: 'deco_13', x: 220, y: 340, w: 100, h: 70, kind: 'building' },
  { id: 'deco_14', x: 380, y: 390, w: 90, h: 60, kind: 'building' },
  { id: 'deco_15', x: 20, y: 560, w: 80, h: 60, kind: 'building' },
  { id: 'deco_16', x: 600, y: 500, w: 90, h: 70, kind: 'building' },
  { id: 'deco_17', x: 1050, y: 560, w: 100, h: 74, kind: 'building' },

  // Street furniture — parked cars and bins, filling out the districts and
  // the new background blocks with the kind of clutter a lived-in town
  // actually has.
  { id: 'filler_25', x: 190, y: 120, w: 18, h: 12, kind: 'car' },
  { id: 'filler_26', x: 970, y: 120, w: 18, h: 12, kind: 'car' },
  { id: 'filler_27', x: 230, y: 630, w: 18, h: 12, kind: 'car' },
  { id: 'filler_28', x: 700, y: 630, w: 18, h: 12, kind: 'car' },
  { id: 'filler_29', x: 800, y: 400, w: 16, h: 16, kind: 'bin' },
  { id: 'filler_30', x: 1150, y: 460, w: 16, h: 16, kind: 'bin' },

  // More trees and hedges, mostly planted alongside the new background
  // buildings so the fill-in blocks read as planted streets rather than
  // bare lots.
  { id: 'filler_32', x: 170, y: 100, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_33', x: 330, y: 60, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_34', x: 790, y: 110, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_39', x: 780, y: 620, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_40', x: 1030, y: 620, w: 20, h: 40, kind: 'tree' },
  { id: 'filler_42', x: 180, y: 700, w: 75, h: 20, kind: 'hedge' },
  { id: 'filler_43', x: 470, y: 700, w: 90, h: 22, kind: 'hedge' },
  { id: 'filler_44', x: 900, y: 456, w: 30, h: 20, kind: 'rock' },

  /*
   * "Fun to discover" bushes — more hidden salvage, spread wide across every
   * district rather than clustered, so cutting across town on a new board
   * tier actually turns something up. See world/collectibles.ts
   * HIDDEN_PICKUPS for what each one is hiding.
   */
  { id: 'filler_45', x: 300, y: 150, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_46', x: 460, y: 460, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_47', x: 1080, y: 322, w: 16, h: 20, kind: 'bush' },
  { id: 'filler_48', x: 1220, y: 700, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_49', x: 980, y: 620, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_50', x: 460, y: 640, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_51', x: 60, y: 505, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_52', x: 700, y: 480, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_53', x: 1150, y: 200, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_54', x: 160, y: 600, w: 16, h: 24, kind: 'bush' },
  { id: 'filler_55', x: 880, y: 700, w: 16, h: 24, kind: 'bush' },

  /*
   * Perimeter security around the Annex Fence itself — the building the
   * district's own fence is named for, and the one Act 2/3 heist content
   * (`content/heist.ts`) actually sends the player to break into. The north
   * approach along the road (where `filler_18` already sits) is the gap the
   * Annex's own blurb calls out as "kept re-opening"; south and east close
   * off the rest, so the building reads as fenced-in on three sides rather
   * than sitting in open ground like everywhere else in town.
   */
  { id: 'filler_56', x: 1040, y: 456, w: 136, h: 16, kind: 'fence' },
  { id: 'filler_57', x: 1176, y: 344, w: 16, h: 108, kind: 'fence' },

  /*
   * The one piece of scenery in town that isn't there from day one — new
   * fencing along the Town Square's south side, matching the square's own
   * `hunted`-tier ambient line about "two more cameras on the bandstand
   * than there were last week." `minStage` keeps it off the map entirely
   * until the story's actually gone on long enough to earn it (see
   * `world/escalation.ts`); set back from both the road at y460-482 and
   * the little cluster of ambient pedestrians/pets that already wander the
   * square's own south side, so it never gets in the way of reaching the
   * location itself, only of cutting across the lot behind it.
   */
  { id: 'filler_58', x: 540, y: 508, w: 100, h: 16, kind: 'fence', minStage: 2 },
];
