import { describe, expect, it } from 'vitest';
import { LOCATIONS } from './locations';
import { OBSTACLES } from './obstacles';
import { CAMERA_NODES, HIDDEN_PICKUP_OBSTACLE_IDS } from './collectibles';
import { STREET_HACK_NODES } from './streethacks';

/**
 * Same rule `junctionboxes.test.ts` already holds junction boxes to,
 * applied to the map's other two point-object families — a camera or a
 * street hack node has to sit somewhere the player can actually walk up
 * to, not inside a location's rect or a solid obstacle. Junction boxes had
 * this coverage; cameras and street hacks didn't, which is exactly the gap
 * that let a district reshuffle place one wrong without anything catching
 * it.
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

describe('camera nodes sit clear of every building and solid obstacle', () => {
  it.each(CAMERA_NODES.map((n) => [n.id, n] as const))('%s', (_id, node) => {
    const hit = overlapsAny(node.x, node.y);
    expect(hit, `${node.id} at (${node.x},${node.y}) hit ${JSON.stringify(hit)}`).toBeUndefined();
  });
});

describe('street hack nodes sit clear of every building and solid obstacle', () => {
  it.each(STREET_HACK_NODES.map((n) => [n.id, n] as const))('%s', (_id, node) => {
    const hit = overlapsAny(node.x, node.y);
    expect(hit, `${node.id} at (${node.x},${node.y}) hit ${JSON.stringify(hit)}`).toBeUndefined();
  });
});
