import { describe, expect, it } from 'vitest';
import { escalationStage, ESCALATION_DAY_THRESHOLDS } from './escalation';

describe('escalationStage', () => {
  it('starts at stage 0 on the opening days', () => {
    expect(escalationStage(0)).toBe(0);
    expect(escalationStage(ESCALATION_DAY_THRESHOLDS[0] - 1)).toBe(0);
  });

  it('advances one stage per threshold crossed', () => {
    expect(escalationStage(ESCALATION_DAY_THRESHOLDS[0])).toBe(1);
    expect(escalationStage(ESCALATION_DAY_THRESHOLDS[1])).toBe(2);
    expect(escalationStage(ESCALATION_DAY_THRESHOLDS[2])).toBe(3);
  });

  it('never exceeds the highest defined stage, however late the day is', () => {
    expect(escalationStage(9999)).toBe(3);
  });

  it('is monotonic — never drops as the day increases', () => {
    let prev = escalationStage(0);
    for (let day = 1; day <= 30; day++) {
      const next = escalationStage(day);
      expect(next).toBeGreaterThanOrEqual(prev);
      prev = next;
    }
  });
});
