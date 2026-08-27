import { describe, expect, it } from 'vitest';
import {
  INVESTIGATE_DURATION_MS,
  INVESTIGATE_TRIGGER_RADIUS,
  investigate,
  isInvestigateActive,
} from './investigate';

describe('isInvestigateActive', () => {
  it('is false with no alert at all', () => {
    expect(isInvestigateActive(null, 1000)).toBe(false);
  });

  it('is true within the window and false once it expires', () => {
    const alert = { x: 0, y: 0, startedAtMs: 1000 };
    expect(isInvestigateActive(alert, 1000 + INVESTIGATE_DURATION_MS - 1)).toBe(true);
    expect(isInvestigateActive(alert, 1000 + INVESTIGATE_DURATION_MS + 1)).toBe(false);
  });
});

describe('investigate', () => {
  const alert = { x: 100, y: 100, startedAtMs: 0 };

  it('leaves a patrol outside the trigger radius untouched', () => {
    const far = { x: 100, y: 100 + INVESTIGATE_TRIGGER_RADIUS + 50 };
    expect(investigate(far, alert, 1)).toEqual(far);
  });

  it('pulls a nearby patrol toward the alert location', () => {
    const near = { x: 100, y: 100 + INVESTIGATE_TRIGGER_RADIUS - 20 };
    const after = investigate(near, alert, 0.1);
    const distBefore = Math.hypot(near.x - alert.x, near.y - alert.y);
    const distAfter = Math.hypot(after.x - alert.x, after.y - alert.y);
    expect(distAfter).toBeLessThan(distBefore);
  });

  it('never overshoots the alert location in one step', () => {
    const near = { x: 100, y: 105 };
    const after = investigate(near, alert, 10); // a huge dt
    expect(after).toEqual({ x: alert.x, y: alert.y });
  });
});
