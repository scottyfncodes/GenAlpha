import type { SaveState } from '../state/schema';
import { addCash } from '../systems/market';
import { applyHeat } from '../systems/heat';
import { markCollected, onCooldown } from '../systems/materials';

/**
 * Bishop's actual mentor payoff — Player-Freedom Audit item #4. Both his
 * branches and Deja's/Files' all grant a skill; his is the one that never
 * had anywhere in the world to spend it (`resistanceIntel.unlocked` used to
 * be read only by Act 2/3 dialogue and the Ending). This is that place: a
 * dead drop inside the Annex fence line, the same compound his whole mentor
 * arc plays out at (`content/mentors/bishop.ts`'s `locationId: 'annex_fence'`
 * on every scene). Genuinely hidden rather than just locked — nothing here
 * renders or prompts at all without the flag, the same "you can't see what
 * you don't know to look for" the brief's own "hidden contact" example asks
 * for, not a fenced-off thing with a sign on it.
 *
 * Sits inside the compound (`world/obstacles.ts`'s `filler_78`, the gap the
 * Annex fence has always had, or the Prototype Hoverboard's own way over
 * `filler_77`) rather than gating entry itself — Bishop's knowledge is
 * about what's worth checking once you're already in, not a second door.
 */
export const DEAD_DROP_ID = 'annex_dead_drop';
/**
 * Just east of the Annex fence line, in the narrow strip past `filler_78`
 * — the gap in that fence the story already calls "the gap somebody keeps
 * re-opening" (`world/obstacles.ts`, `world/locations.ts`'s own
 * `annex_fence` blurb). Reachable on foot through that existing gap, or
 * straight over the fence itself once the Prototype Hoverboard clears
 * `filler_77` (Audit item #2) — Bishop's payoff was never about getting in,
 * it's about knowing there was ever anything back here worth checking.
 */
export const DEAD_DROP_POS = { x: 1540, y: 600 };
export const DEAD_DROP_RESPAWN_DAYS = 5;
export const DEAD_DROP_CASH = 60;
export const DEAD_DROP_HEAT_RELIEF = 8;

export function canCheckDeadDrop(save: SaveState): boolean {
  return save.skills.resistanceIntel.unlocked && !onCooldown(save, DEAD_DROP_ID, DEAD_DROP_RESPAWN_DAYS);
}

/** What's actually in it, this time — a flat cash-and-cover package rather
 * than a loot roll: the resistance isn't a vending machine, it's a standing
 * arrangement, so what changes run to run is only whether it's your turn
 * yet, never what's on offer. */
export function checkDeadDrop(save: SaveState): SaveState {
  if (!canCheckDeadDrop(save)) return save;
  const withCash = addCash(save, DEAD_DROP_CASH);
  const withHeat = {
    ...withCash,
    heat: applyHeat(withCash.heat, {
      eventId: 'annex_dead_drop',
      delta: -DEAD_DROP_HEAT_RELIEF,
      logToHistory: true,
    }),
  };
  return markCollected(withHeat, DEAD_DROP_ID, DEAD_DROP_RESPAWN_DAYS);
}
