import { describe, expect, it } from 'vitest';
import { ALL_SCENES } from './all';
import {
  completionFlag,
  offered,
  pendingScenes,
  visibleChoices,
  type Scene,
} from '../systems/scenes';
import { applyEffects } from '../systems/effects';
import { MENTOR_DONE } from '../systems/mentors';
import { createNewSave } from '../state/defaults';
import type { SaveState } from '../state/schema';

/**
 * WHOLE-GAME REACHABILITY
 *
 * Every other guardrail in this codebase validates one layer and is blind one
 * layer up, which is the shape every bug found so far has had:
 *
 *   - `validateScene` walks node routes inside a single scene
 *   - `validateMentor` walks the beat cursor inside a single mission
 *   - `unreachableBeats` walks options inside a single sabotage window
 *
 * All three can pass while the *composed* game strands the player — a scene
 * shadowed behind another at the same location, a beat gated on a flag no
 * reachable path writes, a branch that quietly costs a skill. Those are only
 * visible from outside all of them.
 *
 * So this walks the actual state graph: from a new save, play every scene the
 * game offers, under every choice index and every minigame outcome, dedupe by
 * a state signature, and keep going until nothing new opens. Roughly 1,900
 * states and under a second, which is worth it for the class of bug it covers.
 *
 * When Act 2 lands this needs no changes — it reads `ALL_SCENES`.
 */

const SKILLS = ['sabotage', 'hacking', 'aiToolAccess', 'resistanceIntel'] as const;

/**
 * What is actually worth trying on a given scene.
 *
 * The walk used to try choice indices 0–3 and all three minigame outcomes on
 * every scene regardless of what was in it, which is four to twelve redundant
 * playthroughs of every one-choice dialogue scene. The extra runs produce no new
 * states — the signature dedupes them — but they are most of the wall-clock
 * time, and when Act 2 quadrupled the graph the suite went from under a second
 * to fifty.
 *
 * Coverage is identical: an index past the last choice is clamped to the last
 * choice by `play`, and a scene with no minigame ignores the outcome entirely.
 */
function strategies(scene: Scene): { picks: number[]; outcomes: string[] } {
  const widest = Math.max(
    1,
    ...Object.values(scene.nodes).map((n) => (n.choices ?? []).length),
  );
  const minigames = Object.values(scene.nodes)
    .map((n) => n.minigame)
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  // `abort` is only a distinct route if some minigame in the scene sends it
  // somewhere `fail` doesn't — `play` folds an absent `onAbort` into `onFail`,
  // and most content routes them together, so exploring it blind is a third of
  // the minigame work for no extra coverage.
  const abortDiffers = minigames.some((m) => m.onAbort && m.onAbort !== m.onFail);

  return {
    picks: Array.from({ length: widest }, (_, i) => i),
    outcomes: minigames.length
      ? abortDiffers
        ? ['win', 'fail', 'abort']
        : ['win', 'fail']
      : ['win'],
  };
}

/**
 * Walks a scene the way SceneView does, with a fixed choice/outcome strategy.
 *
 * `spun` reports that the walk hit the step guard rather than reaching an end.
 * A scene that can be re-entered without changing anything is an infinite hub
 * — the player isn't hard-stuck, they can always pick something else, but the
 * scene has an option that promises progress and delivers none. The heist's
 * recon hub did exactly this when its trace failed, and the symptom showed up
 * three assertions away as a mission parked on the wrong beat.
 */
const STEP_GUARD = 80;
let spun: string[] = [];

function play(save: SaveState, scene: Scene, pickIdx: number, outcome: string): SaveState {
  let s = save;
  let id = scene.start;
  let step = 0;

  for (; step < STEP_GUARD; step++) {
    const node = scene.nodes[id];
    if (!node) break;
    if (node.effects?.length) s = applyEffects(s, node.effects);

    if (node.minigame) {
      id =
        outcome === 'win'
          ? node.minigame.onWin
          : outcome === 'abort'
            ? node.minigame.onAbort ?? node.minigame.onFail
            : node.minigame.onFail;
      continue;
    }
    if (node.end) break;

    const choices = visibleChoices(node, s.player.flags);
    if (choices.length) {
      const picked = choices[Math.min(pickIdx, choices.length - 1)];
      if (picked.effects?.length) s = applyEffects(s, picked.effects);
      if (picked.goto) {
        id = picked.goto;
        continue;
      }
    }
    if (!node.next) break;
    id = node.next;
  }

  if (step >= STEP_GUARD) spun.push(`${scene.id} (pick ${pickIdx}, ${outcome})`);
  return applyEffects(s, [{ kind: 'flag', key: completionFlag(scene.id) }]);
}

/**
 * Every flag that can gate something: the ones named in a scene's `requires`,
 * in a choice's `requiresFlag`/`hiddenIfFlag`, plus every scene's completion
 * flag, which `offered` reads.
 *
 * Computed from the content rather than listed, so it cannot go stale.
 */
const GATING_FLAGS: Set<string> = new Set([
  ...ALL_SCENES.map((s) => completionFlag(s.id)),
  ...ALL_SCENES.flatMap((s) => s.requires?.flags ?? []),
  ...ALL_SCENES.flatMap((s) =>
    Object.values(s.nodes).flatMap((n) =>
      (n.choices ?? []).flatMap((c) => [c.requiresFlag, c.hiddenIfFlag].filter(Boolean) as string[]),
    ),
  ),
]);

/** Fixed order, so a signature is a bitstring rather than a sort per state. */
const GATING_ORDER = [...GATING_FLAGS].sort();

/**
 * Chapter, every mission cursor, and every *gating* flag. Heat is deliberately excluded:
 * it gates dialogue variants and difficulty, never *progress*, so folding it in
 * would multiply the graph without covering anything new.
 *
 * That claim is now load-bearing rather than incidental, because `hunted` opens
 * a scene (the forced breather, module 02). It still holds — that scene is
 * optional, off the critical path, and gates no skill — but the assumption is
 * checked below rather than trusted, by asserting that every tier-gated scene
 * is optional AND that it does become offerable at its tier.
 */
const signature = (s: SaveState) =>
  [
    s.player.currentChapter,
    /*
     * Beat cursors only. A mission record also carries `status`, `attempts`,
     * `hardened` and a cooldown day, none of which `offered` reads — a scene
     * gates on `requires.mission.beat` and nothing else. Folding them in
     * splits every state by how a minigame happened to go rather than by what
     * it opened, which is the same mistake as counting non-gating flags.
     *
     * Minigame-only records (no beat at all) drop out entirely for the same
     * reason. The terminal assertions still read `status` off the real save.
     */
    Object.entries(s.missions)
      .filter(([, v]) => v.beat !== undefined)
      .map(([k, v]) => `${k}:${v.beat}`)
      .sort()
      .join(','),
    /*
     * Gating flags only. A flag nothing reads cannot change what is offered or
     * which choices are visible, so folding it into the signature splits every
     * state in two and proves nothing — and Act 2 writes a lot of them
     * (`casey_answer_found`, `told_bishop_directly`, the low-point set) purely
     * so later dialogue can call back to them. Narrowing this is what keeps the
     * walk in seconds rather than a minute.
     *
     * The set is derived from the content, so adding a gate anywhere puts the
     * flag back in automatically.
     */
    GATING_ORDER.map((f) => (s.player.flags[f] ? '1' : '0')).join(''),
  ].join('|');

interface Exploration {
  states: number;
  played: Set<string>;
  terminals: SaveState[];
  deadEnds: SaveState[];
  exhausted: boolean;
}

/*
 * Raised from 20,000 when Act 2 landed. The graph roughly quadrupled — fourteen
 * new scenes, four of them walkable in any order — and the guard tripped, which
 * showed up as three assertions failing for reasons that had nothing to do with
 * the content. That is exactly what the guard is for, and the first assertion
 * below is what makes it legible rather than mysterious.
 */
function explore(limit = 250000): Exploration {
  spun = [];
  const start = createNewSave('Wren');
  const seen = new Set([signature(start)]);
  const queue: SaveState[] = [start];
  const played = new Set<string>();
  const terminals: SaveState[] = [];
  const deadEnds: SaveState[] = [];
  let steps = 0;

  while (queue.length && steps++ < limit) {
    const save = queue.shift()!;
    const pending = pendingScenes(save, ALL_SCENES);

    if (!pending.length) {
      const complete = SKILLS.every((k) => save.skills[k].unlocked);
      (complete ? terminals : deadEnds).push(save);
      continue;
    }

    for (const scene of pending) {
      played.add(scene.id);
      const { picks, outcomes } = strategies(scene);
      for (const pick of picks) {
        for (const outcome of outcomes) {
          const next = play(save, scene, pick, outcome);
          const key = signature(next);
          if (seen.has(key)) continue;
          seen.add(key);
          queue.push(next);
        }
      }
    }
  }

  return { states: seen.size, played, terminals, deadEnds, exhausted: steps < limit };
}

const result = explore();

describe('the composed game', () => {
  it('explores the whole state graph without hitting the guard', () => {
    // If this ever trips, the graph grew and the assertions below went partial.
    expect(result.exhausted).toBe(true);
    expect(result.states).toBeGreaterThan(100);
  });

  it('has no scene that can spin without progressing', () => {
    expect([...new Set(spun)], `never reached an ending: ${[...new Set(spun)].join(', ')}`).toEqual([]);
  });

  it('leaves no scene unreachable on every path', () => {
    // Tier-gated scenes are unreachable to this walk *by construction*, since
    // the signature excludes Heat. They get their own two tests below.
    const never = ALL_SCENES.filter(
      (s) => !result.played.has(s.id) && !s.requires?.minTier,
    ).map((s) => s.id);
    expect(never, `authored but unreachable: ${never.join(', ')}`).toEqual([]);
  });

  /**
   * The walk's exclusion of Heat is only safe while no tier-gated scene is on
   * the critical path. If one ever grants a skill or advances the chapter, this
   * fails and the signature has to grow to match.
   */
  it('keeps every tier-gated scene off the critical path', () => {
    for (const scene of ALL_SCENES.filter((s) => s.requires?.minTier)) {
      const effects = Object.values(scene.nodes).flatMap((n) => [
        ...(n.effects ?? []),
        ...(n.choices ?? []).flatMap((c) => c.effects ?? []),
      ]);
      expect(
        effects.filter((e) => e.kind === 'skill' || e.kind === 'chapter'),
        `${scene.id} is gated on Heat and moves progression — the walk can't see it`,
      ).toEqual([]);
    }
  });

  it('offers each tier-gated scene once its tier is reached', () => {
    for (const scene of ALL_SCENES.filter((s) => s.requires?.minTier)) {
      const tier = scene.requires!.minTier!;
      const cold = createNewSave('Wren');
      const hot: SaveState = {
        ...cold,
        heat: { ...cold.heat, current: 90, threshold_tier: tier },
      };
      expect(offered(cold, scene), `${scene.id} is offered below its tier`).toBe(false);
      expect(offered(hot, scene), `${scene.id} never becomes offerable`).toBe(true);
    }
  });

  /**
   * The one that matters. A state with nothing left to do and a skill still
   * locked is a soft game-over: skills are the entire progression system, so a
   * player who lands here has no way forward and no way to know why.
   */
  it('never strands the player with nothing to do and a skill unearned', () => {
    const stuck = result.deadEnds.map((s) => ({
      chapter: s.player.currentChapter,
      missing: SKILLS.filter((k) => !s.skills[k].unlocked),
      cursors: Object.fromEntries(Object.entries(s.missions).map(([k, v]) => [k, v.beat])),
    }));
    expect(stuck, `dead ends: ${JSON.stringify(stuck.slice(0, 3))}`).toEqual([]);
  });

  it('reaches a real ending, on more than one route', () => {
    expect(result.terminals.length).toBeGreaterThan(1);
  });

  it('finishes every mentor mission it starts, on every route', () => {
    for (const save of result.terminals) {
      for (const [id, record] of Object.entries(save.missions)) {
        // Minigame records are keyed by mission id and carry no beat cursor.
        if (record.beat === undefined) continue;
        expect(record.beat, `${id} ended parked on beat ${record.beat}`).toBe(MENTOR_DONE);
        expect(record.status, `${id} ended ${record.status}`).toBe('complete');
      }
    }
  });
});

/*
 * Reported rather than asserted on: a hard number here would fail every time
 * content lands, which is the opposite of useful. It's printed so a reviewer
 * can see the graph grew when they expected it to.
 */
describe('scale', () => {
  it('reports the size of the graph it explored', () => {
    // eslint-disable-next-line no-console
    console.log(
      `  reachability: ${result.states} states · ${result.played.size} scenes · ` +
        `${result.terminals.length} endings · ${result.deadEnds.length} dead ends`,
    );
    expect(result.played.size).toBeGreaterThan(0);
  });
});
