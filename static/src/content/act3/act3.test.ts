import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../../world/locations';
import { createNewSave } from '../../state/defaults';
import type { SaveState } from '../../state/schema';
import { applyEffects } from '../../systems/effects';
import { MENTOR_DONE } from '../../systems/mentors';
import { drain, walletOf } from '../../systems/heist';
import {
  completionFlag,
  offered,
  validateScene,
  visibleChoices,
  type Scene,
} from '../../systems/scenes';
import { ACT3_SCENES } from './index';
import { ACT3_TARGETS, MERROW, REYES, SORRELL } from './targets';

const locationIds = LOCATIONS.map((l) => l.id);
const byId = (id: string) => ACT3_SCENES.find((s) => s.id === id)!;
const allNodes = () => ACT3_SCENES.flatMap((s) => Object.values(s.nodes));

/** Act 2 finished — where Act 3 opens. */
function afterAct2(): SaveState {
  return applyEffects(createNewSave('Wren'), [
    { kind: 'flag', key: 'crew_independent' },
    { kind: 'skill', skill: 'sabotage', unlocked: true, tier: 3 },
    { kind: 'skill', skill: 'hacking', unlocked: true, tier: 3 },
    { kind: 'skill', skill: 'aiToolAccess', unlocked: true },
    { kind: 'skill', skill: 'resistanceIntel', unlocked: true, compromised: true },
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
    if (node.redistribute) {
      // The panel owns the split; this proves the scene routes past it.
      id = node.next!;
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

function runAct3(start: SaveState, win = true): SaveState {
  let save = start;
  for (let guard = 0; guard < 40; guard++) {
    const next = ACT3_SCENES.find((s) => offered(save, s));
    if (!next) break;
    save = play(save, next, [], win);
  }
  return save;
}

describe('Act 3 is well formed', () => {
  it.each(ACT3_SCENES.map((s) => [s.id, s] as const))('%s validates', (_id, scene) => {
    expect(validateScene(scene, locationIds)).toEqual([]);
  });

  it('stays shut until the crew goes independent', () => {
    expect(ACT3_SCENES.filter((s) => offered(createNewSave('Wren'), s))).toEqual([]);
    expect(ACT3_SCENES.filter((s) => offered(afterAct2(), s)).map((s) => s.id)).toEqual([
      'act3_1_the_ask',
    ]);
  });

  it('sequences on its own cursor', () => {
    for (const scene of ACT3_SCENES) {
      expect(scene.requires?.mission?.id, `${scene.id} is off the act3 cursor`).toBe('act3');
    }
  });

  it('reaches the ending, and reaches it having failed every minigame', () => {
    for (const win of [true, false]) {
      const end = runAct3(afterAct2(), win);
      expect(end.player.currentChapter).toBe('ending');
      expect(end.missions.act3?.beat).toBe(MENTOR_DONE);
      expect(end.missions.act3?.status).toBe('complete');
    }
  });
});

describe('the villains are an arrangement, not a person', () => {
  it('names three, and discovers all three at once', () => {
    let save = play(afterAct2(), byId('act3_1_the_ask'));
    save = play(save, byId('act3_2_three_names'));
    for (const target of ACT3_TARGETS) {
      expect(walletOf(save, target.walletId), `${target.walletId} not discovered`).toMatchObject({
        discovered: true,
        balance: target.balance,
      });
    }
  });

  /**
   * Skeleton decision 1, as a rule rather than a speech. Take one of them out
   * and the other two hire a replacement by Christmas, so the recon hub does
   * not offer an exit until all three strands are done.
   */
  it('will not let the player leave recon having researched two', () => {
    const hub = byId('act3_3_who_they_are').nodes.hub;
    const exitVisible = (flags: Record<string, boolean>) =>
      visibleChoices(hub, flags, []).some((c) => c.goto === 'ready');

    expect(exitVisible({})).toBe(false);
    expect(exitVisible({ act3_strand_sorrell: true })).toBe(false);
    expect(exitVisible({ act3_strand_sorrell: true, act3_strand_reyes: true })).toBe(false);
    expect(
      exitVisible({
        act3_strand_sorrell: true,
        act3_strand_reyes: true,
        act3_strand_merrow: true,
      }),
    ).toBe(true);
  });

  it('empties all three in the same minute, from one decision', () => {
    const node = allNodes().find((n) => n.redistribute)!;
    expect(node.redistribute!.walletIds).toEqual([
      SORRELL.walletId,
      REYES.walletId,
      MERROW.walletId,
    ]);
  });

  it('drains them without systems/heist.ts needing to know it was three', () => {
    let save = play(afterAct2(), byId('act3_1_the_ask'));
    save = play(save, byId('act3_2_three_names'));
    // Exactly what the panel does: one fraction, one `drain` call per wallet.
    for (const target of ACT3_TARGETS) {
      save = drain(save, { walletId: target.walletId, redistributeFraction: 0.5 });
    }
    expect(save.economy.villainWalletsDrained).toHaveLength(3);
    const total = ACT3_TARGETS.reduce((sum, t) => sum + t.balance, 0);
    const out = save.economy.villainWalletsDrained.reduce((sum, w) => sum + w.redistributed, 0);
    expect(out + save.economy.cashOnHand).toBe(total);
  });

  it('gives every target a clue that some strand actually writes', () => {
    const written = new Set(
      allNodes().flatMap((n) =>
        (n.effects ?? []).filter((e) => e.kind === 'wallet' && e.clue).map((e) => (e as { clue: string }).clue),
      ),
    );
    for (const target of ACT3_TARGETS) {
      for (const method of target.methods) {
        expect(written, `nothing writes ${method.requiresClue}`).toContain(method.requiresClue);
      }
    }
  });
});

describe('the writing rules the act has to keep', () => {
  const lines = allNodes().flatMap((n) => n.lines.map((l) => l.text + ' ' + (l.speaker ?? '')));

  /**
   * Style Guide 07: the mark closes on the big screen and no dialogue ever
   * explains it. Three acts of setup are spent if one character points at it.
   */
  it('never explains the Gen A mark', () => {
    for (const line of lines) {
      expect(line, `a line names the mark: ${line}`).not.toContain('Gen A');
      expect(line.toLowerCase()).not.toContain('anarchy');
    }
  });

  /**
   * Pillar 5: relief, not triumph. The reward was paid out in Act 2, in a car
   * park, when three people turned round to ask them to settle an argument.
   *
   * Scoped to spoken lines. Narration is allowed to observe that nobody thanks
   * them — that is the rule being stated, not broken — and the first version of
   * this test failed on exactly that sentence, which is the right kind of
   * pedantry to catch once and then aim properly.
   */
  it('never has a character thank the protagonist', () => {
    const spoken = allNodes()
      .flatMap((n) => n.lines)
      .filter((l) => l.speaker)
      .map((l) => l.text);
    const thanks = spoken.filter((l) => /thank(s| you)\b/i.test(l));
    expect(thanks, `somebody says thanks: ${thanks.join(' | ')}`).toEqual([]);
  });

  /** The verdict plays to an empty room and is never read out. */
  it('never reads the verdict aloud', () => {
    for (const line of lines) {
      expect(line.toLowerCase()).not.toContain('guilty');
    }
  });

  it('keeps the glitch rare in the finale too', () => {
    const all = allNodes().flatMap((n) => n.lines);
    expect(all.filter((l) => l.glitch).length / all.length).toBeLessThan(0.05);
  });

  /**
   * Decision 2. There is no scene where Sorrell is confronted and cracks, and
   * the temptation to write him one will come up every time this act is
   * touched. His statement is sincere and useless and that is the ending he
   * gets.
   */
  it('leaves Sorrell sincere and unconverted', () => {
    const aftermath = byId('act3_7_what_happens_next');
    const text = Object.values(aftermath.nodes)
      .flatMap((n) => n.lines.map((l) => l.text))
      .join(' ');
    expect(text).toContain('cannot see it');
    expect(text.toLowerCase()).not.toContain('apolog');
  });
});

describe('Nova', () => {
  it('is asked differently depending on Act 2, and says yes either way', () => {
    const door = byId('act3_1_the_ask').nodes.door;
    expect(visibleChoices(door, {}, [])[0].goto).toBe('clean');
    expect(visibleChoices(door, { used_nova_access: true }, [])[0].goto).toBe('owed');

    const flagVariants: Array<{ used_nova_access?: boolean }> = [{}, { used_nova_access: true }];
    for (const flags of flagVariants) {
      const save = play({ ...afterAct2(), player: { ...afterAct2().player, flags: { ...afterAct2().player.flags, ...flags } } }, byId('act3_1_the_ask'));
      expect(save.player.flags.nova_agreed).toBe(true);
    }
  });

  it('gives the player nothing to decide about her channel', () => {
    const after = byId('act3_8_nova_after');
    const choices = Object.values(after.nodes).flatMap((n) => n.choices ?? []);
    expect(choices).toEqual([]);
  });
});
