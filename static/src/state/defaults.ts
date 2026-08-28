import type { SaveState, StoryFlags } from './schema';
import { prefersReducedMotion } from './env';
import { backupNameFor, collidingCharacter, NAME_SWAP_FROM_FLAG, NAME_SWAP_TO_FLAG } from '../systems/names';
import { initialExploration } from '../world/exploration';

export const SAVE_VERSION = '0.8.0';

/**
 * `handle` defaults to `name` when omitted — every existing test and the
 * migration path in `persistence.ts` call this with one argument, and for
 * both, "no handle was ever chosen" should mean exactly what it meant
 * before this field existed: kids call the player by their name too.
 */
export function createNewSave(name: string, handle: string = name): SaveState {
  const now = new Date().toISOString();
  /*
   * Decided once, here, and never revisited — the swap is stamped into the
   * flags a fresh save starts with, so every render from the very first
   * scene onward reads the same resolved name. See systems/names.ts.
   */
  const collision = collidingCharacter(name);
  const flags: StoryFlags = collision
    ? { [NAME_SWAP_FROM_FLAG]: collision, [NAME_SWAP_TO_FLAG]: backupNameFor(collision) }
    : {};
  return {
    meta: { saveVersion: SAVE_VERSION, createdAt: now, lastPlayedAt: now, playtimeSeconds: 0 },
    player: {
      name,
      handle,
      currentChapter: 'act1_glitch_01',
      currentLocation: 'home',
      flags,
    },
    heat: { current: 0, threshold_tier: 'clear', lastDecayDay: 1, history: [] },
    skills: {
      sabotage: { unlocked: false, mentor: 'deja', tier: 0 },
      hacking: { unlocked: false, mentor: 'files', tier: 0 },
      aiToolAccess: { unlocked: false, mentor: 'milo', trustedMode: false },
      resistanceIntel: { unlocked: false, mentor: 'bishop', compromised: false },
    },
    // Ellen is already the protagonist's friend at game start (Act 1, beat 1) —
    // the one relationship that exists before the player earns any others.
    relationships: { nova: { trust: 35, metAt: 'act1_glitch_01' } },
    economy: {
      cashOnHand: 0,
      cryptoWallets: [],
      inventory: [],
      marketState: { prices: {}, activeEvents: [] },
      villainWallets: [],
      villainWalletsDrained: [],
      activeConsumables: [],
    },
    missions: {},
    world: {
      townTrust: 50,
      safehouses: [],
      day: 1,
      collectedNodes: [],
      surveillance: { sweeps: 0, armed: true, lastSweepDay: 0 },
      exploration: initialExploration(),
    },
    settings: {
      textSpeed: 'normal',
      audioMuted: false,
      reducedFlicker: prefersReducedMotion(),
    },
  };
}
