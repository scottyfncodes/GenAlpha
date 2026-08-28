import type { ExplorationState, SaveState } from '../state/schema';
import { LOCATIONS, districtAt } from './locations';
import { cellCoords, CELL } from './exploration';
import { pendingScenes, type Scene } from '../systems/scenes';

/**
 * Story-gated map access. The town stays a true 3x3 the player is always
 * free to *look* at (the fog-of-war/GPS/drone systems in `exploration.ts`
 * never consult this file), but walking into a district is a separate
 * question from knowing it's there — see `Overworld.tsx`'s movement loop,
 * the one place this actually blocks anything.
 *
 * Home's own district starts open (`state/defaults.ts`); every other
 * district opens the moment a scene's own location first sends the player
 * there, and stays open for good after — see `unlockedDistricts`'s doc
 * comment in `state/schema.ts`.
 */

/** Every district a currently open thread points into — always walkable
 * right now, whether or not it's been made sticky yet. */
export function pendingDistrictIds(save: SaveState, scenes: Scene[]): Set<string> {
  const ids = new Set<string>();
  for (const scene of pendingScenes(save, scenes)) {
    const loc = LOCATIONS.find((l) => l.id === scene.locationId);
    if (loc?.district) ids.add(loc.district);
  }
  return ids;
}

/** Whether the player can walk into this district right now: it's either
 * been permanently opened, or an open thread is pointing into it this
 * instant. */
export function isDistrictAccessible(save: SaveState, districtId: string, scenes: Scene[]): boolean {
  if (save.world.unlockedDistricts.includes(districtId)) return true;
  return pendingDistrictIds(save, scenes).has(districtId);
}

/**
 * Migration-only: which districts a save from before this system existed
 * should start with already open, so a save that migrate() rebuilds never
 * walls a player off from ground they've already stood on. Derived from the
 * fog-of-war grid itself (`world/exploration.ts`) rather than from any
 * flag/chapter reasoning — "the player has already been here" is exactly
 * what an `explored` cell already means.
 */
export function districtsFromExploration(exploration: ExplorationState): string[] {
  const ids = new Set<string>();
  for (const idx of exploration.explored) {
    const { gx, gy } = cellCoords(idx);
    const d = districtAt((gx + 0.5) * CELL, (gy + 0.5) * CELL);
    if (d) ids.add(d.id);
  }
  return Array.from(ids);
}
