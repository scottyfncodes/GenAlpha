/**
 * Named coordinates into `public/tiles/kenney-rpg-urban-pack.png` — the
 * pack has 486 tiles and this game currently draws about 20 of them.
 * Nothing here is exhaustive; it's the subset actually wired into
 * `draw.ts`, named for what it draws rather than left as bare numbers.
 */
import { TILE } from './spritesheet';

const SHEET_COLS = 27;

function tileIndex(col: number, row: number): number {
  return row * SHEET_COLS + col;
}

export type Direction = 'left' | 'down' | 'up' | 'right';

interface CharacterSprite {
  left: [number, number, number];
  down: [number, number, number];
  up: [number, number, number];
  right: [number, number, number];
}

/** Each of the pack's 6 characters is a 4-col x 3-row block: columns are
 * direction (left, down, up, right — read off which way the head/hair
 * turns), rows are the 3 walk-cycle frames for that direction. */
const CHAR_COLS = { left: 23, down: 24, up: 25, right: 26 } as const;

function characterAt(charIndex: number): CharacterSprite {
  const base = charIndex * 3;
  const frames = (col: number): [number, number, number] => [
    tileIndex(col, base),
    tileIndex(col, base + 1),
    tileIndex(col, base + 2),
  ];
  return {
    left: frames(CHAR_COLS.left),
    down: frames(CHAR_COLS.down),
    up: frames(CHAR_COLS.up),
    right: frames(CHAR_COLS.right),
  };
}

/** The 6 character skins the pack ships. Index 0 is the player's; ambient
 * NPCs cycle through all 6 (including 0) by a hash of their own id, same
 * "small fixed wardrobe" trick `draw.ts`'s old `NPC_SHIRTS` used. */
export const CHARACTERS: CharacterSprite[] = [0, 1, 2, 3, 4, 5].map(characterAt);

/** A character sprite is drawn taller than it is wide and the source tile
 * has a couple of transparent pixels of headroom baked in — this is the
 * on-screen size that reads at the same scale the old stick-figure did. */
export const CHARACTER_DRAW_SIZE = { w: TILE, h: TILE + 6 };

/** Two-tile stacks — a canopy tile over a canopy+trunk tile — for a tree
 * with a visible trunk, in the pack's two foliage palettes. `top`/`base`
 * are drawn as two full TILE-height blits stacked with no gap, same trick
 * `drawSpriteTile` already composes anything multi-tile with. */
export const TREE_TALL_TEAL = { top: tileIndex(16, 8), base: tileIndex(16, 9) };
export const TREE_SMALL_TEAL = { top: tileIndex(17, 8), base: tileIndex(17, 9) };
export const TREE_TALL_ORANGE = { top: tileIndex(16, 12), base: tileIndex(16, 13) };
export const TREE_SMALL_ORANGE = { top: tileIndex(17, 12), base: tileIndex(17, 13) };

/** Single-tile round bushes — no trunk, no compositing. */
export const BUSH_TEAL = tileIndex(21, 10);
export const BUSH_ORANGE = tileIndex(21, 14);

/** Top-down parked cars and vans, 3 color pairs — picked per-obstacle by
 * id hash the same way the old procedural `drawParkedCar` varied. */
export const CAR_TILES: number[] = [
  tileIndex(8, 9),
  tileIndex(9, 9),
  tileIndex(8, 10),
  tileIndex(9, 10),
  tileIndex(8, 11),
  tileIndex(9, 11),
];

/** The green transit bus — 2 cols x 3 rows, the one vehicle in either
 * sheet tall enough to actually read as a bus instead of a car. Row-major,
 * top to bottom, so a caller can blit it the same way `drawTown` walks any
 * other 2D tile block. */
export const BUS_TILES: number[][] = [
  [tileIndex(21, 14), tileIndex(22, 14)],
  [tileIndex(21, 15), tileIndex(22, 15)],
  [tileIndex(21, 16), tileIndex(22, 16)],
];

/** A 9-slice kit — corner/edge/fill in a 3x3 block — for a flat roof-slab
 * rect of any size. The pack ships this in a few color/border schemes; the
 * two below are the ones `drawSpriteBuildingShell` pairs with a wall kit. */
export interface NineSlice {
  tl: number;
  t: number;
  tr: number;
  l: number;
  fill: number;
  r: number;
  bl: number;
  b: number;
  br: number;
}

function nineSliceAt(col0: number, row0: number): NineSlice {
  return {
    tl: tileIndex(col0, row0),
    t: tileIndex(col0 + 1, row0),
    tr: tileIndex(col0 + 2, row0),
    l: tileIndex(col0, row0 + 1),
    fill: tileIndex(col0 + 1, row0 + 1),
    r: tileIndex(col0 + 2, row0 + 1),
    bl: tileIndex(col0, row0 + 2),
    b: tileIndex(col0 + 1, row0 + 2),
    br: tileIndex(col0 + 2, row0 + 2),
  };
}

export const ROOF_GREY: NineSlice = nineSliceAt(9, 0);
export const ROOF_TAN: NineSlice = nineSliceAt(0, 4);

/** A wall kit is just two rows — the cap (the trimmed seam that sits right
 * under the roof) and a plain fill row repeated for however tall the wall
 * needs to be. The pack's brick textures don't need corner posts to read
 * as a wall; a plain column works fine tiled edge to edge. */
export interface WallKit {
  cap: number;
  fill: number;
}

export const WALL_RED: WallKit = { cap: tileIndex(19, 0), fill: tileIndex(19, 3) };
export const WALL_ORANGE: WallKit = { cap: tileIndex(19, 5), fill: tileIndex(19, 7) };

/** Chain-link, tiled the same one-row way a wall band is — a fence
 * obstacle is never more than 18px tall, so `cap`/`fill` pointing at the
 * same tile isn't a simplification, there's only ever the one row to
 * draw. The tile's own pole sits at its left edge, so tiling it left to
 * right happens to land a post every 16px on its own, no extra math. */
export const FENCE_CHAINLINK: WallKit = { cap: tileIndex(4, 13), fill: tileIndex(4, 13) };

/** A front-facing dumpster — `drawBin`'s sprite replacement. */
export const BIN_DUMPSTER = tileIndex(8, 11);
