import { describe, expect, it } from 'vitest';
import { MAP_HEIGHT, MAP_WIDTH } from './locations';
import { PATROL_ROUTES, patrolTuning } from './patrols';

describe('patrol routes', () => {
  it('stays inside the map on every point, and has at least two of them', () => {
    for (const route of PATROL_ROUTES) {
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
    const ids = PATROL_ROUTES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('escalation stage', () => {
  it('leaves clear silent at stage 0, same as before escalation existed', () => {
    expect(patrolTuning('clear', 0).activeRoutes).toBe(0);
  });

  it('brings a van online at clear once the stage is high enough', () => {
    expect(patrolTuning('clear', 1).activeRoutes).toBeGreaterThan(0);
  });

  it('never activates more routes than actually exist', () => {
    expect(patrolTuning('hunted', 3).activeRoutes).toBeLessThanOrEqual(PATROL_ROUTES.length);
  });

  it('keeps a stage-activated van at a passive, non-hunting beat', () => {
    const tuning = patrolTuning('clear', 3);
    expect(tuning.hunting).toBe(false);
  });
});
