import { describe, expect, it } from 'vitest';
import { frameColForTime, frameForCharacter, frameRowForDirection, resolveFrameSourceRect, type CharacterAnimationState } from './animation';
import { ASSET_MANIFEST, type AssetFrames } from './manifest';

const FOUR_WAY: AssetFrames = { cols: 3, rows: 4, directions: ['left', 'down', 'up', 'right'] };

describe('frameRowForDirection — direction selection', () => {
  it('resolves each compass direction to its declared row, in declared order', () => {
    expect(frameRowForDirection(FOUR_WAY, { x: -1, y: 0 })).toBe(0); // left
    expect(frameRowForDirection(FOUR_WAY, { x: 0, y: 1 })).toBe(1); // down
    expect(frameRowForDirection(FOUR_WAY, { x: 0, y: -1 })).toBe(2); // up
    expect(frameRowForDirection(FOUR_WAY, { x: 1, y: 0 })).toBe(3); // right
  });

  it('breaks a tie in favor of the horizontal axis — same rule world/draw.ts\'s facingDirection uses', () => {
    // |x| === |y|: horizontal wins.
    expect(frameRowForDirection(FOUR_WAY, { x: 1, y: 1 })).toBe(3); // right, not down
    expect(frameRowForDirection(FOUR_WAY, { x: -1, y: -1 })).toBe(0); // left, not up
  });

  it('picks whichever axis has the larger magnitude regardless of sign', () => {
    expect(frameRowForDirection(FOUR_WAY, { x: 0.1, y: -0.9 })).toBe(2); // up dominates
    expect(frameRowForDirection(FOUR_WAY, { x: -0.9, y: 0.1 })).toBe(0); // left dominates
  });

  it('falls back to row 0 for a direction set with no matching entry', () => {
    const noNames: AssetFrames = { cols: 3, rows: 4 };
    expect(frameRowForDirection(noNames, { x: -1, y: 0 })).toBe(0);
  });

  it('falls back to row 0 when directions is an empty array', () => {
    const empty: AssetFrames = { cols: 3, rows: 4, directions: [] };
    expect(frameRowForDirection(empty, { x: 1, y: 0 })).toBe(0);
  });

  it('never returns a row index outside a malformed grid\'s own bounds', () => {
    // 4 named directions but only 2 declared rows — directions.length
    // disagreeing with rows shouldn't happen for a real manifest entry
    // (manifest.test.ts asserts they match), but this function still has
    // to do something sane rather than hand back an out-of-range index.
    const mismatched: AssetFrames = { cols: 3, rows: 2, directions: ['left', 'down', 'up', 'right'] };
    const row = frameRowForDirection(mismatched, { x: 1, y: 0 }); // 'right' is index 3
    expect(row).toBeGreaterThanOrEqual(0);
    expect(row).toBeLessThan(2);
  });

  it('returns 0 for zero or negative rows rather than propagating garbage', () => {
    expect(frameRowForDirection({ cols: 3, rows: 0, directions: [] }, { x: 1, y: 0 })).toBe(0);
    expect(frameRowForDirection({ cols: 3, rows: -1, directions: [] }, { x: 1, y: 0 })).toBe(0);
  });
});

describe('frameColForTime — frame selection and animation timing', () => {
  it('holds the middle frame while not moving, same idle convention as world/draw.ts\'s walkFrame', () => {
    // walkFrame(now, false) always returns 1 for the game's own 3-frame
    // cycle — Math.floor(3 / 2) generalizes that exact frame.
    expect(frameColForTime(FOUR_WAY, 12345, false)).toBe(1);
    expect(frameColForTime({ cols: 5, rows: 1 }, 0, false)).toBe(2);
    expect(frameColForTime({ cols: 4, rows: 1 }, 999, false)).toBe(2);
  });

  it('cycles through every column at the default 150ms rate while moving', () => {
    expect(frameColForTime(FOUR_WAY, 0, true)).toBe(0);
    expect(frameColForTime(FOUR_WAY, 150, true)).toBe(1);
    expect(frameColForTime(FOUR_WAY, 300, true)).toBe(2);
    expect(frameColForTime(FOUR_WAY, 450, true)).toBe(0); // wraps
  });

  it('honors a caller-supplied frame rate', () => {
    expect(frameColForTime(FOUR_WAY, 0, true, 100)).toBe(0);
    expect(frameColForTime(FOUR_WAY, 100, true, 100)).toBe(1);
    expect(frameColForTime(FOUR_WAY, 200, true, 100)).toBe(2);
    expect(frameColForTime(FOUR_WAY, 300, true, 100)).toBe(0);
  });

  it('falls back to the default rate for a non-positive msPerFrame', () => {
    expect(frameColForTime(FOUR_WAY, 150, true, 0)).toBe(1);
    expect(frameColForTime(FOUR_WAY, 150, true, -50)).toBe(1);
  });

  it('returns 0 for zero or negative cols rather than dividing by zero', () => {
    expect(frameColForTime({ cols: 0, rows: 1 }, 500, true)).toBe(0);
    expect(frameColForTime({ cols: -2, rows: 1 }, 500, false)).toBe(0);
  });
});

describe('resolveFrameSourceRect — invalid/missing frame data', () => {
  it('divides a sheet\'s real decoded size by the declared grid', () => {
    const rect = resolveFrameSourceRect(FOUR_WAY, { col: 1, row: 2 }, 48, 88); // 16x22 per cell at 3x4
    expect(rect).toEqual({ sx: 16, sy: 44, sw: 16, sh: 22 });
  });

  it('clamps an out-of-range column or row to the nearest real cell', () => {
    expect(resolveFrameSourceRect(FOUR_WAY, { col: 99, row: 99 }, 48, 88)).toEqual({ sx: 32, sy: 66, sw: 16, sh: 22 });
  });

  it('clamps a negative column or row up to 0', () => {
    expect(resolveFrameSourceRect(FOUR_WAY, { col: -5, row: -5 }, 48, 88)).toEqual({ sx: 0, sy: 0, sw: 16, sh: 22 });
  });

  it('floors a non-integer column or row', () => {
    expect(resolveFrameSourceRect(FOUR_WAY, { col: 1.9, row: 0.4 }, 48, 88)).toEqual({ sx: 16, sy: 0, sw: 16, sh: 22 });
  });

  it('declines a grid with zero or negative cols/rows instead of dividing by zero', () => {
    expect(resolveFrameSourceRect({ cols: 0, rows: 4 }, { col: 0, row: 0 }, 48, 88)).toBeUndefined();
    expect(resolveFrameSourceRect({ cols: 3, rows: 0 }, { col: 0, row: 0 }, 48, 88)).toBeUndefined();
    expect(resolveFrameSourceRect({ cols: -1, rows: -1 }, { col: 0, row: 0 }, 48, 88)).toBeUndefined();
  });
});

describe('frameForCharacter — static asset fallback and backward compatibility', () => {
  const state: CharacterAnimationState = { facing: { x: 1, y: 0 }, now: 300, moving: true };

  it('resolves a frame for a slot that declares frames', () => {
    expect(frameForCharacter({ frames: FOUR_WAY }, state)).toEqual({ row: 3, col: 2 });
  });

  it('returns undefined for a slot with no frames block at all — the static-asset path', () => {
    expect(frameForCharacter({ frames: undefined }, state)).toBeUndefined();
  });

  it('every static slot in the real manifest (no frames declared) resolves to undefined', () => {
    const staticSlots = ASSET_MANIFEST.filter((s) => !s.frames);
    expect(staticSlots.length).toBeGreaterThan(0); // sanity: most of the manifest is static today
    for (const slot of staticSlots) {
      expect(frameForCharacter(slot, state), `${slot.id} should have no frame`).toBeUndefined();
    }
  });

  it('every animated slot in the real manifest resolves to an in-range frame', () => {
    const animatedSlots = ASSET_MANIFEST.filter((s) => s.frames);
    expect(animatedSlots.length).toBeGreaterThan(0); // sanity: character.player, character.npc.person today
    for (const slot of animatedSlots) {
      const frame = frameForCharacter(slot, state);
      expect(frame, `${slot.id} should resolve a frame`).toBeDefined();
      expect(frame!.col).toBeGreaterThanOrEqual(0);
      expect(frame!.col).toBeLessThan(slot.frames!.cols);
      expect(frame!.row).toBeGreaterThanOrEqual(0);
      expect(frame!.row).toBeLessThan(slot.frames!.rows);
    }
  });
});
