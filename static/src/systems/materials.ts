import type { SaveState } from '../state/schema';
import { JUNCTION_BOX_SALVAGE, MATERIALS_BY_ID, RECIPES } from '../content/materials';
import { BLUEPRINTS } from '../content/blueprints';
import { mulberry32, seedFrom } from './rng';
import { BOLT_CUTTERS, PLAYER_DRONE_TIERS } from '../content/economy';
import {
  CAMERA_NODES,
  HIDDEN_PICKUPS,
  sabotageActionsFor,
  type CameraNode,
  type SabotageActionId,
} from '../world/collectibles';
import { JUNCTION_BOX_NODES, JUNCTION_BOX_RISK } from '../world/junctionboxes';
import { DISTRACTION_COOLDOWN_DAYS, DISTRACTION_NODES } from '../world/distractions';
import { DRONE_TAKEDOWN_BY_TOOL_TIER } from '../world/drones';
import { DRONE_SHOOT_MISS_COOLDOWN_DAYS, DRONE_SHOOT_MISS_HEAT_PENALTY } from './droneshoot';
import {
  KAMIKAZE_FAIL_HEAT_PENALTY,
  KAMIKAZE_HEAT_COST,
  KAMIKAZE_RESPAWN_DAYS,
  RECON_FAIL_HEAT_PENALTY,
  type PlayerDroneTier,
} from '../world/playerdrone';
import { canEmpFromAir, reconHeatRelief } from './dronerecon';
import {
  addCash,
  addShdw,
  deckTier,
  droneToolTier,
  grantItem,
  owns,
  playerDroneTier,
  quantityOf,
  removeItem,
} from './market';
import { applyHeat } from './heat';

/**
 * Salvage: find it, sell it for SHDW, or build with it. Pure functions over
 * the save, same shape as heat.ts/missions.ts/market.ts — nothing here
 * decides UI, nothing here is a minigame. A hidden bush is a walk; a camera
 * is a decision with a cost on it; selling is a number; building is a recipe
 * check.
 *
 * Hidden pickups and camera dismantles share one cooldown log
 * (`world.collectedNodes`) even though they're different shapes — both are
 * "a place that gives something back on a day-keyed timer," and a single id
 * namespace is enough to keep them apart.
 */

/**
 * `defaultRespawnDays` only matters when a record exists but was stamped
 * without its own override — every current writer always stamps one for a
 * camera (see `markCollected`), so this is really just a floor for data from
 * before tiers existed.
 *
 * Exported for `systems/streethacks.ts` — a street hack is a third shape on
 * the same "place that gives something back on a day-keyed timer" log this
 * file's own doc comment already describes, not a reason for a second one.
 */
export function onCooldown(save: SaveState, nodeId: string, defaultRespawnDays: number): boolean {
  const record = save.world.collectedNodes.find((c) => c.nodeId === nodeId);
  if (!record) return false;
  const respawnDays = record.respawnDays ?? defaultRespawnDays;
  return save.world.day < record.collectedOnDay + respawnDays;
}

/** `respawnDays` is stamped on the record itself when a node's timer isn't
 * fixed — a camera's varies by which sabotage action took it down. Omitted
 * for a hidden pickup, which always uses its own one fixed value. */
export function markCollected(save: SaveState, nodeId: string, respawnDays?: number): SaveState {
  const collectedNodes = [
    ...save.world.collectedNodes.filter((c) => c.nodeId !== nodeId),
    { nodeId, collectedOnDay: save.world.day, ...(respawnDays !== undefined ? { respawnDays } : {}) },
  ];
  return { ...save, world: { ...save.world, collectedNodes } };
}

/**
 * Flips a node's `relocated` flag on once Overworld.tsx has confirmed its
 * old spot scrolled off screen after its cooldown expired — see
 * `world/relocate.ts` for why this needs to be a persisted one-way flag
 * rather than something recomputed live every frame. A no-op if the node
 * has no cooldown record at all (nothing to relocate) or is already
 * flagged; both keep this safe to dispatch every frame the condition holds
 * until the state actually catches up.
 */
export function markRelocated(save: SaveState, nodeId: string): SaveState {
  const record = save.world.collectedNodes.find((c) => c.nodeId === nodeId);
  if (!record || record.relocated) return save;
  const collectedNodes = save.world.collectedNodes.map((c) => (c.nodeId === nodeId ? { ...c, relocated: true } : c));
  return { ...save, world: { ...save.world, collectedNodes } };
}

/** Whether a hidden bush still has something in it — never taken, or its
 * respawn window (measured in `world.day`, never wall-clock time) has passed. */
export function canCollectHidden(save: SaveState, obstacleId: string): boolean {
  const pickup = HIDDEN_PICKUPS.find((p) => p.obstacleId === obstacleId);
  return Boolean(pickup) && !onCooldown(save, obstacleId, pickup!.respawnDays);
}

/** Walking into it is the whole interaction — no cost, no choice, just luck
 * of which bush it was. A find is a material, cash, or (rarely) both — the
 * "more fun to discover" pass added the cash finds; a material-only pickup
 * just leaves `cash` unset. */
export function collectHidden(save: SaveState, obstacleId: string): SaveState {
  const pickup = HIDDEN_PICKUPS.find((p) => p.obstacleId === obstacleId);
  if (!pickup || !canCollectHidden(save, obstacleId)) return save;
  let s = save;
  if (pickup.itemId) s = grantItem(s, pickup.itemId, pickup.quantity ?? 1, 'found');
  if (pickup.cash) s = addCash(s, pickup.cash);
  return markCollected(s, obstacleId);
}

/**
 * Whether a camera is currently standing — never sabotaged, or SafeTrace's had
 * time to put a new one up — *and* whether the player can actually reach
 * one at all. Bolt cutters first (the housing's still bolted to the pole
 * whatever the deck says), then the deck itself built up to tier 3
 * (`systems/streethacks.ts` `HACK_KIND_MIN_TIER`) — same two-layer gate a
 * street hack's `canHackStreetNode` applies to its own kinds.
 */
export function canSabotage(save: SaveState, node: CameraNode): boolean {
  return owns(save, BOLT_CUTTERS) && deckTier(save) >= 3 && !onCooldown(save, node.id, node.respawnDays);
}

/**
 * Any of the three tiers `sabotageActionsFor` derives for this node — a Heat
 * cost shown on the prompt before it's spent (Heat System guardrail 2), and
 * for two of the three, the better half of the salvage economy:
 * `cracked_chipset` comes from a camera and nowhere else. `acquiredVia:
 * 'theft'` because taking one apart is exactly that, not a lucky find.
 */
export function sabotageCamera(save: SaveState, nodeId: string, actionId: SabotageActionId): SaveState {
  const node = CAMERA_NODES.find((n) => n.id === nodeId);
  if (!node || !canSabotage(save, node)) return save;
  const action = sabotageActionsFor(node).find((a) => a.id === actionId);
  if (!action) return save;

  const withItem = grantItem(save, action.itemId, action.quantity, 'theft');
  const withHeat = {
    ...withItem,
    heat: applyHeat(withItem.heat, {
      eventId: `sabotage_${actionId}_${nodeId}`,
      delta: action.heatCost,
      logToHistory: true,
    }),
  };
  return markCollected(withHeat, nodeId, action.respawnDays);
}

/** Whether a junction box is currently standing — never cracked, or its
 * tier's own respawn window (`JUNCTION_BOX_RISK`) has passed. No tool, no
 * deck tier — the one gate here is the Heat cost, scaled by tier, per the
 * build note that a higher-level plan should cost more to go after, not
 * need different gear to reach. */
export function canDestroyJunctionBox(save: SaveState, node: { id: string; tier: 1 | 2 | 3 | 4 | 5 }): boolean {
  return !onCooldown(save, node.id, JUNCTION_BOX_RISK[node.tier].respawnDays);
}

/** What was actually in a box, once the lid is off. `name` rides along so
 * every surface that reports a find (the overworld toast, the drone strike's
 * own result line) says the same words without re-deriving them from two
 * different catalogs. */
export type JunctionBoxLoot =
  | { kind: 'blueprint'; itemId: string; quantity: 1; name: string }
  | { kind: 'materials'; itemId: string; quantity: number; name: string };

/**
 * What's inside a junction box — decided at the moment it's cracked, never
 * before, which is the whole point of the change: the prompt can no longer
 * tell the player what they're about to get, because until this runs there
 * is nothing to tell.
 *
 * The roll is over the plans at this box's tier the player *doesn't already
 * have*, so 100% collection stays reachable by persistence rather than by
 * luck — the randomness is in the order the plans arrive and how many boxes
 * it takes, never in whether a plan can be had at all. There are exactly as
 * many boxes at each tier as there are plans at that tier, so a tier can
 * always be finished; it just won't be finished in the order anyone planned,
 * and that's what slows the run to 100% down.
 *
 * Once a tier's plans are all found, its boxes pay salvage instead
 * (`JUNCTION_BOX_SALVAGE`) — a box is never empty, because a Heat cost the
 * player already paid should never buy nothing.
 *
 * Deterministic, seeded off the save rather than `Math.random`: a reducer has
 * to be a pure function of its input (React re-invokes it in development to
 * check exactly that), and the overworld needs to be able to ask "what will
 * this box give" and get the same answer the reducer is about to reach, so
 * it can name the find in the toast without a second source of truth.
 */
export function rollJunctionBoxLoot(save: SaveState, node: { id: string; tier: 1 | 2 | 3 | 4 | 5 }): JunctionBoxLoot {
  const unfound = BLUEPRINTS.filter((b) => b.tier === node.tier && !owns(save, b.itemId));
  const rand = mulberry32(seedFrom(`${node.id}:${save.world.day}:${unfound.length}`));

  if (unfound.length > 0) {
    const plan = unfound[Math.floor(rand() * unfound.length)];
    return { kind: 'blueprint', itemId: plan.itemId, quantity: 1, name: plan.name };
  }

  const pool = JUNCTION_BOX_SALVAGE[node.tier];
  const pick = pool[Math.floor(rand() * pool.length)];
  return {
    kind: 'materials',
    itemId: pick.itemId,
    quantity: pick.quantity,
    name: MATERIALS_BY_ID[pick.itemId]?.name ?? 'salvage',
  };
}

/**
 * Crack it open: whatever's inside, once, at the Heat cost its tier carries.
 * `acquiredVia: 'theft'` for the same reason a camera dismantle uses it —
 * this is a decision with a cost on it, not a lucky find.
 */
export function destroyJunctionBox(save: SaveState, nodeId: string): SaveState {
  const node = JUNCTION_BOX_NODES.find((n) => n.id === nodeId);
  if (!node || !canDestroyJunctionBox(save, node)) return save;
  const risk = JUNCTION_BOX_RISK[node.tier];
  const loot = rollJunctionBoxLoot(save, node);

  const withItem = grantItem(save, loot.itemId, loot.quantity, 'theft');
  const withHeat = {
    ...withItem,
    heat: applyHeat(withItem.heat, {
      eventId: `junction_box_${nodeId}`,
      delta: risk.heatCost,
      logToHistory: true,
    }),
  };
  return markCollected(withHeat, nodeId, risk.respawnDays);
}

/** Whether a drone can be taken down right now — some tool built (any tier
 * will do; which one just decides the outcome), and this particular drone
 * isn't already down from a previous hit. */
export function canDisableDrone(save: SaveState, droneId: string): boolean {
  const tier = droneToolTier(save);
  if (tier < 1) return false;
  const result = DRONE_TAKEDOWN_BY_TOOL_TIER[tier as 1 | 2 | 3];
  return !onCooldown(save, droneId, result.respawnDays);
}

/**
 * Bring one down — or don't. `hit` is the outcome of the shooting minigame
 * (`ui/minigames/DroneShoot.tsx`, `systems/droneshoot.ts`), decided by the
 * player's aim, not by which tool they're carrying. The tool only decides
 * what a hit is worth: a slingshot pays little for a real Heat cost, an EMP
 * gun pays the most for none at all (`DRONE_TAKEDOWN_BY_TOOL_TIER`). A miss
 * costs more Heat than any hit tier does — the shot went loud and nothing
 * came of it — and sends the drone off for a short, fixed cooldown rather
 * than an immediate second try.
 */
export function disableDrone(save: SaveState, droneId: string, hit: boolean): SaveState {
  if (!canDisableDrone(save, droneId)) return save;

  if (!hit) {
    const missed = {
      ...save,
      heat: applyHeat(save.heat, {
        eventId: `drone_missed_${droneId}`,
        delta: DRONE_SHOOT_MISS_HEAT_PENALTY,
        logToHistory: true,
      }),
    };
    return markCollected(missed, droneId, DRONE_SHOOT_MISS_COOLDOWN_DAYS);
  }

  const tier = droneToolTier(save) as 1 | 2 | 3;
  const result = DRONE_TAKEDOWN_BY_TOOL_TIER[tier];

  const withItem = grantItem(save, result.itemId, result.quantity, 'theft');
  const withHeat = {
    ...withItem,
    heat: applyHeat(withItem.heat, {
      eventId: `drone_takedown_${droneId}`,
      delta: result.heatCost,
      logToHistory: result.heatCost > 0,
    }),
  };
  return markCollected(withHeat, droneId, result.respawnDays);
}

/** Whichever drone tier the player currently holds — there's only ever one,
 * same "trade up, don't stack" shape as a board or a deck. */
function ownedDroneItemId(save: SaveState): string | undefined {
  return [...PLAYER_DRONE_TIERS].reverse().find((itemId) => owns(save, itemId));
}

/** A recon flight needs an airframe built. Nothing else — no cooldown, no
 * target — because the minigame itself (`ui/minigames/DroneFlight.tsx`) is
 * the actual gate: a player can only fly as often as they're willing to
 * play it, and a scrubbed flight already costs Heat. */
export function canFlyRecon(save: SaveState): boolean {
  return playerDroneTier(save) >= 1;
}

/**
 * `hit` is the flight's own outcome — home clean, or spotted and scrubbed.
 * A clean run pays Heat relief scaled by both the airframe and
 * `discoveredCount`, the number of things the flight actually found
 * (`systems/dronerecon.ts` `reconHeatRelief`) — a thorough scout outpays a
 * flight that just circled and came home. A scrubbed one costs a flat
 * penalty instead. The drone always comes home; this is the one drone
 * action that never touches the inventory.
 */
export function flyRecon(save: SaveState, hit: boolean, discoveredCount = 0): SaveState {
  if (!canFlyRecon(save)) return save;
  const tier = playerDroneTier(save) as PlayerDroneTier;
  const delta = hit ? -reconHeatRelief(tier, discoveredCount) : RECON_FAIL_HEAT_PENALTY;
  return {
    ...save,
    heat: applyHeat(save.heat, {
      eventId: hit ? 'recon_flight_clean' : 'recon_flight_scrubbed',
      delta,
      logToHistory: true,
    }),
  };
}

/** Heat cost for putting a scouted camera to sleep from the air — cheaper
 * than any physical sabotage tier, since nobody climbed the pole, but not
 * free: SafeTrace still notices a housing that's gone dark. */
export const RECON_EMP_HEAT_COST = 3;
/** Shorter than a physical dismantle's respawn — an EMP stuns the housing,
 * it doesn't carry any of it away, so SafeTrace has it back up sooner. */
export const RECON_EMP_RESPAWN_DAYS = 3;

/** Tier 2+ airframe, camera actually in scan range this flight (the caller —
 * `Overworld.tsx` — only ever offers an id that was), and not already dark
 * from this or any other means: the cooldown log is shared with every other
 * way of taking a camera down, so an EMP can't stack on top of a fresh
 * physical sabotage or vice versa. */
export function canReconEmp(save: SaveState, cameraId: string): boolean {
  if (canEmpFromAir(playerDroneTier(save) as PlayerDroneTier) === false) return false;
  return !onCooldown(save, cameraId, RECON_EMP_RESPAWN_DAYS);
}

/**
 * Disruption, not a dismantle: the housing goes dark and stays dark for a
 * few days, at a flat Heat cost, and pays out no parts — bolt cutters never
 * touched it, so there's nothing to carry home. This is the drone's own
 * verb, distinct from the loot a physical sabotage or a kamikaze strike pays.
 */
export function reconEmpCamera(save: SaveState, cameraId: string): SaveState {
  const node = CAMERA_NODES.find((n) => n.id === cameraId);
  if (!node || !canReconEmp(save, cameraId)) return save;
  const withHeat = {
    ...save,
    heat: applyHeat(save.heat, {
      eventId: `recon_emp_${cameraId}`,
      delta: RECON_EMP_HEAT_COST,
      logToHistory: true,
    }),
  };
  return markCollected(withHeat, cameraId, RECON_EMP_RESPAWN_DAYS);
}

/** A camera or a junction box, already in reach — the same two nearby
 * targets `SABOTAGE_CAMERA`/`DESTROY_JUNCTION_BOX` already offer, just
 * reached a second way. */
export type KamikazeTarget = { kind: 'camera'; id: string } | { kind: 'junction'; id: string };

/** An airframe built, and the target not already down (whether from a
 * previous kamikaze run or an ordinary sabotage/destroy — the cooldown log
 * is shared, so it isn't a separate rule to remember). */
export function canKamikaze(save: SaveState, target: KamikazeTarget): boolean {
  if (playerDroneTier(save) < 1) return false;
  return !onCooldown(save, target.id, KAMIKAZE_RESPAWN_DAYS);
}

/**
 * Fly it in. `hit` is the flight minigame's outcome. Either way the drone
 * is gone — a kamikaze run doesn't come home — but only a landed hit takes
 * the target down: a camera pays its featured part at double quantity, a
 * junction box pays its blueprint, both at zero Heat cost and a much
 * longer respawn than an ordinary hit reaches. A crash pays nothing, costs
 * real Heat, and leaves the target standing for the next attempt.
 */
export function kamikazeStrike(save: SaveState, target: KamikazeTarget, hit: boolean): SaveState {
  if (!canKamikaze(save, target)) return save;

  // Confirmed before anything is spent — an unknown target shouldn't cost
  // a real drone, the same "no-op on a bad id" contract every other
  // destroy/sabotage function here holds to.
  const camera = target.kind === 'camera' ? CAMERA_NODES.find((n) => n.id === target.id) : undefined;
  const junction = target.kind === 'junction' ? JUNCTION_BOX_NODES.find((n) => n.id === target.id) : undefined;
  if (!camera && !junction) return save;

  const droneItemId = ownedDroneItemId(save);
  let s = droneItemId ? removeItem(save, droneItemId) : save;

  if (!hit) {
    return {
      ...s,
      heat: applyHeat(s.heat, {
        eventId: `kamikaze_missed_${target.id}`,
        delta: KAMIKAZE_FAIL_HEAT_PENALTY,
        logToHistory: true,
      }),
    };
  }

  if (camera) {
    s = grantItem(s, camera.itemId, 2, 'theft');
  } else {
    // Same roll an on-foot crack would make — flying a drone into a box is a
    // different way in, not a different box.
    const loot = rollJunctionBoxLoot(s, junction!);
    s = grantItem(s, loot.itemId, loot.quantity, 'theft');
  }

  const withHeat = {
    ...s,
    heat: applyHeat(s.heat, {
      eventId: `kamikaze_${target.id}`,
      delta: KAMIKAZE_HEAT_COST,
      logToHistory: false,
    }),
  };
  return markCollected(withHeat, target.id, KAMIKAZE_RESPAWN_DAYS);
}

export function sellMaterial(save: SaveState, itemId: string): SaveState {
  const material = MATERIALS_BY_ID[itemId];
  if (!material || !owns(save, itemId)) return save;
  return addShdw(removeItem(save, itemId), material.sellValueShdw);
}

/** A recipe needs its file before it needs its parts — knowing salvage will
 * eventually make a Rebuilt Deck isn't the same as having the diagram for
 * one. `blueprintItemId` is checked with plain `owns`, same as any other
 * item; the file itself never gets consumed by building, only found. */
export function canCraft(save: SaveState, recipeId: string): boolean {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return false;
  return owns(save, recipe.blueprintItemId) && recipe.inputs.every((i) => quantityOf(save, i.itemId) >= i.quantity);
}

export function craft(save: SaveState, recipeId: string): SaveState {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe || !canCraft(save, recipeId)) return save;

  let s = save;
  for (const input of recipe.inputs) s = removeItem(s, input.itemId, input.quantity);
  return grantItem(s, recipe.outputItemId, 1, 'crafted');
}

/** No tool, no deck, no Heat gate — a distraction is available to anyone
 * standing next to it, the moment it isn't already ringing (`world/
 * distractions.ts` `DISTRACTION_COOLDOWN_DAYS`). */
export function canTriggerDistraction(save: SaveState, nodeId: string): boolean {
  return DISTRACTION_NODES.some((n) => n.id === nodeId) && !onCooldown(save, nodeId, DISTRACTION_COOLDOWN_DAYS);
}

/**
 * Sets the alarm off. No Heat, no item — the whole payoff is off-screen, in
 * `world/investigate.ts`: `Overworld.tsx` stamps an alert at this node's own
 * position the instant this dispatches, which is what actually pulls a
 * nearby patrol or officer away from wherever the player needs them not to
 * be. This function only owns the alarm's own cooldown so it can't be spammed.
 */
export function triggerDistraction(save: SaveState, nodeId: string): SaveState {
  if (!canTriggerDistraction(save, nodeId)) return save;
  return markCollected(save, nodeId, DISTRACTION_COOLDOWN_DAYS);
}
