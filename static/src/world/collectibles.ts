/**
 * Overworld salvage, split into the two ways the build note asked for it to
 * feel different: a handful of *hidden* finds no different-looking from any
 * other bush until you happen to walk into the right one (the Zelda "cut
 * every bush" instinct), and a deliberate, costed act of sabotage against the
 * town's own camera network — which is where the good parts actually come
 * from. Free salvage is a lucky find; a dismantled camera is a decision.
 *
 * Both share the same day-keyed respawn bookkeeping as everything else that
 * comes back — `world.collectedNodes`, never wall-clock time — see
 * `systems/materials.ts`.
 */
import type { EscalationStage } from './escalation';

/**
 * A bush from `world/obstacles.ts` that happens to be hiding something. The
 * obstacle itself is drawn exactly like any other bush — nothing marks it —
 * and it is quietly excluded from collision (Overworld.tsx) so walking into
 * it is possible at all, which is the only tell there ever is.
 *
 * A find is a material, cash, or (rarely) both — `itemId`/`cash` are both
 * optional and independent so a pickup can be either without the other
 * needing a placeholder value. `quantity` defaults to 1; only the rare
 * finds (a Mag-Lift coil, more than one battery) bother setting it.
 */
export interface HiddenPickup {
  obstacleId: string;
  itemId?: string;
  quantity?: number;
  cash?: number;
  respawnDays: number;
}

export const HIDDEN_PICKUPS: HiddenPickup[] = [
  { obstacleId: 'filler_2', itemId: 'battery_pack', respawnDays: 3 },
  { obstacleId: 'filler_4', itemId: 'hard_drive', respawnDays: 2 },
  { obstacleId: 'filler_10', itemId: 'hard_drive', respawnDays: 2 },
  { obstacleId: 'filler_12', itemId: 'logic_board', respawnDays: 3 },
  { obstacleId: 'filler_16', itemId: 'battery_pack', respawnDays: 3 },
  // The fill-out pass: more variety, spread wide, including the board and
  // deck lines' own rarer parts and a few pure cash finds — not everything
  // in a bush has to be a part.
  { obstacleId: 'filler_45', itemId: 'bearings', quantity: 2, respawnDays: 3 },
  { obstacleId: 'filler_46', itemId: 'wheels', quantity: 2, respawnDays: 3 },
  { obstacleId: 'filler_47', itemId: 'motor_kit', respawnDays: 5 },
  { obstacleId: 'filler_48', itemId: 'mag_lift_coil', respawnDays: 8 },
  { obstacleId: 'filler_49', itemId: 'air_gapped_drive', respawnDays: 5 },
  { obstacleId: 'filler_50', itemId: 'graphics_card', respawnDays: 6 },
  { obstacleId: 'filler_51', cash: 25, respawnDays: 4 },
  { obstacleId: 'filler_52', cash: 40, respawnDays: 5 },
  { obstacleId: 'filler_53', cash: 15, respawnDays: 3 },
  { obstacleId: 'filler_54', itemId: 'cracked_chipset', respawnDays: 4 },
  { obstacleId: 'filler_55', itemId: 'trucks', respawnDays: 3 },
];

/** The obstacle ids `HIDDEN_PICKUPS` names, precomputed so Overworld.tsx can
 * cheaply exclude them from collision every frame without re-deriving the
 * set each time — these bushes are walkable, full stop, whether or not
 * there's currently anything in them. */
export const HIDDEN_PICKUP_OBSTACLE_IDS = new Set(HIDDEN_PICKUPS.map((p) => p.obstacleId));

/**
 * A camera worth taking apart. Rendered with the same small blue box as the
 * story pole (`draw.ts` `drawSabotageCamera`, `locations.ts`'s `camera_pole_5th`)
 * so it reads as the same kind of object — this is the ordinary version of
 * the thing Act 1 made you look at once. Coordinates carried over from the
 * old standalone pickups, already checked clear of every building and
 * obstacle rect.
 *
 * `cracked_chipset` — the one material every recipe eventually wants more
 * of — comes from cameras and nowhere else. Hard drives and logic boards
 * overlap with the hidden bush finds; the chipset (and, on the two hardest
 * housings, a graphics card) is the reason to actually do the sabotage
 * instead of just walking around.
 *
 * `itemId`/`respawnDays`/`heatCost` describe the *dismantle* action — the
 * middle of the three risk/reward tiers `sabotageActionsFor` derives from a
 * node. Kept as the node's own baseline numbers, unchanged from before this
 * had tiers, so a "normal" hit still costs what it always did.
 */
export interface CameraNode {
  id: string;
  x: number;
  y: number;
  itemId: string;
  respawnDays: number;
  /** Heat charged for the act, shown on the prompt before it's spent. */
  heatCost: number;
  /**
   * How far this camera actually sees, in map pixels — the "every camera
   * literally covers a certain range of the map" half of the coverage bar
   * (`systems/coverage.ts`). Deliberately per-node rather than one shared
   * constant: a camera worth 4% of the town is a different target from one
   * worth 2%, and that difference is the only thing making one pole more
   * urgent than another.
   */
  coverageRadius: number;
  /**
   * Which escalation stage (`world/escalation.ts`) puts this camera up. 0 is
   * standing from day one; 1-3 arrive as the rollout advances, which is what
   * "each time a new camera goes up, the % goes up" actually means — a real
   * new pole on the map the player can walk to and take down, not a number
   * that moves on its own for reasons nothing on screen explains.
   */
  stage: EscalationStage;
}

export const CAMERA_NODES: CameraNode[] = [
  // Stage 0 — the seven poles that are already up when the game starts.
  { id: 'camera_dismantle_1', x: 288, y: 100, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 195, stage: 0 },
  { id: 'camera_dismantle_2', x: 95, y: 540, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 180, stage: 0 },
  { id: 'camera_dismantle_3', x: 460, y: 300, itemId: 'hard_drive', respawnDays: 4, heatCost: 3, coverageRadius: 230, stage: 0 },
  { id: 'camera_dismantle_4', x: 940, y: 100, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 195, stage: 0 },
  { id: 'camera_dismantle_5', x: 260, y: 620, itemId: 'logic_board', respawnDays: 4, heatCost: 3, coverageRadius: 185, stage: 0 },
  { id: 'camera_dismantle_6', x: 620, y: 600, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 225, stage: 0 },
  { id: 'camera_dismantle_7', x: 1240, y: 300, itemId: 'graphics_card', respawnDays: 6, heatCost: 5, coverageRadius: 190, stage: 0 },
  // Stage 1 (day 4) — the rollout's first visible week: the gaps either side
  // of downtown and the south-east corner nothing watched before.
  { id: 'camera_dismantle_8', x: 728, y: 120, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 200, stage: 1 },
  { id: 'camera_dismantle_9', x: 170, y: 200, itemId: 'hard_drive', respawnDays: 4, heatCost: 3, coverageRadius: 260, stage: 1 },
  { id: 'camera_dismantle_10', x: 1104, y: 642, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 240, stage: 1 },
  // Stage 2 (day 9) — the middle of the map and the western edge, including
  // the first of the two long-range housings.
  { id: 'camera_dismantle_11', x: 418, y: 692, itemId: 'logic_board', respawnDays: 4, heatCost: 3, coverageRadius: 190, stage: 2 },
  { id: 'camera_dismantle_12', x: 1154, y: 480, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 195, stage: 2 },
  { id: 'camera_dismantle_13', x: 58, y: 336, itemId: 'hard_drive', respawnDays: 4, heatCost: 3, coverageRadius: 205, stage: 2 },
  { id: 'camera_dismantle_14', x: 802, y: 424, itemId: 'graphics_card', respawnDays: 6, heatCost: 5, coverageRadius: 215, stage: 2 },
  // Stage 3 (day 15) — the last four, filling the corners the first fourteen
  // leave open. With every one of these standing the town is fully covered,
  // which is the point: past here, doing nothing is what loses ground.
  { id: 'camera_dismantle_15', x: 982, y: 752, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 255, stage: 3 },
  { id: 'camera_dismantle_16', x: 504, y: 63, itemId: 'graphics_card', respawnDays: 6, heatCost: 5, coverageRadius: 235, stage: 3 },
  { id: 'camera_dismantle_17', x: 996, y: 288, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 225, stage: 3 },
  { id: 'camera_dismantle_19', x: 1180, y: 120, itemId: 'graphics_card', respawnDays: 6, heatCost: 5, coverageRadius: 225, stage: 3 },
  { id: 'camera_dismantle_18', x: 200, y: 760, itemId: 'logic_board', respawnDays: 4, heatCost: 3, coverageRadius: 240, stage: 3 },
];

export type SabotageActionId = 'tamper' | 'dismantle' | 'overload';

export interface SabotageAction {
  id: SabotageActionId;
  label: string;
  /** Shown on the prompt before it's spent — Heat System guardrail 2. */
  heatCost: number;
  /** Days the camera stays down before SafeTrace replaces it. */
  respawnDays: number;
  itemId: string;
  quantity: number;
}

/**
 * Three ways to hit the same camera, derived from its own baseline rather
 * than hand-authored per node — three risk/reward points, not three times
 * the content to maintain:
 *
 * - **Tamper**: almost free (Heat +1) and back within a day, but it only
 *   loosens a wire — the common material every node yields the same way,
 *   never the node's own featured part.
 * - **Dismantle**: the node's own numbers, unchanged from before this had
 *   tiers — the featured part, once, at the cost already on the tin.
 * - **Overload**: the expensive one. Heat costs more, the camera stays dark
 *   for over a week, and it pays out double the featured part for it.
 */
export function sabotageActionsFor(node: CameraNode): SabotageAction[] {
  return [
    {
      id: 'tamper',
      label: 'Quick tamper',
      heatCost: 1,
      respawnDays: 1,
      itemId: 'hard_drive',
      quantity: 1,
    },
    {
      id: 'dismantle',
      label: 'Dismantle it',
      heatCost: node.heatCost,
      respawnDays: node.respawnDays,
      itemId: node.itemId,
      quantity: 1,
    },
    {
      id: 'overload',
      label: 'Overload it',
      heatCost: node.heatCost + 3,
      respawnDays: node.respawnDays + 3,
      itemId: node.itemId,
      quantity: 2,
    },
  ];
}
