import type { SkinId } from '../content/skins';

/**
 * Street hacks: the cyberdeck's whole reason to exist. A camera pays parts
 * because it's a piece of Helio's own network sitting right there on a pole;
 * these are the rest of the town's machines — a corner ATM, a payphone
 * nobody's cut the line to — cracked for quick cash instead. Same Trace/
 * Cipher mechanic every hacking mission in the game already uses, just
 * running loose in the world instead of behind a scene's dialogue, the same
 * way a camera's sabotage options run loose instead of behind one.
 *
 * Gated on owning a cyberdeck (`content/economy.ts` `CYBERDECK`) rather than
 * on a story flag — this is the player's own rig doing the player's own
 * jobs, not something a mentor unlocked for them.
 */
export interface StreetHackNode {
  id: string;
  x: number;
  y: number;
  kind: 'atm' | 'phone';
  /** Which of the two hacking feels this node plays as — a locked ATM PIN
   * is a Cipher in every way that matters; a phone line worth tapping is
   * closer to Trace's "read the network" framing. Mixed in either
   * direction here and there so the world doesn't sort neatly by kind. */
  variant: 'trace' | 'cipher';
  tier: 1 | 2 | 3 | 4;
  skinId: SkinId;
  label: string;
  /** Days before Helio (or whoever owns the line) resets it. */
  respawnDays: number;
}

export const STREET_HACK_NODES: StreetHackNode[] = [
  { id: 'atm_5th', x: 220, y: 600, kind: 'atm', variant: 'cipher', tier: 1, skinId: 'atm', label: 'ATM — 5th & Cole', respawnDays: 4 },
  { id: 'atm_fenwick', x: 760, y: 720, kind: 'atm', variant: 'cipher', tier: 2, skinId: 'atm', label: 'ATM — Fenwick Street', respawnDays: 5 },
  { id: 'atm_annex', x: 1000, y: 320, kind: 'atm', variant: 'trace', tier: 3, skinId: 'atm', label: 'ATM — Annex Fence Line', respawnDays: 6 },
  { id: 'atm_north', x: 1180, y: 220, kind: 'atm', variant: 'cipher', tier: 3, skinId: 'atm', label: 'ATM — North Lot', respawnDays: 6 },
  { id: 'phone_bandstand', x: 580, y: 700, kind: 'phone', variant: 'trace', tier: 1, skinId: 'resistance', label: 'Payphone — the bandstand', respawnDays: 4 },
  { id: 'phone_utility', x: 1100, y: 400, kind: 'phone', variant: 'trace', tier: 2, skinId: 'resistance', label: 'Junction phone — Utility Yard', respawnDays: 5 },
  { id: 'phone_corner', x: 380, y: 60, kind: 'phone', variant: 'cipher', tier: 2, skinId: 'resistance', label: 'Payphone — the school corner', respawnDays: 5 },
];

/** How close counts as close enough to open one — same radius the cameras use. */
export const STREET_HACK_INTERACT_RADIUS = 26;
