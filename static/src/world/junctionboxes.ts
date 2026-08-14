/**
 * Junction boxes: the actual physical source of a blueprint (`content/
 * blueprints.ts`). Same shape as `CameraNode` (`world/collectibles.ts`) on
 * purpose — a fixed point, a Heat cost shown before it's spent, a respawn
 * window — because it's the same kind of object: street furniture worth
 * taking apart, not a building with a different paint job.
 *
 * Unlike a camera, there's exactly one payout per box (the one file inside
 * it) and no tiers of action to pick between — the choice already happened
 * when the player decided *which* box was worth the risk. `tier` is what
 * actually scales the risk: a Tier 5 box (a Hoverboard's or a Cyberdeck's
 * own diagram) costs more Heat and stays dark longer than a Tier 1 one, per
 * the build note that the higher-level the plan inside, the higher the
 * price for going after it.
 */
export interface JunctionBoxNode {
  id: string;
  x: number;
  y: number;
  blueprintItemId: string;
  tier: 1 | 2 | 3 | 4 | 5;
}

/** Heat cost and respawn window, purely a function of tier — every box at
 * the same tier costs the same to crack, so the number on the prompt is
 * something a player can learn once and read off any box after that. */
export const JUNCTION_BOX_RISK: Record<JunctionBoxNode['tier'], { heatCost: number; respawnDays: number }> = {
  1: { heatCost: 3, respawnDays: 4 },
  2: { heatCost: 5, respawnDays: 5 },
  3: { heatCost: 7, respawnDays: 6 },
  4: { heatCost: 9, respawnDays: 7 },
  5: { heatCost: 12, respawnDays: 9 },
};

export const JUNCTION_BOX_NODES: JunctionBoxNode[] = [
  // Tier 1 — spread through the residential/civic core, the earliest ground
  // a player actually covers.
  { id: 'junction_1', x: 176, y: 320, blueprintItemId: 'bp_signal_jammer', tier: 1 },
  { id: 'junction_2', x: 460, y: 150, blueprintItemId: 'bp_clean_sim', tier: 1 },
  { id: 'junction_3', x: 380, y: 460, blueprintItemId: 'bp_board_1', tier: 1 },
  { id: 'junction_4', x: 230, y: 460, blueprintItemId: 'bp_cyberdeck_1', tier: 1 },
  // Tier 2 — downtown, once there's a reason to be there.
  { id: 'junction_5', x: 600, y: 305, blueprintItemId: 'bp_board_2', tier: 2 },
  { id: 'junction_6', x: 760, y: 320, blueprintItemId: 'bp_cyberdeck_2', tier: 2 },
  // Tier 3 — the Annex's working edge.
  { id: 'junction_7', x: 900, y: 330, blueprintItemId: 'bp_board_3', tier: 3 },
  { id: 'junction_8', x: 870, y: 450, blueprintItemId: 'bp_cyberdeck_3', tier: 3 },
  // Tier 4 — deeper into the Annex, where the story keeps warning it's
  // watched.
  { id: 'junction_9', x: 1080, y: 325, blueprintItemId: 'bp_board_4', tier: 4 },
  { id: 'junction_10', x: 1100, y: 480, blueprintItemId: 'bp_cyberdeck_4', tier: 4 },
  // Tier 5 — the far edge of the map, the last thing worth the trip.
  { id: 'junction_11', x: 1200, y: 180, blueprintItemId: 'bp_board_5', tier: 5 },
  { id: 'junction_12', x: 1220, y: 600, blueprintItemId: 'bp_cyberdeck_5', tier: 5 },
  // The anti-drone tool line — same tier logic as the board/deck lines,
  // just three stops instead of five.
  { id: 'junction_13', x: 300, y: 570, blueprintItemId: 'bp_slingshot', tier: 1 },
  { id: 'junction_14', x: 740, y: 490, blueprintItemId: 'bp_net_gun', tier: 2 },
  { id: 'junction_15', x: 1000, y: 560, blueprintItemId: 'bp_emp_gun', tier: 3 },
  // The player's own drone line.
  { id: 'junction_16', x: 500, y: 650, blueprintItemId: 'bp_scout_drone', tier: 1 },
  { id: 'junction_17', x: 950, y: 600, blueprintItemId: 'bp_recon_drone', tier: 2 },
  { id: 'junction_18', x: 1220, y: 720, blueprintItemId: 'bp_strike_drone', tier: 3 },
];
