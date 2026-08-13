/**
 * Generic maze filler. These are scenery, not places — no scene, no blurb, no
 * language, nothing `locationAt` will ever match. They exist purely to turn
 * the town from a scatter of named buildings into a walkable grid dense
 * enough to feel like a maze, per the build note: more corridors, a Pac-Man
 * read to the layout.
 *
 * Drawn as natural terrain (trees, bushes, rocks, hedges, chain-link fence —
 * see draw.ts), not as unnamed buildings: a wall of scenery with no name and
 * no windows lit read as a mistake, not as a place. `kind` picks which;
 * assigned by each footprint's proportions (tall reads as a tree, wide and
 * flat as a hedge) and by district (the Annex gets fence, not hedge — the
 * one place in town that's actually fenced) rather than at random, so the
 * town's edges look considered rather than rolled.
 *
 * Coordinates were chosen against a flood-fill connectivity check (every open
 * cell reachable from spawn, every named location's doorway reachable) rather
 * than by eye — a maze that quietly seals off a location is worse than no
 * maze at all. See the design script in the build notes if these ever need
 * to move; re-run the same check before touching them.
 */
export type ObstacleKind = 'tree' | 'bush' | 'rock' | 'hedge' | 'fence';

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: ObstacleKind;
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
];
