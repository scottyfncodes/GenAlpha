/**
 * The takedown shot. Pure logic, no React — the tool tier already decided
 * the reward (`world/drones.ts` `DRONE_TAKEDOWN_BY_TOOL_TIER`); this decides
 * whether the player actually lands it. A better tool doesn't win the
 * encounter by itself, it makes the encounter more winnable: a bigger
 * target, a calmer drone. The shot itself is still the player's to make or
 * miss, per the build note that a drone should be "bigger risk/reward than
 * a camera since it moves and fights back."
 */

export type DroneToolTier = 1 | 2 | 3;

/** How long a takedown window stays open before it counts as a miss on its
 * own — long enough to track and commit to a shot, short enough that
 * standing still and waiting isn't the winning strategy. */
export const DRONE_SHOOT_DURATION_MS = 3000;

/** The play area every drone position and shot coordinate is expressed in. */
export const DRONE_SHOOT_BOUNDS = { w: 280, h: 150 };

/** Heat charged on a miss — steeper than any hit tier's cost, since taking
 * a shot and blowing it is louder than the drone just clocking you. */
export const DRONE_SHOOT_MISS_HEAT_PENALTY = 4;

/** A missed drone peels off rather than sitting there for an immediate
 * second try — short, so it isn't a real loss, just not a free retry. */
export const DRONE_SHOOT_MISS_COOLDOWN_DAYS = 1;

/** Bigger at a higher tool tier — the net gun and EMP gun are forgiving
 * about a slightly late shot in a way the slingshot never is. */
const HIT_RADIUS: Record<DroneToolTier, number> = { 1: 13, 2: 19, 3: 27 };

/** Slower at a higher tool tier — not because the drone flies differently,
 * but because a heavier rig gives the player more time to track it. */
const DRONE_SPEED: Record<DroneToolTier, number> = { 1: 130, 2: 100, 3: 78 };

export function hitRadiusForTier(tier: DroneToolTier): number {
  return HIT_RADIUS[tier];
}

export function droneSpeedForTier(tier: DroneToolTier): number {
  return DRONE_SPEED[tier];
}

/** Whether a shot fired at `shotPos` actually connects with a drone
 * currently at `dronePos`, given the hit radius the tool tier earns. */
export function resolveShot(
  dronePos: { x: number; y: number },
  shotPos: { x: number; y: number },
  tier: DroneToolTier,
): boolean {
  const dist = Math.hypot(dronePos.x - shotPos.x, dronePos.y - shotPos.y);
  return dist <= hitRadiusForTier(tier);
}
