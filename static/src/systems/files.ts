import type { SaveState } from '../state/schema';
import { FILES, type FileEntry } from '../content/files';
import { coveragePercent } from './coverage';
import { deckTier, gpsTier, playerDroneTier, shdwHeld } from './market';
import { escalationStage } from '../world/escalation';
import { CELL, cellStatus, exploredSnapshot } from '../world/exploration';
import { LOCATIONS } from '../world/locations';

/**
 * Whether the player has physically stood in a location's own footprint —
 * `explored` specifically, not `scouted`: a File gated on this is supposed
 * to read as "you were there," and a drone flying past at a distance isn't
 * that. Same centre-point stand-in `world/mapview.ts`'s own `locationKnown`
 * already uses for "is this location known yet" on the map screen.
 */
function locationExplored(save: SaveState, locationId: string): boolean {
  const loc = LOCATIONS.find((l) => l.id === locationId);
  if (!loc) return false;
  const gx = Math.floor((loc.x + loc.w / 2) / CELL);
  const gy = Math.floor((loc.y + loc.h / 2) / CELL);
  return cellStatus(exploredSnapshot(save.world.exploration), gx, gy) === 'explored';
}

/**
 * Whether a File is unlocked — a pure predicate over the save, not a stored
 * flag. See `content/files.ts`'s own doc comment for why: a File is a fact
 * about Aaron's *current* capability, so it has to be computed the same way
 * every time, or a stored "yes" could outlive the thing that made it true
 * (a deck that gets confiscated, say, once that's a thing that can happen).
 * Each check reads state that's already real and already tested elsewhere —
 * no new flags, no migration, nothing a scene has to remember to write.
 */
function unlockedWhen(save: SaveState, id: string): boolean {
  switch (id) {
    case 'corp_safetrace_rollout':
      return escalationStage(save.world.day) >= 1;
    case 'gov_municipal_contract':
      // Coverage itself climbs on the calendar alone (`systems/coverage.ts`),
      // so this only counts once the rollout is nearly total — the point
      // where the government's own fingerprints on the buildout stop being
      // deniable, not merely "some cameras exist."
      return coveragePercent(save) >= 95;
    case 'security_flack_spec':
      return deckTier(save) >= 3;
    case 'location_district_survey':
      return save.world.unlockedDistricts.length >= 2;
    case 'location_sweep_log':
      return save.world.surveillance.sweeps > 0;
    case 'person_deja_note':
      return save.skills.sabotage.unlocked;
    case 'person_bishop_note':
      return save.skills.resistanceIntel.unlocked;
    case 'tech_gps_teardown':
      return gpsTier(save) >= 1;
    case 'tech_drone_flight':
      return playerDroneTier(save) >= 1;
    case 'hidden_littlejohn_ledger':
      return shdwHeld(save) > 0;
    case 'hidden_ai_access_log':
      return save.skills.aiToolAccess.unlocked;
    // Player-Freedom Audit item #7 — gated on having physically stood
    // somewhere, not a stat threshold. Exploration itself is progression.
    case 'location_annex_notes':
      return locationExplored(save, 'annex_fence');
    case 'location_data_center_notes':
      return locationExplored(save, 'data_center');
    case 'location_camera_pole_notes':
      return locationExplored(save, 'camera_pole_5th');
    default:
      return false;
  }
}

export function isFileUnlocked(save: SaveState, fileId: string): boolean {
  return unlockedWhen(save, fileId);
}

export function unlockedFiles(save: SaveState): FileEntry[] {
  return FILES.filter((f) => unlockedWhen(save, f.id));
}

export function lockedFileCount(save: SaveState): number {
  return FILES.length - unlockedFiles(save).length;
}
