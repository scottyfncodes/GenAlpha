import { describe, expect, it } from 'vitest';
import { GEN_A_MARKS, marksAtStage } from './marks';
import { LOCATIONS, MAP_HEIGHT, MAP_WIDTH } from './locations';
import { camerasAtDay } from '../systems/coverage';
import { ESCALATION_DAY_THRESHOLDS, escalationStage } from './escalation';

/**
 * The mark's rarity curve, asserted — because it is the one piece of the
 * world design that is *only* a curve. Density is a taste call and nothing
 * here checks it; what these tests defend is the shape: rare, then
 * spreading, then everywhere, with the circles closing as it goes.
 *
 * The failure this exists to catch is somebody adding a mark because a
 * corner of the map looked bare and quietly making the symbol common on
 * day one, which is the exact thing the design says it must not be.
 */
describe('the Gen A rollout', () => {
  it('is rare on day one — a symbol already everywhere is wallpaper', () => {
    const opening = marksAtStage(0);
    expect(opening.length).toBeGreaterThan(0);
    expect(opening.length).toBeLessThanOrEqual(5);
  });

  it('adds marks at every stage and never takes one back down', () => {
    let previous = marksAtStage(0);
    for (const stage of [1, 2, 3] as const) {
      const now = marksAtStage(stage);
      expect(now.length, `stage ${stage} added no marks`).toBeGreaterThan(previous.length);
      for (const mark of previous) expect(now).toContain(mark);
      previous = now;
    }
  });

  it('ends with every authored mark standing', () => {
    expect(marksAtStage(3)).toHaveLength(GEN_A_MARKS.length);
  });

  /**
   * `ui/GenAMark.tsx`'s clean → claiming → closed arc, told on the map
   * instead of in a cutscene: the early ones are hesitant and inconsistent,
   * the late ones are drawn by people who know what they are drawing.
   */
  it('closes the circle as the rollout advances', () => {
    const meanClosure = (stage: 0 | 1 | 2 | 3) => {
      const marks = GEN_A_MARKS.filter((m) => m.stage === stage);
      return marks.reduce((sum, m) => sum + m.closure, 0) / marks.length;
    };
    expect(meanClosure(0)).toBeLessThan(meanClosure(2));
    expect(meanClosure(2)).toBeLessThan(meanClosure(3));
    // Nothing is a closed ring before the player has had time to notice
    // the symbol at all.
    for (const mark of marksAtStage(0)) expect(mark.closure).toBeLessThan(1);
  });

  /** The Civic Zone is the beat: somebody painted the government block. It
   * should not already be painted when the game opens. */
  it('leaves the Civic Zone unmarked until the rollout is under way', () => {
    const civic = LOCATIONS.filter((l) => l.district === 'civic_zone');
    const inCivicZone = (m: { x: number; y: number }) =>
      m.x >= 1128 && m.x <= MAP_WIDTH && m.y >= 0 && m.y <= 336;
    expect(civic.length, 'the district itself went missing').toBeGreaterThan(0);
    expect(marksAtStage(0).filter(inCivicZone)).toHaveLength(0);
    expect(marksAtStage(3).filter(inCivicZone).length).toBeGreaterThan(0);
  });

  it('keeps every mark on the map', () => {
    for (const mark of GEN_A_MARKS) {
      expect(mark.x, `${mark.x},${mark.y} is off the west/east edge`).toBeGreaterThanOrEqual(0);
      expect(mark.x).toBeLessThanOrEqual(MAP_WIDTH);
      expect(mark.y, `${mark.x},${mark.y} is off the north/south edge`).toBeGreaterThanOrEqual(0);
      expect(mark.y).toBeLessThanOrEqual(MAP_HEIGHT);
    }
  });

  it('gives every mark a distinct position', () => {
    const keys = GEN_A_MARKS.map((m) => `${m.x},${m.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  /**
   * The marks and the cameras run off one clock on purpose, and the point
   * of sharing it is that they multiply against each other: every threshold
   * that puts another lens up also puts another mark up. If the two ever
   * drift onto separate schedules the "they are both spreading" read is
   * gone and nobody would notice from the code alone.
   */
  it('spreads on the same clock the camera rollout does', () => {
    for (const day of [1, ...ESCALATION_DAY_THRESHOLDS]) {
      const stage = escalationStage(day);
      expect(marksAtStage(stage).length, `day ${day} has no marks`).toBeGreaterThan(0);
      expect(camerasAtDay(day).length, `day ${day} has no cameras`).toBeGreaterThan(0);
    }
    const first = escalationStage(1);
    const last = escalationStage(ESCALATION_DAY_THRESHOLDS[2]);
    expect(marksAtStage(last).length).toBeGreaterThan(marksAtStage(first).length);
    expect(camerasAtDay(ESCALATION_DAY_THRESHOLDS[2]).length).toBeGreaterThan(camerasAtDay(1).length);
  });
});
