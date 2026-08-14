import { describe, expect, it } from 'vitest';
import { gravitate, GRAVITY_RADIUS } from './pursuit';

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
