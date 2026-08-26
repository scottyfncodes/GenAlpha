import { describe, expect, it } from 'vitest';
import { LOCATIONS } from './locations';
import { OBSTACLES } from './obstacles';
import { HIDDEN_PICKUP_OBSTACLE_IDS } from './collectibles';
import { SIGNAGE_NODES } from './signage';

/**
 * Same rule every other point object on the map is held to — see
 * `junctionboxes.test.ts`'s own doc comment. A sign has to sit somewhere the
 * player can actually walk up to, not inside a location's rect or a solid
 * obstacle.
 */
const SOLID_OBSTACLES = OBSTACLES.filter((o) => !HIDDEN_PICKUP_OBSTACLE_IDS.has(o.id));
const BLOCKERS: { x: number; y: number; w: number; h: number }[] = [...LOCATIONS, ...SOLID_OBSTACLES];

const NODE_PAD = 8;

function overlapsAny(x: number, y: number): { x: number; y: number; w: number; h: number } | undefined {
  return BLOCKERS.find(
    (rect) =>
      x - NODE_PAD < rect.x + rect.w &&
      x + NODE_PAD > rect.x &&
      y - NODE_PAD < rect.y + rect.h &&
      y + NODE_PAD > rect.y,
  );
}

describe('signage nodes sit clear of every building and solid obstacle', () => {
  it.each(SIGNAGE_NODES.map((n) => [n.id, n] as const))('%s', (_id, node) => {
    const hit = overlapsAny(node.x, node.y);
    expect(hit, `${node.id} at (${node.x},${node.y}) hit ${JSON.stringify(hit)}`).toBeUndefined();
  });
});

describe('every sign has a real joke', () => {
  it.each(SIGNAGE_NODES.map((n) => [n.id, n] as const))('%s before and after actually differ', (_id, node) => {
    expect(node.after).not.toBe(node.before);
    expect(node.before.length).toBeGreaterThan(0);
    expect(node.after.length).toBeGreaterThan(0);
  });

  it('gives every sign a distinct id', () => {
    const ids = SIGNAGE_NODES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
