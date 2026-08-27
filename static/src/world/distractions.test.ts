import { describe, expect, it } from 'vitest';
import { OBSTACLES } from './obstacles';
import { DISTRACTION_NODES } from './distractions';

describe('DISTRACTION_NODES', () => {
  it('every node points at a real, actually-parked-car obstacle', () => {
    const cars = new Map(OBSTACLES.filter((o) => o.kind === 'car').map((o) => [o.id, o]));
    for (const node of DISTRACTION_NODES) {
      const obstacle = cars.get(node.obstacleId);
      expect(obstacle, `${node.id} -> ${node.obstacleId}`).toBeDefined();
      expect(node.x).toBe(obstacle!.x);
      expect(node.y).toBe(obstacle!.y);
    }
  });

  it('ids are unique', () => {
    const ids = DISTRACTION_NODES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is a small, curated set, not every car on the map', () => {
    const totalCars = OBSTACLES.filter((o) => o.kind === 'car').length;
    expect(DISTRACTION_NODES.length).toBeLessThan(totalCars);
    expect(DISTRACTION_NODES.length).toBeGreaterThan(0);
  });
});
