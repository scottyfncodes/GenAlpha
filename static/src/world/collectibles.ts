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
}

export const CAMERA_NODES: CameraNode[] = [
  { id: 'camera_dismantle_1', x: 288, y: 100, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4 },
  { id: 'camera_dismantle_2', x: 95, y: 540, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4 },
  { id: 'camera_dismantle_3', x: 460, y: 300, itemId: 'hard_drive', respawnDays: 4, heatCost: 3 },
  { id: 'camera_dismantle_4', x: 940, y: 100, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4 },
  { id: 'camera_dismantle_5', x: 260, y: 620, itemId: 'logic_board', respawnDays: 4, heatCost: 3 },
  { id: 'camera_dismantle_6', x: 620, y: 600, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4 },
  { id: 'camera_dismantle_7', x: 1240, y: 300, itemId: 'graphics_card', respawnDays: 6, heatCost: 5 },
];

export type SabotageActionId = 'tamper' | 'dismantle' | 'overload';

export interface SabotageAction {
  id: SabotageActionId;
  label: string;
  /** Shown on the prompt before it's spent — Heat System guardrail 2. */
  heatCost: number;
  /** Days the camera stays down before Helio replaces it. */
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
