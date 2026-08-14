import type { SaveState } from '../state/schema';
import { MATERIALS_BY_ID, RECIPES } from '../content/materials';
import { BOLT_CUTTERS } from '../content/economy';
import {
  CAMERA_NODES,
  HIDDEN_PICKUPS,
  sabotageActionsFor,
  type CameraNode,
  type SabotageActionId,
} from '../world/collectibles';
import { JUNCTION_BOX_NODES, JUNCTION_BOX_RISK } from '../world/junctionboxes';
import { DRONE_TAKEDOWN_BY_TOOL_TIER } from '../world/drones';
import { DRONE_SHOOT_MISS_COOLDOWN_DAYS, DRONE_SHOOT_MISS_HEAT_PENALTY } from './droneshoot';
import { addCash, addShdw, deckTier, droneToolTier, grantItem, owns, quantityOf, removeItem } from './market';
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
 * Whether a camera is currently standing — never sabotaged, or Helio's had
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

/**
 * Crack it open: the one file inside, once, at the Heat cost its tier
 * carries. `acquiredVia: 'theft'` for the same reason a camera dismantle
 * uses it — this is a decision with a cost on it, not a lucky find.
 */
export function destroyJunctionBox(save: SaveState, nodeId: string): SaveState {
  const node = JUNCTION_BOX_NODES.find((n) => n.id === nodeId);
  if (!node || !canDestroyJunctionBox(save, node)) return save;
  const risk = JUNCTION_BOX_RISK[node.tier];

  const withItem = grantItem(save, node.blueprintItemId, 1, 'theft');
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
