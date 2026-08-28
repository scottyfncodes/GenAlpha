import { describe, expect, it } from 'vitest';
import { ASSET_MANIFEST, LAYERS, type AnchorPoint, type AssetCategory } from './manifest';

/**
 * Validation tooling for the asset-slot manifest — the "asset
 * validation/debug tooling" the art-pipeline run calls for. Checks the
 * manifest's own self-consistency (unique ids, sane dimensions, a real
 * layer, frame math that isn't nonsense); it does not — and cannot, this
 * run — check that a `draw.ts` call site actually agrees with what a slot
 * claims, since nothing in the renderer reads this file yet (see the art
 * bible §6/§8). That cross-check is future work once slots start getting
 * wired in.
 */

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)+$/;
const CATEGORIES: AssetCategory[] = [
  'character',
  'small-prop',
  'medium-prop',
  'large-prop',
  'building',
  'landmark',
  'vehicle',
  'terrain',
  'technology',
  'effect',
  'ui-icon',
];
const ANCHORS: AnchorPoint[] = ['bottom-center', 'top-left', 'center', 'explicit'];

describe('asset manifest', () => {
  it('is not empty', () => {
    expect(ASSET_MANIFEST.length).toBeGreaterThan(0);
  });

  it('covers every asset category the art bible defines', () => {
    const covered = new Set(ASSET_MANIFEST.map((s) => s.category));
    for (const category of CATEGORIES) {
      expect(covered.has(category), `no slot in category "${category}"`).toBe(true);
    }
  });

  it.each(ASSET_MANIFEST.map((s) => [s.id, s] as const))('%s is well-formed', (_id, slot) => {
    expect(slot.id, 'id must be kebab-case, dot-namespaced').toMatch(ID_PATTERN);
    expect(CATEGORIES).toContain(slot.category);
    expect(ANCHORS).toContain(slot.anchor);
    expect(LAYERS as readonly string[]).toContain(slot.layer);

    expect(slot.label.trim().length, 'label must not be empty').toBeGreaterThan(0);
    expect(slot.description.trim().length, 'description must not be empty').toBeGreaterThan(0);
    expect(slot.sourceRef.trim().length, 'sourceRef must trace back to the renderer').toBeGreaterThan(0);

    expect(Number.isInteger(slot.width), 'width must be a whole number of world units').toBe(true);
    expect(Number.isInteger(slot.height), 'height must be a whole number of world units').toBe(true);
    expect(slot.width).toBeGreaterThan(0);
    expect(slot.height).toBeGreaterThan(0);

    if (slot.frames) {
      expect(Number.isInteger(slot.frames.cols)).toBe(true);
      expect(Number.isInteger(slot.frames.rows)).toBe(true);
      expect(slot.frames.cols).toBeGreaterThan(0);
      expect(slot.frames.rows).toBeGreaterThan(0);
      if (slot.frames.directions) {
        expect(
          slot.frames.directions.length,
          'a named direction set must have one row per direction',
        ).toBe(slot.frames.rows);
      }
    }
  });

  it('has no duplicate ids', () => {
    const ids = ASSET_MANIFEST.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no duplicate labels within the same category', () => {
    const seen = new Map<string, Set<string>>();
    for (const slot of ASSET_MANIFEST) {
      const set = seen.get(slot.category) ?? new Set<string>();
      expect(set.has(slot.label), `duplicate label "${slot.label}" in category "${slot.category}"`).toBe(false);
      set.add(slot.label);
      seen.set(slot.category, set);
    }
  });

  it('never anchors a building or terrain slot anywhere but top-left', () => {
    // The one anchor invariant the art bible (§4) states as a hard rule
    // rather than a per-object choice: footprint-rect categories always
    // read their stored (x, y) as the box's own top-left corner.
    for (const slot of ASSET_MANIFEST.filter((s) => s.category === 'building' || s.category === 'terrain')) {
      expect(slot.anchor, `${slot.id} should anchor top-left`).toBe('top-left');
    }
  });

  it('never anchors a character slot anywhere but bottom-center', () => {
    for (const slot of ASSET_MANIFEST.filter((s) => s.category === 'character')) {
      if (slot.id === 'character.npc.bird') continue; // airborne — see the art bible §2/§4
      expect(slot.anchor, `${slot.id} should anchor bottom-center (feet)`).toBe('bottom-center');
    }
  });
});
