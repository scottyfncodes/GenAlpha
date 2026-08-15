import { describe, expect, it } from 'vitest';
import {
  activeCameras,
  camerasAtDay,
  coverageLabel,
  coverageOf,
  coveragePercent,
  coverageTier,
  COVERAGE_SWEEP_AT,
  COVERAGE_SWEEP_REARM_BELOW,
  feedIsUp,
  markSwept,
  rearmIfClear,
  repairNetwork,
  sweepDue,
  SWEEP_HARDENING_PER_SWEEP,
} from './coverage';
import { destroyJunctionBox, markCollected, sabotageCamera } from './materials';
import { CAMERA_NODES } from '../world/collectibles';
import { CAMERA_FEED, CAMERAS_FED_BY } from '../world/coverage';
import { JUNCTION_BOX_NODES } from '../world/junctionboxes';
import { ESCALATION_DAY_THRESHOLDS } from '../world/escalation';
import { createNewSave } from '../state/defaults';
import type { SaveState } from '../state/schema';

const atDay = (day: number): SaveState => {
  const save = createNewSave('Wren');
  return { ...save, world: { ...save.world, day } };
};

const FULL_ROLLOUT_DAY = ESCALATION_DAY_THRESHOLDS[2];

describe('the camera rollout', () => {
  it('puts more cameras up at every escalation threshold', () => {
    const counts = [1, ...ESCALATION_DAY_THRESHOLDS].map((d) => camerasAtDay(d).length);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i], `stage ${i} added no cameras`).toBeGreaterThan(counts[i - 1]);
    }
  });

  it('never takes a camera back down as days pass', () => {
    let prev = camerasAtDay(1).map((c) => c.id);
    for (let day = 2; day <= 30; day++) {
      const now = camerasAtDay(day).map((c) => c.id);
      for (const id of prev) expect(now, `${id} vanished on day ${day}`).toContain(id);
      prev = now;
    }
  });

  it('every camera declares a stage the escalation system can actually reach', () => {
    for (const camera of CAMERA_NODES) {
      expect(camerasAtDay(FULL_ROLLOUT_DAY).map((c) => c.id)).toContain(camera.id);
    }
  });
});

describe('coverage', () => {
  it('rises as the rollout advances', () => {
    const byStage = [1, ...ESCALATION_DAY_THRESHOLDS].map((d) => coveragePercent(atDay(d)));
    for (let i = 1; i < byStage.length; i++) {
      expect(byStage[i], `coverage did not rise at stage ${i}`).toBeGreaterThan(byStage[i - 1]);
    }
  });

  /**
   * The load-bearing one. If the full rollout can't actually reach 100%, the
   * sweep can never fire and the whole consequence is dead code — and because
   * sweep hardening only ever arrives *after* a sweep, nothing else would ever
   * push it over either. This is the test that catches a radius edit quietly
   * reopening a corner of the map.
   */
  it('reaches 100% with the whole rollout standing and nothing sabotaged', () => {
    expect(coveragePercent(atDay(FULL_ROLLOUT_DAY))).toBe(COVERAGE_SWEEP_AT);
  });

  it('is 0 with no cameras at all', () => {
    expect(coverageOf([])).toBe(0);
  });

  it('never exceeds 100 however hard the network is tuned', () => {
    expect(coverageOf(camerasAtDay(FULL_ROLLOUT_DAY), 10)).toBeLessThanOrEqual(100);
  });

  it('counts overlapping cameras once rather than twice', () => {
    const [a] = CAMERA_NODES;
    const twin = { ...a, id: 'twin' };
    expect(coverageOf([a, twin])).toBe(coverageOf([a]));
  });

  it('grows with the sweep count, since every lens reaches further', () => {
    const cams = camerasAtDay(1);
    expect(SWEEP_HARDENING_PER_SWEEP).toBeGreaterThan(0);
    expect(coverageOf(cams, 1)).toBeGreaterThan(coverageOf(cams, 0));
  });

  it('drops when a camera is sabotaged', () => {
    const save = atDay(1);
    const target = activeCameras(save)[0];
    const after = markCollected(save, target.id, target.respawnDays);
    expect(coveragePercent(after)).toBeLessThan(coveragePercent(save));
  });

  it('comes back once the camera respawns', () => {
    const save = atDay(1);
    const target = activeCameras(save)[0];
    const down = markCollected(save, target.id, target.respawnDays);
    expect(coveragePercent(down)).toBeLessThan(coveragePercent(save));

    // Compared against an untouched save at the *same* day rather than
    // against the starting day: the respawn window can span an escalation
    // threshold, and new cameras going up is not this test's subject.
    const later = { ...down, world: { ...down.world, day: down.world.day + target.respawnDays } };
    expect(coveragePercent(later)).toBe(coveragePercent(atDay(later.world.day)));
  });

  /**
   * Late on, the lenses overlap enough that some individual cameras carry no
   * unique ground at all — taking one down changes nothing, and the player
   * has to pick a camera that matters or cut a box instead. That's a real
   * property of the map rather than a bug, but it should be *some* cameras
   * and not most of them, or the whole camera half of the loop is decorative.
   */
  it('leaves most cameras individually worth taking down at full rollout', () => {
    const save = atDay(FULL_ROLLOUT_DAY);
    const full = coveragePercent(save);
    const mattering = camerasAtDay(FULL_ROLLOUT_DAY).filter(
      (c) => coveragePercent(markCollected(save, c.id, c.respawnDays)) < full,
    );
    expect(mattering.length).toBeGreaterThan(camerasAtDay(FULL_ROLLOUT_DAY).length / 2);
  });
});

describe('the junction box network', () => {
  it('gives every camera exactly one feed, and one that exists', () => {
    const boxIds = new Set(JUNCTION_BOX_NODES.map((b) => b.id));
    for (const camera of CAMERA_NODES) {
      expect(CAMERA_FEED[camera.id], `${camera.id} has no feed`).toBeDefined();
      expect(boxIds.has(CAMERA_FEED[camera.id])).toBe(true);
    }
  });

  it('agrees with itself in both directions', () => {
    for (const [boxId, cameraIds] of Object.entries(CAMERAS_FED_BY)) {
      for (const cameraId of cameraIds) expect(CAMERA_FEED[cameraId]).toBe(boxId);
    }
  });

  it('routes each camera through the box physically nearest it', () => {
    for (const camera of CAMERA_NODES) {
      const distances = JUNCTION_BOX_NODES.map((b) => Math.hypot(b.x - camera.x, b.y - camera.y));
      const feed = JUNCTION_BOX_NODES.find((b) => b.id === CAMERA_FEED[camera.id])!;
      expect(Math.hypot(feed.x - camera.x, feed.y - camera.y)).toBe(Math.min(...distances));
    }
  });

  /** The whack-a-mole claim, stated as a test: cutting a box blinds the
   * cameras hanging off it without anybody climbing a pole. */
  it('takes a box’s cameras out of coverage while the box is down', () => {
    const save = atDay(FULL_ROLLOUT_DAY);
    const boxId = Object.keys(CAMERAS_FED_BY).find((id) => CAMERAS_FED_BY[id].length > 0)!;
    const after = destroyJunctionBox(save, boxId);

    for (const cameraId of CAMERAS_FED_BY[boxId]) expect(feedIsUp(after, cameraId)).toBe(false);
    expect(activeCameras(after).map((c) => c.id)).not.toContain(CAMERAS_FED_BY[boxId][0]);
    expect(coveragePercent(after)).toBeLessThan(coveragePercent(save));
  });

  it('leaves a camera dark whether the pole or the box was hit', () => {
    const save = atDay(FULL_ROLLOUT_DAY);
    const boxId = Object.keys(CAMERAS_FED_BY).find((id) => CAMERAS_FED_BY[id].length === 1)!;
    const cameraId = CAMERAS_FED_BY[boxId][0];
    const camera = CAMERA_NODES.find((c) => c.id === cameraId)!;

    const viaBox = destroyJunctionBox(save, boxId);
    const viaPole = markCollected(save, camera.id, camera.respawnDays);
    expect(coveragePercent(viaBox)).toBe(coveragePercent(viaPole));
  });
});

describe('coverage tiers', () => {
  it('bands the number the way the HUD reads it', () => {
    expect(coverageTier(0)).toBe('partial');
    expect(coverageTier(69)).toBe('partial');
    expect(coverageTier(70)).toBe('heavy');
    expect(coverageTier(89)).toBe('heavy');
    expect(coverageTier(90)).toBe('critical');
    expect(coverageTier(100)).toBe('critical');
  });

  it('has copy for every band', () => {
    for (const tier of ['partial', 'heavy', 'critical'] as const) {
      expect(coverageLabel(tier).length).toBeGreaterThan(0);
    }
  });
});

describe('the lockdown sweep', () => {
  it('is due once the town is fully covered and the latch is armed', () => {
    const save = atDay(FULL_ROLLOUT_DAY);
    expect(save.world.surveillance.armed).toBe(true);
    expect(sweepDue(save)).toBe(true);
  });

  it('is not due while there are still gaps', () => {
    expect(sweepDue(atDay(1))).toBe(false);
  });

  it('does not fire twice on the same latch', () => {
    const swept = markSwept(atDay(FULL_ROLLOUT_DAY), FULL_ROLLOUT_DAY);
    expect(swept.world.surveillance.armed).toBe(false);
    expect(sweepDue(swept)).toBe(false);
  });

  it('re-arms only once coverage has been pushed back down', () => {
    const swept = markSwept(atDay(FULL_ROLLOUT_DAY), FULL_ROLLOUT_DAY);
    // Still fully covered: nothing has changed, so the latch stays down.
    expect(rearmIfClear(swept).world.surveillance.armed).toBe(false);

    // Knock cameras out until coverage clears the re-arm threshold.
    let cleared = swept;
    for (const camera of camerasAtDay(FULL_ROLLOUT_DAY)) {
      if (coveragePercent(cleared) < COVERAGE_SWEEP_REARM_BELOW) break;
      cleared = markCollected(cleared, camera.id, camera.respawnDays);
    }
    expect(coveragePercent(cleared)).toBeLessThan(COVERAGE_SWEEP_REARM_BELOW);
    expect(rearmIfClear(cleared).world.surveillance.armed).toBe(true);
  });

  /**
   * The player has to be able to actually do this, or the "clawing back"
   * design note is a slogan. Cutting junction boxes alone — the cheapest
   * route, no pole climbing — has to be enough to clear the re-arm threshold
   * even after several sweeps have tightened every lens.
   */
  it('stays clearable by cutting boxes alone, however many sweeps have landed', () => {
    for (const sweeps of [0, 1, 2, 3]) {
      let save = atDay(FULL_ROLLOUT_DAY);
      save = { ...save, world: { ...save.world, surveillance: { sweeps, armed: false, lastSweepDay: 1 } } };

      const loadBearing = Object.keys(CAMERAS_FED_BY).filter((id) => CAMERAS_FED_BY[id].length > 0);
      for (const boxId of loadBearing) {
        if (coveragePercent(save) < COVERAGE_SWEEP_REARM_BELOW) break;
        save = destroyJunctionBox(save, boxId);
      }
      expect(
        coveragePercent(save),
        `after ${sweeps} sweep(s), cutting every load-bearing box still left the town sealed`,
      ).toBeLessThan(COVERAGE_SWEEP_REARM_BELOW);
    }
  });

  it('puts the whole network back up, and leaves everything else alone', () => {
    let save = atDay(FULL_ROLLOUT_DAY);
    const camera = CAMERA_NODES[0];
    save = sabotageCamera(
      { ...save, economy: { ...save.economy, inventory: [] } },
      camera.id,
      'dismantle',
    );
    save = destroyJunctionBox(save, JUNCTION_BOX_NODES[0].id);
    save = markCollected(save, 'filler_2', 3); // a hidden bush, not SafeTrace's hardware

    const repaired = repairNetwork(save);
    const ids = repaired.world.collectedNodes.map((c) => c.nodeId);
    expect(ids).not.toContain(camera.id);
    expect(ids).not.toContain(JUNCTION_BOX_NODES[0].id);
    expect(ids, 'a sweep repaired a bush').toContain('filler_2');
  });

  it('is a no-op on a network with nothing down', () => {
    const save = atDay(FULL_ROLLOUT_DAY);
    expect(repairNetwork(save)).toBe(save);
  });

  it('banks the sweep permanently', () => {
    const swept = markSwept(atDay(FULL_ROLLOUT_DAY), 15);
    expect(swept.world.surveillance.sweeps).toBe(1);
    expect(swept.world.surveillance.lastSweepDay).toBe(15);
    expect(markSwept(swept, 20).world.surveillance.sweeps).toBe(2);
  });
});
