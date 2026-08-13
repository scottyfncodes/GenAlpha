import { describe, expect, it } from 'vitest';
import { canHackStreetNode, cashFor, effectiveTier, levelsFor, resolveStreetHack } from './streethacks';
import { createNewSave } from '../state/defaults';
import { STREET_HACK_NODES } from '../world/streethacks';
import { heatFor } from './missions';

const node = STREET_HACK_NODES[0]; // atm_5th, tier 1
const tier2Node = STREET_HACK_NODES.find((n) => n.tier === 2)!;

const withDeck = () => {
  const save = createNewSave('Wren');
  save.economy.inventory = [{ itemId: 'cyberdeck', quantity: 1, acquiredVia: 'purchase' }];
  return save;
};

describe('canHackStreetNode', () => {
  it('refuses without a cyberdeck, even on a fresh node', () => {
    const save = createNewSave('Wren');
    expect(canHackStreetNode(save, node)).toBe(false);
  });

  it('allows it once a cyberdeck is owned', () => {
    expect(canHackStreetNode(withDeck(), node)).toBe(true);
  });

  it('goes back on cooldown after a landed attempt', () => {
    const after = resolveStreetHack(withDeck(), node.id, 'clean');
    expect(canHackStreetNode(after, node)).toBe(false);
  });
});

describe('resolveStreetHack', () => {
  it('does nothing at all without a cyberdeck', () => {
    const save = createNewSave('Wren');
    const after = resolveStreetHack(save, node.id, 'clean');
    expect(after).toEqual(save);
  });

  it('pays full tier cash on a clean crack', () => {
    const save = withDeck();
    const after = resolveStreetHack(save, node.id, 'clean');
    expect(after.economy.cashOnHand).toBe(save.economy.cashOnHand + cashFor(node.tier));
    expect(after.heat.current).toBe(heatFor('hacking', 'clean'));
  });

  it('pays half, rounded up, on a messy crack', () => {
    const save = withDeck();
    const after = resolveStreetHack(save, node.id, 'messy');
    expect(after.economy.cashOnHand).toBe(save.economy.cashOnHand + Math.ceil(cashFor(node.tier) / 2));
  });

  it('pays nothing on a failed attempt, but still charges Heat and burns the machine', () => {
    const save = withDeck();
    const after = resolveStreetHack(save, node.id, 'failed');
    expect(after.economy.cashOnHand).toBe(save.economy.cashOnHand);
    expect(after.heat.current).toBe(heatFor('hacking', 'failed'));
    expect(canHackStreetNode(after, node)).toBe(false);
  });

  it('backing out costs a little Heat but leaves the machine available', () => {
    const save = withDeck();
    const after = resolveStreetHack(save, node.id, 'aborted');
    expect(after.economy.cashOnHand).toBe(save.economy.cashOnHand);
    expect(after.heat.current).toBe(heatFor('hacking', 'aborted'));
    expect(canHackStreetNode(after, node)).toBe(true);
  });

  it('is a no-op against a node on cooldown', () => {
    const first = resolveStreetHack(withDeck(), node.id, 'clean');
    const second = resolveStreetHack(first, node.id, 'clean');
    expect(second).toEqual(first);
  });

  it('gets the same burner-phone discount any other digital job gets', () => {
    const save = withDeck();
    save.economy.inventory.push({ itemId: 'burner_phone', quantity: 1, acquiredVia: 'purchase' });
    const after = resolveStreetHack(save, node.id, 'clean');
    expect(after.heat.current).toBeLessThan(heatFor('hacking', 'clean'));
  });

  it('pays the deep-level tier\'s cash, not the node\'s baked tier, when a harder level is chosen', () => {
    const save = withDeck();
    const after = resolveStreetHack(save, node.id, 'clean', 'deep');
    // atm_5th is tier 1; deep reads it as tier 2.
    expect(after.economy.cashOnHand).toBe(save.economy.cashOnHand + cashFor(2));
  });

  it('pays the quick-level tier\'s cash on an easier read', () => {
    const save = withDeck();
    const after = resolveStreetHack(save, tier2Node.id, 'clean', 'quick');
    expect(after.economy.cashOnHand).toBe(save.economy.cashOnHand + cashFor(1));
  });
});

describe('levelsFor', () => {
  it('has no quick option for a tier-1 node — nothing easier to offer', () => {
    expect(levelsFor(node)).toEqual(['standard', 'deep']);
  });

  it('offers all three for a middling tier', () => {
    expect(levelsFor(tier2Node)).toEqual(['quick', 'standard', 'deep']);
  });

  it('has no deep option for a tier-4 node — nothing harder to offer', () => {
    const tier4: typeof node = { ...node, tier: 4 };
    expect(levelsFor(tier4)).toEqual(['quick', 'standard']);
  });
});

describe('effectiveTier', () => {
  it('clamps at the floor and ceiling rather than going out of range', () => {
    expect(effectiveTier(node, 'quick')).toBe(1); // tier 1, would-be 0
    const tier4: typeof node = { ...node, tier: 4 };
    expect(effectiveTier(tier4, 'deep')).toBe(4); // would-be 5
  });

  it('shifts by exactly one tier either direction otherwise', () => {
    expect(effectiveTier(tier2Node, 'quick')).toBe(1);
    expect(effectiveTier(tier2Node, 'standard')).toBe(2);
    expect(effectiveTier(tier2Node, 'deep')).toBe(3);
  });
});
