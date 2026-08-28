import type { SaveState } from '../state/schema';
import { deckTier, owns } from '../systems/market';

/**
 * The physical-obstacle progression, per the Player-Freedom Audit's #1 item:
 * a small, curated set of specific obstacles (never a whole class of them —
 * every other fence and gate on the map stays permanent) that the player can
 * see and bounce off long before they own the thing that opens them, then
 * physically clear for good once they do.
 *
 * `id` names an actual entry in `world/obstacles.ts` `OBSTACLES` — this is
 * the one obstacle of its kind on the whole map that's ever anything other
 * than permanent scenery. `flag` is a `player.flags` boolean, the same
 * "knowledge/state that never needs its own schema field" mechanism
 * `systems/blueprints.ts` already established — cleared once, persists
 * forever, no migration needed.
 *
 * Both targets were picked for what's already on the other side of them,
 * not at random: the substation fence backs onto the tier-heavy junction-box
 * ground `world/junctionboxes.ts`'s own comment already calls out, and the
 * Data Centre gate is Bellhaven's actual antagonist building
 * (`world/locations.ts`'s `data_center`) — cutting/opening either one is
 * supposed to feel like it was worth remembering, not like a tutorial prop.
 */
export interface ClearableObstacle {
  id: string;
  kind: 'fence' | 'gate';
  flag: string;
  /** Button label once the player actually has what it takes. */
  actionLabel: string;
  /** What's stopping them, read off the same ownership check `requires`
   * makes — shown next to a disabled prompt, never a bare "LOCKED". */
  lockedHint: string;
  requires: (save: SaveState) => boolean;
  heatCost: number;
  /** Pickup-style toast copy once it's done. */
  toastKicker: string;
  toastDetail: string;
}

export const CLEARABLE_OBSTACLES: ClearableObstacle[] = [
  {
    id: 'sub_fence_e',
    kind: 'fence',
    flag: 'cleared_sub_fence_e',
    actionLabel: 'Cut the fence',
    lockedHint: 'Chain-link, cut-proof to bare hands. Needs Bolt Cutters.',
    requires: (save) => owns(save, 'bolt_cutters'),
    heatCost: 3,
    toastKicker: 'FENCE CUT',
    toastDetail: 'A way into the substation yard, from now on.',
  },
  {
    id: 'civic_gate',
    kind: 'gate',
    flag: 'opened_civic_gate',
    actionLabel: 'Override the gate arm',
    lockedHint: 'The arm reads a badge, not a face. Needs a Cracked Deck (rig tier 3).',
    requires: (save) => deckTier(save) >= 3,
    heatCost: 5,
    toastKicker: 'GATE OVERRIDDEN',
    toastDetail: 'The Data Centre’s own gate, open because you told it to be.',
  },
];

export const CLEARABLE_OBSTACLES_BY_ID: Record<string, ClearableObstacle> = Object.fromEntries(
  CLEARABLE_OBSTACLES.map((c) => [c.id, c]),
);

export function isObstacleCleared(save: SaveState, id: string): boolean {
  const target = CLEARABLE_OBSTACLES_BY_ID[id];
  return target ? Boolean(save.player.flags[target.flag]) : false;
}

/** Every cleared obstacle's own id, for the collision filter and the draw
 * pass — computed fresh each call rather than cached, same as every other
 * derived-from-flags set in this codebase (cheap: two entries, checked once
 * a frame). */
export function clearedObstacleIds(save: SaveState): Set<string> {
  return new Set(CLEARABLE_OBSTACLES.filter((c) => isObstacleCleared(save, c.id)).map((c) => c.id));
}
