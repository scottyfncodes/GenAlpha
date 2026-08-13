import { describe, expect, it } from 'vitest';
import { LOCATIONS } from './locations';
import { OBSTACLES } from './obstacles';
import { HIDDEN_PICKUP_OBSTACLE_IDS } from './collectibles';
import { JUNCTION_BOX_NODES } from './junctionboxes';

/**
 * Same rule every other point object on the map is held to (`npcs.test.ts`,
 * and the camera/street-hack nodes' own hand-checked coordinates): a
 * junction box has to sit somewhere the player can actually walk up to,
 * not inside a location's rect or a solid obstacle.
 */
const SOLID_OBSTACLES = OBSTACLES.filter((o) => !HIDDEN_PICKUP_OBSTACLE_IDS.has(o.id));
const BLOCKERS: { x: number; y: number; w: number; h: number }[] = [...LOCATIONS, ...SOLID_OBSTACLES];

const NODE_PAD = 8; // half the 16px footprint every point object on this map uses

function overlapsAny(x: number, y: number): { x: number; y: number; w: number; h: number } | undefined {
  return BLOCKERS.find(
    (rect) =>
      x - NODE_PAD < rect.x + rect.w &&
      x + NODE_PAD > rect.x &&
      y - NODE_PAD < rect.y + rect.h &&
      y + NODE_PAD > rect.y,
  );
}

describe('junction box nodes sit clear of every building and solid obstacle', () => {
  it.each(JUNCTION_BOX_NODES.map((n) => [n.id, n] as const))('%s', (_id, node) => {
    const hit = overlapsAny(node.x, node.y);
    expect(hit, `${node.id} at (${node.x},${node.y}) hit ${JSON.stringify(hit)}`).toBeUndefined();
  });

  it('every blueprint has exactly one junction box', () => {
    const seen = new Set<string>();
    for (const node of JUNCTION_BOX_NODES) {
      expect(seen.has(node.blueprintItemId), `${node.blueprintItemId} appears more than once`).toBe(false);
      seen.add(node.blueprintItemId);
    }
  });
});
