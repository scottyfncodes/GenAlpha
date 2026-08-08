import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../../world/locations';
import { createNewSave } from '../../state/defaults';
import type { SaveState } from '../../state/schema';
import { applyEffects } from '../../systems/effects';
import { MENTOR_DONE } from '../../systems/mentors';
import {
  completionFlag,
  offered,
  validateScene,
  visibleChoices,
  type Scene,
} from '../../systems/scenes';
import { ACT2_SCENES } from './index';

const locationIds = LOCATIONS.map((l) => l.id);
const byId = (id: string) => ACT2_SCENES.find((s) => s.id === id)!;

/** Crew assembled, Act 1 closed — where Act 2 opens. */
function afterTheCrew(): SaveState {
  return applyEffects(createNewSave('Wren'), [
    { kind: 'flag', key: 'resistance_hint_found' },
    { kind: 'flag', key: 'safety_grant_known' },
    { kind: 'flag', key: 'bishop_first_op_complete' },
    { kind: 'skill', skill: 'sabotage', unlocked: true, tier: 1 },
    { kind: 'skill', skill: 'hacking', unlocked: true, tier: 1 },
    { kind: 'skill', skill: 'aiToolAccess', unlocked: true },
    { kind: 'skill', skill: 'resistanceIntel', unlocked: true },
  ]);
}

function play(save: SaveState, scene: Scene, prefer: string[] = [], win = true): SaveState {
  let s = save;
  let id = scene.start;

  for (let step = 0; step < 60; step++) {
    const node = scene.nodes[id];
    expect(node, `${scene.id}: routed to missing node "${id}"`).toBeDefined();
    if (node.effects?.length) s = applyEffects(s, node.effects);
    if (node.minigame) {
      id = win ? node.minigame.onWin : node.minigame.onFail;
      continue;
    }
    if (node.end) break;

    const choices = visibleChoices(node, s.player.flags, []);
    if (choices.length) {
      const picked = choices.find((c) => prefer.some((p) => c.text.includes(p))) ?? choices[0];
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

/** Walks whatever Act 2 currently offers until it stops offering anything. */
function runAct2(start: SaveState, prefer: string[] = [], win = true): SaveState {
  let save = start;
  for (let guard = 0; guard < 40; guard++) {
    const next = ACT2_SCENES.find((s) => offered(save, s));
    if (!next) break;
    save = play(save, next, prefer, win);
  }
  return save;
}

describe('Act 2 is well formed', () => {
  it.each(ACT2_SCENES.map((s) => [s.id, s] as const))('%s validates', (_id, scene) => {
    expect(validateScene(scene, locationIds)).toEqual([]);
  });

  it('gives every scene a distinct id', () => {
    const ids = ACT2_SCENES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('stays shut until the crew exists', () => {
    const fresh = createNewSave('Wren');
    expect(ACT2_SCENES.filter((s) => offered(fresh, s))).toEqual([]);
    expect(ACT2_SCENES.filter((s) => offered(afterTheCrew(), s)).map((s) => s.id)).toEqual([
      'act2_1_car_park',
    ]);
  });

  /**
   * Skeleton decision 2. A player who did the heist before meeting Milo should
   * not find Milo closed, so Act 2 sequences on its own cursor and touches no
   * mentor gate. If an Act 2 scene ever gates on a chapter, this is the test
   * that should stop it.
   */
  it('sequences on its own cursor, not on a chapter', () => {
    for (const scene of ACT2_SCENES) {
      expect(scene.requires?.chapter, `${scene.id} gates on a chapter`).toBeUndefined();
      /*
       * The four floor scenes carry their own cursors, because they are
       * order-free siblings and `requires.mission` names one. They still have
       * to be on *a* cursor — that is what closes each scene's door on entry
       * rather than on completion, which is the reload hole this whole
       * convention exists to shut.
       */
      const gate = scene.requires?.mission;
      expect(gate, `${scene.id} is on no cursor at all`).toBeDefined();
      expect(
        gate!.id === 'act2' || gate!.id.startsWith('act2_floor_'),
        `${scene.id} is on an unrelated cursor: ${gate!.id}`,
      ).toBe(true);
    }
  });

  /** Nobody raises their voice. The betrayal is administrative, not villainous. */
  it('keeps the glitch effect rare across the act', () => {
    const lines = ACT2_SCENES.flatMap((s) => Object.values(s.nodes).flatMap((n) => n.lines));
    const glitched = lines.filter((l) => l.glitch).length;
    expect(glitched / lines.length).toBeLessThan(0.05);
  });
});

describe('the act plays through', () => {
  it('reaches Act 3 on the direct route', () => {
    const end = runAct2(afterTheCrew(), ['Show him', 'Do it the long way']);
    expect(end.player.currentChapter).toBe('act3_01');
    expect(end.missions.act2?.beat).toBe(MENTOR_DONE);
    expect(end.missions.act2?.status).toBe('complete');
  });

  it('reaches Act 3 having failed every minigame in it', () => {
    const end = runAct2(afterTheCrew(), ['Show him'], false);
    expect(end.player.currentChapter).toBe('act3_01');
    // The answer still arrives — Aaron finishes the quarterly overnight.
    expect(end.player.flags.casey_answer_found).toBe(true);
  });

  it('answers Casey clerically, in the middle of the act rather than at the end', () => {
    let save = play(afterTheCrew(), byId('act2_1_car_park'));
    save = play(save, byId('act2_2_what_the_cameras_are_for'));
    expect(save.player.flags.casey_answer_found).toBe(true);
    expect(save.missions.act2?.beat).toBe(3);
  });
});

describe('the betrayal', () => {
  const upToTelling = (prefer: string[] = []) => {
    let save = afterTheCrew();
    for (const id of [
      'act2_1_car_park',
      'act2_2_what_the_cameras_are_for',
      'act2_3_on_a_schedule',
      'act2_4_the_easy_way',
      'act2_5_small_wins',
      'act2_6_the_funding_question',
    ]) {
      save = play(save, byId(id), prefer);
    }
    return save;
  };

  it('leaves the player holding the file without the meaning', () => {
    const save = upToTelling();
    expect(save.player.flags.resistance_funding_traced).toBe(true);
    // Beat 6 must NOT flip it — that gap is the whole design of beat 7.
    expect(save.skills.resistanceIntel.compromised).toBe(false);
  });

  it('flips the act on both routes, told or withheld', () => {
    for (const route of [['Show him'], ['Don’t']]) {
      const told = play(upToTelling(), byId('act2_7_telling_bishop'), route);
      expect(told.skills.resistanceIntel.compromised).toBe(true);
      expect(told.player.currentChapter).toBe('act2_07');
      expect(told.missions.act2?.beat).toBe(8);
    }
  });

  /**
   * Skeleton design note 3, pinned because it is the easiest thing in the act
   * to "improve" by accident. He is not thinking about the protagonist in this
   * scene and the game must not pretend he is. His trust moves in beat 9.
   */
  it('does not move Bishop’s trust in the scene itself, on either route', () => {
    const before = upToTelling().relationships.bishop?.trust ?? 0;
    for (const route of [['Show him'], ['Don’t']]) {
      const after = play(upToTelling(), byId('act2_7_telling_bishop'), route);
      expect(after.relationships.bishop?.trust ?? 0).toBe(before);
    }
  });

  it('withdraws pre-betrayal content the moment it flips', () => {
    const before = upToTelling();
    const funding = byId('act2_6_the_funding_question');
    expect(funding.requires?.compromised).toBe(false);
    const after = applyEffects(before, [
      { kind: 'skill', skill: 'resistanceIntel', compromised: true },
    ]);
    expect(offered(after, funding)).toBe(false);
  });

  it('holds beat 9 until all four floor scenes have been walked, in any order', () => {
    let save = play(upToTelling(), byId('act2_7_telling_bishop'), ['Show him']);
    const floor = ['act2_8d_home', 'act2_8b_files', 'act2_8c_milo', 'act2_8a_deja'];
    const comesBack = byId('act2_9_bishop_comes_back');

    for (const id of floor.slice(0, 3)) {
      expect(offered(save, comesBack)).toBe(false);
      save = play(save, byId(id));
    }
    expect(offered(save, comesBack)).toBe(false);
    save = play(save, byId(floor[3]));
    expect(offered(save, comesBack)).toBe(true);
  });

  it('gives Bishop his trust back later and larger than anyone else got theirs', () => {
    let save = play(upToTelling(), byId('act2_7_telling_bishop'), ['Show him']);
    for (const id of ['act2_8a_deja', 'act2_8b_files', 'act2_8c_milo', 'act2_8d_home']) {
      save = play(save, byId(id));
    }
    const before = save.relationships.bishop?.trust ?? 0;
    save = play(save, byId('act2_9_bishop_comes_back'));
    expect((save.relationships.bishop?.trust ?? 0) - before).toBeGreaterThanOrEqual(25);
    expect(save.player.flags.crew_independent).toBe(true);
  });
});

describe('Ellen', () => {
  it('grants nothing mechanical, ever — she is not a mentor', () => {
    const effects = ACT2_SCENES.flatMap((s) =>
      Object.values(s.nodes).flatMap((n) => [
        ...(n.effects ?? []),
        ...(n.choices ?? []).flatMap((c) => c.effects ?? []),
      ]),
    );
    const novaScenes = ['act2_3_on_a_schedule', 'act2_4_the_easy_way'];
    const fromNova = ACT2_SCENES.filter((s) => novaScenes.includes(s.id)).flatMap((s) =>
      Object.values(s.nodes).flatMap((n) => [
        ...(n.effects ?? []),
        ...(n.choices ?? []).flatMap((c) => c.effects ?? []),
      ]),
    );
    expect(fromNova.filter((e) => e.kind === 'skill')).toEqual([]);
    expect(effects.length).toBeGreaterThan(0);
  });

  it('costs her when the player uses her, and does not block either path', () => {
    let clean = afterTheCrew();
    let used = afterTheCrew();
    for (const id of ['act2_1_car_park', 'act2_2_what_the_cameras_are_for', 'act2_3_on_a_schedule']) {
      clean = play(clean, byId(id));
      used = play(used, byId(id));
    }
    const base = clean.relationships.nova?.trust ?? 0;

    clean = play(clean, byId('act2_4_the_easy_way'), ['Do it the long way']);
    used = play(used, byId('act2_4_the_easy_way'), ['Ask Ellen']);

    expect(used.player.flags.used_nova_access).toBe(true);
    expect(clean.player.flags.used_nova_access).toBeUndefined();
    expect(used.relationships.nova?.trust ?? 0).toBeLessThan(base);
    expect(clean.relationships.nova?.trust ?? 0).toBeGreaterThan(base);
    // Both reach the midpoint. Neither route is blocked; the cost is social.
    expect(used.missions.act2?.beat).toBe(5);
    expect(clean.missions.act2?.beat).toBe(5);
  });

  /** The cost lands in beat 10 as a different scene, never as a locked door. */
  it('changes the final ask rather than gating it', () => {
    const gap = byId('act2_10_the_decision').nodes.gap;
    const clean = visibleChoices(gap, {}, []);
    const owed = visibleChoices(gap, { used_nova_access: true }, []);
    expect(clean).toHaveLength(1);
    expect(owed).toHaveLength(1);
    expect(clean[0].goto).toBe('ask_clean');
    expect(owed[0].goto).toBe('ask_owed');
  });
});
