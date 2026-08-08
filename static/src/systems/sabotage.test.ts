import { describe, expect, it } from 'vitest';
import { buildSabotageConfig, SABOTAGE_MISSIONS } from '../content/sabotage';
import { choose, createSabotage, examine, hesitate, openWindow, optionsFor, unreachableBeats } from './sabotage';

const build = (missionId: string, over = {}) =>
  buildSabotageConfig({ missionId, heatTier: 'clear', ...over });

describe('authored missions', () => {
  it.each(Object.keys(SABOTAGE_MISSIONS))(
    '%s gives every beat a move that needs no casing and no tool',
    (id: string) => {
      expect(unreachableBeats(SABOTAGE_MISSIONS[id])).toEqual([]);
    },
  );

  it('hides the prep-gated casing detail until a trace has been run', () => {
    const cold = createSabotage(build('annex_side_door', { prepped: false }));
    const warm = createSabotage(build('annex_side_door', { prepped: true }));
    const count = (s: typeof cold) =>
      s.config.casingDetails.filter((d) => !d.hiddenUnlessPrepped || s.config.prepped).length;
    expect(count(warm)).toBe(count(cold) + 1);
  });
});

describe('the window', () => {
  it('running out of the clock never picks an option the player could not have', () => {
    // No casing, no tools: the only reachable options are the blind ones.
    let s = openWindow(createSabotage(build('annex_side_door')));
    const reachable = optionsFor(s, []).map((o) => o.id);
    s = hesitate(s, []);
    // The forced choice must be one of the options that were actually offered.
    const taken = SABOTAGE_MISSIONS.annex_side_door.windowBeats[0].options.find(
      (o) => o.outcome === s.log[0],
    );
    expect(taken).toBeDefined();
    expect(reachable).toContain(taken!.id);
  });

  it('casing turns a beat from blind into prepared', () => {
    let s = createSabotage(build('annex_side_door'));
    expect(optionsFor(openWindow(s), []).every((o) => o.risk >= 4)).toBe(true);
    s = examine(s, 'patrol');
    expect(optionsFor(openWindow(s), []).some((o) => o.risk <= 1)).toBe(true);
  });

  it('fails soft — spotted resolves the mission, it never ends the run', () => {
    let s = openWindow(createSabotage(build('annex_side_door')));
    while (s.status === 'active' && s.phase === 'window') {
      const blind = [...optionsFor(s, [])].sort((a, b) => b.risk - a.risk)[0];
      s = choose(s, blind.id);
    }
    expect(s.status).toBe('spotted');
    expect(s.phase).toBe('resolved');
  });

  it('a tool neutralises a beat and is recorded as spent', () => {
    let s = openWindow(createSabotage(build('annex_side_door')));
    const jam = optionsFor(s, ['signal_jammer']).find((o) => o.requiresTool);
    expect(jam).toBeDefined();
    s = choose(s, jam!.id);
    expect(s.alertness).toBe(0);
    expect(s.toolsUsed).toEqual(['signal_jammer']);
  });
});
