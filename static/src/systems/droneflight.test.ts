import { describe, expect, it } from 'vitest';
import { collides, isShotDown, progressPct } from './droneflight';

describe('collides', () => {
  it('is true when two entities overlap', () => {
    expect(collides({ x: 0, y: 0, r: 5 }, { x: 6, y: 0, r: 5 })).toBe(true);
  });

  it('is false when two entities are clear of each other', () => {
    expect(collides({ x: 0, y: 0, r: 5 }, { x: 20, y: 0, r: 5 })).toBe(false);
  });

  it('is inclusive exactly at the combined radius', () => {
    expect(collides({ x: 0, y: 0, r: 5 }, { x: 10, y: 0, r: 5 })).toBe(true);
    expect(collides({ x: 0, y: 0, r: 5 }, { x: 10.5, y: 0, r: 5 })).toBe(false);
  });
});

describe('progressPct', () => {
  it('runs from 0 to 100 over the duration', () => {
    expect(progressPct(0, 1000)).toBe(0);
    expect(progressPct(500, 1000)).toBe(50);
    expect(progressPct(1000, 1000)).toBe(100);
  });

  it('clamps past the end rather than overshooting', () => {
    expect(progressPct(2000, 1000)).toBe(100);
  });

  it('never goes negative', () => {
    expect(progressPct(-100, 1000)).toBe(0);
  });
});

describe('isShotDown', () => {
  it('is false under the cap and true at or above it', () => {
    expect(isShotDown(1, 3)).toBe(false);
    expect(isShotDown(3, 3)).toBe(true);
    expect(isShotDown(4, 3)).toBe(true);
  });
});
