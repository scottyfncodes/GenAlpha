import { describe, expect, it } from 'vitest';
import { MENTORS, MENTOR_SCENES } from './mentors';
import { ALL_SCENES } from './all';
import { LOCATIONS } from '../world/locations';
import { MENTOR_DONE, validateMentor, type MentorMission } from '../systems/mentors';
import { applyEffects } from '../systems/effects';
import {
  completionFlag,
  offered,
  pendingScenes,
  scenesAt,
  visibleChoices,
  type Effect,
  type Scene,
} from '../systems/scenes';
import { createNewSave } from '../state/defaults';
import type { SaveState } from '../state/schema';
import { DEJA_JOBSITE } from './sabotage';

const locationIds = LOCATIONS.map((l) => l.id);

/** Act 1 finished: the flag every mentor mission opens on. */
function afterAct1(): SaveState {
  const save = createNewSave('Wren');
  return applyEffects(save, [
    { kind: 'flag', key: 'resistance_hint_found' },
    { kind: 'chapter', chapterId: 'act1_complete' },
  ]);
}

type Chooser = (nodeId: string, choices: string[]) => number;
type Outcome = (nodeId: string) => 'win' | 'fail' | 'abort';

/**
 * Walks a scene the way SceneView does: node effects fire on entry, choices
 * apply their own, minigames route on outcome, and the completion flag lands
 * at the end. Enough fidelity to prove content is playable without a DOM.
 */
function play(save: SaveState, scene: Scene, choose: Chooser, outcome: Outcome): SaveState {
  let s = save;
  let id = scene.start;

  for (let step = 0; step < 60; step++) {
    const node = scene.nodes[id];
    expect(node, `${scene.id}: routed to missing node "${id}"`).toBeDefined();
    if (node.effects?.length) s = applyEffects(s, node.effects);

    if (node.minigame) {
      const result = outcome(node.id);
      id =
        result === 'win'
          ? node.minigame.onWin
          : result === 'abort'
            ? node.minigame.onAbort ?? node.minigame.onFail
            : node.minigame.onFail;
      continue;
    }
    if (node.end) break;

    const choices = visibleChoices(node, s.player.flags);
    if (choices.length) {
      const picked = choices[choose(node.id, choices.map((c) => c.text))];
      expect(picked, `${scene.id}.${node.id}: chooser picked nothing`).toBeDefined();
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

/** Plays whatever scene the mission is currently offering, until none is. */
function runMission(
  save: SaveState,
  mission: MentorMission,
  choose: Chooser = () => 0,
  outcome: Outcome = () => 'win',
): SaveState {
  let s = save;
  for (let i = 0; i < 12; i++) {
    const scene = mission.scenes.find((sc) => offered(s, sc));
    if (!scene) return s;
    s = play(s, scene, choose, outcome);
  }
  throw new Error(`${mission.id}: mission never finished offering scenes`);
}

const pickByText = (want: string): Chooser => (_id, choices) => {
  const i = choices.findIndex((c) => c.includes(want));
  return i >= 0 ? i : 0;
};

const allEffects = (scenes: Scene[]): Effect[] =>
  scenes.flatMap((s) =>
    Object.values(s.nodes).flatMap((n) => [
      ...(n.effects ?? []),
      ...(n.choices ?? []).flatMap((c) => c.effects ?? []),
    ]),
  );

describe('mentor missions are well formed', () => {
  it.each(MENTORS.map((m) => [m.id, m] as const))('%s fills the template', (_id, mission) => {
    expect(validateMentor(mission, locationIds)).toEqual([]);
  });

  it('gives every mentor a distinct set of scene ids', () => {
    const ids = MENTOR_SCENES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps mentor content out of Act 1 entirely', () => {
    const fresh = createNewSave('Wren');
    expect(MENTOR_SCENES.filter((s) => offered(fresh, s))).toEqual([]);
  });

  /*
   * Deja and Aaron both seed their Contact at the school. `sceneAt` returns
   * only the first offered scene at a location, so Aaron was invisible until
   * Deja's Contact was finished — a hard ordering gate, when module 06 says
   * mentor order is player-directed except for Bishop, and the content's own
   * comment says nothing gates it but Bishop's skill count.
   *
   * The overworld now offers every thread at a location. This pins the
   * property that matters: no open thread is unreachable from its own place.
   * Act 2 opens more threads at once, so this gets easier to break, not harder.
   */
  it('leaves no open thread hidden behind another at the same location', () => {
    const save = afterAct1();
    const open = pendingScenes(save, ALL_SCENES);
    const reachable = new Set(
      open.flatMap((s) => scenesAt(save, ALL_SCENES, s.locationId).map((x) => x.id)),
    );
    for (const s of open) {
      expect(reachable.has(s.id), `${s.id} is offered but unreachable at ${s.locationId}`).toBe(true);
    }
    expect(reachable.size).toBe(open.length);
  });

  it('lets the player approach Deja or Aaron first, as module 06 intends', () => {
    const save = afterAct1();
    const school = scenesAt(save, ALL_SCENES, 'school').map((s) => s.id);
    expect(school).toContain('mentor_deja_1_contact');
    expect(school).toContain('mentor_files_1_contact');
  });
});

describe('playing them', () => {
  it('unlocks all four skills on the default path', () => {
    let save = afterAct1();
    // Bishop's gate means he can't come first, which is the point of the gate.
    // Aaron gets an explicit chooser because index 0 at his test is the trade,
    // and this test is about the path where the player passes it.
    for (const mission of MENTORS) {
      save = runMission(save, mission, pickByText('mine to give'));
    }

    expect(save.skills.sabotage).toMatchObject({ unlocked: true, tier: 1 });
    expect(save.skills.hacking).toMatchObject({ unlocked: true, tier: 1 });
    expect(save.skills.aiToolAccess.unlocked).toBe(true);
    expect(save.skills.resistanceIntel.unlocked).toBe(true);

    for (const m of MENTORS) {
      expect(save.missions[m.id].status, `${m.id} did not complete`).toBe('complete');
      expect(save.missions[m.id].beat).toBe(MENTOR_DONE);
      expect(save.relationships[m.id].trust, `${m.id} trust`).toBeGreaterThan(20);
      expect(save.relationships[m.id].metAt).toBeTruthy();
    }
  });

  it('holds Bishop back until two other mentors are done', () => {
    const save = afterAct1();
    expect(MENTORS[3].scenes.some((s) => offered(save, s))).toBe(false);

    const one = runMission(save, MENTORS[0]);
    expect(MENTORS[3].scenes.some((s) => offered(one, s))).toBe(false);

    const two = runMission(one, MENTORS[1]);
    expect(MENTORS[3].scenes.some((s) => offered(two, s))).toBe(true);
  });

  it('still reaches hacking when the player fails Aaron’s test', () => {
    const traded = runMission(afterAct1(), MENTORS[1], pickByText('brother at the annex'));

    expect(traded.player.flags.files_traded_it).toBe(true);
    expect(traded.player.flags.files_amends_made).toBe(true);
    expect(traded.skills.hacking.unlocked).toBe(true);
    expect(traded.missions.files.status).toBe('complete');
  });

  it('costs real trust to have failed it', () => {
    const kept = runMission(afterAct1(), MENTORS[1], pickByText('mine to give'));
    const traded = runMission(afterAct1(), MENTORS[1], pickByText('brother at the annex'));

    expect(kept.relationships.files.trust).toBeGreaterThan(traded.relationships.files.trust);
    expect(kept.skills.hacking.unlocked).toBe(traded.skills.hacking.unlocked);
  });

  it('gives Milo’s trustedMode only to the harder path', () => {
    const clean = runMission(afterAct1(), MENTORS[2], pickByText('Read it yourself'));
    const easy = runMission(afterAct1(), MENTORS[2], pickByText('Let it read the file'));

    expect(clean.skills.aiToolAccess).toMatchObject({ unlocked: true, trustedMode: true });
    expect(easy.skills.aiToolAccess).toMatchObject({ unlocked: true, trustedMode: false });
    // The shortcut's cost is the +2 flat from the Heat table, and nothing else.
    expect(easy.heat.current - clean.heat.current).toBe(2);
  });

  it('does not lock the player out when Deja’s cover is blown', () => {
    const spotted = runMission(afterAct1(), MENTORS[0], () => 0, () => 'fail');

    expect(spotted.player.flags.deja_took_the_fall).toBe(true);
    expect(spotted.skills.sabotage.unlocked).toBe(true);
    expect(spotted.relationships.deja.trust).toBeGreaterThan(0);
  });

  it('gives walking away its own ending, not the one about getting caught', () => {
    const walked = runMission(afterAct1(), MENTORS[0], () => 0, () => 'abort');

    expect(walked.player.flags.deja_job_missed).toBe(true);
    expect(walked.player.flags.deja_took_the_fall).toBeUndefined();
    expect(walked.skills.sabotage.unlocked).toBe(true);
    // The cover was worth more than not doing it, and not doing it still
    // moved her — she asked you back.
    const clean = runMission(afterAct1(), MENTORS[0]);
    expect(walked.relationships.deja.trust).toBeLessThan(clean.relationships.deja.trust);
    expect(walked.relationships.deja.trust).toBeGreaterThan(0);
  });

  it('writes the flag the betrayal will need to call back to', () => {
    let save = runMission(afterAct1(), MENTORS[0]);
    save = runMission(save, MENTORS[1]);
    save = runMission(save, MENTORS[3]);
    expect(save.player.flags.bishop_first_op_complete).toBe(true);
  });
});

describe('system touches', () => {
  it('keeps mentor Heat modest — Act 2 has to have somewhere to go', () => {
    const scripted = allEffects(MENTOR_SCENES)
      .filter((e): e is Extract<Effect, { kind: 'heat' }> => e.kind === 'heat')
      .reduce((sum, e) => sum + e.delta, 0);
    // Bishop's op plus Milo's optional shortcut. Deja's run is charged by the
    // mission table instead, which is why it isn't in here.
    expect(scripted).toBeLessThanOrEqual(10);
  });

  /*
   * NARROWED for Act 2. The invariant this protects is that skills are granted
   * by people, and only ever at a Beat 4 — that is the whole "skill by
   * relationship" design and it must not leak into ordinary story content.
   *
   * It used to assert on every `skill` effect anywhere, which was the same
   * thing right up until the betrayal, because until then the only reason to
   * touch a skill was to grant one. Setting `resistanceIntel.compromised` is
   * not a grant; it takes a skill's *meaning* away and is by definition not a
   * mentor unlock. So the assertion is now about unlocks specifically, which
   * is what it always meant.
   */
  it('only ever grants a skill from a mentor unlock scene', () => {
    const grants = (scenes: Scene[]) =>
      allEffects(scenes).filter((e) => e.kind === 'skill' && e.unlocked !== undefined);
    expect(grants(ALL_SCENES)).toEqual(grants(MENTOR_SCENES));
  });

  it('changes a skill outside a mentor scene only to compromise one', () => {
    const outside = allEffects(ALL_SCENES)
      .filter((e): e is Extract<Effect, { kind: 'skill' }> => e.kind === 'skill')
      .filter((e) => !allEffects(MENTOR_SCENES).includes(e));
    for (const e of outside) {
      expect(e.unlocked, `${e.skill} is unlocked outside a mentor unlock scene`).toBeUndefined();
      expect(e.compromised).toBe(true);
    }
  });

  it('keeps the glitch rare across the new content too', () => {
    const lines = MENTOR_SCENES.flatMap((s) => Object.values(s.nodes).flatMap((n) => n.lines));
    const glitched = lines.filter((l) => l.glitch).length;
    expect(glitched / lines.length).toBeLessThan(0.05);
  });

  it('leaves Bishop the warmest before he has asked for anything', () => {
    /*
     * Structural, not decorative. The tell isn't that Bishop ends up liked —
     * it's that he hands over more trust in Contact and The Ask, before the
     * player has done a single thing for him, than any other mentor does. Deja
     * makes you cover for her. Aaron hands you a live wire and watches. Bishop
     * is delighted with you on sight. If a later content pass evens the four
     * out for pacing, the betrayal loses its setup, so this is pinned.
     */
    const upfront = (m: MentorMission) =>
      allEffects(m.scenes.filter((s) => (s.requires?.mission?.beat ?? 9) <= 2))
        .filter((e): e is Extract<Effect, { kind: 'trust' }> => e.kind === 'trust')
        .reduce((sum, e) => sum + e.delta, 0);

    const bishop = MENTORS.find((m) => m.id === 'bishop')!;
    for (const other of MENTORS.filter((m) => m.id !== 'bishop')) {
      expect(upfront(bishop), `bishop vs ${other.id}`).toBeGreaterThan(upfront(other));
    }
  });
});

describe('Deja’s tutorial is unfailable on purpose', () => {
  /**
   * The handoff flagged this as an accident of the risk numbers. It's a
   * decision now: the first sabotage run the player ever sees cannot be lost
   * at a normal Heat tier, so the mechanic gets taught rather than tested.
   * `hunted` and a hardened retarget can still take it away, which is why the
   * spotted branch is authored rather than dead.
   */
  it('cannot be lost even by going in completely blind', () => {
    const worstBlind = DEJA_JOBSITE.windowBeats
      .map((b) =>
        Math.max(...b.options.filter((o) => !o.requiresCasingDetail && !o.requiresTool).map((o) => o.risk)),
      )
      .reduce((a, b) => a + b, 0);
    expect(worstBlind).toBeLessThan(DEJA_JOBSITE.alertnessBudget);
  });
});
