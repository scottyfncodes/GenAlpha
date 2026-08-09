/**
 * Overworld collectible nodes (module 9 addendum, Part A): things worth
 * walking off the critical path for. Coordinates checked against the same
 * padded-rect collision data as the maze filler and patrol routes — every
 * point here sits outside every building and obstacle, padding included, so
 * a node is never placed somewhere the player can't actually stand next to.
 *
 * Respawn is keyed to `world.day`, never wall-clock time, same rule as
 * everything else that comes back — see `systems/materials.ts` `canCollect`.
 */
export interface CollectibleNode {
  id: string;
  x: number;
  y: number;
  itemId: string;
  respawnDays: number;
}

export const COLLECTIBLE_NODES: CollectibleNode[] = [
  { id: 'salvage_1', x: 640, y: 415, itemId: 'copper_wire', respawnDays: 2 },
  { id: 'salvage_2', x: 600, y: 428, itemId: 'salvaged_board', respawnDays: 3 },
  { id: 'salvage_3', x: 120, y: 300, itemId: 'copper_wire', respawnDays: 2 },
  { id: 'salvage_4', x: 140, y: 350, itemId: 'spare_battery', respawnDays: 3 },
  { id: 'salvage_5', x: 756, y: 100, itemId: 'cracked_chipset', respawnDays: 4 },
  { id: 'salvage_6', x: 756, y: 210, itemId: 'copper_wire', respawnDays: 2 },
  { id: 'salvage_7', x: 330, y: 300, itemId: 'salvaged_board', respawnDays: 3 },
  { id: 'salvage_8', x: 330, y: 450, itemId: 'spare_battery', respawnDays: 3 },
  { id: 'salvage_9', x: 540, y: 300, itemId: 'cracked_chipset', respawnDays: 4 },
  { id: 'salvage_10', x: 540, y: 450, itemId: 'copper_wire', respawnDays: 2 },
  { id: 'salvage_11', x: 16, y: 300, itemId: 'salvaged_board', respawnDays: 3 },
  { id: 'salvage_12', x: 948, y: 300, itemId: 'spare_battery', respawnDays: 3 },
  { id: 'salvage_13', x: 260, y: 428, itemId: 'cracked_chipset', respawnDays: 4 },
  { id: 'salvage_14', x: 600, y: 600, itemId: 'copper_wire', respawnDays: 2 },
  { id: 'salvage_15', x: 700, y: 608, itemId: 'salvaged_board', respawnDays: 3 },
];
