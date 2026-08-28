import { describe, expect, it } from 'vitest';
import { createNewSave } from '../state/defaults';
import { OBSTACLES_BY_ID } from './obstacles';
import { CLEARABLE_OBSTACLES, clearedObstacleIds, isObstacleCleared } from './clearables';

describe('the physical-obstacle progression — audit item #1', () => {
  it('both targets are real obstacles that actually exist on the map', () => {
    for (const target of CLEARABLE_OBSTACLES) {
      expect(OBSTACLES_BY_ID[target.id], `${target.id} isn't in OBSTACLES`).toBeDefined();
      expect(OBSTACLES_BY_ID[target.id].kind).toBe(target.kind);
    }
  });

  it('starts uncleared, and unreachable, on a fresh save', () => {
    const save = createNewSave('Wren');
    for (const target of CLEARABLE_OBSTACLES) {
      expect(isObstacleCleared(save, target.id)).toBe(false);
      expect(target.requires(save)).toBe(false);
    }
    expect(clearedObstacleIds(save).size).toBe(0);
  });

  it('the fence opens for Bolt Cutters and nothing else clears with it', () => {
    const save = createNewSave('Wren');
    const withCutters = {
      ...save,
      economy: {
        ...save.economy,
        inventory: [...save.economy.inventory, { itemId: 'bolt_cutters', quantity: 1, acquiredVia: 'purchase' as const }],
      },
    };
    const fence = CLEARABLE_OBSTACLES.find((c) => c.kind === 'fence')!;
    const gate = CLEARABLE_OBSTACLES.find((c) => c.kind === 'gate')!;
    expect(fence.requires(withCutters)).toBe(true);
    expect(gate.requires(withCutters)).toBe(false);
  });

  it('clearing sets the flag and never touches inventory or the obstacle table', () => {
    const save = createNewSave('Wren');
    const target = CLEARABLE_OBSTACLES[0];
    const cleared = { ...save, player: { ...save.player, flags: { ...save.player.flags, [target.flag]: true } } };
    expect(isObstacleCleared(cleared, target.id)).toBe(true);
    expect(clearedObstacleIds(cleared)).toEqual(new Set([target.id]));
    expect(cleared.economy.inventory).toEqual(save.economy.inventory);
    // The other target is unaffected — clearing one is never both.
    const other = CLEARABLE_OBSTACLES.find((c) => c.id !== target.id)!;
    expect(isObstacleCleared(cleared, other.id)).toBe(false);
  });
});
