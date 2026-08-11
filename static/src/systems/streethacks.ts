import type { SaveState } from '../state/schema';
import { STREET_HACK_NODES, type StreetHackNode } from '../world/streethacks';
import { CYBERDECK } from '../content/economy';
import { owns, addCash, heatReliefFor } from './market';
import { onCooldown, markCollected } from './materials';
import { applyHeat } from './heat';
import { heatFor, type RunOutcome } from './missions';

/**
 * Street hacks are ambient overworld activity, not authored story missions —
 * they don't write to `save.missions` (no hardening, no mission record; an
 * ATM doesn't get smarter about you the way a story target does) and they
 * don't touch hazard pay (that's specifically the reward for a mission run
 * while Heat is elevated; a street hack's whole reward is the cash itself).
 * They *do* share the same Heat table every other hacking action uses
 * (`missions.ts` `heatFor`) — one Heat economy, not two.
 */

/** What a clean crack pays. Messy pays half, rounded up — same "it worked,
 * but you left edges" idea `resolveRun` already prices in, just felt in cash
 * here instead of in how much Heat it cost. */
const CASH_BY_TIER: Record<1 | 2 | 3 | 4, number> = {
  1: 20,
  2: 35,
  3: 55,
  4: 80,
};

export function cashFor(tier: StreetHackNode['tier']): number {
  return CASH_BY_TIER[tier];
}

/** Whether this node can be hit right now: the player owns a cyberdeck at
 * all, and Helio hasn't reset this particular machine yet. */
export function canHackStreetNode(save: SaveState, node: StreetHackNode): boolean {
  return owns(save, CYBERDECK) && !onCooldown(save, node.id, node.respawnDays);
}

export function resolveStreetHack(save: SaveState, nodeId: string, outcome: RunOutcome): SaveState {
  const node = STREET_HACK_NODES.find((n) => n.id === nodeId);
  if (!node || !canHackStreetNode(save, node)) return save;

  const landed = outcome === 'clean' || outcome === 'messy';
  const payout = !landed ? 0 : outcome === 'clean' ? cashFor(node.tier) : Math.ceil(cashFor(node.tier) / 2);

  // Same relief a burner phone gives any other digital job — this is one,
  // and the briefing that offers it previews the same discount.
  const relief = heatReliefFor(save, 'hacking');
  const withCash = payout > 0 ? addCash(save, payout) : save;
  const withHeat = {
    ...withCash,
    heat: applyHeat(withCash.heat, {
      eventId: `street_hack_${nodeId}_${outcome}`,
      delta: Math.max(1, heatFor('hacking', outcome) - relief),
      logToHistory: true,
    }),
  };

  // Backing out cleanly costs the same small Heat tax a story mission's own
  // abort does, but — same as a story mission — doesn't put the target on
  // cooldown. Only a real attempt, landed or not, uses up the machine.
  if (outcome === 'aborted') return withHeat;
  return markCollected(withHeat, nodeId, node.respawnDays);
}
