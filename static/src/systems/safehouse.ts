import type { SaveState, Safehouse } from '../state/schema';
import { mulberry32, seedFrom } from './rng';

/**
 * SAFEHOUSES — the last thing in the schema that nothing wrote.
 *
 * `world.safehouses` has been in `save-schema.json` since 0.1.0, and module 03
 * ships two catalog items for it (Reinforced Lock, Off-grid Power Rig), and
 * there has never been a safehouse. The two items listed unbuyable with
 * "Nowhere to put it yet." showing next to them, which was the honest holding
 * position and is now over.
 *
 * WHAT IS SPEC'D AND WHAT IS INFERRED, because the difference matters:
 *
 *   Spec'd (module 03): the Lock "reduces chance of a safehouse being burned";
 *   the Power Rig "unlocks safehouse as a base for higher-tier missions".
 *
 *   Inferred here: *what burns one*. No module says. The reading taken is the
 *   one the rest of the game already implies — a job that goes wrong while the
 *   town is already watching you. So a failed mission at `flagged` or above can
 *   burn it, the Lock halves that chance, and a burned safehouse comes back on
 *   its own after a few days rather than being lost. Nothing in this game is
 *   permanently taken away from the player and Heat never hard-fails anything
 *   (module 02, guardrail 1).
 *
 *   Also inferred: "a base for higher-tier missions" is read as somewhere you
 *   can actually stay and work, so the Power Rig makes lying low there properly
 *   restful rather than gating a tier. Tiers are story-gated everywhere else in
 *   this codebase and adding a second gate on a purchase would make the skill
 *   progression buyable, which the whole design refuses.
 */

export const SAFEHOUSE_LOCK = 'safehouse_upgrade_lock';
export const SAFEHOUSE_POWER = 'safehouse_upgrade_power';

/** Base chance a failed job at flagged+ burns the place. Halved by the Lock. */
export const BURN_CHANCE = 0.25;
/** Days a burned safehouse stays burned. It always comes back. */
export const BURN_DAYS = 4;

/** Lying low somewhere that is actually yours. Better with power. */
export const SAFEHOUSE_DECAY = 16;
export const SAFEHOUSE_DECAY_POWERED = 22;

export function safehouseOf(save: SaveState, id: string): Safehouse | undefined {
  return save.world.safehouses.find((s) => s.id === id);
}

/** The one the player is currently using, if any is usable. */
export function activeSafehouse(save: SaveState): Safehouse | undefined {
  return save.world.safehouses.find((s) => !s.burned);
}

export function hasSafehouse(save: SaveState): boolean {
  return save.world.safehouses.length > 0;
}

export function hasUpgrade(save: SaveState, upgradeId: string): boolean {
  return save.world.safehouses.some((s) => s.upgrades.includes(upgradeId));
}

/** Establishing one. Idempotent — a scene re-entered can't create two. */
export function establish(save: SaveState, id: string): SaveState {
  if (safehouseOf(save, id)) return save;
  const safehouse: Safehouse = { id, burned: false, upgrades: [] };
  return { ...save, world: { ...save.world, safehouses: [...save.world.safehouses, safehouse] } };
}

/**
 * Installing an upgrade. Safehouse goods don't go into inventory — you cannot
 * carry a power rig around, and an item that sits in a bag doing nothing is
 * the kind of thing a player rightly stops trusting the market about.
 */
export function install(save: SaveState, upgradeId: string): SaveState {
  const target = save.world.safehouses[0];
  if (!target || target.upgrades.includes(upgradeId)) return save;
  return {
    ...save,
    world: {
      ...save.world,
      safehouses: save.world.safehouses.map((s) =>
        s.id === target.id ? { ...s, upgrades: [...s.upgrades, upgradeId] } : s,
      ),
    },
  };
}

/** How much Heat a night here takes off, given what's been installed. */
export function safehouseDecay(save: SaveState): number {
  return hasUpgrade(save, SAFEHOUSE_POWER) ? SAFEHOUSE_DECAY_POWERED : SAFEHOUSE_DECAY;
}

/**
 * Whether a job going wrong takes the place with it.
 *
 * Seeded on the mission and the day so a reload can't reroll it — the same
 * rule the market's raid roll follows, and for the same reason: a consequence
 * the player can retry away isn't one.
 */
export function burnRoll(save: SaveState, missionId: string): boolean {
  if (!activeSafehouse(save)) return false;
  const tier = save.heat.threshold_tier;
  if (tier !== 'flagged' && tier !== 'hunted') return false;
  const chance = hasUpgrade(save, SAFEHOUSE_LOCK) ? BURN_CHANCE / 2 : BURN_CHANCE;
  return mulberry32(seedFrom(`burn:${missionId}:${save.world.day}`))() < chance;
}

export function burn(save: SaveState, day: number): SaveState {
  const target = activeSafehouse(save);
  if (!target) return save;
  return {
    ...save,
    world: {
      ...save.world,
      safehouses: save.world.safehouses.map((s) =>
        s.id === target.id ? { ...s, burned: true, burnedOnDay: day } : s,
      ),
    },
  };
}

/**
 * Burned places come back. Called wherever the day advances, so a player who
 * loses their base gets it back by carrying on rather than by doing anything
 * in particular — losing it for good would be a hard fail wearing a hat.
 */
export function tickSafehouses(save: SaveState): SaveState {
  if (!save.world.safehouses.some((s) => s.burned)) return save;
  return {
    ...save,
    world: {
      ...save.world,
      safehouses: save.world.safehouses.map((s) =>
        s.burned && save.world.day - (s.burnedOnDay ?? save.world.day) >= BURN_DAYS
          ? { ...s, burned: false, burnedOnDay: undefined }
          : s,
      ),
    },
  };
}

/** Why the player can't use the place, or null. Same shape as the market's. */
export function safehouseBlocked(save: SaveState): string | null {
  if (!hasSafehouse(save)) return null;
  return activeSafehouse(save) ? null : 'Somebody’s been in. Give it a week.';
}
