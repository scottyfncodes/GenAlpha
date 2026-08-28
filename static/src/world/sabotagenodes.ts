import type { SaveState } from '../state/schema';
import type { RunOutcome } from '../systems/missions';
import { heatFor } from '../systems/missions';
import { addCash } from '../systems/market';
import { applyHeat } from '../systems/heat';
import { markCollected, onCooldown } from '../systems/materials';

/**
 * Repeatable overworld sabotage — Player-Freedom Audit item #5, mirroring
 * `world/streethacks.ts`'s own philosophy exactly: fixed points, visible
 * whether or not the player can act on them yet, gated on a skill rather
 * than a purchase (Deja's own — `save.skills.sabotage.unlocked` — the one
 * mentor skill that previously had no free-roam form at all, only scripted
 * one-off missions), respawning on a cooldown rather than consumed. Runs
 * the exact same `systems/sabotage.ts` casing/window mechanic every scripted
 * sabotage mission already uses (`content/sabotage.ts`'s `SURVEILLANCE_RELAY`
 * config) — this is a new place to spend that mechanic, never a second one.
 */
export interface SabotageNode {
  id: string;
  x: number;
  y: number;
  label: string;
}

export const SABOTAGE_NODE_MISSION_ID = 'surveillance_relay';
export const SABOTAGE_NODE_RESPAWN_DAYS = 6;
export const SABOTAGE_NODE_CASH = 70;
export const SABOTAGE_INTERACT_RADIUS = 26;

/** One relay per district, spread the same "district a player actually
 * covers early" way `junctionboxes.ts`'s own tier-1 spread is — Main
 * Street, Old Market, The Blocks, each parked near a junction box already
 * proven to sit clear of buildings and obstacles. */
export const SABOTAGE_NODES: SabotageNode[] = [
  { id: 'relay_main_street', x: 700, y: 220, label: 'Surveillance Relay' },
  { id: 'relay_old_market', x: 170, y: 500, label: 'Surveillance Relay' },
  { id: 'relay_the_blocks', x: 770, y: 1000, label: 'Surveillance Relay' },
];

export function canSabotageNode(save: SaveState, node: SabotageNode): boolean {
  return save.skills.sabotage.unlocked && !onCooldown(save, node.id, SABOTAGE_NODE_RESPAWN_DAYS);
}

/**
 * Same clean/messy/aborted/failed shape `resolveStreetHack`
 * (`systems/streethacks.ts`) already settles a run with — full pay clean,
 * half messy, nothing otherwise, same `heatFor('sabotage', outcome)` table
 * every scripted sabotage mission already pays into. Aborting doesn't cost
 * the node its cooldown, same rule street hacks follow: only a real attempt
 * uses up the machine.
 */
export function resolveSabotageNode(save: SaveState, nodeId: string, outcome: RunOutcome): SaveState {
  const node = SABOTAGE_NODES.find((n) => n.id === nodeId);
  if (!node || !canSabotageNode(save, node)) return save;

  const landed = outcome === 'clean' || outcome === 'messy';
  const payout = !landed ? 0 : outcome === 'clean' ? SABOTAGE_NODE_CASH : Math.ceil(SABOTAGE_NODE_CASH / 2);
  const withCash = payout > 0 ? addCash(save, payout) : save;
  const withHeat = {
    ...withCash,
    heat: applyHeat(withCash.heat, {
      eventId: `sabotage_relay_${nodeId}_${outcome}`,
      delta: heatFor('sabotage', outcome),
      logToHistory: true,
    }),
  };

  if (outcome === 'aborted') return withHeat;
  return markCollected(withHeat, nodeId, SABOTAGE_NODE_RESPAWN_DAYS);
}
