import { describe, expect, it } from 'vitest';
import { LOCATIONS } from './locations';
import { OBSTACLES } from './obstacles';
import { HIDDEN_PICKUP_OBSTACLE_IDS } from './collectibles';
import { JUNCTION_BOX_NODES } from './junctionboxes';
import { BLUEPRINTS } from '../content/blueprints';
import { rollJunctionBoxLoot } from '../systems/materials';
import { grantItem } from '../systems/market';
import { createNewSave } from '../state/defaults';

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

});

/**
 * The invariant that replaced "every blueprint has exactly one junction
 * box". A box no longer names a plan, so per-box uniqueness is meaningless —
 * but the *reason* that test existed still matters, and matters more now
 * that contents are rolled: 100% blueprint collection has to stay reachable
 * by persistence rather than by luck.
 *
 * `rollJunctionBoxLoot` draws from the plans at a box's tier the player
 * hasn't found yet, so the guarantee reduces to a counting argument — as
 * long as each tier has at least as many boxes as it has plans, every plan
 * at that tier can be obtained, whatever order the rolls come out in.
 */
describe('every blueprint stays obtainable', () => {
  const tiers = [1, 2, 3, 4, 5] as const;

  it.each(tiers)('tier %i has at least as many boxes as plans', (tier) => {
    const boxes = JUNCTION_BOX_NODES.filter((n) => n.tier === tier).length;
    const plans = BLUEPRINTS.filter((b) => b.tier === tier).length;
    expect(boxes, `tier ${tier}: ${plans} plans but only ${boxes} boxes to find them in`).toBeGreaterThanOrEqual(
      plans,
    );
  });

  it('every blueprint sits in a tier some junction box actually serves', () => {
    const servedTiers = new Set(JUNCTION_BOX_NODES.map((n) => n.tier));
    for (const plan of BLUEPRINTS) {
      expect(servedTiers.has(plan.tier), `${plan.itemId} is tier ${plan.tier}, which no box serves`).toBe(true);
    }
  });

  /**
   * The counting argument in practice: crack boxes at a tier until the pool
   * is empty and check every plan actually arrived. This is the test that
   * would catch a roll that can repeat a plan the player already owns.
   */
  it.each(tiers)('tier %i pays out every one of its plans before repeating', (tier) => {
    const box = JUNCTION_BOX_NODES.find((n) => n.tier === tier)!;
    const expected = BLUEPRINTS.filter((b) => b.tier === tier).map((b) => b.itemId);
    let save = createNewSave('Wren');
    const found: string[] = [];

    for (let i = 0; i < expected.length; i++) {
      const loot = rollJunctionBoxLoot(save, box);
      expect(loot.kind, `tier ${tier} ran out of plans after ${i} of ${expected.length}`).toBe('blueprint');
      expect(found, `${loot.itemId} was handed out twice`).not.toContain(loot.itemId);
      found.push(loot.itemId);
      save = grantItem(save, loot.itemId, 1, 'theft');
    }

    expect(found.sort()).toEqual([...expected].sort());
    // ...and once the tier is mined out, the box pays salvage rather than nothing.
    expect(rollJunctionBoxLoot(save, box).kind).toBe('materials');
  });
});
