import { describe, expect, it } from 'vitest';
import { createNewSave, SAVE_VERSION } from './defaults';
import { migrate } from './persistence';
import type { SaveState } from './schema';

describe('save migration', () => {
  it('brings a 0.1.0 save forward without losing anything', () => {
    const old = {
      meta: { saveVersion: '0.1.0', createdAt: 'x', lastPlayedAt: 'x', playtimeSeconds: 90 },
      player: { name: 'Wren', currentChapter: 'act1_glitch_04', currentLocation: 'home', flags: { casey_missing_noticed: true } },
      heat: { current: 7, threshold_tier: 'clear', lastDecayAt: '2026-01-01T00:00:00Z', history: [] },
      skills: {},
      relationships: { nova: { trust: 45, metAt: 'act1_glitch_01' } },
      economy: { cashOnHand: 0, cryptoWallets: [], inventory: [], marketState: { prices: {}, activeEvents: [] }, villainWalletsDrained: [] },
      world: { townTrust: 50, safehouses: [] },
      settings: { textSpeed: 'normal', audioMuted: false },
    } as unknown as SaveState;

    const next = migrate(old, true);

    // Asserted against the constant, not a literal: a version bump is not a
    // reason for this test to need editing, and pinning the literal here is
    // how it would start lying about what it checks.
    expect(next.meta.saveVersion).toBe(SAVE_VERSION);
    expect(next.world.day).toBe(1);
    expect(next.missions).toEqual({});
    expect(next.heat.lastDecayDay).toBe(1);
    // An old save has no stored preference: fall back to the OS one, not false.
    expect(next.settings.reducedFlicker).toBe(true);
    // Nothing the player earned is dropped.
    expect(next.player.name).toBe('Wren');
    expect(next.relationships.nova.trust).toBe(45);
    expect(next.player.flags.casey_missing_noticed).toBe(true);
    // 0.5.0 subtrees an older save can't have had.
    expect(next.economy.villainWallets).toEqual([]);
    expect(next.economy.activeConsumables).toEqual([]);
  });

  it('is idempotent', () => {
    const fresh = createNewSave('Wren');
    expect(migrate(migrate(fresh))).toEqual(fresh);
  });

  /*
   * The test above asserted on name, trust and one flag — all of which survive
   * a shallow spread — so it passed while `skills: {}` came out the far side
   * still empty, and the next thing to read `skills.hacking.tier` threw. A
   * migration that returns a save the game cannot load has not migrated it.
   */
  it('returns whole subtrees, not just the keys that happened to be asserted', () => {
    const partial = {
      meta: { saveVersion: '0.1.0' },
      player: { name: 'Wren', currentChapter: 'act1_glitch_04', currentLocation: 'home' },
      heat: { current: 7 },
      skills: {},
      relationships: {},
    } as unknown as SaveState;

    const next = migrate(partial);

    expect(next.skills.hacking).toMatchObject({ unlocked: false, tier: 0 });
    expect(next.skills.sabotage).toMatchObject({ unlocked: false, tier: 0 });
    expect(next.skills.aiToolAccess.trustedMode).toBe(false);
    expect(next.skills.resistanceIntel.compromised).toBe(false);
    expect(next.economy.inventory).toEqual([]);
    expect(next.world.day).toBe(1);
    // 0.8.0 subtree an older save can't have had — a partial incidents
    // object should never leave a kind reading as `undefined`.
    expect(next.world.incidents).toEqual({
      camera_disabled: 0,
      junction_box_cracked: 0,
      signage_hacked: 0,
      street_hack_landed: 0,
      drone_downed: 0,
      times_caught: 0,
    });
    expect(next.settings.textSpeed).toBe('normal');
    expect(next.player.flags).toEqual({});
    expect(next.heat.current).toBe(7);
    // The wall-clock field 0.3.0 replaced does not survive into the new save.
    expect((next.heat as unknown as Record<string, unknown>).lastDecayAt).toBeUndefined();
  });
});
