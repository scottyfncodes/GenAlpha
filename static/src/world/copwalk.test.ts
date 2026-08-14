import { describe, expect, it } from 'vitest';
import { MAP_HEIGHT, MAP_WIDTH } from './locations';
import { COP_ROUTES, copTuning } from './copwalk';

describe('cop routes', () => {
  it('stays inside the map on every point, and has at least two of them', () => {
    for (const route of COP_ROUTES) {
      expect(route.points.length).toBeGreaterThanOrEqual(2);
      for (const p of route.points) {
        expect(p.x, `${route.id} x out of bounds`).toBeGreaterThanOrEqual(0);
        expect(p.x, `${route.id} x out of bounds`).toBeLessThanOrEqual(MAP_WIDTH);
        expect(p.y, `${route.id} y out of bounds`).toBeGreaterThanOrEqual(0);
        expect(p.y, `${route.id} y out of bounds`).toBeLessThanOrEqual(MAP_HEIGHT);
      }
    }
  });

  it('gives every route a distinct id', () => {
    const ids = COP_ROUTES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('escalation stage', () => {
  it('leaves clear silent at stage 0, same as before escalation existed', () => {
    expect(copTuning('clear', 0).activeRoutes).toBe(0);
  });

  it('brings a beat online at clear once the stage is high enough', () => {
    expect(copTuning('clear', 2).activeRoutes).toBeGreaterThan(0);
  });

  it('never activates more routes than actually exist', () => {
    expect(copTuning('hunted', 3).activeRoutes).toBeLessThanOrEqual(COP_ROUTES.length);
  });

  it('gives a stage-activated officer real speed and detection, not a frozen, blind one', () => {
    const tuning = copTuning('clear', 3);
    expect(tuning.speed).toBeGreaterThan(0);
    expect(tuning.detectionRadius).toBeGreaterThan(0);
  });
});
