import { describe, expect, it } from 'vitest';
import { createNewSave } from '../state/defaults';
import type { SaveState } from '../state/schema';
import { applyEffects } from './effects';
import {
  DRAIN_HEAT,
  MAX_TRUST_PER_DRAIN,
  clueEffect,
  discoverEffects,
  drain,
  drainBlocked,
  drainPreview,
  hardenWallet,
  isDrained,
  methodsFor,
  walletOf,
} from './heist';
import { HELIO_OPS } from '../content/heist';
import { tierFor } from './heat';

const found = (): SaveState => applyEffects(createNewSave('Wren'), discoverEffects(HELIO_OPS));

const withClue = (save: SaveState, clueId: string) =>
  applyEffects(save, [clueEffect(HELIO_OPS, clueId)]);

const atHeat = (save: SaveState, current: number): SaveState => ({
  ...save,
  heat: { ...save.heat, current, threshold_tier: tierFor(current) },
});

describe('the target', () => {
  /*
   * The recon phase's whole output is discovering the wallet, so a save with
   * no wallets in it is the correct starting state — the player's save should
   * say what they know, not what exists.
   */
  it('starts unknown, and a new save carries no trace of it', () => {
    expect(createNewSave('Wren').economy.villainWallets).toEqual([]);
    expect(walletOf(createNewSave('Wren'), HELIO_OPS.walletId)).toBeUndefined();
  });

  it('copies balance and security tier in on discovery', () => {
    const wallet = walletOf(found(), HELIO_OPS.walletId);
    expect(wallet).toMatchObject({
      discovered: true,
      balance: HELIO_OPS.balance,
      securityTier: HELIO_OPS.securityTier,
    });
  });

  it('gates every method behind the clue that opens it', () => {
    const blind = methodsFor(found(), HELIO_OPS);
    expect(blind.every((m) => !m.open)).toBe(true);
    // And says which one is missing, rather than showing a dead option.
    expect(blind[0].missingClue).toBeDefined();

    const known = methodsFor(withClue(found(), 'delivery'), HELIO_OPS);
    expect(known.find((m) => m.method.id === 'physical_intercept')?.open).toBe(true);
    expect(known.find((m) => m.method.id === 'phishing_rig')?.open).toBe(false);
  });

  it('names a clue for every method, so no approach is unreachable', () => {
    for (const method of HELIO_OPS.methods) {
      expect(
        HELIO_OPS.clues.map((c) => c.id),
        `${method.id} needs a clue nothing defines`,
      ).toContain(method.requiresClue);
    }
  });

  it('records a clue once, however many times it’s found', () => {
    const twice = withClue(withClue(found(), 'delivery'), 'delivery');
    expect(walletOf(twice, HELIO_OPS.walletId)?.clues).toEqual(['delivery']);
  });
});

describe('what stops a drain', () => {
  it('won’t drain a wallet the player hasn’t found', () => {
    expect(drainBlocked(createNewSave('Wren'), HELIO_OPS.walletId)).toBeTruthy();
  });

  /** Module 02: some crypto actions are simply unavailable at hunted. */
  it('won’t attempt it while hunted — cool down first', () => {
    expect(drainBlocked(atHeat(found(), 90), HELIO_OPS.walletId)).toBeTruthy();
    expect(drainBlocked(found(), HELIO_OPS.walletId)).toBeNull();
  });

  it('won’t drain the same wallet twice', () => {
    const once = drain(found(), { walletId: HELIO_OPS.walletId, redistributeFraction: 0.5 });
    expect(drainBlocked(once, HELIO_OPS.walletId)).toBeTruthy();
    const twice = drain(once, { walletId: HELIO_OPS.walletId, redistributeFraction: 0.5 });
    expect(twice.economy.cashOnHand).toBe(once.economy.cashOnHand);
    expect(twice.economy.villainWalletsDrained).toHaveLength(1);
  });
});

describe('the drain', () => {
  const half = () => drain(found(), { walletId: HELIO_OPS.walletId, redistributeFraction: 0.5 });

  it('splits the money without losing or inventing any of it', () => {
    const after = half();
    const [record] = after.economy.villainWalletsDrained;
    expect(record.amountDrained).toBe(HELIO_OPS.balance);
    expect(record.redistributed + after.economy.cashOnHand).toBe(HELIO_OPS.balance);
  });

  it('empties the wallet without forgetting the player found it', () => {
    const wallet = walletOf(half(), HELIO_OPS.walletId);
    expect(wallet?.balance).toBe(0);
    expect(wallet?.discovered).toBe(true);
  });

  /**
   * The schema's own cross-module rule: a drain writes a Heat history entry and
   * a town-trust delta as well as the money. Theft isn't free narratively even
   * when it's a win, and these three going out of step is the exact failure
   * the rule exists to prevent — so they're asserted together.
   */
  it('charges Heat, logs it, and moves the town in one move', () => {
    const before = found();
    const after = half();
    expect(after.heat.current).toBe(before.heat.current + DRAIN_HEAT);
    expect(after.heat.history.some((h) => h.eventId.includes(HELIO_OPS.walletId))).toBe(true);
    expect(after.world.townTrust).toBeGreaterThan(before.world.townTrust);
  });

  it('costs the same Heat whichever way the money goes', () => {
    const generous = drain(found(), { walletId: HELIO_OPS.walletId, redistributeFraction: 1 });
    const selfish = drain(found(), { walletId: HELIO_OPS.walletId, redistributeFraction: 0 });
    expect(generous.heat.current).toBe(selfish.heat.current);
  });

  /*
   * Both extremes have to work. Module 03 says most play lands in between and
   * neither end is wrong, which means neither end is allowed to be a bug.
   */
  it('allows keeping all of it', () => {
    const kept = drain(found(), { walletId: HELIO_OPS.walletId, redistributeFraction: 0 });
    expect(kept.economy.cashOnHand).toBe(HELIO_OPS.balance);
    expect(kept.world.townTrust).toBe(found().world.townTrust);
  });

  it('allows giving all of it away', () => {
    const given = drain(found(), { walletId: HELIO_OPS.walletId, redistributeFraction: 1 });
    expect(given.economy.cashOnHand).toBe(0);
    expect(given.economy.villainWalletsDrained[0].redistributed).toBe(HELIO_OPS.balance);
  });

  it('clamps a nonsense fraction rather than paying out nonsense', () => {
    const over = drain(found(), { walletId: HELIO_OPS.walletId, redistributeFraction: 4 });
    expect(over.economy.cashOnHand).toBe(0);
    const under = drain(found(), { walletId: HELIO_OPS.walletId, redistributeFraction: -2 });
    expect(under.economy.cashOnHand).toBe(HELIO_OPS.balance);
  });

  it('caps what one drain can do to the town’s mood', () => {
    const given = drain(found(), { walletId: HELIO_OPS.walletId, redistributeFraction: 1 });
    expect(given.world.townTrust - found().world.townTrust).toBeLessThanOrEqual(MAX_TRUST_PER_DRAIN);
  });

  it('previews exactly what it will do before it does it', () => {
    const preview = drainPreview(found(), HELIO_OPS.walletId, 0.5);
    const after = drain(found(), { walletId: HELIO_OPS.walletId, redistributeFraction: 0.5 });
    expect(preview.kept).toBe(after.economy.cashOnHand);
    expect(preview.redistributed).toBe(after.economy.villainWalletsDrained[0].redistributed);
    expect(preview.heat).toBe(after.heat.current - found().heat.current);
  });
});

describe('a failed attempt', () => {
  it('hardens the target instead of walling the player out', () => {
    const once = hardenWallet(found(), HELIO_OPS.walletId);
    expect(walletOf(once, HELIO_OPS.walletId)?.securityTier).toBe('medium');
    const twice = hardenWallet(once, HELIO_OPS.walletId);
    expect(walletOf(twice, HELIO_OPS.walletId)?.securityTier).toBe('high');
    // And stops there — there is no tier at which the target becomes impossible.
    expect(walletOf(hardenWallet(twice, HELIO_OPS.walletId), HELIO_OPS.walletId)?.securityTier).toBe('high');
  });

  it('leaves the money where it is', () => {
    const hardened = hardenWallet(found(), HELIO_OPS.walletId);
    expect(walletOf(hardened, HELIO_OPS.walletId)?.balance).toBe(HELIO_OPS.balance);
    expect(isDrained(hardened, HELIO_OPS.walletId)).toBe(false);
  });
});
