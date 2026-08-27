import { describe, expect, it } from 'vitest';
import {
  canCraft,
  canDestroyJunctionBox,
  canDisableDrone,
  canFlyRecon,
  canKamikaze,
  canReconEmp,
  canSabotage,
  collectHidden,
  craft,
  destroyJunctionBox,
  disableDrone,
  flyRecon,
  kamikazeStrike,
  reconEmpCamera,
  rollJunctionBoxLoot,
} from './materials';
import { createNewSave } from '../state/defaults';
import { CAMERA_NODES } from '../world/collectibles';
import { JUNCTION_BOX_NODES } from '../world/junctionboxes';

const node = CAMERA_NODES[0];

describe('canSabotage', () => {
  it('refuses without bolt cutters, even on a maxed-out deck', () => {
    const save = createNewSave('Wren');
    save.economy.inventory = [{ itemId: 'cyberdeck_5', quantity: 1, acquiredVia: 'purchase' }];
    expect(canSabotage(save, node)).toBe(false);
  });

  it('refuses with bolt cutters but a deck below tier 3', () => {
    const save = createNewSave('Wren');
    save.economy.inventory = [
      { itemId: 'cyberdeck_2', quantity: 1, acquiredVia: 'purchase' },
      { itemId: 'bolt_cutters', quantity: 1, acquiredVia: 'purchase' },
    ];
    expect(canSabotage(save, node)).toBe(false);
  });

  it('allows it once both the tool and a tier-3+ deck are owned', () => {
    const save = createNewSave('Wren');
    save.economy.inventory = [
      { itemId: 'cyberdeck_3', quantity: 1, acquiredVia: 'purchase' },
      { itemId: 'bolt_cutters', quantity: 1, acquiredVia: 'purchase' },
    ];
    expect(canSabotage(save, node)).toBe(true);
  });
});

describe('collectHidden', () => {
  it('grants cash on a cash-only pickup, no item', () => {
    const save = createNewSave('Wren');
    const before = save.economy.cashOnHand;
    const after = collectHidden(save, 'filler_51'); // cash: 25
    expect(after.economy.cashOnHand).toBe(before + 25);
    expect(after.economy.inventory).toEqual(save.economy.inventory);
  });

  it('grants the material on an item-only pickup, no cash change', () => {
    const save = createNewSave('Wren');
    const before = save.economy.cashOnHand;
    const after = collectHidden(save, 'filler_2'); // battery_pack
    expect(after.economy.cashOnHand).toBe(before);
    expect(after.economy.inventory.find((i) => i.itemId === 'battery_pack')?.quantity).toBe(1);
  });
});

describe('canCraft — blueprint gating', () => {
  it('refuses a recipe with every material on hand but no blueprint', () => {
    const save = createNewSave('Wren');
    save.economy.inventory = [
      { itemId: 'hard_drive', quantity: 2, acquiredVia: 'found' },
      { itemId: 'cracked_chipset', quantity: 1, acquiredVia: 'found' },
    ];
    expect(canCraft(save, 'craft_signal_jammer')).toBe(false);
  });

  it('refuses a recipe with the blueprint but not enough materials', () => {
    const save = createNewSave('Wren');
    save.economy.inventory = [{ itemId: 'bp_signal_jammer', quantity: 1, acquiredVia: 'theft' }];
    expect(canCraft(save, 'craft_signal_jammer')).toBe(false);
  });

  it('allows it once both the blueprint and the materials are on hand, and craft does not consume the file', () => {
    const save = createNewSave('Wren');
    save.economy.inventory = [
      { itemId: 'bp_signal_jammer', quantity: 1, acquiredVia: 'theft' },
      { itemId: 'hard_drive', quantity: 2, acquiredVia: 'found' },
      { itemId: 'cracked_chipset', quantity: 1, acquiredVia: 'found' },
    ];
    expect(canCraft(save, 'craft_signal_jammer')).toBe(true);
    const after = craft(save, 'craft_signal_jammer');
    expect(after.economy.inventory.find((i) => i.itemId === 'signal_jammer')?.quantity).toBe(1);
    expect(after.economy.inventory.find((i) => i.itemId === 'bp_signal_jammer')?.quantity).toBe(1);
    expect(after.economy.inventory.find((i) => i.itemId === 'hard_drive')).toBeUndefined();
  });
});

describe('junction boxes', () => {
  const tier1 = JUNCTION_BOX_NODES.find((n) => n.tier === 1)!;
  const tier5 = JUNCTION_BOX_NODES.find((n) => n.tier === 5)!;

  it('is always destroyable off cooldown, no tool or deck required', () => {
    const save = createNewSave('Wren');
    expect(canDestroyJunctionBox(save, tier1)).toBe(true);
  });

  it('grants whatever it rolled and charges Heat scaled by tier, then goes on cooldown', () => {
    const save = createNewSave('Wren');
    const loot = rollJunctionBoxLoot(save, tier1);
    const after = destroyJunctionBox(save, tier1.id);
    expect(after.economy.inventory.find((i) => i.itemId === loot.itemId)?.quantity).toBe(loot.quantity);
    expect(after.heat.current).toBeGreaterThan(save.heat.current);
    expect(canDestroyJunctionBox(after, tier1)).toBe(false);
  });

  it('costs more Heat for a higher tier box', () => {
    const save = createNewSave('Wren');
    const lowRisk = destroyJunctionBox(save, tier1.id);
    const highRisk = destroyJunctionBox(save, tier5.id);
    expect(highRisk.heat.current).toBeGreaterThan(lowRisk.heat.current);
  });

  it('is a no-op on an unknown node id', () => {
    const save = createNewSave('Wren');
    expect(destroyJunctionBox(save, 'not_a_real_node')).toEqual(save);
  });
});

describe('drone takedowns', () => {
  it('refuses without any tool built', () => {
    const save = createNewSave('Wren');
    expect(canDisableDrone(save, 'drone_diagonal')).toBe(false);
  });

  it('a hit pays out the tool tier’s reward and goes on cooldown', () => {
    const save = createNewSave('Wren');
    save.economy.inventory = [{ itemId: 'slingshot', quantity: 1, acquiredVia: 'crafted' }];
    expect(canDisableDrone(save, 'drone_diagonal')).toBe(true);
    const after = disableDrone(save, 'drone_diagonal', true);
    expect(after.economy.inventory.find((i) => i.itemId === 'battery_pack')?.quantity).toBe(1);
    expect(after.heat.current).toBeGreaterThan(save.heat.current);
    expect(canDisableDrone(after, 'drone_diagonal')).toBe(false);
  });

  it('a miss pays out nothing, costs more Heat than any hit tier, and still goes on cooldown', () => {
    const save = createNewSave('Wren');
    save.economy.inventory = [{ itemId: 'emp_gun', quantity: 1, acquiredVia: 'crafted' }];
    const after = disableDrone(save, 'drone_diagonal', false);
    expect(after.economy.inventory).toEqual(save.economy.inventory);
    expect(after.heat.current - save.heat.current).toBeGreaterThan(2); // above the slingshot hit's own Heat cost
    expect(canDisableDrone(after, 'drone_diagonal')).toBe(false);
  });

  it('a better tool pays out less Heat on a hit than a worse one', () => {
    const slingshot = createNewSave('Wren');
    slingshot.economy.inventory = [{ itemId: 'slingshot', quantity: 1, acquiredVia: 'crafted' }];
    const empGun = createNewSave('Wren');
    empGun.economy.inventory = [{ itemId: 'emp_gun', quantity: 1, acquiredVia: 'crafted' }];
    const afterSlingshot = disableDrone(slingshot, 'drone_diagonal', true);
    const afterEmp = disableDrone(empGun, 'drone_diagonal', true);
    expect(afterEmp.heat.current - empGun.heat.current).toBeLessThan(afterSlingshot.heat.current - slingshot.heat.current);
  });
});

describe('recon flights', () => {
  it('refuses without any drone built', () => {
    const save = createNewSave('Wren');
    expect(canFlyRecon(save)).toBe(false);
  });

  it('a clean flight relieves Heat and never touches the inventory', () => {
    const save = createNewSave('Wren');
    save.heat = { ...save.heat, current: 30 };
    save.economy.inventory = [{ itemId: 'scout_drone', quantity: 1, acquiredVia: 'crafted' }];
    expect(canFlyRecon(save)).toBe(true);
    const after = flyRecon(save, true);
    expect(after.heat.current).toBeLessThan(save.heat.current);
    expect(after.economy.inventory).toEqual(save.economy.inventory);
  });

  it('a scrubbed flight costs Heat instead, and still keeps the drone', () => {
    const save = createNewSave('Wren');
    save.economy.inventory = [{ itemId: 'scout_drone', quantity: 1, acquiredVia: 'crafted' }];
    const after = flyRecon(save, false);
    expect(after.heat.current).toBeGreaterThan(save.heat.current);
    expect(after.economy.inventory).toEqual(save.economy.inventory);
  });

  it('a better airframe relieves more Heat on a clean flight', () => {
    const scout = createNewSave('Wren');
    scout.heat = { ...scout.heat, current: 40 };
    scout.economy.inventory = [{ itemId: 'scout_drone', quantity: 1, acquiredVia: 'crafted' }];
    const strike = createNewSave('Wren');
    strike.heat = { ...strike.heat, current: 40 };
    strike.economy.inventory = [{ itemId: 'strike_drone', quantity: 1, acquiredVia: 'crafted' }];
    const afterScout = flyRecon(scout, true);
    const afterStrike = flyRecon(strike, true);
    expect(strike.heat.current - afterStrike.heat.current).toBeGreaterThan(scout.heat.current - afterScout.heat.current);
  });

  it('a flight that actually found things relieves more Heat than one that circled and came home', () => {
    const save = createNewSave('Wren');
    save.heat = { ...save.heat, current: 40 };
    save.economy.inventory = [{ itemId: 'scout_drone', quantity: 1, acquiredVia: 'crafted' }];
    const nothingFound = flyRecon(save, true, 0);
    const foundThree = flyRecon(save, true, 3);
    expect(save.heat.current - foundThree.heat.current).toBeGreaterThan(save.heat.current - nothingFound.heat.current);
  });
});

describe('recon EMP', () => {
  it('is not available on the base Scout airframe', () => {
    const save = createNewSave('Wren');
    save.economy.inventory = [{ itemId: 'scout_drone', quantity: 1, acquiredVia: 'crafted' }];
    expect(canReconEmp(save, node.id)).toBe(false);
  });

  it('opens up at Tier 2 and costs Heat but no parts, on the camera\'s own cooldown log', () => {
    const save = createNewSave('Wren');
    save.economy.inventory = [
      { itemId: 'recon_drone', quantity: 1, acquiredVia: 'crafted' },
      { itemId: 'bolt_cutters', quantity: 1, acquiredVia: 'crafted' },
      { itemId: 'cyberdeck_3', quantity: 1, acquiredVia: 'purchase' },
    ];
    expect(canReconEmp(save, node.id)).toBe(true);
    // A housing standing and reachable on foot too, before the EMP lands.
    expect(canSabotage(save, node)).toBe(true);
    const after = reconEmpCamera(save, node.id);
    expect(after.heat.current).toBeGreaterThan(save.heat.current);
    expect(after.economy.inventory).toEqual(save.economy.inventory);
    expect(canReconEmp(after, node.id)).toBe(false);
    // Shares the camera's own cooldown log, so a physical sabotage can't
    // stack on top of a housing that's already dark from an EMP.
    expect(canSabotage(after, node)).toBe(false);
  });

  it('is a no-op on an unknown camera id', () => {
    const save = createNewSave('Wren');
    save.economy.inventory = [{ itemId: 'strike_drone', quantity: 1, acquiredVia: 'crafted' }];
    expect(reconEmpCamera(save, 'not_a_real_node')).toEqual(save);
  });
});

describe('kamikaze strikes', () => {
  const camera = CAMERA_NODES[0];
  const junction = JUNCTION_BOX_NODES[0];

  it('refuses without any drone built', () => {
    const save = createNewSave('Wren');
    expect(canKamikaze(save, { kind: 'camera', id: camera.id })).toBe(false);
  });

  it('a landed hit on a camera pays double its featured part, at zero Heat, and consumes the drone', () => {
    const save = createNewSave('Wren');
    save.economy.inventory = [{ itemId: 'scout_drone', quantity: 1, acquiredVia: 'crafted' }];
    const after = kamikazeStrike(save, { kind: 'camera', id: camera.id }, true);
    expect(after.economy.inventory.find((i) => i.itemId === camera.itemId)?.quantity).toBe(2);
    expect(after.economy.inventory.find((i) => i.itemId === 'scout_drone')).toBeUndefined();
    expect(after.heat.current).toBe(save.heat.current);
    expect(canKamikaze(after, { kind: 'camera', id: camera.id })).toBe(false);
  });

  it('a landed hit on a junction box pays what the box held and consumes the drone', () => {
    const save = createNewSave('Wren');
    save.economy.inventory = [{ itemId: 'recon_drone', quantity: 1, acquiredVia: 'crafted' }];
    const after = kamikazeStrike(save, { kind: 'junction', id: junction.id }, true);
    // Rolled off the post-removal save, exactly as `kamikazeStrike` does.
    const loot = rollJunctionBoxLoot({ ...save, economy: { ...save.economy, inventory: [] } }, junction);
    expect(after.economy.inventory.find((i) => i.itemId === loot.itemId)?.quantity).toBe(loot.quantity);
    expect(after.economy.inventory.find((i) => i.itemId === 'recon_drone')).toBeUndefined();
  });

  it('a crash pays out nothing, costs Heat, consumes the drone anyway, and leaves the target standing', () => {
    const save = createNewSave('Wren');
    save.economy.inventory = [{ itemId: 'strike_drone', quantity: 1, acquiredVia: 'crafted' }];
    const after = kamikazeStrike(save, { kind: 'camera', id: camera.id }, false);
    expect(after.economy.inventory.find((i) => i.itemId === camera.itemId)).toBeUndefined();
    expect(after.economy.inventory.find((i) => i.itemId === 'strike_drone')).toBeUndefined();
    expect(after.heat.current).toBeGreaterThan(save.heat.current);
    // The drone's gone (that's the point of "kamikaze"), but the *target*
    // itself never went on cooldown — rebuild a drone and it's still there.
    const rearmed = { ...after, economy: { ...after.economy, inventory: [{ itemId: 'strike_drone', quantity: 1, acquiredVia: 'crafted' as const }] } };
    expect(canKamikaze(rearmed, { kind: 'camera', id: camera.id })).toBe(true);
  });

  it('is a no-op on an unknown target id', () => {
    const save = createNewSave('Wren');
    save.economy.inventory = [{ itemId: 'scout_drone', quantity: 1, acquiredVia: 'crafted' }];
    expect(kamikazeStrike(save, { kind: 'camera', id: 'not_a_real_node' }, true)).toEqual(save);
  });
});
