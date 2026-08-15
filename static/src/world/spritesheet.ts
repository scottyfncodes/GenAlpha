/**
 * The one real image this game loads — Kenney's CC0 RPG Urban Pack, a single
 * 458x305 sheet of 16x16 tiles (27 cols x 18 rows, 1px spacing, 0px margin;
 * see `public/tiles/NOTICE.txt`). `spriteIndex.ts` names the specific tiles
 * the game actually draws; this module only knows how to get the sheet
 * loaded and hand back a source rect for a given tile index.
 *
 * `drawTown` runs synchronously, every frame, straight from the render loop
 * — there's no `await` point to hang a "wait for the image" on. So the load
 * kicks off once at module import (a browser `<img>` decodes off the main
 * thread regardless), and every sprite draw call is expected to check
 * `spriteSheetReady()` first and fall back to the existing procedural shape
 * when it isn't — true for the handful of frames before the image lands,
 * never true again after that.
 */

const SHEET_SRC = './tiles/kenney-rpg-urban-pack.png';

export const TILE = 16;
const SHEET_COLS = 27;
const SHEET_SPACING = 1;

let sheet: HTMLImageElement | null = null;
let ready = false;

function load(): HTMLImageElement {
  const img = new Image();
  img.onload = () => {
    ready = true;
  };
  img.src = SHEET_SRC;
  return img;
}

/** Call once, anywhere, before the first frame — safe to call more than
 * once, the load only actually kicks off the first time. */
export function ensureSpriteSheetLoading(): void {
  if (!sheet) sheet = load();
}

export function spriteSheetReady(): boolean {
  return ready;
}

/** `tileIndex(col, row)` from `spriteIndex.ts`, turned into the source rect
 * `drawImage`'s 9-argument form wants. Undefined until `ensureSpriteSheetLoading`
 * has actually fired the load — callers only reach here after checking
 * `spriteSheetReady()`, so this never has to handle the not-yet-loaded case. */
export function tileSourceRect(index: number): { sx: number; sy: number } {
  const col = index % SHEET_COLS;
  const row = Math.floor(index / SHEET_COLS);
  return { sx: col * (TILE + SHEET_SPACING), sy: row * (TILE + SHEET_SPACING) };
}

/**
 * Blit one tile, scaled to `dw`x`dh`, centered on `(cx, cy)` in world
 * (pre-scale, pre-camera) coordinates — the same coordinate space every
 * other draw* function in `draw.ts` already draws in. Multi-tile sprites
 * (a tree's canopy-then-trunk stack) are just two calls with the second
 * one's `cy` offset by the first tile's drawn height.
 */
export function drawSpriteTile(
  ctx: CanvasRenderingContext2D,
  index: number,
  cx: number,
  cy: number,
  dw: number,
  dh: number,
): void {
  if (!sheet || !ready) return;
  const { sx, sy } = tileSourceRect(index);
  ctx.drawImage(sheet, sx, sy, TILE, TILE, Math.round(cx - dw / 2), Math.round(cy - dh / 2), Math.round(dw), Math.round(dh));
}
