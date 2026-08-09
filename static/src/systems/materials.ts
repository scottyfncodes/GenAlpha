import type { SaveState } from '../state/schema';
import { MATERIALS_BY_ID, RECIPES } from '../content/materials';
import { COLLECTIBLE_NODES, type CollectibleNode } from '../world/collectibles';
import { addShdw, grantItem, owns, quantityOf, removeItem } from './market';

/**
 * Salvage: collect, sell for SHDW, or build (module 9 addendum, Part A).
 * Pure functions over the save, same shape as heat.ts/missions.ts/market.ts —
 * nothing here decides UI, nothing here is a minigame. Finding a node is a
 * walk; selling it is a number; building something is a recipe check. The
 * *exploring* is the gameplay, not a system layered on top of it.
 */

export function nodeById(nodeId: string): CollectibleNode | undefined {
  return COLLECTIBLE_NODES.find((n) => n.id === nodeId);
}

/** Whether a node is currently pickable — never collected, or its respawn
 * window (measured in `world.day`, never wall-clock time) has passed. */
export function canCollect(save: SaveState, node: CollectibleNode): boolean {
  const record = save.world.collectedNodes.find((c) => c.nodeId === node.id);
  if (!record) return true;
  return save.world.day >= record.collectedOnDay + node.respawnDays;
}

export function collect(save: SaveState, nodeId: string): SaveState {
  const node = nodeById(nodeId);
  if (!node || !canCollect(save, node)) return save;

  const withItem = grantItem(save, node.itemId, 1, 'found');
  const collectedNodes = [
    ...withItem.world.collectedNodes.filter((c) => c.nodeId !== nodeId),
    { nodeId, collectedOnDay: withItem.world.day },
  ];
  return { ...withItem, world: { ...withItem.world, collectedNodes } };
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
