import { describe, expect, it } from 'vitest';
import { applyCatch, consequenceFor, HURT_UNTIL_DAY_FLAG } from './consequences';
import { createNewSave } from '../state/defaults';
import { HOME_LOCATION_ID } from '../world/locations';

const save = () => createNewSave('Wren');

describe('consequenceFor', () => {
  it('is nothing at clear — there are no patrols to be caught by that low', () => {
    expect(consequenceFor(save(), 'clear')).toBeNull();
  });

  it('escalates by tier below hunted', () => {
    expect(consequenceFor(save(), 'watched')?.id).toBe('shakedown');
    expect(consequenceFor(save(), 'flagged')?.id).toBe('call_parents');
  });

  it('is arrested the first time at hunted, and worse the second', () => {
    expect(consequenceFor(save(), 'hunted')?.id).toBe('arrested');

    const caughtBefore = {
      ...save(),
      player: { ...save().player, flags: { hunted_catch_count: true } },
    };
    expect(consequenceFor(caughtBefore, 'hunted')?.id).toBe('skull_cracked');
  });
});

describe('applyCatch', () => {
  it('does nothing at clear — no hard fail, and no consequence to have', () => {
    expect(applyCatch(save(), 'clear')).toEqual(save());
  });

  it('costs cash and Heat, and never takes cash below zero', () => {
    const broke = { ...save(), economy: { ...save().economy, cashOnHand: 5 } };
    const after = applyCatch(broke, 'watched');
    expect(after.economy.cashOnHand).toBe(0);
    expect(after.heat.current).toBeGreaterThan(broke.heat.current);
  });

  it('arrest costs a day, and stamps the flag that turns the next one worse', () => {
    const before = save();
    const after = applyCatch(before, 'hunted');
    expect(after.world.day).toBe(before.world.day + 1);
    expect(after.player.flags.hunted_catch_count).toBe(true);
  });

  it('a second hunted catch leaves a temporary speed debuff behind', () => {
    const caughtBefore = {
      ...save(),
      player: { ...save().player, flags: { hunted_catch_count: true } },
    };
    const after = applyCatch(caughtBefore, 'hunted');
    expect(after.player.flags[HURT_UNTIL_DAY_FLAG]).toBe(after.world.day + 1);
  });

  it('sends the player home, whatever they were caught doing and wherever they were', () => {
    for (const tier of ['watched', 'flagged', 'hunted'] as const) {
      const elsewhere = { ...save(), player: { ...save().player, currentLocation: 'town_square' } };
      const after = applyCatch(elsewhere, tier);
      expect(after.player.currentLocation).toBe(HOME_LOCATION_ID);
    }
  });

  it('never hard-fails — every field stays inside its own valid range regardless of tier', () => {
    for (const tier of ['clear', 'watched', 'flagged', 'hunted'] as const) {
      const after = applyCatch(save(), tier);
      expect(after.economy.cashOnHand).toBeGreaterThanOrEqual(0);
      expect(after.heat.current).toBeGreaterThanOrEqual(0);
      expect(after.heat.current).toBeLessThanOrEqual(100);
    }
  });
});
