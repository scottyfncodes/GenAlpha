import type { SaveState } from '../state/schema';
import { SIGNAGE_NODES, type SignageNode } from '../world/signage';
import { onCooldown, markCollected } from './materials';
import { applyHeat } from './heat';
import { bumpIncident } from './incidents';

/** No tool, no deck tier — the Heat cost on the prompt is the only gate,
 * same shape as a junction box. See `world/signage.ts`'s own doc comment
 * for why this one is deliberately the cheapest interaction in the game. */
export function canHackSignage(save: SaveState, node: Pick<SignageNode, 'id' | 'respawnDays'>): boolean {
  return !onCooldown(save, node.id, node.respawnDays);
}

export function hackSignage(save: SaveState, nodeId: string): SaveState {
  const node = SIGNAGE_NODES.find((n) => n.id === nodeId);
  if (!node || !canHackSignage(save, node)) return save;

  const withHeat = {
    ...save,
    heat: applyHeat(save.heat, {
      eventId: `signage_${nodeId}`,
      delta: node.heatCost,
      logToHistory: true,
    }),
    world: { ...save.world, incidents: bumpIncident(save.world.incidents, 'signage_hacked') },
  };
  return markCollected(withHeat, nodeId, node.respawnDays);
}
