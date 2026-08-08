import { describe, expect, it } from 'vitest';
import { createNewSave } from '../state/defaults';
import type { SaveState } from '../state/schema';
import { applyEffects } from './effects';
import { lieLowBlocked, tierFor } from './heat';
import { offered, validateScene, type Scene } from './scenes';
import { BREATHER_SCENES, LIE_LOW_FLAG } from '../content/breather';
import { LOCATIONS } from '../world/locations';

/**
 * The scaffolding Act 2 needs, tested with no Act 2 content behind it.
 *
 * Two mechanisms here were specified in the design docs and implemented by
 * nothing: `skills.resistanceIntel.compromised`, which the schema calls the
 * single flag that flips Act 2 into Act 3, and the `hunted` tier's forced
 * story beat, which module 02 spends a paragraph on. Both are built now so the
 * content pass writes scenes rather than plumbing.
 */

const at = (save: SaveState, current: number): SaveState => ({
  ...save,
  heat: { ...save.heat, current, threshold_tier: tierFor(current) },
});

const scene = (requires: Scene['requires']): Scene => ({
  id: 'probe',
  beat: 1,
  locationId: 'home',
  hook: 'probe',
  language: 'A',
  requires,
  start: 'a',
  nodes: { a: { id: 'a', lines: [{ text: 'x' }], effects: [{ kind: 'chapter', chapterId: 'z' }], end: true } },
});

describe('the compromised gate', () => {
  it('starts false, and nothing in the shipped game writes it yet', () => {
    expect(createNewSave('Wren').skills.resistanceIntel.compromised).toBe(false);
  });

  it('is writable by content, which it was not before', () => {
    const after = applyEffects(createNewSave('Wren'), [
      { kind: 'skill', skill: 'resistanceIntel', compromised: true },
    ]);
    expect(after.skills.resistanceIntel.compromised).toBe(true);
    // And doesn't graft the field onto a skill that has no business with it.
    const stray = applyEffects(createNewSave('Wren'), [
      { kind: 'skill', skill: 'hacking', compromised: true } as never,
    ]);
    expect((stray.skills.hacking as unknown as Record<string, unknown>).compromised).toBeUndefined();
  });

  /**
   * The failure this exists to prevent: a scene written for a player who still
   * trusts the adult resistance, still being offered after they've found out.
   */
  it('withdraws a pre-betrayal scene the moment the flag flips', () => {
    const before = createNewSave('Wren');
    const trusting = scene({ compromised: false });
    expect(offered(before, trusting)).toBe(true);

    const after = applyEffects(before, [
      { kind: 'skill', skill: 'resistanceIntel', compromised: true },
    ]);
    expect(offered(after, trusting)).toBe(false);
  });

  it('holds post-betrayal content back until it', () => {
    const after = scene({ compromised: true });
    expect(offered(createNewSave('Wren'), after)).toBe(false);
    expect(
      offered(
        applyEffects(createNewSave('Wren'), [
          { kind: 'skill', skill: 'resistanceIntel', compromised: true },
        ]),
        after,
      ),
    ).toBe(true);
  });

  it('leaves a scene that declares no stance offered either way', () => {
    const agnostic = scene({});
    const flipped = applyEffects(createNewSave('Wren'), [
      { kind: 'skill', skill: 'resistanceIntel', compromised: true },
    ]);
    expect(offered(createNewSave('Wren'), agnostic)).toBe(true);
    expect(offered(flipped, agnostic)).toBe(true);
  });
});

describe('the hunted breather', () => {
  const breather = BREATHER_SCENES[0];

  it('validates like any other scene', () => {
    expect(validateScene(breather, LOCATIONS.map((l) => l.id))).toEqual([]);
  });

  it('appears only at hunted', () => {
    expect(offered(at(createNewSave('Wren'), 0), breather)).toBe(false);
    expect(offered(at(createNewSave('Wren'), 60), breather)).toBe(false);
    expect(offered(at(createNewSave('Wren'), 80), breather)).toBe(true);
  });

  /**
   * Module 02, guardrail 1: no hard game-over from Heat, ever. The top tier
   * has to resolve downward under its own steam, so the beat that fires there
   * must take enough Heat off to leave the tier.
   */
  it('brings the player back down out of the tier it fires in', () => {
    const decay = Object.values(breather.nodes)
      .flatMap((n) => n.effects ?? [])
      .filter((e): e is Extract<typeof e, { kind: 'heat' }> => e.kind === 'heat')
      .reduce((sum, e) => sum + e.delta, 0);
    expect(decay).toBeLessThan(0);
    // From the bottom of hunted, this must clear the tier rather than park in it.
    expect(75 + decay).toBeLessThan(75);
    expect(tierFor(75 + decay)).not.toBe('hunted');
  });

  it('happens once rather than every time the meter goes back up', () => {
    const played = applyEffects(at(createNewSave('Wren'), 80), [
      { kind: 'beat', missionId: 'breather', beat: 0, done: true },
    ]);
    expect(offered(played, breather)).toBe(false);
  });
});

describe('lying low', () => {
  it('is offered from somewhere, not from a menu', () => {
    expect(LOCATIONS.some((l) => l.canLieLow)).toBe(true);
  });

  it('is available in the ordinary tiers', () => {
    expect(lieLowBlocked(at(createNewSave('Wren'), 40).heat, false)).toBeNull();
  });

  it('says so rather than doing nothing when there’s no Heat to lose', () => {
    expect(lieLowBlocked(createNewSave('Wren').heat, false)).toBeTruthy();
  });

  /**
   * At `hunted` the action is withheld until the forced beat has played —
   * which is not a block, because that beat is sitting at the same location
   * the button is on. Module 02 asks for a redirect, not a wall.
   */
  it('redirects at hunted, and opens up once the beat has played', () => {
    const hot = at(createNewSave('Wren'), 85).heat;
    expect(lieLowBlocked(hot, false)).toBeTruthy();
    expect(lieLowBlocked(hot, true)).toBeNull();
  });

  it('has a beat waiting wherever it withholds itself', () => {
    const lieLowSpots = LOCATIONS.filter((l) => l.canLieLow).map((l) => l.id);
    const breatherSpots = BREATHER_SCENES.map((s) => s.locationId);
    for (const spot of breatherSpots) expect(lieLowSpots).toContain(spot);
    expect(BREATHER_SCENES.length).toBeGreaterThan(0);
    expect(LIE_LOW_FLAG.length).toBeGreaterThan(0);
  });
});
