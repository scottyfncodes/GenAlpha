import type { SaveState } from '../state/schema';
import { MATERIALS_BY_ID, RECIPES } from '../content/materials';
import { CAMERA_NODES, HIDDEN_PICKUPS, type CameraNode } from '../world/collectibles';
import { addShdw, grantItem, owns, quantityOf, removeItem } from './market';
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

function onCooldown(save: SaveState, nodeId: string, respawnDays: number): boolean {
  const record = save.world.collectedNodes.find((c) => c.nodeId === nodeId);
  return Boolean(record) && save.world.day < record!.collectedOnDay + respawnDays;
}

function markCollected(save: SaveState, nodeId: string): SaveState {
  const collectedNodes = [
    ...save.world.collectedNodes.filter((c) => c.nodeId !== nodeId),
    { nodeId, collectedOnDay: save.world.day },
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
 * of which bush it was. */
export function collectHidden(save: SaveState, obstacleId: string): SaveState {
  const pickup = HIDDEN_PICKUPS.find((p) => p.obstacleId === obstacleId);
  if (!pickup || !canCollectHidden(save, obstacleId)) return save;
  return markCollected(grantItem(save, pickup.itemId, 1, 'found'), obstacleId);
}

/** Whether a camera is currently standing — never dismantled, or Helio's had
 * time to put a new one up. */
export function canDismantle(save: SaveState, node: CameraNode): boolean {
  return !onCooldown(save, node.id, node.respawnDays);
}

/**
 * The deliberate version: a Heat cost, shown on the prompt before it's spent
 * (Heat System guardrail 2), and the better half of the salvage economy —
 * `cracked_chipset` comes from here and nowhere else. `acquiredVia: 'theft'`
 * because taking a camera apart is exactly that, not a lucky find.
 */
export function dismantleCamera(save: SaveState, nodeId: string): SaveState {
  const node = CAMERA_NODES.find((n) => n.id === nodeId);
  if (!node || !canDismantle(save, node)) return save;

  const withItem = grantItem(save, node.itemId, 1, 'theft');
  const withHeat = {
    ...withItem,
    heat: applyHeat(withItem.heat, {
      eventId: `dismantle_${nodeId}`,
      delta: node.heatCost,
      logToHistory: true,
    }),
  };
  return markCollected(withHeat, nodeId);
}

export function sellMaterial(save: SaveState, itemId: string): SaveState {
  const material = MATERIALS_BY_ID[itemId];
  if (!material || !owns(save, itemId)) return save;
  return addShdw(removeItem(save, itemId), material.sellValueShdw);
}

export function canCraft(save: SaveState, recipeId: string): boolean {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return false;
  return recipe.inputs.every((i) => quantityOf(save, i.itemId) >= i.quantity);
}

export function craft(save: SaveState, recipeId: string): SaveState {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe || !canCraft(save, recipeId)) return save;

  let s = save;
  for (const input of recipe.inputs) s = removeItem(s, input.itemId, input.quantity);
  return grantItem(s, recipe.outputItemId, 1, 'crafted');
}
