import type { SaveState } from '../state/schema';
import { STREET_HACK_NODES, type StreetHackNode } from '../world/streethacks';
import { addCash, deckTier, heatReliefFor } from './market';
import { onCooldown, markCollected } from './materials';
import { applyHeat } from './heat';
import { heatFor, type RunOutcome } from './missions';

/**
 * What a rig has to be built up to before it can even reach a given kind of
 * target — a separate axis from `HackLevel`'s Quick/Standard/Deep, which
 * only matters once a target is already in reach. Payphones first (tier 1),
 * then ATMs (tier 2); cameras (tier 3) are gated the same way but through
 * `systems/materials.ts`'s `canSabotage` instead, since a camera dismantle
 * isn't a `StreetHackNode` — and "building systems" (tier 4) last, before
 * the fifth tier stops unlocking new kinds and just makes every hack easier
 * (`content/hacking.ts` configs take a `deckTier` bonus the same shape the
 * hacking skill tier's own +1 already uses).
 */
export const HACK_KIND_MIN_TIER: Record<StreetHackNode['kind'], number> = {
  phone: 1,
  atm: 2,
  building: 4,
};

export const CAMERA_MIN_DECK_TIER = 3;

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

/**
 * "What level of hack" — the choice the cyberdeck's Hack tab offers before a
 * node's own briefing. A node's baked `tier` is its `'standard'` level;
 * `'quick'` and `'deep'` are the same target read one notch easier or harder
 * (`HACKING_TIERS`/`CIPHER_TIERS`, `content/hacking.ts`), same shape as a
 * camera's tamper/dismantle/overload trio, just expressed as a shift on the
 * one tier number every hacking config already keys off rather than three
 * separate action definitions.
 */
export type HackLevel = 'quick' | 'standard' | 'deep';

const LEVEL_DELTA: Record<HackLevel, number> = { quick: -1, standard: 0, deep: 1 };

/** Only offers a level that lands on a real tier (1–4) — a tier-1 node has
 * no easier read to offer, a tier-4 one no harder. */
export function levelsFor(node: StreetHackNode): HackLevel[] {
  const levels: HackLevel[] = [];
  if (node.tier > 1) levels.push('quick');
  levels.push('standard');
  if (node.tier < 4) levels.push('deep');
  return levels;
}

export function effectiveTier(node: StreetHackNode, level: HackLevel): 1 | 2 | 3 | 4 {
  return Math.max(1, Math.min(4, node.tier + LEVEL_DELTA[level])) as 1 | 2 | 3 | 4;
}

/** Whether this node can be hit right now: the rig is built up to the tier
 * this *kind* of target needs — not just any deck, per `HACK_KIND_MIN_TIER`
 * — and Helio hasn't reset this particular machine yet. */
export function canHackStreetNode(save: SaveState, node: StreetHackNode): boolean {
  return deckTier(save) >= HACK_KIND_MIN_TIER[node.kind] && !onCooldown(save, node.id, node.respawnDays);
}

export function resolveStreetHack(
  save: SaveState,
  nodeId: string,
  outcome: RunOutcome,
  level: HackLevel = 'standard',
): SaveState {
  const node = STREET_HACK_NODES.find((n) => n.id === nodeId);
  if (!node || !canHackStreetNode(save, node)) return save;

  const tier = effectiveTier(node, level);
  const landed = outcome === 'clean' || outcome === 'messy';
  const payout = !landed ? 0 : outcome === 'clean' ? cashFor(tier) : Math.ceil(cashFor(tier) / 2);

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
