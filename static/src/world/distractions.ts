/**
 * DISTRACT — the one deliberately player-initiated reuse of `investigate.ts`.
 * That file already lets a *sabotage* pull the nearest patrol off its route
 * for a few seconds as a side effect; this is the same mechanism offered to
 * the player on purpose, as a tool rather than a consequence. Set a car
 * alarm off and whatever's close enough to plausibly hear it goes to look —
 * which is the opening the player just bought themselves, somewhere else.
 *
 * A small, hand-picked set of parked cars (`world/obstacles.ts`), one per
 * district that's actually watched, rather than every car on the map — a
 * prompt on all of them would be wallpaper, not an opportunity. Cheap and
 * fast to reset (a car alarm isn't a resource, it's a trick), and it costs
 * no Heat: the whole point of a distraction is that it's the thing you use
 * *instead* of paying a Heat cost to get past something.
 */
export interface DistractionNode {
  id: string;
  /** The `Obstacle.id` this alarm belongs to — same car, just interactive. */
  obstacleId: string;
  x: number;
  y: number;
}

export const DISTRACTION_NODES: DistractionNode[] = [
  { id: 'alarm_heights', obstacleId: 'heights_car_1', x: 200, y: 234 },
  { id: 'alarm_main_street', obstacleId: 'main_car_1', x: 580, y: 204 },
  { id: 'alarm_civic', obstacleId: 'civic_car_1', x: 1200, y: 330 },
  { id: 'alarm_old_market', obstacleId: 'market_car_1', x: 60, y: 534 },
  { id: 'alarm_blocks', obstacleId: 'blocks_car_1', x: 590, y: 944 },
];

/** Same interact radius the other street furniture (cameras, junctions,
 * street hacks) already uses — one consistent "close enough" across the map. */
export const DISTRACTION_INTERACT_RADIUS = 26;

/** A car alarm resets fast — this is a trick, not a resource, and a player
 * who wants to use the same one twice on the same visit shouldn't have to
 * wait a story-length cooldown to do it. */
export const DISTRACTION_COOLDOWN_DAYS = 1;
