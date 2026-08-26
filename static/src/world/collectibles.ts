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
 * `coverageRadius` is a *solved* set, not a taste. Three assertions in
 * `systems/coverage.test.ts` decide every number in this column together:
 * the full rollout reaches exactly 100%, each stage rises on the one
 * before it, and more than half of the standing cameras are still
 * individually worth taking down at full coverage.
 *
 * That last one is the constraint that actually does the work. A camera
 * whose whole disc sits inside its neighbours' owns no ground, so cutting
 * it changes nothing and the sabotage loop goes decorative — and a
 * clustered network is exactly the shape that produces those. The radii
 * that satisfy all three don't line up with any per-district rule of
 * thumb; they are what they are because of where the poles ended up.
 *
 * Which means: **move a node here and the whole column needs re-solving.**
 * Don't hand-nudge one radius to taste and assume the rest still hold —
 * run the coverage test, and expect it to fail until the set is re-fitted.
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
  /**
   * Which way the lens points, in degrees (0 = east, 90 = south, the same
   * screen convention `world/npcs.ts` uses for a wander heading). Authored
   * per node rather than derived, because a camera's *direction* is the
   * only thing that turns "there is a camera here" into "that camera can
   * see the alley I was about to use" — `draw.ts`'s `drawSabotageCamera`
   * paints the wedge on the ground, so the coverage the HUD reports as a
   * percentage is also visible as a shape the player can walk around.
   */
  facing: number;
}

export const CAMERA_NODES: CameraNode[] = [
  /*
   * Placement is the surveillance gradient the 3x3 layout is built around:
   * density climbs toward the Civic Zone and falls away toward Liberty
   * Park. Read the stage columns as a rollout, not a scatter —
   *
   *   stage 0  Civic Zone 4 · Main Street 2 · The Plaza 2 · The Works 1
   *   stage 1  the working districts get their first lens each
   *   stage 2  the residential blocks — The Heights and The Blocks
   *   stage 3  Liberty Park, last, because taking the commons is the point
   *
   * — which is why a brand-new save can walk The Heights and the park
   * without passing a single camera, and why by the end of the game there
   * is nowhere left that's true of. A camera worth 4% of the town is a
   * different target from one worth 2%, and the Civic Zone's are the
   * widest on the map.
   */
  // Stage 0 — the Civic Zone's own ring, four lenses on one block: the
  // approach from the secondary road, City Hall's street frontage, the
  // service cut between Library and Records, and the Data Centre gate.
  { id: 'camera_dismantle_1', x: 1122, y: 60, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 350, stage: 0, facing: 0 },
  { id: 'camera_dismantle_2', x: 1200, y: 216, itemId: 'hard_drive', respawnDays: 4, heatCost: 3, coverageRadius: 360, stage: 0, facing: 90 },
  { id: 'camera_dismantle_3', x: 1348, y: 216, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 230, stage: 0, facing: 90 },
  { id: 'camera_dismantle_4', x: 1512, y: 216, itemId: 'graphics_card', respawnDays: 6, heatCost: 5, coverageRadius: 280, stage: 0, facing: 270 },
  // Stage 0 — Main Street's two, the Crossroads corner and the shopfronts.
  { id: 'camera_dismantle_5', x: 614, y: 196, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 243, stage: 0, facing: 180 },
  { id: 'camera_dismantle_6', x: 950, y: 190, itemId: 'hard_drive', respawnDays: 4, heatCost: 3, coverageRadius: 223, stage: 0, facing: 0 },
  // Stage 0 — The Plaza's lot, which the story has always said is better
  // covered than the school, and The Works' own row.
  { id: 'camera_dismantle_7', x: 1240, y: 948, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 284, stage: 0, facing: 90 },
  { id: 'camera_dismantle_8', x: 1560, y: 780, itemId: 'logic_board', respawnDays: 4, heatCost: 3, coverageRadius: 204, stage: 0, facing: 90 },
  { id: 'camera_dismantle_9', x: 1330, y: 552, itemId: 'graphics_card', respawnDays: 6, heatCost: 5, coverageRadius: 261, stage: 0, facing: 0 },
  // Stage 1 (day 4) — Old Market, Southside and the Annex fence line: the
  // working districts get their first lens each, closing the widest gaps
  // stage 0 left.
  { id: 'camera_dismantle_10', x: 224, y: 550, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 308, stage: 1, facing: 180 },
  { id: 'camera_dismantle_11', x: 220, y: 976, itemId: 'hard_drive', respawnDays: 4, heatCost: 3, coverageRadius: 229, stage: 1, facing: 0 },
  { id: 'camera_dismantle_12', x: 1540, y: 500, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 230, stage: 1, facing: 180 },
  { id: 'camera_dismantle_13', x: 1400, y: 930, itemId: 'logic_board', respawnDays: 4, heatCost: 3, coverageRadius: 259, stage: 1, facing: 180 },
  // Stage 2 (day 9) — the residential blocks. The Heights gets its first
  // camera in the whole game here, which is the beat: the district the
  // player started in stops being the one nobody watches.
  { id: 'camera_dismantle_14', x: 170, y: 256, itemId: 'logic_board', respawnDays: 4, heatCost: 3, coverageRadius: 285, stage: 2, facing: 270 },
  { id: 'camera_dismantle_15', x: 404, y: 246, itemId: 'hard_drive', respawnDays: 4, heatCost: 3, coverageRadius: 271, stage: 2, facing: 180 },
  { id: 'camera_dismantle_16', x: 706, y: 952, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 261, stage: 2, facing: 0 },
  { id: 'camera_dismantle_17', x: 1000, y: 952, itemId: 'graphics_card', respawnDays: 6, heatCost: 5, coverageRadius: 309, stage: 2, facing: 180 },
  { id: 'camera_dismantle_18', x: 1554, y: 216, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 220, stage: 2, facing: 180 },
  /*
   * Stage 3 (day 15) — Liberty Park last, because taking the commons is
   * the point. Exactly ONE of these stands inside the park: `_21`, on the
   * lawn's south edge, on the fountain's own axis and pointed straight up
   * it. The other two watch the park's *approaches* from the west gate and
   * the east gate — they are street cameras that happen to border a park,
   * and from anywhere on the grass you can see one lens and only one.
   *
   * That restraint is the whole beat. A thicket of cameras over a park
   * reads as set dressing; one camera on a pole over a fountain, in a
   * district with a playground and a banner and people on the grass, reads
   * as somebody deciding this place needed watching. With these standing
   * there is no unwatched ground left in Bellhaven — past here, doing
   * nothing is what loses ground.
   */
  { id: 'camera_dismantle_19', x: 528, y: 396, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 247, stage: 3, facing: 0 },
  { id: 'camera_dismantle_20', x: 1074, y: 520, itemId: 'graphics_card', respawnDays: 6, heatCost: 5, coverageRadius: 329, stage: 3, facing: 180 },
  { id: 'camera_dismantle_21', x: 900, y: 616, itemId: 'cracked_chipset', respawnDays: 5, heatCost: 4, coverageRadius: 260, stage: 3, facing: 270 },
  { id: 'camera_dismantle_22', x: 350, y: 700, itemId: 'logic_board', respawnDays: 4, heatCost: 3, coverageRadius: 296, stage: 3, facing: 90 },
  { id: 'camera_dismantle_23', x: 1130, y: 1000, itemId: 'graphics_card', respawnDays: 6, heatCost: 5, coverageRadius: 219, stage: 3, facing: 0 },
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
