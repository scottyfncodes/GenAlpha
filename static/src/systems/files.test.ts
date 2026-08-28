import { describe, expect, it } from 'vitest';
import { createNewSave } from '../state/defaults';
import { FILES } from '../content/files';
import { LOCATIONS } from '../world/locations';
import { revealArea } from '../world/exploration';
import { isFileUnlocked, lockedFileCount, unlockedFiles } from './files';

describe('Files — unlocked as a pure predicate over the save, not a stored flag', () => {
  it('a fresh save has every File locked', () => {
    const save = createNewSave('Wren');
    expect(unlockedFiles(save)).toEqual([]);
    expect(lockedFileCount(save)).toBe(FILES.length);
  });

  it('crossing the first escalation threshold unlocks the corporate memo', () => {
    const save = createNewSave('Wren');
    expect(isFileUnlocked(save, 'corp_safetrace_rollout')).toBe(false);
    const later = { ...save, world: { ...save.world, day: 4 } };
    expect(isFileUnlocked(later, 'corp_safetrace_rollout')).toBe(true);
  });

  it('holding some Little John unlocks the ledger fragment, and nothing else', () => {
    const save = createNewSave('Wren');
    const holding = {
      ...save,
      economy: { ...save.economy, cryptoWallets: [{ asset: 'SHDW', amount: 1 }] },
    };
    expect(isFileUnlocked(holding, 'hidden_littlejohn_ledger')).toBe(true);
    expect(isFileUnlocked(holding, 'hidden_ai_access_log')).toBe(false);
  });

  it('a mentor skill unlock reveals that mentor’s own dossier entry', () => {
    const save = createNewSave('Wren');
    const trusted = {
      ...save,
      skills: { ...save.skills, resistanceIntel: { ...save.skills.resistanceIntel, unlocked: true } },
    };
    expect(isFileUnlocked(trusted, 'person_bishop_note')).toBe(true);
    expect(isFileUnlocked(trusted, 'person_deja_note')).toBe(false);
  });

  it('re-derives on every read — nothing here can outlive the state it describes', () => {
    const save = createNewSave('Wren');
    const withDrone = {
      ...save,
      economy: {
        ...save.economy,
        inventory: [...save.economy.inventory, { itemId: 'scout_drone', quantity: 1, acquiredVia: 'found' as const }],
      },
    };
    expect(isFileUnlocked(withDrone, 'tech_drone_flight')).toBe(true);
    const withoutDrone = { ...withDrone, economy: { ...withDrone.economy, inventory: save.economy.inventory } };
    expect(isFileUnlocked(withoutDrone, 'tech_drone_flight')).toBe(false);
  });

  describe('location-tied Files — audit item #7', () => {
    it('unlocks once the player has physically stood at the location, not before', () => {
      const save = createNewSave('Wren');
      expect(isFileUnlocked(save, 'location_annex_notes')).toBe(false);

      const annex = LOCATIONS.find((l) => l.id === 'annex_fence')!;
      const visited = revealArea(save, annex.x + annex.w / 2, annex.y + annex.h / 2, 10, 'explored');
      expect(isFileUnlocked(visited, 'location_annex_notes')).toBe(true);
      // Standing at the Annex doesn't also unlock the other two.
      expect(isFileUnlocked(visited, 'location_data_center_notes')).toBe(false);
      expect(isFileUnlocked(visited, 'location_camera_pole_notes')).toBe(false);
    });

    it('scouting from a distance (drone) doesn’t count — only actually being there does', () => {
      const save = createNewSave('Wren');
      const dataCenter = LOCATIONS.find((l) => l.id === 'data_center')!;
      const scouted = revealArea(
        save,
        dataCenter.x + dataCenter.w / 2,
        dataCenter.y + dataCenter.h / 2,
        10,
        'scouted',
      );
      expect(isFileUnlocked(scouted, 'location_data_center_notes')).toBe(false);
    });
  });
});
