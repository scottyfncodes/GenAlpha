/**
 * The player's own drone, and the two things it's for.
 *
 * RECON: launch from anywhere, any time (no target, no location gate) —
 * `ui/minigames/DroneRecon.tsx`, `systems/dronerecon.ts`. A free-roam scout
 * of the block the player is standing in, not a survival run: the reward is
 * what actually gets found (`reconHeatRelief`), and a Tier 2+ airframe can
 * put a scouted camera to sleep from the air instead of only ever looking.
 * The airframe comes home either way; nothing here risks losing it, because
 * a scouting run isn't supposed to fly into anything.
 *
 * KAMIKAZE: only at a camera or junction box already in reach (same nearby
 * detection Overworld.tsx already runs for `SABOTAGE_CAMERA`/
 * `DESTROY_JUNCTION_BOX`) — `ui/minigames/DroneFlight.tsx`,
 * `systems/droneflight.ts`. Flown, not resolved off a stat check, same "the
 * tool decides how forgiving it is, the player still has to fly it" shape
 * `systems/droneshoot.ts` set for the anti-drone tools. It's a one-way trip
 * regardless of outcome — the whole point of the word — so the drone is
 * always consumed, win or lose. A landed run is the best single payout
 * either economy has: a camera pays its featured part at double quantity
 * for no Heat at all, a junction box pays its blueprint the same way. A
 * crashed run pays out nothing and costs real Heat, because a drone that
 * didn't make it still got found.
 */

export type PlayerDroneTier = 1 | 2 | 3;

export interface PlayerDroneTuning {
  /** Hits the airframe can absorb before the flight ends in a crash. */
  maxHits: number;
  /** How often the drone's auto-fire launches a shot, in ms — lower is
   * faster, so a better tier clears more of what's in front of it. */
  fireIntervalMs: number;
  /** Max lateral speed in the flight minigame's own play field, px/s. */
  speed: number;
}

const TUNING: Record<PlayerDroneTier, PlayerDroneTuning> = {
  1: { maxHits: 2, fireIntervalMs: 600, speed: 130 },
  2: { maxHits: 3, fireIntervalMs: 420, speed: 165 },
  3: { maxHits: 4, fireIntervalMs: 280, speed: 200 },
};

export function playerDroneTuning(tier: PlayerDroneTier): PlayerDroneTuning {
  return TUNING[tier];
}

/** Flight length in ms — long enough to feel like an actual sortie, short
 * enough to fit in the same beat as everything else on this map. */
export const RECON_FLIGHT_MS = 14000;
export const KAMIKAZE_FLIGHT_MS = 16000;

/** What a scouting flight costs if it's spotted and scrubbed before it gets
 * home — `systems/dronerecon.ts` `reconHeatRelief` is what a clean one pays. */
export const RECON_FAIL_HEAT_PENALTY = 3;

/** What a landed kamikaze run costs in Heat (nothing — a drone doesn't
 * have your face on it) and how long the target stays down for, longer
 * than any ordinary sabotage action reaches, since this is the thorough
 * version. A crash costs the number below instead, and touches nothing. */
export const KAMIKAZE_HEAT_COST = 0;
export const KAMIKAZE_RESPAWN_DAYS = 14;
export const KAMIKAZE_FAIL_HEAT_PENALTY = 5;
