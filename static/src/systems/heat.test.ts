import { describe, expect, it } from 'vitest';
import { applyHeat, decayTo, HISTORY_CAP, lieLow, tierFor } from './heat';
import type { HeatState } from '../state/schema';

const heat = (over: Partial<HeatState> = {}): HeatState => ({
  current: 0,
  threshold_tier: 'clear',
  lastDecayDay: 1,
  history: [],
  ...over,
});

describe('tiers', () => {
  it('bands exactly on the spec boundaries', () => {
    expect(tierFor(0)).toBe('clear');
    expect(tierFor(24)).toBe('clear');
    expect(tierFor(25)).toBe('watched');
    expect(tierFor(49)).toBe('watched');
    expect(tierFor(50)).toBe('flagged');
    expect(tierFor(74)).toBe('flagged');
    expect(tierFor(75)).toBe('hunted');
    expect(tierFor(100)).toBe('hunted');
  });
});

describe('applyHeat', () => {
  it('clamps to 0..100 and re-derives the cached tier', () => {
    expect(applyHeat(heat({ current: 95 }), { eventId: 'e', delta: 20 }).current).toBe(100);
    expect(applyHeat(heat({ current: 3 }), { eventId: 'e', delta: -20 }).current).toBe(0);
    expect(applyHeat(heat(), { eventId: 'e', delta: 60 }).threshold_tier).toBe('flagged');
  });

  it('only logs when asked, and caps the log', () => {
    expect(applyHeat(heat(), { eventId: 'minor', delta: 1 }).history).toHaveLength(0);
    let h = heat();
    for (let i = 0; i < HISTORY_CAP + 8; i++) {
      h = applyHeat(h, { eventId: `e${i}`, delta: 1, logToHistory: true });
    }
    expect(h.history).toHaveLength(HISTORY_CAP);
    expect(h.history[0].eventId).toBe('e8');
  });
});

describe('decay runs on the in-fiction clock', () => {
  it('charges two per elapsed day', () => {
    expect(decayTo(heat({ current: 20 }), 4).current).toBe(14);
  });

  it('is idempotent for the same day — this is what makes it safe on load', () => {
    const once = decayTo(heat({ current: 20 }), 2);
    expect(decayTo(once, 2)).toEqual(once);
  });

  it('never runs backwards', () => {
    const h = heat({ current: 20, lastDecayDay: 5 });
    expect(decayTo(h, 3)).toEqual(h);
  });

  it('lying low stamps the day so the same day is not charged twice', () => {
    const h = lieLow(heat({ current: 40 }), 2);
    expect(h.current).toBe(28);
    expect(decayTo(h, 2)).toEqual(h);
  });
});
