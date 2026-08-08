import { describe, expect, it } from 'vitest';
import { heatFor, isOnCooldown, isPrepped, nextRecord, resolveRun } from './missions';
import { createNewSave } from '../state/defaults';
import type { MissionRecord } from '../state/schema';

describe('the Heat table', () => {
  it('prices sabotage above hacking, and failure above success', () => {
    expect(heatFor('sabotage', 'clean')).toBeGreaterThan(heatFor('hacking', 'clean'));
    expect(heatFor('hacking', 'failed')).toBeGreaterThan(heatFor('hacking', 'clean'));
    expect(heatFor('sabotage', 'failed')).toBeGreaterThan(heatFor('sabotage', 'clean'));
  });

  it('stays inside the spec ranges (hacking 3-8, sabotage 5-12)', () => {
    for (const o of ['clean', 'messy', 'failed', 'aborted'] as const) {
      expect(heatFor('hacking', o)).toBeGreaterThanOrEqual(3);
      expect(heatFor('hacking', o)).toBeLessThanOrEqual(8);
      expect(heatFor('sabotage', o)).toBeGreaterThanOrEqual(5);
      expect(heatFor('sabotage', o)).toBeLessThanOrEqual(12);
    }
  });
});

describe('mission records', () => {
  const base: MissionRecord = { status: 'available', attempts: 0, hardened: 0 };

  it('hardens and delays on failure, but never denies the retry', () => {
    const r = nextRecord(base, { missionId: 'm', kind: 'hacking', outcome: 'failed' }, 3);
    expect(r.hardened).toBe(1);
    expect(r.cooldownUntilDay).toBe(4);
    expect(isOnCooldown(r, 3)).toBe(true);
    expect(isOnCooldown(r, 4)).toBe(false);
  });

  it('banks intel from a run the player walked away from', () => {
    const r = nextRecord(
      base,
      { missionId: 'm', kind: 'hacking', outcome: 'aborted', bankedIntel: [4, 9] },
      1,
    );
    expect(r.status).toBe('available');
    expect(r.bankedIntel).toEqual([4, 9]);
  });

  it('clears the cooldown and the banked intel once the mission lands', () => {
    const failed = nextRecord(base, { missionId: 'm', kind: 'hacking', outcome: 'failed' }, 1);
    const done = nextRecord(failed, { missionId: 'm', kind: 'hacking', outcome: 'clean' }, 2);
    expect(done.status).toBe('complete');
    expect(done.cooldownUntilDay).toBeUndefined();
    expect(done.bankedIntel).toBeUndefined();
    expect(done.attempts).toBe(2);
  });

  it('marks a target prepped once a trace has landed on it, and keeps it', () => {
    expect(isPrepped(base)).toBe(false);
    const traced = nextRecord(base, { missionId: 'm', kind: 'hacking', outcome: 'clean' }, 1);
    expect(isPrepped(traced)).toBe(true);
    const later = nextRecord(traced, { missionId: 'm', kind: 'sabotage', outcome: 'failed' }, 2);
    expect(isPrepped(later)).toBe(true);
  });
});

describe('resolveRun — the mission cycle', () => {
  const base = () => createNewSave('Wren');

  it('advances the day, so decay and cooldowns are reachable at all', () => {
    const after = resolveRun(base(), { missionId: 'm', kind: 'hacking', outcome: 'clean' });
    expect(after.world.day).toBe(2);
    // +3 for a clean hack, then -2 of passive decay for the day that passed.
    expect(after.heat.current).toBe(1);
    expect(after.heat.lastDecayDay).toBe(2);
  });

  it('does not let a failed run clear its own cooldown', () => {
    const after = resolveRun(base(), { missionId: 'm', kind: 'sabotage', outcome: 'failed' });
    expect(isOnCooldown(after.missions.m, after.world.day)).toBe(true);
    expect(isOnCooldown(after.missions.m, after.world.day + 1)).toBe(false);
  });

  it('never decays below the floor, and still logs the gain', () => {
    const after = resolveRun(base(), { missionId: 'm', kind: 'hacking', outcome: 'aborted' });
    expect(after.heat.current).toBeGreaterThanOrEqual(0);
    expect(after.heat.history).toHaveLength(1);
  });

  it('spends a single-use tool exactly once', () => {
    const save = base();
    save.economy.inventory = [{ itemId: 'signal_jammer', quantity: 1, acquiredVia: 'purchase' }];
    const after = resolveRun(save, { missionId: 'm', kind: 'sabotage', outcome: 'clean' }, ['signal_jammer']);
    expect(after.economy.inventory).toEqual([]);
  });
});
