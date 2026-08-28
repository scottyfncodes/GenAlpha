import type { SaveState } from '../state/schema';

/**
 * Blueprint ownership as knowledge, not cargo. A blueprint used to be a
 * plain inventory item (`content/blueprints.ts`'s own history) — this is
 * the read/write pair that replaced `owns`/`grantItem` for it: a flag on
 * `player.flags`, permanent, unsellable, untradeable, and never rendered
 * anywhere inventory is. The flag key is derived from the blueprint's own
 * `itemId` rather than stored as a second id, so there's exactly one name
 * for a given blueprint anywhere in the save.
 */
function blueprintFlagKey(itemId: string): string {
  return `${itemId}_unlocked`;
}

export function isBlueprintUnlocked(save: SaveState, itemId: string): boolean {
  return Boolean(save.player.flags[blueprintFlagKey(itemId)]);
}

/** Idempotent — unlocking an already-unlocked blueprint is a no-op, same
 * "no-op on nothing new" contract every other reveal/unlock in this game
 * follows. */
export function unlockBlueprint(save: SaveState, itemId: string): SaveState {
  if (isBlueprintUnlocked(save, itemId)) return save;
  return {
    ...save,
    player: { ...save.player, flags: { ...save.player.flags, [blueprintFlagKey(itemId)]: true } },
  };
}
