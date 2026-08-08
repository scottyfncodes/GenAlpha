import { describe, expect, it } from 'vitest';
import { createNewSave } from '../state/defaults';
import type { SaveState } from '../state/schema';
import { applyEffects } from './effects';
import { tierFor } from './heat';
import { buy, unavailableReason, quantityOf } from './market';
import { resolveRun } from './missions';
import {
  BURN_DAYS,
  SAFEHOUSE_LOCK,
  SAFEHOUSE_POWER,
  activeSafehouse,
  burnRoll,
  establish,
  hasUpgrade,
  install,
  safehouseBlocked,
  safehouseDecay,
  tickSafehouses,
} from './safehouse';
import { SAFEHOUSE_ID } from '../content/safehouse';

const rich = (cash = 2000): SaveState => {
  const save = createNewSave('Wren');
  return { ...save, economy: { ...save.economy, cashOnHand: cash } };
};

const withHouse = (cash = 2000) => establish(rich(cash), SAFEHOUSE_ID);

const at = (save: SaveState, current: number): SaveState => ({
  ...save,
  heat: { ...save.heat, current, threshold_tier: tierFor(current) },
});

const onDay = (save: SaveState, day: number): SaveState => ({
  ...save,
  world: { ...save.world, day },
});

describe('establishing one', () => {
  /** `world.safehouses` has been in the schema since 0.1.0 and empty until now. */
  it('starts with none', () => {
    expect(createNewSave('Wren').world.safehouses).toEqual([]);
  });

  it('is written by content, through an effect', () => {
    const after = applyEffects(createNewSave('Wren'), [
      { kind: 'safehouse', id: SAFEHOUSE_ID },
    ]);
    expect(after.world.safehouses).toHaveLength(1);
    expect(activeSafehouse(after)?.id).toBe(SAFEHOUSE_ID);
  });

  /** A scene re-entered mid-reload must not produce two of them. */
  it('cannot be established twice', () => {
    expect(establish(withHouse(), SAFEHOUSE_ID).world.safehouses).toHaveLength(1);
  });
});

describe('the two goods that had nowhere to go', () => {
  it('stays unbuyable while there is no safehouse', () => {
    expect(unavailableReason(rich(), SAFEHOUSE_LOCK)).toBe('Nowhere to put it yet.');
  });

  it('becomes buyable the moment there is one', () => {
    expect(unavailableReason(withHouse(), SAFEHOUSE_LOCK)).toBeNull();
  });

  /**
   * You cannot carry a power rig around. An item that sits in a bag doing
   * nothing is the kind of thing a player rightly stops trusting the market
   * about, so safehouse goods install where they belong.
   */
  it('installs rather than going into inventory', () => {
    const bought = buy(withHouse(), SAFEHOUSE_POWER);
    expect(quantityOf(bought, SAFEHOUSE_POWER)).toBe(0);
    expect(hasUpgrade(bought, SAFEHOUSE_POWER)).toBe(true);
    expect(bought.economy.cashOnHand).toBeLessThan(2000);
  });

  it('will not sell the same upgrade twice', () => {
    const once = buy(withHouse(), SAFEHOUSE_LOCK);
    expect(unavailableReason(once, SAFEHOUSE_LOCK)).toBe('Already in.');
    const twice = buy(once, SAFEHOUSE_LOCK);
    expect(twice.economy.cashOnHand).toBe(once.economy.cashOnHand);
  });

  /** The flagged Phase 5 imbalance, partly answered: somewhere for the money. */
  it('gives a heist payout something to be spent on', () => {
    let save = withHouse();
    save = buy(save, SAFEHOUSE_LOCK);
    save = buy(save, SAFEHOUSE_POWER);
    expect(activeSafehouse(save)?.upgrades).toHaveLength(2);
  });
});

describe('what the upgrades do', () => {
  it('makes a night at your own place worth more than a quiet kitchen', () => {
    const plain = safehouseDecay(withHouse());
    const powered = safehouseDecay(buy(withHouse(), SAFEHOUSE_POWER));
    expect(powered).toBeGreaterThan(plain);
  });

  /**
   * Module 03: the Lock "reduces chance of a safehouse being burned". Checked
   * across many seeds rather than one, because the roll is seeded per mission
   * and day and a single sample says nothing.
   */
  it('halves the chance of losing the place', () => {
    const count = (save: SaveState) => {
      let burned = 0;
      for (let day = 1; day <= 400; day++) {
        if (burnRoll(onDay(save, day), 'job')) burned++;
      }
      return burned;
    };
    const bare = count(at(withHouse(), 60));
    const locked = count(at(buy(withHouse(), SAFEHOUSE_LOCK), 60));
    expect(bare).toBeGreaterThan(0);
    expect(locked).toBeLessThan(bare);
  });
});

describe('burning, and coming back', () => {
  it('is only ever at risk when the town is already watching', () => {
    for (const heat of [0, 20, 40]) {
      let ever = false;
      for (let day = 1; day <= 200; day++) {
        if (burnRoll(onDay(at(withHouse(), heat), day), 'job')) ever = true;
      }
      expect(ever, `burned at heat ${heat}`).toBe(false);
    }
  });

  it('only ever risks it on a job that actually went wrong', () => {
    const hot = at(withHouse(), 60);
    const clean = resolveRun(hot, { missionId: 'x', kind: 'sabotage', outcome: 'clean' });
    expect(activeSafehouse(clean)).toBeDefined();
  });

  /**
   * And it always comes back. Losing a base permanently would be a hard fail
   * state wearing a different hat, which module 02 doesn't allow anywhere.
   */
  it('recovers on its own after a few days', () => {
    const burned = {
      ...withHouse(),
      world: {
        ...withHouse().world,
        safehouses: [{ id: SAFEHOUSE_ID, burned: true, burnedOnDay: 1, upgrades: [] }],
      },
    };
    expect(safehouseBlocked(burned)).toBeTruthy();
    expect(activeSafehouse(tickSafehouses(onDay(burned, 2)))).toBeUndefined();

    const back = tickSafehouses(onDay(burned, 1 + BURN_DAYS));
    expect(activeSafehouse(back)).toBeDefined();
    expect(safehouseBlocked(back)).toBeNull();
  });

  it('keeps the upgrades through a burn', () => {
    const locked = buy(withHouse(), SAFEHOUSE_LOCK);
    const burned = {
      ...locked,
      world: {
        ...locked.world,
        safehouses: locked.world.safehouses.map((s) => ({ ...s, burned: true, burnedOnDay: 1 })),
      },
    };
    const back = tickSafehouses(onDay(burned, 1 + BURN_DAYS));
    expect(hasUpgrade(back, SAFEHOUSE_LOCK)).toBe(true);
  });

  it('does nothing to a player who has no safehouse at all', () => {
    const none = at(rich(), 80);
    expect(burnRoll(none, 'job')).toBe(false);
    expect(safehouseBlocked(none)).toBeNull();
    expect(install(none, SAFEHOUSE_LOCK)).toEqual(none);
  });
});
