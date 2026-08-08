/**
 * Generic maze filler. These are scenery, not places — no scene, no blurb, no
 * language, nothing `locationAt` will ever match. They exist purely to turn
 * the town from a scatter of named buildings into a walkable grid dense
 * enough to feel like a maze, per the build note: more corridors, a Pac-Man
 * read to the layout.
 *
 * Coordinates were chosen against a flood-fill connectivity check (every open
 * cell reachable from spawn, every named location's doorway reachable) rather
 * than by eye — a maze that quietly seals off a location is worse than no
 * maze at all. See the design script in the build notes if these ever need
 * to move; re-run the same check before touching them.
 */
export interface Obstacle {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const OBSTACLES: Obstacle[] = [
  { id: 'filler_1', x: 240, y: 40, w: 100, h: 64 },
  { id: 'filler_2', x: 40, y: 200, w: 90, h: 60 },
  { id: 'filler_3', x: 40, y: 320, w: 80, h: 56 },
  { id: 'filler_4', x: 320, y: 176, w: 80, h: 56 },
  { id: 'filler_5', x: 560, y: 40, w: 90, h: 56 },
  { id: 'filler_6', x: 664, y: 40, w: 80, h: 60 },
  { id: 'filler_7', x: 552, y: 260, w: 64, h: 80 },
  { id: 'filler_8', x: 848, y: 220, w: 80, h: 90 },
  { id: 'filler_9', x: 848, y: 340, w: 80, h: 100 },
  { id: 'filler_10', x: 720, y: 380, w: 90, h: 70 },
  { id: 'filler_11', x: 400, y: 440, w: 80, h: 70 },
  { id: 'filler_12', x: 200, y: 480, w: 70, h: 60 },
  { id: 'filler_13', x: 40, y: 480, w: 70, h: 90 },
  { id: 'filler_14', x: 512, y: 560, w: 70, h: 60 },
  { id: 'filler_15', x: 848, y: 560, w: 80, h: 60 },
  { id: 'filler_16', x: 300, y: 200, w: 60, h: 56 },
  { id: 'filler_17', x: 208, y: 40, w: 60, h: 56 },
];
