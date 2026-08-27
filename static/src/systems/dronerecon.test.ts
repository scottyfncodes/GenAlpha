import { describe, expect, it } from 'vitest';
import {
  canEmpFromAir,
  isRevealed,
  poisInRange,
  RECON_REVEAL_RADIUS,
  RECON_SCAN_RADIUS,
  reconHeatRelief,
  type ReconPoi,
} from './dronerecon';

describe('poisInRange', () => {
  const center = { x: 500, y: 500 };

  it('includes a camera inside the scan radius and excludes one outside it', () => {
    const near = [{ id: 'cam_near', x: 500, y: 500 + RECON_SCAN_RADIUS - 1 }];
    const far = [{ id: 'cam_far', x: 500, y: 500 + RECON_SCAN_RADIUS + 50 }];
    const pois = poisInRange(center, [...near, ...far], [], []);
    expect(pois.map((p) => p.id)).toEqual(['cam_near']);
  });

  it('includes a junction box in range and names its tier', () => {
    const pois = poisInRange(center, [], [{ id: 'junction_1', x: 510, y: 510, tier: 3 }], []);
    expect(pois).toHaveLength(1);
    expect(pois[0].kind).toBe('junction');
    expect(pois[0].label).toContain('Tier 3');
  });

  it('contributes at most one POI per patrol route, at its nearest in-range point', () => {
    const route = {
      id: 'beat_1',
      points: [
        { x: 0, y: 0 }, // out of range
        { x: 505, y: 505 }, // in range
        { x: 520, y: 520 }, // also in range — shouldn't double up
      ],
    };
    const pois = poisInRange(center, [], [], [route]);
    expect(pois).toHaveLength(1);
    expect(pois[0].id).toBe('patrol_beat_1');
  });

  it('finds nothing when nothing is nearby', () => {
    expect(poisInRange(center, [], [], [])).toEqual([]);
  });
});

describe('isRevealed', () => {
  const poi: ReconPoi = { id: 'cam_1', kind: 'camera', x: 100, y: 100, label: 'FLACK camera' };

  it('is false until the drone is within the reveal radius', () => {
    expect(isRevealed({ x: 100, y: 100 + RECON_REVEAL_RADIUS + 1 }, poi)).toBe(false);
  });

  it('is true once the drone is close enough', () => {
    expect(isRevealed({ x: 100, y: 100 + RECON_REVEAL_RADIUS - 1 }, poi)).toBe(true);
  });
});

describe('reconHeatRelief', () => {
  it('pays out something even when nothing was found', () => {
    expect(reconHeatRelief(1, 0)).toBeGreaterThan(0);
  });

  it('pays more the more was actually discovered', () => {
    expect(reconHeatRelief(1, 3)).toBeGreaterThan(reconHeatRelief(1, 0));
  });

  it('a better airframe pays more at the same discovery count', () => {
    expect(reconHeatRelief(3, 2)).toBeGreaterThan(reconHeatRelief(1, 2));
  });
});

describe('canEmpFromAir', () => {
  it('is not available on the base Scout airframe', () => {
    expect(canEmpFromAir(1)).toBe(false);
  });

  it('opens up at tier 2', () => {
    expect(canEmpFromAir(2)).toBe(true);
    expect(canEmpFromAir(3)).toBe(true);
  });
});
