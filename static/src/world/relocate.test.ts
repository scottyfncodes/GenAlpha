import { describe, expect, it } from 'vitest';
import { isOnScreen, relocatedPosition } from './relocate';

describe('relocatedPosition', () => {
  const siblings = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 100, y: 0 },
    { id: 'c', x: 200, y: 0 },
  ];

  it('never picks the node’s own original position', () => {
    for (let day = 0; day < 30; day++) {
      const result = relocatedPosition(siblings[0], siblings, day, new Set());
      expect(result).not.toEqual({ x: 0, y: 0 });
    }
  });

  it('is deterministic for the same node/day pair', () => {
    const a = relocatedPosition(siblings[0], siblings, 7, new Set());
    const b = relocatedPosition(siblings[0], siblings, 7, new Set());
    expect(a).toEqual(b);
  });

  it('picks different respawns across different days at least sometimes', () => {
    const results = new Set<string>();
    for (let day = 0; day < 20; day++) {
      const r = relocatedPosition(siblings[0], siblings, day, new Set());
      results.add(`${r.x},${r.y}`);
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it('never picks a position already claimed this frame', () => {
    const used = new Set(['100,0']);
    for (let day = 0; day < 30; day++) {
      const result = relocatedPosition(siblings[0], siblings, day, used);
      expect(result).toEqual({ x: 200, y: 0 });
    }
  });

  it('falls back to its own position if every sibling is claimed', () => {
    const used = new Set(['100,0', '200,0']);
    const result = relocatedPosition(siblings[0], siblings, 3, used);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('falls back to its own position with no siblings at all', () => {
    const result = relocatedPosition(siblings[0], [], 3, new Set());
    expect(result).toEqual({ x: 0, y: 0 });
  });
});

describe('isOnScreen', () => {
  it('is true for a point inside the viewport', () => {
    expect(isOnScreen(50, 50, 0, 0, 100, 100)).toBe(true);
  });

  it('is true just past the edge, inside the margin', () => {
    expect(isOnScreen(-10, 50, 0, 0, 100, 100, 24)).toBe(true);
  });

  it('is false well outside the viewport and its margin', () => {
    expect(isOnScreen(500, 500, 0, 0, 100, 100)).toBe(false);
  });
});
