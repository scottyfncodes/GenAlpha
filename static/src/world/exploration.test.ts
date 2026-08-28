import { describe, expect, it } from 'vitest';
import { createNewSave } from '../state/defaults';
import {
  cellCoords,
  cellStatus,
  exploredSnapshot,
  FOOT_REVEAL_RADIUS,
  GRID_H,
  GRID_W,
  initialExploration,
  revealArea,
} from './exploration';

/** A save with a blank exploration grid — `createNewSave` already carries
 * `initialExploration`'s own starting patch around Home, which every test
 * below would otherwise have to account for. */
function blankSave() {
  const save = createNewSave('Wren');
  return { ...save, world: { ...save.world, exploration: { explored: [], scouted: [] } } };
}

describe('initialExploration', () => {
  it('reveals a real patch around Home, not an empty grid', () => {
    const exploration = initialExploration();
    expect(exploration.explored.length).toBeGreaterThan(0);
    expect(exploration.scouted).toEqual([]);
  });
});

describe('revealArea', () => {
  it('marks cells within the radius as explored', () => {
    const save = revealArea(blankSave(), 500, 500, 64, 'explored');
    const snapshot = exploredSnapshot(save.world.exploration);
    expect(cellStatus(snapshot, Math.floor(500 / 32), Math.floor(500 / 32))).toBe('explored');
  });

  it('is a safe no-op — same state reference — once nothing in the circle is new', () => {
    const revealed = revealArea(blankSave(), 500, 500, FOOT_REVEAL_RADIUS, 'explored');
    const again = revealArea(revealed, 500, 500, FOOT_REVEAL_RADIUS, 'explored');
    expect(again).toBe(revealed);
  });

  it('still moves ground even on a second call from a nearby point, if it reaches new cells', () => {
    const revealed = revealArea(blankSave(), 500, 500, 40, 'explored');
    const moved = revealArea(revealed, 700, 500, 40, 'explored');
    expect(moved).not.toBe(revealed);
    expect(moved.world.exploration.explored.length).toBeGreaterThan(revealed.world.exploration.explored.length);
  });

  it('leaves cells outside the radius unknown', () => {
    const save = revealArea(blankSave(), 100, 100, 40, 'explored');
    const snapshot = exploredSnapshot(save.world.exploration);
    expect(cellStatus(snapshot, Math.floor(1500 / 32), Math.floor(1000 / 32))).toBe('unknown');
  });

  it('a scouted reveal never overwrites ground already explored', () => {
    const explored = revealArea(blankSave(), 500, 500, 60, 'explored');
    const scouted = revealArea(explored, 500, 500, 60, 'scouted');
    const snapshot = exploredSnapshot(scouted.world.exploration);
    expect(cellStatus(snapshot, Math.floor(500 / 32), Math.floor(500 / 32))).toBe('explored');
    // Nothing new was actually scouted — every cell in range was already
    // explored — so this should be the same no-op the second test above pins.
    expect(scouted).toBe(explored);
  });

  it('an explored reveal evicts the same ground from scouted — no cell needs to live in both', () => {
    const scouted = revealArea(blankSave(), 500, 500, 60, 'scouted');
    expect(scouted.world.exploration.scouted.length).toBeGreaterThan(0);
    const walked = revealArea(scouted, 500, 500, 60, 'explored');
    expect(walked.world.exploration.scouted).toEqual([]);
    const snapshot = exploredSnapshot(walked.world.exploration);
    expect(cellStatus(snapshot, Math.floor(500 / 32), Math.floor(500 / 32))).toBe('explored');
  });

  it('clips to the map edge rather than throwing near a corner', () => {
    expect(() => revealArea(blankSave(), 0, 0, 200, 'explored')).not.toThrow();
    expect(() => revealArea(blankSave(), 1600, 1100, 200, 'scouted')).not.toThrow();
  });
});

describe('cellCoords', () => {
  it('round-trips against the grid dimensions', () => {
    const index = 5 * GRID_W + 7;
    expect(cellCoords(index)).toEqual({ gx: 7, gy: 5 });
    expect(GRID_H).toBeGreaterThan(0);
  });
});
