import type { SkinId } from '../content/skins';

/**
 * Street hacks: the cyberdeck's whole reason to exist. A camera pays parts
 * because it's a piece of SafeTrace's own network sitting right there on a pole;
 * these are the rest of the town's machines — a corner ATM, a payphone
 * nobody's cut the line to, a building's own systems once the rig can reach
 * that deep — cracked for quick cash instead. Same Trace/Cipher mechanic
 * every hacking mission in the game already uses, just running loose in the
 * world instead of behind a scene's dialogue, the same way a camera's
 * sabotage options run loose instead of behind one.
 *
 * Gated per-kind on the deck's own tier (`systems/streethacks.ts`
 * `HACK_KIND_MIN_TIER`) rather than on a story flag — this is the player's
 * own rig doing the player's own jobs, not something a mentor unlocked for
 * them, and which kinds it can reach is exactly how far up the build line it
 * is.
 */
export interface StreetHackNode {
  id: string;
  x: number;
  y: number;
  kind: 'atm' | 'phone' | 'building';
  /** Which of the two hacking feels this node plays as — a locked ATM PIN
   * is a Cipher in every way that matters; a phone line worth tapping is
   * closer to Trace's "read the network" framing. Mixed in either
   * direction here and there so the world doesn't sort neatly by kind. */
  variant: 'trace' | 'cipher';
  tier: 1 | 2 | 3 | 4;
  skinId: SkinId;
  label: string;
  /** Days before SafeTrace (or whoever owns the line) resets it. */
  respawnDays: number;
}

export const STREET_HACK_NODES: StreetHackNode[] = [
  { id: 'atm_5th', x: 350, y: 300, kind: 'atm', variant: 'cipher', tier: 1, skinId: 'atm', label: 'ATM — 5th & Cole', respawnDays: 4 },
  { id: 'atm_fenwick', x: 1414, y: 52, kind: 'atm', variant: 'cipher', tier: 2, skinId: 'atm', label: 'ATM — Fenwick Street', respawnDays: 5 },
  { id: 'atm_annex', x: 1446, y: 422, kind: 'atm', variant: 'trace', tier: 3, skinId: 'atm', label: 'ATM — Annex Fence Line', respawnDays: 6 },
  { id: 'atm_north', x: 1350, y: 150, kind: 'atm', variant: 'cipher', tier: 3, skinId: 'atm', label: 'ATM — North Lot', respawnDays: 6 },
  { id: 'phone_bandstand', x: 716, y: 318, kind: 'phone', variant: 'trace', tier: 1, skinId: 'resistance', label: 'Payphone — the bandstand', respawnDays: 4 },
  { id: 'phone_utility', x: 1261, y: 176, kind: 'phone', variant: 'trace', tier: 2, skinId: 'resistance', label: 'Junction phone — Utility Yard', respawnDays: 5 },
  { id: 'phone_corner', x: 709, y: 172, kind: 'phone', variant: 'cipher', tier: 2, skinId: 'resistance', label: 'Payphone — the school corner', respawnDays: 5 },
  // Building systems — the deck's fourth unlock, higher tiers and better
  // pay than a corner machine: this is the inside of a building, not the
  // street-level box bolted to the front of it.
  { id: 'building_school', x: 650, y: 32, kind: 'building', variant: 'trace', tier: 3, skinId: 'infrastructure', label: 'Panel — School boiler room', respawnDays: 6 },
  { id: 'building_deja', x: 1350, y: 120, kind: 'building', variant: 'cipher', tier: 3, skinId: 'infrastructure', label: 'Panel — Utility Yard junction', respawnDays: 6 },
  { id: 'building_annex_fence', x: 1350, y: 470, kind: 'building', variant: 'trace', tier: 4, skinId: 'datacenter', label: 'Panel — Annex Fence server rack', respawnDays: 7 },
];

/** How close counts as close enough to open one — same radius the cameras use. */
export const STREET_HACK_INTERACT_RADIUS = 26;
