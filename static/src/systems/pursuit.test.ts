import { describe, expect, it } from 'vitest';
import { gravitate, GRAVITY_RADIUS, underTreeCover } from './pursuit';

describe('gravitate', () => {
  it('never pulls at clear or watched', () => {
    const pos = { x: 0, y: 0 };
    const player = { x: 500, y: 0 };
    expect(gravitate(pos, player, 'clear', 1)).toEqual(pos);
    expect(gravitate(pos, player, 'watched', 1)).toEqual(pos);
  });

  it('pulls toward the player at flagged when within range', () => {
    const pos = { x: 0, y: 0 };
    const player = { x: 50, y: 0 };
    const after = gravitate(pos, player, 'flagged', 1);
    expect(after.x).toBeGreaterThan(0);
    expect(after.x).toBeLessThan(50);
  });

  it('does nothing once outside the gravity radius for that tier', () => {
    const pos = { x: 0, y: 0 };
    const player = { x: GRAVITY_RADIUS.flagged + 50, y: 0 };
    expect(gravitate(pos, player, 'flagged', 1)).toEqual(pos);
  });

  it('pulls harder at hunted than at flagged over the same time step', () => {
    const pos = { x: 0, y: 0 };
    const player = { x: 50, y: 0 };
    const flagged = gravitate(pos, player, 'flagged', 1);
    const hunted = gravitate(pos, player, 'hunted', 1);
    expect(hunted.x).toBeGreaterThan(flagged.x);
  });

  it('never overshoots the player in one step, even with a huge dt', () => {
    const pos = { x: 0, y: 0 };
    const player = { x: 50, y: 0 };
    const after = gravitate(pos, player, 'hunted', 100);
    expect(after.x).toBeLessThanOrEqual(50);
  });
});

describe('underTreeCover', () => {
  const trees = [
    { x: 100, y: 100, w: 20, h: 40, kind: 'tree' },
    { x: 300, y: 300, w: 20, h: 40, kind: 'bush' },
  ];

  it('is true standing inside a tree’s canopy', () => {
    expect(underTreeCover({ x: 110, y: 120 }, trees)).toBe(true);
  });

  it('is true just past the trunk rect, inside the canopy margin', () => {
    expect(underTreeCover({ x: 98, y: 120 }, trees)).toBe(true);
  });

  it('is false well clear of any tree', () => {
    expect(underTreeCover({ x: 500, y: 500 }, trees)).toBe(false);
  });

  it('ignores obstacles that aren’t trees, even standing right on one', () => {
    expect(underTreeCover({ x: 310, y: 320 }, trees)).toBe(false);
  });
});
