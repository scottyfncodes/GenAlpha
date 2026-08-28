/**
 * The player's own drone, and the two things it's for. Both are flown live,
 * in the same town the character walks — see `Overworld.tsx`'s own frame
 * loop, which redirects movement input at the drone's position instead of
 * the player's whenever a flight is active, and reuses the exact same
 * `drawTown` render pass (just with a drone body standing in for the
 * player's own sprite). There is no separate minigame screen any more: what
 * the drone finds is whatever ground its pilot actually flies it over.
 *
 * RECON: launch from anywhere, any time (no target, no location gate). Free
 * flight, revealing `scouted` fog continuously along the flight path — a
 * much richer read of the town than any fixed reveal circle, because the
 * player is the one choosing where to look. The only risk is the battery:
 * it drains the whole flight, and the drone has to make it back within
 * range of wherever it launched from before it hits zero. Land it and it
 * pays Heat relief, same as ever. Run the battery out mid-flight and SafeTrace
 * picks up whatever's left on the ground — the airframe is gone for good,
 * whatever tier it was.
 *
 * KAMIKAZE: only at a camera or junction box already in reach (same nearby
 * detection Overworld.tsx already runs for `SABOTAGE_CAMERA`/
 * `DESTROY_JUNCTION_BOX`). Same free flight, aimed at a fixed point instead
 * of open exploration — reach the target before the battery dies and it's a
 * hit, don't and it's a miss. Either way the airframe is gone: a kamikaze
 * run was never coming home to begin with.
 */

export type PlayerDroneTier = 1 | 2 | 3;

/** World units per second while flying — faster than anything the player
 * can be on foot, the one thing that has to be true for "you're not walking
 * any more, you're flying" to actually read at the controls. */
export const DRONE_FLIGHT_SPEED: Record<PlayerDroneTier, number> = { 1: 190, 2: 230, 3: 270 };

/** Total flight time before the battery dies, in ms. A better airframe
 * flies longer, not just faster — the real reward for investing past tier
 * 1 is range, since a round trip is what a recon flight actually spends
 * its battery on. */
export const DRONE_BATTERY_MS: Record<PlayerDroneTier, number> = { 1: 26000, 2: 40000, 3: 58000 };

/** A kamikaze target is already in reach by the time the button's even
 * offered (same proximity gate a camera/junction box prompt needs), so the
 * battery here is generous headroom rather than a real range constraint —
 * it exists so a flight that goes wide of the target can still run out and
 * crash, not so tier matters much for reaching something already this
 * close. */
export const KAMIKAZE_BATTERY_MS = 10000;

/** How far the scouted-fog reveal reaches around the drone while it flies,
 * continuously — see `world/exploration.ts`'s `revealArea`. Wider than a
 * walking foot's own `FOOT_REVEAL_RADIUS`, since a camera looking straight
 * down sees more street than a kid looking sideways does. */
export const DRONE_FLIGHT_REVEAL_RADIUS: Record<PlayerDroneTier, number> = { 1: 130, 2: 160, 3: 200 };

/** How close the drone has to get back to its own launch point before
 * landing is possible — a real spot to put down in, not a pixel-exact
 * return. */
export const DRONE_LANDING_RADIUS = 50;

/** How close a kamikaze flight has to get to its target before it counts as
 * a hit. */
export const KAMIKAZE_IMPACT_RADIUS = 40;

/** Heat relief on a landed recon flight, and the cost of one the battery
 * caught first — scaled by tier, since a better sensor package is worth
 * more once it's actually up there. */
export const RECON_SUCCESS_HEAT_RELIEF: Record<PlayerDroneTier, number> = { 1: 6, 2: 9, 3: 13 };
export const RECON_FAIL_HEAT_PENALTY = 3;

/** What a landed kamikaze run costs in Heat (nothing — a drone doesn't
 * have your face on it) and how long the target stays down for, longer
 * than any ordinary sabotage action reaches, since this is the thorough
 * version. A crash costs the number below instead, and touches nothing. */
export const KAMIKAZE_HEAT_COST = 0;
export const KAMIKAZE_RESPAWN_DAYS = 14;
export const KAMIKAZE_FAIL_HEAT_PENALTY = 5;
