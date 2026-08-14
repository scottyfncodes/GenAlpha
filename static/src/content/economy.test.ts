import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../world/locations';
import { createNewSave } from '../state/defaults';
import type { SaveState } from '../state/schema';
import { applyEffects } from '../systems/effects';
import { completionFlag, offered, validateScene, visibleChoices, type Scene } from '../systems/scenes';
import { MENTOR_DONE } from '../systems/mentors';
import { walletOf } from '../systems/heist';
import { owns, quantityOf } from '../systems/market';
import { MARKET_SCENES, STARTING_TIN, MARKET_ACCESS_FLAG } from './market';
import { HEIST_SCENES, HELIO_INTERCEPT, HELIO_OPS } from './heist';
import { ITEMS_BY_ID, INTEL_TIP } from './economy';

const locationIds = LOCATIONS.map((l) => l.id);
const ECONOMY_SCENES = [...MARKET_SCENES, ...HEIST_SCENES];

/** Act 1 done and all four mentors earned — where the heist opens. */
function afterTheCrew(): SaveState {
  const save = createNewSave('Wren');
  return applyEffects(save, [
    { kind: 'flag', key: 'resistance_hint_found' },
    { kind: 'flag', key: 'safety_grant_known' },
    { kind: 'chapter', chapterId: 'act1_complete' },
    { kind: 'skill', skill: 'sabotage', unlocked: true, tier: 1 },
    { kind: 'skill', skill: 'hacking', unlocked: true, tier: 1 },
    { kind: 'skill', skill: 'aiToolAccess', unlocked: true },
    { kind: 'skill', skill: 'resistanceIntel', unlocked: true },
  ]);
}

/** Walks a scene, taking the first visible choice whose text matches. */
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
      // The panel owns the split; the walk only proves the scene routes past it.
      id = node.next!;
      continue;
    }
    if (node.end) break;

    const choices = visibleChoices(
      node,
      s.player.flags,
      s.economy.inventory.map((i) => i.itemId),
    );
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

describe('economy content is well formed', () => {
  it.each(ECONOMY_SCENES.map((s) => [s.id, s] as const))('%s validates', (_id, scene) => {
    expect(validateScene(scene, locationIds)).toEqual([]);
  });

  it('gives every scene a distinct id', () => {
    const ids = ECONOMY_SCENES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /*
   * The heist's execution nodes hand off to two mission ids, and the sabotage
   * one has to exist in the registry or the minigame renders against
   * undefined. Cheap to check, invisible by reading.
   */
  it('points its sabotage handoff at a real authored mission', () => {
    expect(HELIO_OPS.methods.find((m) => m.kind === 'sabotage')?.missionId).toBe(
      HELIO_INTERCEPT.missionId,
    );
  });

  it('keeps the whole economy out of Act 1', () => {
    const fresh = createNewSave('Wren');
    expect(ECONOMY_SCENES.filter((s) => offered(fresh, s))).toEqual([]);
  });

  it('opens the heist only once all four mentors are done', () => {
    const halfway = applyEffects(createNewSave('Wren'), [
      { kind: 'flag', key: 'resistance_hint_found' },
      { kind: 'flag', key: 'safety_grant_known' },
      { kind: 'skill', skill: 'sabotage', unlocked: true },
      { kind: 'skill', skill: 'hacking', unlocked: true },
    ]);
    expect(HEIST_SCENES.filter((s) => offered(halfway, s))).toEqual([]);
    expect(HEIST_SCENES.filter((s) => offered(afterTheCrew(), s)).map((s) => s.id)).toEqual([
      'heist_1_the_number',
    ]);
  });
});

describe('the market opens', () => {
  const opening = MARKET_SCENES[0];

  it('hands over the tin exactly once', () => {
    const after = play(applyEffects(createNewSave('Wren'), [{ kind: 'flag', key: 'resistance_hint_found' }]), opening);
    expect(after.economy.cashOnHand).toBe(STARTING_TIN);
    expect(after.player.flags[MARKET_ACCESS_FLAG]).toBe(true);
  });

  /**
   * The one that matters, and the reason this scene gates on a mission cursor
   * rather than a chapter. Node effects fire on entry and the completion flag
   * lands at the end, so without a door that closes on entry a reload
   * mid-scene is an infinite supply of money.
   */
  it('closes the door on entry, so a reload can’t re-run the tin', () => {
    const started = applyEffects(createNewSave('Wren'), [{ kind: 'flag', key: 'resistance_hint_found' }]);
    const after = play(started, opening);
    expect(after.missions.market?.beat).toBe(MENTOR_DONE);
    expect(offered(after, opening)).toBe(false);
    // Even with the completion flag stripped, as a mid-scene reload would be.
    const reloaded = { ...after, player: { ...after.player, flags: { ...after.player.flags, [completionFlag(opening.id)]: false } } };
    expect(offered(reloaded, opening)).toBe(false);
  });

  it('leaves the market shut until the player has been shown it', () => {
    const fresh = createNewSave('Wren');
    const lot = LOCATIONS.find((l) => l.id === 'fenwick_lot');
    expect(lot?.marketFlag).toBe(MARKET_ACCESS_FLAG);
    expect(fresh.player.flags[MARKET_ACCESS_FLAG]).toBeUndefined();
  });
});

describe('the heist, played through', () => {
  it('discovers the wallet on the recon beat', () => {
    const after = play(afterTheCrew(), HEIST_SCENES[0]);
    expect(walletOf(after, HELIO_OPS.walletId)).toMatchObject({
      discovered: true,
      balance: HELIO_OPS.balance,
    });
    expect(after.missions.helio_heist?.beat).toBe(2);
  });

  /**
   * The no-money path. A player who has bought nothing must still be able to
   * open an approach, or the economy has quietly become a paywall on the story
   * — which module 03 never asks for and the game's whole shape forbids.
   */
  it('opens a route with no purchases at all', () => {
    let save = play(afterTheCrew(), HEIST_SCENES[0]);
    expect(save.economy.cashOnHand).toBe(0);
    save = play(save, HEIST_SCENES[1], ['Watch what comes', 'You know enough']);
    expect(walletOf(save, HELIO_OPS.walletId)?.clues).toContain('delivery');

    const choose = HEIST_SCENES[2].nodes.choose;
    const open = visibleChoices(choose, save.player.flags, []);
    expect(open.map((c) => c.text)).toContain('Thursday, the grey case.');
  });

  it('turns a bought tip into the hidden casing detail', () => {
    let save = play(afterTheCrew(), HEIST_SCENES[0]);
    save = applyEffects(save, [{ kind: 'item', itemId: INTEL_TIP, via: 'purchase' }]);
    expect(quantityOf(save, INTEL_TIP)).toBe(1);

    save = play(save, HEIST_SCENES[1], ['Ask Ines', 'You know enough']);
    expect(walletOf(save, HELIO_OPS.walletId)?.clues).toContain('backup');
    // Module 05's Tier 4 hook, reached by homework somebody else did.
    expect(save.missions[HELIO_INTERCEPT.missionId]?.prepped).toBe(true);
  });

  it('hides the tip option from a player carrying no tip', () => {
    const save = play(afterTheCrew(), HEIST_SCENES[0]);
    const hub = HEIST_SCENES[1].nodes.hub;
    expect(owns(save, INTEL_TIP)).toBe(false);
    expect(visibleChoices(hub, save.player.flags, []).map((c) => c.text)).not.toContain(
      'Ask Ines whether anyone’s selling on TraceBook.',
    );
  });

  it('reaches the split on a win and marks the heist done after it', () => {
    let save = play(afterTheCrew(), HEIST_SCENES[0]);
    save = play(save, HEIST_SCENES[1], ['Watch what comes', 'You know enough']);
    save = play(save, HEIST_SCENES[2], ['Thursday, the grey case'], true);
    expect(save.missions.helio_heist?.beat).toBe(MENTOR_DONE);
    expect(save.missions.helio_heist?.status).toBe('complete');
  });

  /** Failure is never a wall — module 02 allows no hard fail state anywhere. */
  it('sends a failed attempt to a second pass rather than nowhere', () => {
    let save = play(afterTheCrew(), HEIST_SCENES[0]);
    save = play(save, HEIST_SCENES[1], ['Watch what comes', 'You know enough']);
    save = play(save, HEIST_SCENES[2], ['Thursday, the grey case'], false);
    expect(save.missions.helio_heist?.beat).toBe(5);
    expect(offered(save, HEIST_SCENES[3])).toBe(true);

    const second = play(save, HEIST_SCENES[3], ['Thursday, the grey case'], false);
    expect(second.missions.helio_heist?.beat).toBe(MENTOR_DONE);
  });

  it('keeps the intel tip consumable, so the shortcut is spent not owned', () => {
    expect(ITEMS_BY_ID[INTEL_TIP].consumable).toBe(true);
  });
});
