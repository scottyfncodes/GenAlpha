import { describe, expect, it } from 'vitest';
import { reducer } from './GameContext';
import { createNewSave } from './defaults';
import { coveragePercent, SWEEP_DAYS, SWEEP_HEAT_FLOOR } from '../systems/coverage';
import { PASSIVE_DECAY_PER_DAY } from '../systems/heat';
import { ESCALATION_DAY_THRESHOLDS } from '../world/escalation';
import { JUNCTION_BOX_NODES } from '../world/junctionboxes';
import { CAMERAS_FED_BY } from '../world/coverage';
import type { SaveState } from './schema';

/**
 * The sweep end to end, through the one writer that actually performs it.
 * `systems/coverage.test.ts` covers the arithmetic; this covers the wiring —
 * that the reducer notices, that it only notices once, and above all that it
 * never produces the fail state `systems/heat.ts` forbids.
 */

/** One day short of the last escalation threshold, so a single ADVANCE_DAY
 * tips the town into full coverage the way an idle player would. */
const EVE_OF_FULL_ROLLOUT = ESCALATION_DAY_THRESHOLDS[2] - 1;

/**
 * `lastDecayDay` is stamped forward with the day, not left at 1. Otherwise a
 * fixture that jumps the clock to day 14 has fourteen days of un-charged
 * passive decay banked up, and the first action in a test silently spends it —
 * which makes any assertion about Heat a measurement of the fixture rather
 * than of the sweep.
 */
const eve = (): SaveState => {
  const save = createNewSave('Wren');
  return {
    ...save,
    world: { ...save.world, day: EVE_OF_FULL_ROLLOUT },
    heat: { ...save.heat, lastDecayDay: EVE_OF_FULL_ROLLOUT },
  };
};

const step = (save: SaveState, action: Parameters<typeof reducer>[1]) => reducer(save, action)!;

describe('the lockdown sweep, through the reducer', () => {
  it('fires when a day advance completes the rollout', () => {
    const before = eve();
    expect(coveragePercent(before)).toBeLessThan(100);

    const after = step(before, { type: 'ADVANCE_DAY' });
    expect(after.world.surveillance.sweeps).toBe(1);
    expect(after.world.surveillance.lastSweepDay).toBe(after.world.day);
  });

  it('costs the player the sweep’s days on top of the day they advanced', () => {
    const before = eve();
    const after = step(before, { type: 'ADVANCE_DAY' });
    expect(after.world.day).toBe(before.world.day + 1 + SWEEP_DAYS);
  });

  it('leaves Heat at the hunted floor', () => {
    const after = step(eve(), { type: 'ADVANCE_DAY' });
    expect(after.heat.current).toBeGreaterThanOrEqual(SWEEP_HEAT_FLOOR);
    expect(after.heat.threshold_tier).toBe('hunted');
  });

  it('never hands Heat back to a player who arrived already hotter', () => {
    const hot = { ...eve(), heat: { ...eve().heat, current: 95, threshold_tier: 'hunted' as const } };
    const after = step(hot, { type: 'ADVANCE_DAY' });
    // The only thing that moved Heat is ordinary passive decay over the day
    // the player advanced plus the sweep's own — the floor never topped it up.
    expect(after.heat.current).toBe(95 - (1 + SWEEP_DAYS) * PASSIVE_DECAY_PER_DAY);
    expect(after.heat.current).toBeGreaterThan(SWEEP_HEAT_FLOOR);
  });

  /**
   * Uses a box that carries no cameras, which is what makes the assertion
   * clean: coverage can still reach 100% with it down, so the sweep fires
   * while the box is genuinely cut and the repair is the only thing that
   * could have put it back. A load-bearing box would have held coverage
   * under 100 and prevented the sweep outright — which is the system working,
   * but not what this test is about.
   */
  it('puts back a box the player had cut', () => {
    let save = eve();
    const orphan = Object.keys(CAMERAS_FED_BY).find((id) => CAMERAS_FED_BY[id].length === 0)!;
    save = step(save, { type: 'DESTROY_JUNCTION_BOX', nodeId: orphan });
    expect(save.world.collectedNodes.map((c) => c.nodeId)).toContain(orphan);

    const after = step(save, { type: 'ADVANCE_DAY' });
    expect(after.world.surveillance.sweeps).toBe(1);
    expect(after.world.collectedNodes.map((c) => c.nodeId)).not.toContain(orphan);
  });

  it('is held off entirely while a load-bearing box is still cut', () => {
    let save = eve();
    const loadBearing = Object.keys(CAMERAS_FED_BY).find((id) => CAMERAS_FED_BY[id].length > 0)!;
    save = step(save, { type: 'DESTROY_JUNCTION_BOX', nodeId: loadBearing });

    const after = step(save, { type: 'ADVANCE_DAY' });
    expect(coveragePercent(after)).toBeLessThan(100);
    expect(after.world.surveillance.sweeps).toBe(0);
  });

  /** The guardrail, asserted rather than trusted. */
  it('never ends the run — the save is still playable afterwards', () => {
    const after = step(eve(), { type: 'ADVANCE_DAY' });
    expect(after.player.currentChapter).toBe(eve().player.currentChapter);
    expect(after).not.toBeNull();
    // ...and the player can still act: another box goes down normally.
    const boxId = JUNCTION_BOX_NODES[0].id;
    const acted = step(after, { type: 'DESTROY_JUNCTION_BOX', nodeId: boxId });
    expect(acted.world.collectedNodes.map((c) => c.nodeId)).toContain(boxId);
  });

  it('does not fire again while the town stays sealed', () => {
    let save = step(eve(), { type: 'ADVANCE_DAY' });
    expect(save.world.surveillance.sweeps).toBe(1);
    expect(coveragePercent(save)).toBe(100);

    for (let i = 0; i < 6; i++) save = step(save, { type: 'ADVANCE_DAY' });
    expect(save.world.surveillance.sweeps, 'the sweep re-fired without the latch re-arming').toBe(1);
  });

  /**
   * The full loop: swept, clawed back below the re-arm threshold, then left
   * alone long enough for the network to come back. A second sweep is
   * supposed to be reachable — that's the whack-a-mole — it just has to go
   * through the latch rather than round it.
   */
  it('can fire a second time once the player has cleared it and let it climb again', () => {
    let save = step(eve(), { type: 'ADVANCE_DAY' });
    expect(save.world.surveillance.sweeps).toBe(1);

    for (const boxId of Object.keys(CAMERAS_FED_BY).filter((id) => CAMERAS_FED_BY[id].length > 0)) {
      if (save.world.surveillance.armed) break;
      save = step(save, { type: 'DESTROY_JUNCTION_BOX', nodeId: boxId });
    }
    expect(save.world.surveillance.armed, 'cutting every load-bearing box never re-armed the latch').toBe(true);

    // Let every box respawn. The longest window is a tier 5 box at 9 days.
    save = step(save, { type: 'ADVANCE_DAY', days: 12 });
    expect(save.world.surveillance.sweeps).toBe(2);
  });
});
