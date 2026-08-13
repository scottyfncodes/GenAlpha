import { describe, expect, it } from 'vitest';
import { canSabotage, collectHidden } from './materials';
import { createNewSave } from '../state/defaults';
import { CAMERA_NODES } from '../world/collectibles';

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
