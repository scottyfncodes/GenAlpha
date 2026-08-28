import { describe, expect, it } from 'vitest';
import { HIDDEN_PICKUPS } from './collectibles';
import { OBSTACLES } from './obstacles';
import { MATERIALS } from '../content/materials';

describe('HIDDEN_PICKUPS', () => {
  it('names a real obstacle, and a bush at that — the only reason a bush is walkable at all', () => {
    for (const pickup of HIDDEN_PICKUPS) {
      const obstacle = OBSTACLES.find((o) => o.id === pickup.obstacleId);
      expect(obstacle, `${pickup.obstacleId} should exist in OBSTACLES`).toBeTruthy();
      expect(obstacle?.kind, `${pickup.obstacleId} should be a bush`).toBe('bush');
    }
  });

  it('never lists the same bush twice', () => {
    const ids = HIDDEN_PICKUPS.map((p) => p.obstacleId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives a real quantity/cash to find, not an empty bush', () => {
    for (const pickup of HIDDEN_PICKUPS) {
      expect(Boolean(pickup.itemId) || Boolean(pickup.cash)).toBe(true);
    }
  });

  it('names only material ids that actually exist', () => {
    const materialIds = new Set(MATERIALS.map((m) => m.itemId));
    for (const pickup of HIDDEN_PICKUPS) {
      if (pickup.itemId) expect(materialIds.has(pickup.itemId)).toBe(true);
    }
  });

  /**
   * Regression guard: `bushings` gates `craft_board_2` and `craft_slingshot`
   * (content/materials.ts) and, before this pass, had no drop source
   * anywhere in the game — not a camera, not a junction box, not a bush —
   * which made both recipes quietly uncraftable.
   */
  it('gives bushings at least one drop source', () => {
    expect(HIDDEN_PICKUPS.some((p) => p.itemId === 'bushings')).toBe(true);
  });
});
