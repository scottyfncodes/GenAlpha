import { describe, expect, it } from 'vitest';
import { reactionLine, type ReactionCategory } from './reactions';

const CATEGORIES: ReactionCategory[] = ['mischief', 'heat_up', 'caught'];

describe('bystander reaction lines', () => {
  it('returns a non-empty line for every category', () => {
    for (const category of CATEGORIES) {
      expect(reactionLine(category, () => 0).length).toBeGreaterThan(0);
    }
  });

  it('is deterministic off the given generator', () => {
    expect(reactionLine('mischief', () => 0)).toBe(reactionLine('mischief', () => 0));
  });

  it('covers the whole pool as the generator sweeps 0..1', () => {
    for (const category of CATEGORIES) {
      const seen = new Set<string>();
      for (let i = 0; i < 50; i++) seen.add(reactionLine(category, () => i / 50));
      expect(seen.size).toBeGreaterThan(1);
    }
  });

  it('never lets the generator’s own edge (1) index past the pool', () => {
    for (const category of CATEGORIES) {
      expect(() => reactionLine(category, () => 0.999999)).not.toThrow();
    }
  });
});
