/**
 * CHARACTER ANIMATION SELECTION — pure functions only, no drawing, no
 * loading, no timers. Given a manifest slot's `frames` grid and a moment in
 * time, picks which cell of that grid to draw. `assetLoader.ts`'s job stays
 * "load, slice, draw"; this module's job is "which cell" — kept separate on
 * purpose (see `docs/art/genalpha-character-animation-architecture.md` §4).
 *
 * Deliberately mirrors `world/draw.ts`'s own `facingDirection`/`walkFrame`
 * rather than inventing a parallel convention: same dominant-axis-wins
 * compass logic, same "hold the middle/neutral frame while standing still"
 * idle rule, same default frame-swap rate (150ms). Those two functions stay
 * exactly where they are — this is the art-pipeline-side equivalent for
 * when a future run wires manifest-backed art into the live renderer, not a
 * replacement for the procedural character's own logic.
 *
 * Nothing in `world/draw.ts` imports this module.
 */
import type { AssetFrames, AssetSlot } from './manifest';

/** Which cell of a sliced sheet to draw — the same shape
 * `assetLoader.ts`'s `drawAssetSlot` takes as its optional `frame` arg. */
export interface SpriteFrame {
  col: number;
  row: number;
}

/**
 * Row index for a facing vector, by looking up the resolved compass
 * direction in the slot's own declared `directions` order. Same
 * dominant-axis tie-break `world/draw.ts`'s `facingDirection` uses
 * (horizontal wins a tie). Falls back to row 0 — the top row, whatever it
 * represents for a slot that doesn't name its rows as compass directions,
 * or one row shorter than expected — rather than a negative or out-of-range
 * index; a slot's `directions` array is expected to match `frames.rows`
 * (`manifest.test.ts` asserts this for every real entry), so this is a
 * defensive floor for malformed input, not a path any current slot takes.
 */
export function frameRowForDirection(frames: AssetFrames, facing: { x: number; y: number }): number {
  const rows = frames.rows;
  if (!Number.isFinite(rows) || rows <= 0) return 0;

  const directions = frames.directions;
  if (!directions || directions.length === 0) return 0;

  const direction = Math.abs(facing.x) >= Math.abs(facing.y) ? (facing.x < 0 ? 'left' : 'right') : facing.y < 0 ? 'up' : 'down';

  const row = directions.indexOf(direction);
  if (row < 0) return 0;
  return Math.min(row, rows - 1);
}

/** Default frame-swap rate — 150ms, the same cadence `world/draw.ts`'s
 * `walkFrame` already uses for the one animated character in the game. */
const DEFAULT_MS_PER_FRAME = 150;

/**
 * Column index for a moment in time. Standing still holds the middle frame
 * (`Math.floor(cols / 2)` — for the game's own 3-frame cycle that's frame 1,
 * exactly `walkFrame`'s hardcoded idle frame, generalized to any frame
 * count instead of assuming 3). Moving cycles through every column at
 * `msPerFrame` per step, wrapping — same `Math.floor(now / rate) % cols`
 * shape `walkFrame` already uses.
 */
export function frameColForTime(frames: AssetFrames, now: number, moving: boolean, msPerFrame = DEFAULT_MS_PER_FRAME): number {
  const cols = frames.cols;
  if (!Number.isFinite(cols) || cols <= 0) return 0;

  if (!moving) return Math.floor(cols / 2);

  const rate = msPerFrame > 0 ? msPerFrame : DEFAULT_MS_PER_FRAME;
  return Math.floor(now / rate) % cols;
}

/** The rectangle to read out of a loaded sheet image for one `{col, row}`
 * cell — everything `drawAssetSlot`'s slicing branch needs, computed with
 * no dependency on a real `<canvas>`/`Image` so it's directly testable. */
export interface FrameSourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * Resolves which rectangle of a loaded sheet image one `{col, row}` cell
 * occupies, given the sheet's own decoded pixel size. Per-frame source size
 * is *derived* from the real image, never declared in the manifest (see the
 * architecture doc §3) — a sheet's native resolution is the artist's own
 * choice; this just divides it by the grid.
 *
 * Returns `undefined` for a slot whose `frames.cols`/`rows` aren't both
 * positive — shouldn't happen for any real manifest entry
 * (`manifest.test.ts` requires both), but a malformed grid falls back to
 * "no slice" rather than dividing by zero. `col`/`row` are otherwise
 * clamped into range rather than trusted: an out-of-bounds or non-integer
 * index (a stale frame count, a hand-written bug) reads the nearest real
 * cell instead of a garbage or blank source rect.
 */
export function resolveFrameSourceRect(
  frames: AssetFrames,
  frame: SpriteFrame,
  naturalWidth: number,
  naturalHeight: number,
): FrameSourceRect | undefined {
  const { cols, rows } = frames;
  if (!(cols > 0) || !(rows > 0)) return undefined;

  const col = Math.min(Math.max(0, Math.floor(frame.col)), cols - 1);
  const row = Math.min(Math.max(0, Math.floor(frame.row)), rows - 1);
  const sw = naturalWidth / cols;
  const sh = naturalHeight / rows;
  return { sx: col * sw, sy: row * sh, sw, sh };
}

/** The state a character-class slot's animation is driven by — exactly the
 * three things `world/draw.ts`'s `drawPlayer`/`drawPedestrian` already
 * track today (a facing vector, a clock, and a moving flag), plus an
 * optional override of the default frame rate. */
export interface CharacterAnimationState {
  facing: { x: number; y: number };
  now: number;
  moving: boolean;
  msPerFrame?: number;
}

/**
 * The single entry point player/NPC call sites are expected to use:
 * resolves a slot's current `{col, row}` from its animation state, or
 * `undefined` when the slot isn't animated at all (`slot.frames` absent —
 * every static character in this game today: dog, cat, bird, and every
 * non-character slot). Passing that straight through to `drawAssetSlot`'s
 * optional `frame` parameter is the whole integration: `undefined` takes
 * the exact same whole-image path a static slot already draws today, no
 * separate static/animated branch for a caller to maintain.
 */
export function frameForCharacter(slot: Pick<AssetSlot, 'frames'>, state: CharacterAnimationState): SpriteFrame | undefined {
  if (!slot.frames) return undefined;
  return {
    row: frameRowForDirection(slot.frames, state.facing),
    col: frameColForTime(slot.frames, state.now, state.moving, state.msPerFrame),
  };
}
