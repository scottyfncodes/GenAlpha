import { describe, expect, it } from 'vitest';
import { droneSpeedForTier, hitRadiusForTier, resolveShot } from './droneshoot';

describe('drone shoot tuning', () => {
  it('gives a higher tool tier a bigger hit radius', () => {
    expect(hitRadiusForTier(2)).toBeGreaterThan(hitRadiusForTier(1));
    expect(hitRadiusForTier(3)).toBeGreaterThan(hitRadiusForTier(2));
  });

  it('gives a higher tool tier a calmer (slower) drone', () => {
    expect(droneSpeedForTier(2)).toBeLessThan(droneSpeedForTier(1));
    expect(droneSpeedForTier(3)).toBeLessThan(droneSpeedForTier(2));
  });
});

describe('resolveShot', () => {
  it('hits dead on, at every tier', () => {
    const drone = { x: 100, y: 80 };
    expect(resolveShot(drone, { x: 100, y: 80 }, 1)).toBe(true);
    expect(resolveShot(drone, { x: 100, y: 80 }, 3)).toBe(true);
  });

  it('misses a shot well outside even the most forgiving radius', () => {
    const drone = { x: 100, y: 80 };
    expect(resolveShot(drone, { x: 250, y: 10 }, 3)).toBe(false);
  });

  it('a shot that misses the slingshot’s tight radius lands for the EMP gun’s wide one', () => {
    const drone = { x: 100, y: 80 };
    const shot = { x: 100 + hitRadiusForTier(1) + 3, y: 80 };
    expect(resolveShot(drone, shot, 1)).toBe(false);
    expect(resolveShot(drone, shot, 3)).toBe(true);
  });

  it('is inclusive right at the radius boundary', () => {
    const drone = { x: 0, y: 0 };
    const r = hitRadiusForTier(2);
    expect(resolveShot(drone, { x: r, y: 0 }, 2)).toBe(true);
    expect(resolveShot(drone, { x: r + 0.5, y: 0 }, 2)).toBe(false);
  });
});
