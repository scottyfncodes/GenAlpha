import type { MarketEventInstance, SaveState } from './schema';
import { SAVE_VERSION, createNewSave } from './defaults';
import { prefersReducedMotion } from './env';

const KEY = 'static.save';

/**
 * localStorage is fine here — this ships as a real static site, not a
 * Claude.ai artifact. All reads/writes funnel through these functions so the
 * storage backend can be swapped later without touching game code.
 */
export function loadSave(): SaveState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw) as SaveState, prefersReducedMotion());
  } catch {
    return null;
  }
}

export function writeSave(state: SaveState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Quota or private-mode failure. Play continues; the session won't persist.
  }
}

export function clearSave(): void {
  localStorage.removeItem(KEY);
}

export function hasSave(): boolean {
  return localStorage.getItem(KEY) !== null;
}

/**
 * Version migrations. `prefersReduced` is passed in rather than read here so
 * this stays pure and testable.
 *
 * CHANGED: this used to add missing top-level keys and spread everything else
 * through untouched, which meant a save with a partial subtree stayed partial.
 * A save carrying `skills: {}` migrated "successfully" and then threw the
 * moment anything read `skills.hacking.tier`. It now merges against a fresh
 * save as a template, so every subtree is whole on the way out — the player's
 * values always win, defaults only fill genuine holes.
 */
export function migrate(save: SaveState, prefersReduced = false): SaveState {
  if (save.meta?.saveVersion === SAVE_VERSION) return save;

  const base = createNewSave(save.player?.name ?? 'unset');
  const day = save.world?.day ?? base.world.day;

  return {
    ...base,
    ...save,
    meta: { ...base.meta, ...save.meta, saveVersion: SAVE_VERSION },
    player: { ...base.player, ...save.player, flags: { ...save.player?.flags } },
    /*
     * Rebuilt field by field rather than spread, so `lastDecayAt` — the
     * wall-clock timestamp 0.3.0 replaced — doesn't ride along as dead weight
     * in every future save file.
     */
    heat: {
      current: save.heat?.current ?? base.heat.current,
      threshold_tier: save.heat?.threshold_tier ?? base.heat.threshold_tier,
      lastDecayDay: save.heat?.lastDecayDay ?? day,
      history: save.heat?.history ?? [],
    },
    skills: {
      sabotage: { ...base.skills.sabotage, ...save.skills?.sabotage },
      hacking: { ...base.skills.hacking, ...save.skills?.hacking },
      aiToolAccess: { ...base.skills.aiToolAccess, ...save.skills?.aiToolAccess },
      resistanceIntel: { ...base.skills.resistanceIntel, ...save.skills?.resistanceIntel },
    },
    relationships: { ...base.relationships, ...save.relationships },
    economy: {
      ...base.economy,
      ...save.economy,
      /*
       * 0.4.0 -> 0.5.0: `activeEvents` was a bare list of ids with no way to
       * expire. There is no honest conversion — an old entry has no start day
       * and no scope — so they are dropped rather than migrated into events
       * that would run forever. A dropped event costs the player nothing; the
       * next day advance re-rolls the ambient ones.
       */
      marketState: {
        ...base.economy.marketState,
        ...save.economy?.marketState,
        activeEvents: (save.economy?.marketState?.activeEvents ?? []).filter(
          (e): e is MarketEventInstance => typeof e === 'object' && e !== null && 'expiresOnDay' in e,
        ),
      },
      villainWallets: save.economy?.villainWallets ?? [],
      activeConsumables: save.economy?.activeConsumables ?? [],
    },
    missions: save.missions ?? {},
    /*
     * 0.6.0 -> 0.7.0 adds `surveillance`. Merged as its own subtree rather
     * than left to the outer spread for the reason this function's own doc
     * comment gives: a save carrying a *partial* surveillance object would
     * otherwise survive the merge partial and blow up the first time
     * `systems/coverage.ts` read `.armed` off it. A save from before the
     * coverage bar existed starts armed with no sweeps behind it, which is
     * exactly where a new game starts — the town has not swept yet.
     */
    world: {
      ...base.world,
      ...save.world,
      day,
      surveillance: { ...base.world.surveillance, ...save.world?.surveillance },
      /*
       * 0.7.0 -> 0.8.0 adds `incidents`. Merged as its own subtree for the
       * same reason `surveillance` is: a save carrying a *partial* incidents
       * object (an old save has none at all) would otherwise leave a kind
       * this version added reading as `undefined` instead of a real 0.
       */
      incidents: { ...base.world.incidents, ...save.world?.incidents },
    },
    settings: {
      ...base.settings,
      ...save.settings,
      // An old save has no stored preference, so fall back to the OS setting
      // rather than to `false` — this defaults toward the safer option.
      reducedFlicker: save.settings?.reducedFlicker ?? prefersReduced,
    },
  };
}
