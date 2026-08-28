import { describe, expect, it } from 'vitest';
import { OBSTACLES_BY_ID } from './obstacles';

/**
 * Player-Freedom Audit item #2: board-tier traversal. Three fence segments,
 * one per district, each tagged `minBoardTier` rather than turned into new
 * geometry — locks in which three, and at which tier, since a future edit
 * to `obstacles.ts` could easily drop the field while moving a segment
 * around without anyone noticing until it stopped feeling like progression.
 */
describe('board-tier traversal targets', () => {
  it('the Motorized Deck clears the Crossroads chain-link', () => {
    expect(OBSTACLES_BY_ID['filler_58'].minBoardTier).toBe(3);
  });

  it('the Prototype Hoverboard clears the Annex fence line', () => {
    expect(OBSTACLES_BY_ID['filler_77'].minBoardTier).toBe(4);
  });

  it('the Hoverboard clears the Data Centre’s east perimeter', () => {
    expect(OBSTACLES_BY_ID['civic_fence_e'].minBoardTier).toBe(5);
  });

  it('nothing else on the map is board-tier passable', () => {
    const tagged = Object.values(OBSTACLES_BY_ID).filter((o) => o.minBoardTier !== undefined);
    expect(tagged.map((o) => o.id).sort()).toEqual(['civic_fence_e', 'filler_58', 'filler_77']);
  });
});
