/**
 * THE ASSET LOADER — draws a manifest slot (`manifest.ts`) as real art when
 * a file exists at `public/art/<id>.png`, or as a correctly-sized,
 * anchor-marked placeholder when it doesn't. Every slot in this run's
 * manifest has no backing file yet, so every slot draws as a placeholder —
 * that's the expected, intended state of Run 1.
 *
 * Follows the exact `ensureLoading()`/`ready()`/fallback-to-procedural shape
 * every other image source in this game already uses (`world/spritesheet.ts`,
 * `ui/minigames/droneSprites.ts`): kick a load off once, check readiness
 * before every draw, never block a frame on a promise. The "procedural
 * fallback" here is the placeholder renderer instead of a hand-drawn shape,
 * which is the same idea one layer earlier — a placeholder IS this system's
 * fallback art, not a debug overlay bolted on top of it.
 *
 * Nothing in `world/draw.ts` calls into this module. See the art bible §6/§8
 * — wiring real per-object art into the live renderer is Run 2 production
 * work, not this run's.
 *
 * `drawAssetSlot`'s optional `frame` parameter (below) is the one addition
 * since Run 1 — a manifest-sliced spritesheet, per
 * `docs/art/genalpha-character-animation-architecture.md`. It's additive:
 * every call site that never passes a `frame` (58 of the 61 slots don't
 * declare `frames` at all, and won't ever have one to pass) draws exactly
 * as it always has. `animation.ts` is what actually decides *which* frame
 * to pass; this file only knows how to cut one out of a sheet once told.
 */
import { ASSET_MANIFEST, type AnchorPoint, type AssetCategory, type AssetSlot } from './manifest';
import { resolveFrameSourceRect, type SpriteFrame } from './animation';

const SLOTS_BY_ID = new Map<string, AssetSlot>(ASSET_MANIFEST.map((s) => [s.id, s]));

export function slotById(id: string): AssetSlot | undefined {
  return SLOTS_BY_ID.get(id);
}

interface LoadEntry {
  img: HTMLImageElement | null;
  ready: boolean;
  /** A 404 (the expected case for every slot in this run) — stays a
   * placeholder forever rather than retrying every frame. */
  failed: boolean;
}

const registry = new Map<string, LoadEntry>();

function entryFor(slot: AssetSlot): LoadEntry {
  let entry = registry.get(slot.id);
  if (!entry) {
    entry = { img: null, ready: false, failed: false };
    registry.set(slot.id, entry);
  }
  return entry;
}

/** Where real art for a slot would live, once it exists. */
export function assetPath(slot: AssetSlot): string {
  return `./art/${slot.id}.png`;
}

/** Kick off a load for one slot — safe to call every frame, only actually
 * starts a request the first time. */
export function ensureAssetLoading(slot: AssetSlot): void {
  const entry = entryFor(slot);
  if (entry.img) return;
  const img = new Image();
  img.onload = () => {
    entry.ready = true;
  };
  img.onerror = () => {
    entry.failed = true;
  };
  entry.img = img;
  img.src = assetPath(slot);
}

/** Kick off every manifest slot's load at once — call once, anywhere,
 * before the first frame that might draw from this module. */
export function ensureAllAssetsLoading(): void {
  for (const slot of ASSET_MANIFEST) ensureAssetLoading(slot);
}

export function assetReady(slot: AssetSlot): boolean {
  return entryFor(slot).ready;
}

/** True once we know for certain there's no real file — i.e. every slot in
 * this run, until art starts landing in `public/art/`. */
export function assetIsPlaceholder(slot: AssetSlot): boolean {
  const entry = entryFor(slot);
  return !entry.ready;
}

/**
 * Top-left draw origin for a slot's `width`x`height` box, given the world
 * position `(x, y)` interpreted per its `anchor` (art bible §4). `explicit`
 * has no generic rule — callers with a real per-instance origin (a wall
 * mark's own coordinates) should position the box themselves; this treats
 * `explicit` the same as `center` only so every slot has *some* sane
 * default when drawn generically (the gallery, mainly).
 */
function topLeftFor(slot: Pick<AssetSlot, 'width' | 'height' | 'anchor'>, x: number, y: number): { x: number; y: number } {
  switch (slot.anchor) {
    case 'bottom-center':
      return { x: x - slot.width / 2, y: y - slot.height };
    case 'top-left':
      return { x, y };
    case 'center':
    case 'explicit':
      return { x: x - slot.width / 2, y: y - slot.height / 2 };
  }
}

const CATEGORY_COLORS: Record<AssetCategory, string> = {
  character: '#e0672f',
  'small-prop': '#6fa06a',
  'medium-prop': '#4fb5a8',
  'large-prop': '#9b7fc9',
  building: '#b89a5a',
  landmark: '#e6402a',
  vehicle: '#3f7fe0',
  terrain: '#7fa3c9',
  technology: '#e84ac9',
  effect: '#e8b23c',
  'ui-icon': '#8fa6bd',
};

export function categoryColor(category: AssetCategory): string {
  return CATEGORY_COLORS[category];
}

const px = Math.round;

/**
 * The placeholder itself: a category-tinted checkerboard at the slot's
 * exact declared size (never a stand-in size — dropping real art in later
 * at the same dimensions is the whole point), a dashed "this is not final
 * art" border, and the id printed across it when there's room. Anchor is
 * NOT drawn here — see `drawAnchorMarker`, kept separate so a caller can
 * show real art with an anchor marker overlaid too (useful for checking a
 * newly-dropped-in file lines up before trusting it).
 *
 * `frame`, when a caller passes one for an animated slot, becomes a third
 * label line — there's no sheet to slice yet, but the placeholder can still
 * say which cell of the eventual one it stands in for.
 */
function drawPlaceholder(ctx: CanvasRenderingContext2D, slot: AssetSlot, boxX: number, boxY: number, frame?: SpriteFrame): void {
  const { width: w, height: h, category } = slot;
  const color = categoryColor(category);
  const cell = Math.max(2, Math.round(Math.min(w, h) / 6));

  ctx.save();
  ctx.beginPath();
  ctx.rect(px(boxX), px(boxY), w, h);
  ctx.clip();

  ctx.globalAlpha = 0.28;
  for (let row = 0; row * cell < h; row++) {
    for (let col = 0; col * cell < w; col++) {
      if ((row + col) % 2 !== 0) continue;
      ctx.fillStyle = color;
      ctx.fillRect(px(boxX + col * cell), px(boxY + row * cell), cell, cell);
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.strokeRect(px(boxX) + 0.5, px(boxY) + 0.5, w - 1, h - 1);
  ctx.setLineDash([]);
  ctx.restore();

  // Label, only when the box is big enough to hold anything legible —
  // most props and technology nodes are 12-24px, well under that, and a
  // clipped half-word is worse than no label at all.
  if (w >= 40 && h >= 20) {
    ctx.save();
    ctx.font = '6px monospace';
    ctx.fillStyle = 'rgba(20, 17, 15, 0.85)';
    ctx.fillText(slot.id, px(boxX) + 2, px(boxY) + 8, w - 4);
    ctx.fillStyle = 'rgba(20, 17, 15, 0.6)';
    const dims = `${w}x${h}`;
    ctx.fillText(frame ? `${dims} · frame ${frame.col},${frame.row}` : dims, px(boxX) + 2, px(boxY) + h - 3, w - 4);
    ctx.restore();
  }
}

/**
 * Draw one slot at world position `(x, y)`, interpreted per its own
 * `anchor`. Real art (once `public/art/<id>.png` exists and loads) draws at
 * exactly the slot's declared `width`x`height` — dropping a correctly-sized
 * file in is the entire integration step, nothing else in this function
 * changes. Until then, every slot draws its placeholder.
 *
 * `frame`, optional, is the animation extension: pass `{col, row}` (from
 * `animation.ts`'s `frameForCharacter`, typically) to draw one cell of a
 * slot's declared `frames` grid instead of the whole image. Backward
 * compatible by construction — every existing call site that never passes
 * a fourth argument keeps drawing the whole image, exactly as before this
 * parameter existed. The slicing branch only ever runs when BOTH the slot
 * declares `frames` AND the caller supplies one: a `frame` passed for a
 * slot with no `frames` block is silently ignored (there's no grid to cut a
 * cell out of), and a `frames`-bearing slot drawn with no `frame` argument
 * draws its whole sheet image, unsliced — the same "nothing to do beyond
 * the basic case" default every other slot already has.
 */
export function drawAssetSlot(ctx: CanvasRenderingContext2D, slot: AssetSlot, x: number, y: number, frame?: SpriteFrame): void {
  ensureAssetLoading(slot);
  const entry = entryFor(slot);
  const { x: boxX, y: boxY } = topLeftFor(slot, x, y);

  if (entry.ready && entry.img) {
    const rect = slot.frames && frame ? resolveFrameSourceRect(slot.frames, frame, entry.img.naturalWidth, entry.img.naturalHeight) : undefined;
    if (rect) {
      ctx.drawImage(entry.img, rect.sx, rect.sy, rect.sw, rect.sh, px(boxX), px(boxY), slot.width, slot.height);
      return;
    }
    // No slicing to do — either this slot has no `frames` (58 of 61 today),
    // the caller didn't pass one, or `resolveFrameSourceRect` declined a
    // malformed grid. Same whole-image draw every slot has always had.
    ctx.drawImage(entry.img, px(boxX), px(boxY), slot.width, slot.height);
    return;
  }
  drawPlaceholder(ctx, slot, boxX, boxY, slot.frames ? frame : undefined);
}

/** A small crosshair + dot at the slot's true anchor point, independent of
 * whether it's currently drawing real art or a placeholder — the gallery's
 * own "does this line up" check. Bright, saturated magenta on purpose: it
 * must never be mistaken for in-world content. */
export function drawAnchorMarker(ctx: CanvasRenderingContext2D, x: number, y: number, reach = 5): void {
  ctx.save();
  ctx.strokeStyle = '#ff2ec4';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px(x) - reach, px(y));
  ctx.lineTo(px(x) + reach, px(y));
  ctx.moveTo(px(x), px(y) - reach);
  ctx.lineTo(px(x), px(y) + reach);
  ctx.stroke();
  ctx.fillStyle = '#ff2ec4';
  ctx.beginPath();
  ctx.arc(px(x), px(y), 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export type { AnchorPoint, AssetCategory, AssetSlot, SpriteFrame };
export { ASSET_MANIFEST };
