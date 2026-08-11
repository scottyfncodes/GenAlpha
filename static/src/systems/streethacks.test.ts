import { describe, expect, it } from 'vitest';
import { canHackStreetNode, cashFor, resolveStreetHack } from './streethacks';
import { createNewSave } from '../state/defaults';
import { STREET_HACK_NODES } from '../world/streethacks';
import { heatFor } from './missions';

const node = STREET_HACK_NODES[0]; // atm_5th, tier 1

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
});
