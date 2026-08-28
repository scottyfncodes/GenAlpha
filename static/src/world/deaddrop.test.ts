import { describe, expect, it } from 'vitest';
import { createNewSave } from '../state/defaults';
import { canCheckDeadDrop, checkDeadDrop, DEAD_DROP_CASH, DEAD_DROP_HEAT_RELIEF } from './deaddrop';

describe('Bishop’s dead drop — audit item #4', () => {
  it('is unreachable without resistanceIntel, whatever else is true', () => {
    const save = createNewSave('Wren');
    expect(canCheckDeadDrop(save)).toBe(false);
    expect(checkDeadDrop(save)).toBe(save);
  });

  it('pays out cash and heat relief once resistanceIntel is unlocked', () => {
    const save = createNewSave('Wren');
    const trusted = {
      ...save,
      skills: { ...save.skills, resistanceIntel: { ...save.skills.resistanceIntel, unlocked: true } },
    };
    expect(canCheckDeadDrop(trusted)).toBe(true);
    const after = checkDeadDrop(trusted);
    expect(after.economy.cashOnHand).toBe(trusted.economy.cashOnHand + DEAD_DROP_CASH);
    expect(after.heat.current).toBe(Math.max(0, trusted.heat.current - DEAD_DROP_HEAT_RELIEF));
  });

  it('goes on cooldown after a check — same drop, not a slot machine', () => {
    const save = createNewSave('Wren');
    const trusted = {
      ...save,
      skills: { ...save.skills, resistanceIntel: { ...save.skills.resistanceIntel, unlocked: true } },
    };
    const after = checkDeadDrop(trusted);
    expect(canCheckDeadDrop(after)).toBe(false);
    // A second call while on cooldown is a safe no-op, not a double payout.
    expect(checkDeadDrop(after)).toBe(after);
  });
});
