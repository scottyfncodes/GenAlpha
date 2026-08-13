import { describe, expect, it } from 'vitest';
import {
  canHackStreetNode,
  cashFor,
  effectiveTier,
  HACK_KIND_MIN_TIER,
  levelsFor,
  resolveStreetHack,
} from './streethacks';
import { createNewSave } from '../state/defaults';
import { DECK_TIERS } from '../content/economy';
import { STREET_HACK_NODES } from '../world/streethacks';
import { heatFor } from './missions';

// Phone is the tier-1 kind — the baseline gating tests use this one so
// they're testing "owns a deck at all" rather than a specific kind's own
// minimum tier.
const phoneNode = STREET_HACK_NODES.find((n) => n.kind === 'phone')!;
const atmNode = STREET_HACK_NODES.find((n) => n.kind === 'atm')!;
const buildingNode = STREET_HACK_NODES.find((n) => n.kind === 'building')!;
const tier2AtmNode = STREET_HACK_NODES.find((n) => n.kind === 'atm' && n.tier === 2)!;

/** Grants exactly one deck tier — `craft_cyberdeck_N`'s recipes consume the
 * one below it, so a real save never holds two at once; this mirrors that. */
const withDeck = (tier: 1 | 2 | 3 | 4 | 5 = 1) => {
  const save = createNewSave('Wren');
  save.economy.inventory = [{ itemId: DECK_TIERS[tier - 1], quantity: 1, acquiredVia: 'purchase' }];
  return save;
};

describe('canHackStreetNode', () => {
  it('refuses without any deck, even on a fresh node', () => {
    const save = createNewSave('Wren');
    expect(canHackStreetNode(save, phoneNode)).toBe(false);
  });

  it('allows a phone once a burner deck (tier 1) is owned', () => {
    expect(canHackStreetNode(withDeck(1), phoneNode)).toBe(true);
  });

  it('refuses an ATM on a tier-1 deck — needs tier 2', () => {
    expect(canHackStreetNode(withDeck(1), atmNode)).toBe(false);
  });

  it('allows an ATM once the deck reaches tier 2', () => {
    expect(canHackStreetNode(withDeck(2), atmNode)).toBe(true);
  });

  it('refuses building systems below tier 4', () => {
    expect(canHackStreetNode(withDeck(3), buildingNode)).toBe(false);
  });

  it('allows building systems at tier 4', () => {
    expect(canHackStreetNode(withDeck(4), buildingNode)).toBe(true);
  });

  it('a higher deck tier still reaches every lower kind', () => {
    expect(canHackStreetNode(withDeck(5), phoneNode)).toBe(true);
    expect(canHackStreetNode(withDeck(5), atmNode)).toBe(true);
    expect(canHackStreetNode(withDeck(5), buildingNode)).toBe(true);
  });

  it('goes back on cooldown after a landed attempt', () => {
    const after = resolveStreetHack(withDeck(1), phoneNode.id, 'clean');
    expect(canHackStreetNode(after, phoneNode)).toBe(false);
  });
});

describe('resolveStreetHack', () => {
  it('does nothing at all without the kind-appropriate deck tier', () => {
    const save = withDeck(1);
    const after = resolveStreetHack(save, atmNode.id, 'clean');
    expect(after).toEqual(save);
  });

  it('pays full tier cash on a clean crack', () => {
    const save = withDeck(1);
    const after = resolveStreetHack(save, phoneNode.id, 'clean');
    expect(after.economy.cashOnHand).toBe(save.economy.cashOnHand + cashFor(phoneNode.tier));
    expect(after.heat.current).toBe(heatFor('hacking', 'clean'));
  });

  it('pays half, rounded up, on a messy crack', () => {
    const save = withDeck(1);
    const after = resolveStreetHack(save, phoneNode.id, 'messy');
    expect(after.economy.cashOnHand).toBe(save.economy.cashOnHand + Math.ceil(cashFor(phoneNode.tier) / 2));
  });

  it('pays nothing on a failed attempt, but still charges Heat and burns the machine', () => {
    const save = withDeck(1);
    const after = resolveStreetHack(save, phoneNode.id, 'failed');
    expect(after.economy.cashOnHand).toBe(save.economy.cashOnHand);
    expect(after.heat.current).toBe(heatFor('hacking', 'failed'));
    expect(canHackStreetNode(after, phoneNode)).toBe(false);
  });

  it('backing out costs a little Heat but leaves the machine available', () => {
    const save = withDeck(1);
    const after = resolveStreetHack(save, phoneNode.id, 'aborted');
    expect(after.economy.cashOnHand).toBe(save.economy.cashOnHand);
    expect(after.heat.current).toBe(heatFor('hacking', 'aborted'));
    expect(canHackStreetNode(after, phoneNode)).toBe(true);
  });

  it('is a no-op against a node on cooldown', () => {
    const first = resolveStreetHack(withDeck(1), phoneNode.id, 'clean');
    const second = resolveStreetHack(first, phoneNode.id, 'clean');
    expect(second).toEqual(first);
  });

  it('gets the same burner-phone discount any other digital job gets', () => {
    const save = withDeck(1);
    save.economy.inventory.push({ itemId: 'burner_phone', quantity: 1, acquiredVia: 'purchase' });
    const after = resolveStreetHack(save, phoneNode.id, 'clean');
    expect(after.heat.current).toBeLessThan(heatFor('hacking', 'clean'));
  });

  it('pays the deep-level tier\'s cash, not the node\'s baked tier, when a harder level is chosen', () => {
    const save = withDeck(1);
    const after = resolveStreetHack(save, phoneNode.id, 'clean', 'deep');
    // phoneNode is tier 1; deep reads it as tier 2.
    expect(after.economy.cashOnHand).toBe(save.economy.cashOnHand + cashFor(2));
  });

  it('pays the quick-level tier\'s cash on an easier read', () => {
    const save = withDeck(2);
    const after = resolveStreetHack(save, tier2AtmNode.id, 'clean', 'quick');
    expect(after.economy.cashOnHand).toBe(save.economy.cashOnHand + cashFor(1));
  });
});

describe('HACK_KIND_MIN_TIER', () => {
  it('unlocks phones first, then ATMs, then building systems last', () => {
    expect(HACK_KIND_MIN_TIER.phone).toBe(1);
    expect(HACK_KIND_MIN_TIER.atm).toBe(2);
    expect(HACK_KIND_MIN_TIER.building).toBe(4);
  });
});

describe('levelsFor', () => {
  it('has no quick option for a tier-1 node — nothing easier to offer', () => {
    expect(levelsFor(phoneNode)).toEqual(['standard', 'deep']);
  });

  it('offers all three for a middling tier', () => {
    expect(levelsFor(tier2AtmNode)).toEqual(['quick', 'standard', 'deep']);
  });

  it('has no deep option for a tier-4 node — nothing harder to offer', () => {
    const tier4: typeof phoneNode = { ...phoneNode, tier: 4 };
    expect(levelsFor(tier4)).toEqual(['quick', 'standard']);
  });
});

describe('effectiveTier', () => {
  it('clamps at the floor and ceiling rather than going out of range', () => {
    expect(effectiveTier(phoneNode, 'quick')).toBe(1); // tier 1, would-be 0
    const tier4: typeof phoneNode = { ...phoneNode, tier: 4 };
    expect(effectiveTier(tier4, 'deep')).toBe(4); // would-be 5
  });

  it('shifts by exactly one tier either direction otherwise', () => {
    expect(effectiveTier(tier2AtmNode, 'quick')).toBe(1);
    expect(effectiveTier(tier2AtmNode, 'standard')).toBe(2);
    expect(effectiveTier(tier2AtmNode, 'deep')).toBe(3);
  });
});
