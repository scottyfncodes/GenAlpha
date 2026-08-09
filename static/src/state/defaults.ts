import type { SaveState } from './schema';
import { prefersReducedMotion } from './env';

export const SAVE_VERSION = '0.6.0';

export function createNewSave(name: string): SaveState {
  const now = new Date().toISOString();
  return {
    meta: { saveVersion: SAVE_VERSION, createdAt: now, lastPlayedAt: now, playtimeSeconds: 0 },
    player: {
      name,
      currentChapter: 'act1_glitch_01',
      currentLocation: 'home',
      flags: {},
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
    world: { townTrust: 50, safehouses: [], day: 1, collectedNodes: [] },
    settings: {
      textSpeed: 'normal',
      audioMuted: false,
      reducedFlicker: prefersReducedMotion(),
    },
  };
}
