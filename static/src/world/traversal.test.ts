import { describe, expect, it } from 'vitest';
import { OBSTACLES } from './obstacles';
import { GATE_CLEAR_HEAT_RELIEF, isGateOpen, MAX_BOARD_TIER, traversableObstacleIds, TRAVERSAL_GATES } from './traversal';

describe('TRAVERSAL_GATES', () => {
  it('every gate points at an obstacle id that actually exists', () => {
    const ids = new Set(OBSTACLES.map((o) => o.id));
    for (const gate of TRAVERSAL_GATES) {
      expect(ids.has(gate.obstacleId)).toBe(true);
    }
  });

  it('no gate asks for a board tier past the top of the trade-up line', () => {
    for (const gate of TRAVERSAL_GATES) {
      expect(gate.minBoardTier).toBeLessThanOrEqual(MAX_BOARD_TIER);
    }
  });

  it('a fence-line gate is never cheaper than a gate-kind one — the Hoverboard has to earn the bigger barrier', () => {
    const gateKindTiers = TRAVERSAL_GATES.filter((g) => g.id.startsWith('gate_')).map((g) => g.minBoardTier);
    const fenceKindTiers = TRAVERSAL_GATES.filter((g) => g.id.startsWith('fence_')).map((g) => g.minBoardTier);
    expect(Math.min(...fenceKindTiers)).toBeGreaterThan(Math.max(...gateKindTiers));
  });
});

describe('isGateOpen / traversableObstacleIds', () => {
  it('walking (tier 0) opens nothing', () => {
    expect(traversableObstacleIds(0).size).toBe(0);
  });

  it('a tier-3 board opens the gate-kind barriers but not the fence lines', () => {
    const open = traversableObstacleIds(3);
    expect(open.has('civic_gate')).toBe(true);
    expect(open.has('civic_fence_e')).toBe(false);
  });

  it('the Hoverboard (tier 5) opens everything on the list', () => {
    const open = traversableObstacleIds(5);
    for (const gate of TRAVERSAL_GATES) expect(open.has(gate.obstacleId)).toBe(true);
  });

  it('isGateOpen is consistent with the derived set', () => {
    for (const gate of TRAVERSAL_GATES) {
      expect(isGateOpen(gate, gate.minBoardTier)).toBe(true);
      expect(isGateOpen(gate, gate.minBoardTier - 1)).toBe(false);
    }
  });
});

describe('GATE_CLEAR_HEAT_RELIEF', () => {
  it('is a real, positive relief', () => {
    expect(GATE_CLEAR_HEAT_RELIEF).toBeGreaterThan(0);
  });
});
