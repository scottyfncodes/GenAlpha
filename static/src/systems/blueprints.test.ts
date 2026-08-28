import { describe, expect, it } from 'vitest';
import { createNewSave } from '../state/defaults';
import { isBlueprintUnlocked, unlockBlueprint } from './blueprints';

describe('isBlueprintUnlocked / unlockBlueprint', () => {
  it('starts unlocked for nothing', () => {
    const save = createNewSave('Wren');
    expect(isBlueprintUnlocked(save, 'bp_signal_jammer')).toBe(false);
  });

  it('unlocking sets the flag and never touches inventory', () => {
    const save = createNewSave('Wren');
    const after = unlockBlueprint(save, 'bp_signal_jammer');
    expect(isBlueprintUnlocked(after, 'bp_signal_jammer')).toBe(true);
    expect(after.economy.inventory).toEqual(save.economy.inventory);
  });

  it('is a safe no-op — same state reference — once already unlocked', () => {
    const save = createNewSave('Wren');
    const unlocked = unlockBlueprint(save, 'bp_signal_jammer');
    const again = unlockBlueprint(unlocked, 'bp_signal_jammer');
    expect(again).toBe(unlocked);
  });

  it('two different blueprints unlock independently', () => {
    const save = createNewSave('Wren');
    const after = unlockBlueprint(unlockBlueprint(save, 'bp_signal_jammer'), 'bp_board_1');
    expect(isBlueprintUnlocked(after, 'bp_signal_jammer')).toBe(true);
    expect(isBlueprintUnlocked(after, 'bp_board_1')).toBe(true);
    expect(isBlueprintUnlocked(after, 'bp_board_2')).toBe(false);
  });
});
