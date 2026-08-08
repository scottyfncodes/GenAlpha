/**
 * Generic maze filler. These are scenery, not places — no scene, no blurb, no
 * language, nothing `locationAt` will ever match. They exist purely to turn
 * the town from a scatter of named buildings into a walkable grid dense
 * enough to feel like a maze, per the build note: more corridors, a Pac-Man
 * read to the layout.
 *
 * Drawn as natural terrain (trees, bushes, rocks, hedges — see draw.ts), not
 * as unnamed buildings: a wall of scenery with no name and no windows lit
 * read as a mistake, not as a place. `kind` picks which; assigned by each
 * footprint's proportions (tall reads as a tree, wide and flat as a hedge)
 * rather than at random, so the town's edges look considered rather than
 * rolled.
 *
 * Coordinates were chosen against a flood-fill connectivity check (every open
 * cell reachable from spawn, every named location's doorway reachable) rather
 * than by eye — a maze that quietly seals off a location is worse than no
 * maze at all. See the design script in the build notes if these ever need
 * to move; re-run the same check before touching them.
 */
export type ObstacleKind = 'tree' | 'bush' | 'rock' | 'hedge';

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: ObstacleKind;
}

export const OBSTACLES: Obstacle[] = [
  { id: 'filler_1', x: 240, y: 40, w: 100, h: 64, kind: 'hedge' },
  { id: 'filler_2', x: 40, y: 200, w: 90, h: 60, kind: 'bush' },
  { id: 'filler_3', x: 40, y: 320, w: 80, h: 56, kind: 'rock' },
  { id: 'filler_4', x: 320, y: 176, w: 80, h: 56, kind: 'bush' },
  { id: 'filler_5', x: 560, y: 40, w: 90, h: 56, kind: 'hedge' },
  { id: 'filler_6', x: 664, y: 40, w: 80, h: 60, kind: 'rock' },
  { id: 'filler_7', x: 552, y: 260, w: 64, h: 80, kind: 'tree' },
  { id: 'filler_8', x: 848, y: 220, w: 80, h: 90, kind: 'tree' },
  { id: 'filler_9', x: 848, y: 340, w: 80, h: 100, kind: 'tree' },
  { id: 'filler_10', x: 720, y: 380, w: 90, h: 70, kind: 'bush' },
  { id: 'filler_11', x: 400, y: 440, w: 80, h: 70, kind: 'rock' },
  { id: 'filler_12', x: 200, y: 480, w: 70, h: 60, kind: 'bush' },
  { id: 'filler_13', x: 40, y: 480, w: 70, h: 90, kind: 'tree' },
  { id: 'filler_14', x: 512, y: 560, w: 70, h: 60, kind: 'rock' },
  { id: 'filler_15', x: 848, y: 560, w: 80, h: 60, kind: 'hedge' },
  { id: 'filler_16', x: 300, y: 200, w: 60, h: 56, kind: 'bush' },
  { id: 'filler_17', x: 208, y: 40, w: 60, h: 56, kind: 'rock' },
];
