/**
 * The real images this game loads. Three sheets now: Kenney's CC0 RPG Urban
 * Pack (458x305, 27 cols x 18 rows) for the cozy/suburban tiles everything
 * so far has used, Kenney's CC0 Roguelike City Pack (628x475, 37 cols x
 * 28 rows) for the industrial grey concrete warehouse/garage needed and the
 * first pack simply doesn't have, and Kenney's CC0 Roguelike Indoor pack
 * (458x305, 27 cols x 18 rows — the same grid as the first sheet) for the
 * furniture and floor tiles the small interior-backdrop canvases draw. All
 * 16x16 tiles, 1px spacing, 0px margin — see `public/tiles/NOTICE.txt`.
 * `spriteIndex.ts`, `spriteIndexCity.ts`, and `spriteIndexInterior.ts` name
 * the specific tiles each sheet actually draws; this module only knows how
 * to get a sheet loaded and hand back a source rect for a given tile index.
 *
 * `drawTown` runs synchronously, every frame, straight from the render loop
 * — there's no `await` point to hang a "wait for the image" on. So each
 * load kicks off once at module import (a browser `<img>` decodes off the
 * main thread regardless), and every sprite draw call is expected to check
 * the sheet's `ready()` first and fall back to the existing procedural
 * shape when it isn't — true for the handful of frames before the image
 * lands, never true again after that.
 */

export const TILE = 16;
const SPACING = 1;

interface SpriteSheet {
  ensureLoading(): void;
  ready(): boolean;
  tileSourceRect(index: number): { sx: number; sy: number };
  drawTile(ctx: CanvasRenderingContext2D, index: number, cx: number, cy: number, dw: number, dh: number): void;
  drawTileAt(ctx: CanvasRenderingContext2D, index: number, x: number, y: number, size?: number): void;
}

function createSheet(src: string, cols: number): SpriteSheet {
  let img: HTMLImageElement | null = null;
  let ready = false;

  function tileSourceRect(index: number): { sx: number; sy: number } {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return { sx: col * (TILE + SPACING), sy: row * (TILE + SPACING) };
  }

  return {
    ensureLoading() {
      if (img) return;
      img = new Image();
      img.onload = () => {
        ready = true;
      };
      img.src = src;
    },
    ready: () => ready,
    tileSourceRect,
    drawTile(ctx, index, cx, cy, dw, dh) {
      if (!img || !ready) return;
      const { sx, sy } = tileSourceRect(index);
      ctx.drawImage(img, sx, sy, TILE, TILE, Math.round(cx - dw / 2), Math.round(cy - dh / 2), Math.round(dw), Math.round(dh));
    },
    drawTileAt(ctx, index, x, y, size = TILE) {
      if (!img || !ready) return;
      const { sx, sy } = tileSourceRect(index);
      ctx.drawImage(img, sx, sy, TILE, TILE, Math.round(x), Math.round(y), size, size);
    },
  };
}

const mainSheet = createSheet('./tiles/kenney-rpg-urban-pack.png', 27);
const citySheet = createSheet('./tiles/kenney-roguelike-city-pack.png', 37);
const interiorSheet = createSheet('./tiles/kenney-roguelike-interior-pack.png', 27);

/** Call once, anywhere, before the first frame — safe to call more than
 * once, each sheet's load only actually kicks off the first time. */
export function ensureSpriteSheetLoading(): void {
  mainSheet.ensureLoading();
  citySheet.ensureLoading();
  interiorSheet.ensureLoading();
}

export function spriteSheetReady(): boolean {
  return mainSheet.ready();
}

/** `tileIndex(col, row)` from `spriteIndex.ts`, turned into the source rect
 * `drawImage`'s 9-argument form wants. */
export function tileSourceRect(index: number): { sx: number; sy: number } {
  return mainSheet.tileSourceRect(index);
}

/**
 * Blit one tile, scaled to `dw`x`dh`, centered on `(cx, cy)` in world
 * (pre-scale, pre-camera) coordinates — the same coordinate space every
 * other draw* function in `draw.ts` already draws in. Multi-tile sprites
 * (a tree's canopy-then-trunk stack) are just two calls with the second
 * one's `cy` offset by the first tile's drawn height.
 */
export function drawSpriteTile(ctx: CanvasRenderingContext2D, index: number, cx: number, cy: number, dw: number, dh: number): void {
  mainSheet.drawTile(ctx, index, cx, cy, dw, dh);
}

/** Top-left anchored, at a fixed `size` (defaults to the tile's own native
 * 16px) — the primitive a tiled wall/roof grid repeats across a rect with,
 * where `drawSpriteTile`'s center-anchored scaling would fight the grid
 * math instead of helping it. */
export function drawTileAt(ctx: CanvasRenderingContext2D, index: number, x: number, y: number, size: number = TILE): void {
  mainSheet.drawTileAt(ctx, index, x, y, size);
}

/** The Roguelike City Pack sheet — same shape as the functions above, kept
 * under its own names rather than a shared "which sheet" parameter so every
 * existing call site (all of it written against the main sheet) needed zero
 * changes when this second sheet was added. */
export function citySheetReady(): boolean {
  return citySheet.ready();
}

export function drawCityTileAt(ctx: CanvasRenderingContext2D, index: number, x: number, y: number, size: number = TILE): void {
  citySheet.drawTileAt(ctx, index, x, y, size);
}

/** The Roguelike Indoor pack — furniture and floor tiles for the small
 * interior-backdrop canvases (`InteriorBackdrop.tsx`), same shape as the
 * city sheet's exports above. */
export function interiorSheetReady(): boolean {
  return interiorSheet.ready();
}

export function drawInteriorTileAt(ctx: CanvasRenderingContext2D, index: number, x: number, y: number, size: number = TILE): void {
  interiorSheet.drawTileAt(ctx, index, x, y, size);
}
