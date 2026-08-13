import { describe, expect, it } from 'vitest';
import { canCraft, canDestroyJunctionBox, canSabotage, collectHidden, craft, destroyJunctionBox } from './materials';
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

  it('grants the blueprint and charges Heat scaled by tier, then goes on cooldown', () => {
    const save = createNewSave('Wren');
    const after = destroyJunctionBox(save, tier1.id);
    expect(after.economy.inventory.find((i) => i.itemId === tier1.blueprintItemId)?.quantity).toBe(1);
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
