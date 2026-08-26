import { describe, expect, it } from 'vitest';
import { createNewSave } from '../state/defaults';
import { canHackSignage, hackSignage } from './signage';
import { SIGNAGE_NODES } from '../world/signage';

/**
 * The cheapest interaction in the game — see `world/signage.ts`'s own doc
 * comment for why. These tests exist to defend exactly that: no tool, no
 * deck tier, nothing but the Heat cost and the cooldown.
 */
describe('hacking street signage', () => {
  it('needs no gear at all on a brand-new save', () => {
    const save = createNewSave('Wren');
    expect(canHackSignage(save, SIGNAGE_NODES[0])).toBe(true);
  });

  it('costs Heat and lands on the record', () => {
    const save = createNewSave('Wren');
    const node = SIGNAGE_NODES[0];
    const next = hackSignage(save, node.id);
    expect(next.heat.current).toBe(node.heatCost);
    expect(next.world.collectedNodes.some((c) => c.nodeId === node.id)).toBe(true);
  });

  it('goes on cooldown once hacked', () => {
    const save = createNewSave('Wren');
    const node = SIGNAGE_NODES[0];
    const hacked = hackSignage(save, node.id);
    expect(canHackSignage(hacked, node)).toBe(false);
  });

  it('is hackable again once its respawn window passes', () => {
    const save = createNewSave('Wren');
    const node = SIGNAGE_NODES[0];
    let s = hackSignage(save, node.id);
    s = { ...s, world: { ...s.world, day: s.world.day + node.respawnDays } };
    expect(canHackSignage(s, node)).toBe(true);
  });

  it('is a no-op on an unknown node id', () => {
    const save = createNewSave('Wren');
    expect(hackSignage(save, 'not_a_real_sign')).toBe(save);
  });

  it('is a no-op while already on cooldown', () => {
    const save = createNewSave('Wren');
    const node = SIGNAGE_NODES[0];
    const hacked = hackSignage(save, node.id);
    expect(hackSignage(hacked, node.id)).toBe(hacked);
  });

  it('bumps the Incident Book tally', () => {
    const save = createNewSave('Wren');
    const next = hackSignage(save, SIGNAGE_NODES[0].id);
    expect(next.world.incidents.signage_hacked).toBe(1);
  });
});
