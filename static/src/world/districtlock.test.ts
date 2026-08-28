import { describe, expect, it } from 'vitest';
import { createNewSave } from '../state/defaults';
import { revealArea } from './exploration';
import { LOCATIONS } from './locations';
import { districtsFromExploration, isDistrictAccessible, pendingDistrictIds } from './districtlock';
import type { Scene } from '../systems/scenes';

/** A minimal, always-offered scene at the given location — no `requires` at
 * all, so `offered()` never has anything to gate on. */
function fakeScene(locationId: string): Scene {
  return {
    id: `test_${locationId}`,
    beat: 1,
    locationId,
    hook: 'Test hook',
    language: 'A',
    start: 'n1',
    nodes: { n1: { id: 'n1', lines: [{ text: 'Test line.' }] } },
  };
}

describe('pendingDistrictIds', () => {
  it('names the district of every currently offered scene', () => {
    const save = createNewSave('Wren');
    const worksLocation = LOCATIONS.find((l) => l.district === 'the_works')!;
    const ids = pendingDistrictIds(save, [fakeScene(worksLocation.id)]);
    expect(ids.has('the_works')).toBe(true);
  });

  it('is empty when nothing is offered', () => {
    const save = createNewSave('Wren');
    expect(pendingDistrictIds(save, []).size).toBe(0);
  });

  it('ignores a scene whose location does not exist', () => {
    const save = createNewSave('Wren');
    expect(pendingDistrictIds(save, [fakeScene('not_a_real_location')]).size).toBe(0);
  });
});

describe('isDistrictAccessible', () => {
  it('is true for a district already in unlockedDistricts', () => {
    const save = createNewSave('Wren');
    expect(isDistrictAccessible(save, 'the_heights', [])).toBe(true);
  });

  it('is false for a district neither unlocked nor currently offered', () => {
    const save = createNewSave('Wren');
    expect(isDistrictAccessible(save, 'the_works', [])).toBe(false);
  });

  it('is true for a district a currently open thread points into, even before it is sticky-unlocked', () => {
    const save = createNewSave('Wren');
    const civicLocation = LOCATIONS.find((l) => l.district === 'civic_zone')!;
    expect(isDistrictAccessible(save, 'civic_zone', [fakeScene(civicLocation.id)])).toBe(true);
  });
});

describe('districtsFromExploration', () => {
  it('reads Home\'s own starting patch as the_heights', () => {
    const save = createNewSave('Wren');
    expect(districtsFromExploration(save.world.exploration)).toContain('the_heights');
  });

  it('reads only `explored` ground, not `scouted` — a drone-scouted district is known, not walked', () => {
    const worksLocation = LOCATIONS.find((l) => l.district === 'the_works')!;
    const base = createNewSave('Wren');
    const blank = { ...base, world: { ...base.world, exploration: { explored: [], scouted: [] } } };
    const scouted = revealArea(
      blank,
      worksLocation.x + worksLocation.w / 2,
      worksLocation.y + worksLocation.h / 2,
      60,
      'scouted',
    );
    expect(districtsFromExploration(scouted.world.exploration)).not.toContain('the_works');
  });

  it('picks up a district the player has actually walked through', () => {
    const worksLocation = LOCATIONS.find((l) => l.district === 'the_works')!;
    const base = createNewSave('Wren');
    const blank = { ...base, world: { ...base.world, exploration: { explored: [], scouted: [] } } };
    const walked = revealArea(
      blank,
      worksLocation.x + worksLocation.w / 2,
      worksLocation.y + worksLocation.h / 2,
      60,
      'explored',
    );
    const ids = districtsFromExploration(walked.world.exploration);
    expect(ids).toContain('the_works');
    expect(ids).not.toContain('the_heights');
  });
});
