import { describe, expect, it } from 'vitest';
import { ALL_SCENES } from './all';
import { ACT1_SCENES } from './act1';
import { createNewSave } from '../state/defaults';
import type { SaveState } from '../state/schema';
import { applyEffects } from '../systems/effects';
import { resolveRun, type RunOutcome } from '../systems/missions';
import { decayTo } from '../systems/heat';
import { completionFlag, offered, visibleChoices, type Scene } from '../systems/scenes';
import { LIE_LOW_FLAG } from './breather';

/**
 * BALANCE, AS FAR AS IT CAN BE CHECKED WITHOUT A PLAYER.
 *
 * Nobody has played this game. That is stated plainly in the handoff and this
 * file does not change it — feel is not measurable from here. What *is*
 * measurable is whether the numbers land where the design documents say they
 * should, and two of them are stated precisely enough to assert:
 *
 *   - "Heat should sit around 10–15 by end of Act 1 (low `watched` range) —
 *     enough to feel real, not enough to be scary yet."  (module 08)
 *   - "Midpoint: small wins against the system build confidence and Heat …
 *     Act 2 close condition: Heat 55–70."  (Story Bible / module 09)
 *
 * Those are the shape of the curve, and a curve is exactly the thing that
 * drifts silently when content gets added a scene at a time. So this plays the
 * game — routing minigames through `resolveRun` so the real Heat table and the
 * real per-day decay apply — and checks where it comes out.
 *
 * The bands are asserted wide enough to survive ordinary content edits and
 * narrow enough to catch a real drift. If one fails, the answer is usually to
 * change a scene's Heat, not to widen the band.
 */

type Style = 'careful' | 'messy';

/**
 * Plays a scene the way a player of a given style would: taking the first
 * choice, and winning or failing every minigame. Minigame outcomes go through
 * `resolveRun`, so this pays the same Heat, advances the same day clock and
 * gets the same decay the real game does.
 */
function playScene(save: SaveState, scene: Scene, style: Style): SaveState {
  let s = save;
  let id = scene.start;

  for (let step = 0; step < 80; step++) {
    const node = scene.nodes[id];
    if (!node) break;
    if (node.effects?.length) s = applyEffects(s, node.effects);

    if (node.minigame) {
      const outcome: RunOutcome = style === 'careful' ? 'clean' : 'failed';
      if (!node.minigame.practice) {
        s = resolveRun(
          s,
          { missionId: node.minigame.missionId, kind: node.minigame.kind, outcome },
          [],
          node.minigame.kind === 'hacking' ? node.minigame.skinId : undefined,
        );
      }
      id = style === 'careful' ? node.minigame.onWin : node.minigame.onFail;
      continue;
    }
    if (node.redistribute) {
      id = node.next!;
      continue;
    }
    if (node.end) break;

    const choices = visibleChoices(node, s.player.flags, []);
    if (choices.length) {
      const picked = choices[0];
      if (picked.effects?.length) s = applyEffects(s, picked.effects);
      if (picked.goto) {
        id = picked.goto;
        continue;
      }
    }
    if (!node.next) break;
    id = node.next;
  }

  return applyEffects(s, [{ kind: 'flag', key: completionFlag(scene.id) }]);
}

/** Plays whatever is offered, from `scenes`, until nothing is. */
function playThrough(start: SaveState, scenes: Scene[], style: Style): SaveState {
  let save = start;
  for (let guard = 0; guard < 80; guard++) {
    const next = scenes.find((s) => offered(save, s));
    if (!next) break;
    save = playScene(save, next, style);
  }
  return save;
}

const act1 = (style: Style) => playThrough(createNewSave('Wren'), ACT1_SCENES, style);

/** Act 1, then everything the game goes on to offer, in the order it offers it. */
const wholeGame = (style: Style) => playThrough(act1(style), ALL_SCENES, style);

describe('the Heat curve', () => {
  /**
   * Module 08's close condition, and the most load-bearing number in Act 1:
   * the act has to end feeling real and not yet frightening. Too low and four
   * hours of investigation cost nothing; too high and the tone is wrong before
   * the player has met anybody.
   */
  it('leaves Act 1 on module 08’s number, which is not module 08’s tier', () => {
    const careful = act1('careful');
    expect(careful.heat.current).toBeGreaterThanOrEqual(8);
    expect(careful.heat.current).toBeLessThanOrEqual(18);

    /*
     * DOC CONFLICT, and worth knowing about rather than quietly resolving.
     *
     * Module 08: "Heat should sit around 10–15 by end of Act 1 (low `watched`
     * range)". Module 02's tier table: clear 0–24, watched 25–49. Ten to
     * fifteen is upper `clear`, not low `watched`, so the two documents cannot
     * both be followed.
     *
     * Followed here: the number. Module 02 owns the tier boundaries and module
     * 08's parenthetical is a mislabel — and the number is the thing that was
     * chosen deliberately ("enough to feel real, not enough to be scary yet"),
     * whereas the tier name is a gloss on it. Inflating Act 1 to 25+ to make
     * the label true would put the world into ambient-caution mode before the
     * player has met anybody, which is the tone the number exists to protect.
     *
     * Measured: 12.
     */
    expect(careful.heat.threshold_tier).toBe('clear');
  });

  /** Even played badly, Act 1 must not reach a tier that changes the world. */
  it('never lets a clumsy Act 1 reach flagged', () => {
    const messy = act1('messy');
    expect(messy.heat.current).toBeLessThan(50);
    expect(messy.heat.threshold_tier).not.toBe('flagged');
    expect(messy.heat.threshold_tier).not.toBe('hunted');
  });

  /**
   * The Story Bible's midpoint: confidence and Heat both climb, and the act
   * should close under real pressure without tipping into the crisis tier —
   * `hunted` is meant to be rare and consequential, not where the story simply
   * ends up.
   */
  it('ends a careful whole game in the Story Bible’s 55–70 band', () => {
    const careful = wholeGame('careful');
    expect(careful.skills.resistanceIntel.compromised).toBe(true);
    expect(careful.player.currentChapter).toBe('ending');
    // Measured: 59. Real pressure, short of the crisis tier.
    expect(careful.heat.current).toBeGreaterThanOrEqual(50);
    expect(careful.heat.current).toBeLessThanOrEqual(72);
    expect(careful.heat.threshold_tier).toBe('flagged');
  });

  /**
   * The other end of the curve, and it is a feature rather than a tolerance:
   * a player who fails everything ends up in the tier the forced breather beat
   * exists for, and the beat is then actually sitting there waiting for them.
   * That ties the Heat table, the tier boundaries and the content together in
   * one assertion, which is the only place in the suite they all meet.
   */
  it('puts a badly played run through the forced breather, not into a wall', () => {
    const messy = wholeGame('messy');
    expect(messy.heat.threshold_tier).toBe('hunted');

    /*
     * The run reached `hunted` partway through and the breather beat fired —
     * which is the whole of module 02's design for the top tier, and the first
     * check anywhere that it actually happens in play rather than in a unit
     * test that sets the tier by hand. It fires, the run continues, and the
     * meter climbs back afterwards, which is correct: the breather is a
     * breather, not an absolution.
     */
    expect(messy.player.flags[LIE_LOW_FLAG]).toBe(true);
    expect(messy.player.currentChapter).toBe('ending');
  });

  /**
   * Guardrail 1, checked end to end rather than in a unit: no route through the
   * whole game hard-fails, and the meter stays inside its own range whatever
   * happens. A clamp bug would show up here as a number outside 0–100.
   */
  it('keeps the meter in range on a badly played run', () => {
    const messy = wholeGame('messy');
    expect(messy.heat.current).toBeGreaterThanOrEqual(0);
    expect(messy.heat.current).toBeLessThanOrEqual(100);
  });

  /**
   * Decay has to be slow enough that "lie low" is a real choice (module 02
   * guardrail 3) and fast enough that a careful player isn't permanently
   * taxed for a bad night in Act 1.
   */
  it('decays slowly enough that lying low is a real choice', () => {
    const start = wholeGame('careful');
    let quiet = start;
    const trace: number[] = [];
    for (let d = 0; d < 10; d++) {
      const day = quiet.world.day + 1;
      quiet = { ...quiet, world: { ...quiet.world, day }, heat: decayTo(quiet.heat, day) };
      trace.push(quiet.heat.current);
    }

    // Ten quiet days must not wipe out a whole act's exposure, or "lie low"
    // becomes idle-waiting optimisation (module 02 guardrail 3) …
    expect(quiet.heat.current).toBeGreaterThan(start.heat.current / 3);
    // … and must visibly move, or patience isn't rewarded at all.
    expect(trace[0]).toBeLessThan(start.heat.current);
    expect(quiet.heat.current).toBeLessThan(start.heat.current - 15);
  });
});

describe('the economy has somewhere to go', () => {
  /**
   * The tin is the only money in the game that isn't stolen, and the first
   * purchase has to be a real decision — affordable enough to matter, tight
   * enough to hurt. If the catalog's cheapest gear ever drifts above it, the
   * market is inert until the first heist.
   */
  it('leaves the player able to buy something, but not much', () => {
    const save = playThrough(act1('careful'), ALL_SCENES, 'careful');
    expect(save.economy.cashOnHand).toBeGreaterThan(0);
    expect(save.economy.cashOnHand).toBeLessThan(200);
  });

  /** Flagged since Phase 5 and still true: the heist outruns the catalog. */
  it('records the known imbalance rather than pretending it is solved', () => {
    // Deliberately not an assertion about gameplay — a note with a number on
    // it, so that when Act 2 missions start costing gear this test is the
    // thing that says how far there is to go.
    const catalogTotal = 45 + 120 + 200 + 80 + 150 + 60 + 25;
    const firstHeist = 8600;
    expect(firstHeist / catalogTotal).toBeGreaterThan(5);
  });
});
