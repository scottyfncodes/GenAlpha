import { BOARD_TIERS } from '../content/economy';

/**
 * What owning a board actually changes about the map, not just how fast you
 * cross it. `systems/market.ts` `boardTier` has driven a pure speed
 * multiplier since it shipped — real, but exactly the thing module 08's
 * gameplay pass calls out: "do not simply increase movement speed." This is
 * the other half. A handful of the barriers `world/obstacles.ts` already
 * places — every one already has a walkable way around it, per that file's
 * own "a route the player cannot take is set dressing" rule — stop being
 * solid at all once the player's board is good enough to clear them
 * outright. Nowhere on this list is a place a walking player can't reach;
 * every one is a place a board means they stop detouring to reach it,
 * which is the honest, buildable version of "clear certain barriers" this
 * map's own reachability guarantee actually allows.
 *
 * Two tiers of barrier, matching two tiers of board:
 *  - a `gate` obstacle — already the thing everybody in town walks around
 *    (see `obstacles.ts`'s own comments on `civic_gate`, `market_gate_lot`,
 *    `sub_gate`) — opens at board tier 3, the first tier worth calling a
 *    real board rather than a bootleg one.
 *  - a full `fence` line — a real boundary, not a gate somebody left for
 *    show — only opens at tier 5, the Hoverboard. Clearing an actual fence
 *    line around the Data Centre or the Annex is the "I can go there now"
 *    moment the top tier is supposed to earn.
 */
export interface TraversalGate {
  id: string;
  /** The `Obstacle.id` (world/obstacles.ts) this gate stops blocking. */
  obstacleId: string;
  minBoardTier: number;
  label: string;
}

export const TRAVERSAL_GATES: TraversalGate[] = [
  { id: 'gate_civic', obstacleId: 'civic_gate', minBoardTier: 3, label: 'The Data Centre gate — cleared, no detour.' },
  { id: 'gate_market_lot', obstacleId: 'market_gate_lot', minBoardTier: 3, label: 'The lot gate everyone already walks around.' },
  { id: 'gate_substation', obstacleId: 'sub_gate', minBoardTier: 3, label: 'The substation gate, cleared at speed.' },
  { id: 'fence_data_centre', obstacleId: 'civic_fence_e', minBoardTier: 5, label: 'Straight over the Data Centre fence line.' },
  { id: 'fence_works_annex', obstacleId: 'filler_77', minBoardTier: 5, label: 'Straight over the Annex fence — no gap needed.' },
];

export function isGateOpen(gate: TraversalGate, boardTier: number): boolean {
  return boardTier >= gate.minBoardTier;
}

/** The obstacle ids currently crossable at this board tier — same shape as
 * `collectibles.ts` `HIDDEN_PICKUP_OBSTACLE_IDS`, so Overworld.tsx excludes
 * them from collision the same cheap way. Walking (tier 0) opens nothing. */
export function traversableObstacleIds(boardTier: number): Set<string> {
  return new Set(TRAVERSAL_GATES.filter((g) => isGateOpen(g, boardTier)).map((g) => g.obstacleId));
}

/** The board tier a save currently holds needs `BOARD_TIERS.length` (5) to
 * exist for `isGateOpen`'s ceiling to mean anything — a cheap sanity check
 * a test can pin so this file and the economy catalog can't drift apart. */
export const MAX_BOARD_TIER = BOARD_TIERS.length;

/**
 * The "clean line" reward for actually riding a gate through rather than
 * just noticing it's open — small, felt Heat relief, the same "skillful use
 * of a tool is worth something" idea `dronerecon.ts`'s discovery bonus
 * already applies to flying well. Not a resource and not a toast full of
 * numbers: `Overworld.tsx` debounces it per gate per approach (the same
 * "stillTouching" pattern the hidden pickups already use) so standing on
 * the spot doesn't farm it, and pays it out as Heat quietly easing rather
 * than a counter going up.
 */
export const GATE_CLEAR_HEAT_RELIEF = 2;
