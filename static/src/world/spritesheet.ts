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

/**
 * Every purchased tile — from any of the three Kenney sheets — passes
 * through `drawTile`/`drawTileAt` below, so this is the one place to make
 * them land in Bellhaven's own dusk/riso register instead of the pack's
 * brighter, cheerier default colours. The hand-drawn vector art (ground,
 * roads, glows, `PALETTE` in draw.ts) is already muted to this register;
 * the sprites were the one thing still arguing with it. Desaturated and
 * darkened rather than recoloured outright — this has to keep reading as
 * "a building/tree/car", just toned to the same evening light everything
 * else on the canvas is drawn in.
 *
 * Applied once, at load time, to a tinted copy of the sheet — never as a
 * live `ctx.filter` on the per-frame blit. `drawTown` redraws every visible
 * tile every frame, and a chained canvas filter re-evaluated per `drawImage`
 * call is real per-frame cost for zero further benefit once the pixels are
 * already the right colour; this way every frame's blit is exactly as cheap
 * as it was before the tint existed.
 *
 * Two passes, not one. `saturate`/`brightness`/`contrast` alone (tried
 * first) measured as a ~7% average pixel shift — real, but not visible at a
 * glance; a filter grade that subtle reads as noise, not as "this sprite
 * belongs to this world". The second pass is a flat wash of the town's own
 * ground colour (`PALETTE.ground`, draw.ts) blended in with `source-atop`,
 * which paints only where the sprite already has ink — transparent pixels
 * stay transparent, so a tree's silhouette or a window's cutout is untouched
 * — and does the actual work of pulling Kenney's palette toward Bellhaven's.
 */
const SPRITE_FILTER = 'saturate(0.4) brightness(0.74) contrast(1.18)';
/** Same hex as `PALETTE.ground` in draw.ts — kept as a literal rather than a
 * shared import because that constant lives in a module that pulls in the
 * whole overworld render pipeline, and this file has no other reason to
 * depend on it. */
const SPRITE_WASH = 'rgba(61, 71, 89, 0.4)';

interface SpriteSheet {
  ensureLoading(): void;
  ready(): boolean;
  tileSourceRect(index: number): { sx: number; sy: number };
  drawTile(ctx: CanvasRenderingContext2D, index: number, cx: number, cy: number, dw: number, dh: number): void;
  drawTileAt(ctx: CanvasRenderingContext2D, index: number, x: number, y: number, size?: number): void;
}

function createSheet(src: string, cols: number): SpriteSheet {
  let img: HTMLImageElement | null = null;
  /** The tinted copy actually drawn from once it exists — a same-size
   * canvas painted through `SPRITE_FILTER` exactly once, in `onload`, so
   * every later `drawImage` call reads pre-tinted pixels at zero extra
   * per-frame cost. Falls back to the raw `img` for the handful of frames
   * between "image decoded" and "tint pass finished". */
  let tinted: HTMLCanvasElement | null = null;
  let ready = false;

  function tileSourceRect(index: number): { sx: number; sy: number } {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return { sx: col * (TILE + SPACING), sy: row * (TILE + SPACING) };
  }

  function source(): CanvasImageSource | null {
    return tinted ?? img;
  }

  return {
    ensureLoading() {
      if (img) return;
      img = new Image();
      img.onload = () => {
        ready = true;
        const el = img;
        if (!el) return;
        const off = document.createElement('canvas');
        off.width = el.naturalWidth;
        off.height = el.naturalHeight;
        const offCtx = off.getContext('2d');
        if (!offCtx) return; // stays on the untinted fallback
        offCtx.filter = SPRITE_FILTER;
        offCtx.drawImage(el, 0, 0);
        offCtx.filter = 'none';
        offCtx.globalCompositeOperation = 'source-atop';
        offCtx.fillStyle = SPRITE_WASH;
        offCtx.fillRect(0, 0, off.width, off.height);
        offCtx.globalCompositeOperation = 'source-over';
        tinted = off;
      };
      img.src = src;
    },
    ready: () => ready,
    tileSourceRect,
    drawTile(ctx, index, cx, cy, dw, dh) {
      const src = source();
      if (!src || !ready) return;
      const { sx, sy } = tileSourceRect(index);
      ctx.drawImage(src, sx, sy, TILE, TILE, Math.round(cx - dw / 2), Math.round(cy - dh / 2), Math.round(dw), Math.round(dh));
    },
    drawTileAt(ctx, index, x, y, size = TILE) {
      const src = source();
      if (!src || !ready) return;
      const { sx, sy } = tileSourceRect(index);
      ctx.drawImage(src, sx, sy, TILE, TILE, Math.round(x), Math.round(y), size, size);
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
