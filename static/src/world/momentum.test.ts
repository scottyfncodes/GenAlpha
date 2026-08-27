import { describe, expect, it } from 'vitest';
import { easeSpeed, momentumTuningFor } from './momentum';

describe('momentumTuningFor', () => {
  it('walking (tier 0) accelerates and decelerates far faster than any board tier', () => {
    const walk = momentumTuningFor(0);
    for (let tier = 1; tier <= 5; tier++) {
      const board = momentumTuningFor(tier);
      expect(walk.accelPerSec).toBeGreaterThan(board.accelPerSec);
      expect(walk.decelPerSec).toBeGreaterThan(board.decelPerSec);
    }
  });

  it('every board tier shares the same curve — the board has a feel, not five', () => {
    const t1 = momentumTuningFor(1);
    const t5 = momentumTuningFor(5);
    expect(t5).toEqual(t1);
  });
});

describe('easeSpeed', () => {
  const tuning = { accelPerSec: 100, decelPerSec: 200 };

  it('steps toward the target at the accel rate when speeding up', () => {
    expect(easeSpeed(0, 50, 0.1, tuning)).toBeCloseTo(10, 5);
  });

  it('steps toward the target at the decel rate when slowing down', () => {
    expect(easeSpeed(50, 0, 0.1, tuning)).toBeCloseTo(30, 5);
  });

  it('never overshoots the target in one step', () => {
    expect(easeSpeed(48, 50, 1, tuning)).toBe(50);
    expect(easeSpeed(2, 0, 1, tuning)).toBe(0);
  });

  it('holds steady once it reaches the target', () => {
    expect(easeSpeed(50, 50, 0.1, tuning)).toBe(50);
  });
});
