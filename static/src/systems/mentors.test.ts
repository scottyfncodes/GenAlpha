import { describe, expect, it } from 'vitest';
import {
  MENTOR_DONE,
  beatOf,
  isMentorComplete,
  progressOf,
  scenesOf,
  validateMentor,
  type MentorMission,
} from './mentors';
import { applyEffects } from './effects';
import { createNewSave } from '../state/defaults';
import type { Scene } from './scenes';

const locations = ['here'];

/** A minimal legal mission, so each test can break exactly one thing. */
function scene(beat: number, exit: number, extra: Partial<Scene> = {}): Scene {
  return {
    id: `s${beat}`,
    beat,
    locationId: 'here',
    hook: 'hook',
    language: 'B',
    requires: { mission: { id: 'deja', beat } },
    start: 'a',
    nodes: {
      a: {
        id: 'a',
        lines: [{ text: 'x' }],
        effects:
          exit === MENTOR_DONE
            ? [
                { kind: 'skill', skill: 'sabotage', unlocked: true, tier: 1 },
                { kind: 'beat', missionId: 'deja', beat: MENTOR_DONE, done: true },
              ]
            : [{ kind: 'beat', missionId: 'deja', beat: exit }],
        end: true,
      },
    },
    ...extra,
  };
}

function mission(scenes: Scene[]): MentorMission {
  return { id: 'deja', name: 'Deja', skill: 'sabotage', teaches: 'Sabotage', scenes };
}

const contact = scene(1, 2, {
  requires: { mission: { id: 'deja', beat: 1 } },
  nodes: {
    a: {
      id: 'a',
      lines: [{ text: 'x' }],
      effects: [
        { kind: 'trust', npcId: 'deja', delta: 2, metAt: 's1' },
        { kind: 'beat', missionId: 'deja', beat: 2 },
      ],
      end: true,
    },
  },
});

const legal = () => mission([contact, scene(2, 3), scene(3, 4), scene(4, MENTOR_DONE)]);

describe('validateMentor', () => {
  it('passes a mission that fills the template', () => {
    expect(validateMentor(legal(), locations)).toEqual([]);
  });

  it('catches a beat that nothing leads to', () => {
    const m = mission([contact, scene(2, 3), scene(4, MENTOR_DONE)]);
    expect(validateMentor(m, locations).join(' ')).toContain('beat 3 is reachable but has no scene');
  });

  it('catches a scene stranded on an unreachable beat', () => {
    const m = mission([contact, scene(2, MENTOR_DONE), scene(3, 4), scene(4, MENTOR_DONE)]);
    expect(validateMentor(m, locations).join(' ')).toContain('unreachable');
  });

  it('catches a mission with no way to finish', () => {
    const m = mission([contact, scene(2, 3), scene(3, 2)]);
    expect(validateMentor(m, locations).join(' ')).toContain('no path marks the mission done');
  });

  it('catches a scene that exits to its own beat', () => {
    const m = mission([contact, scene(2, 2), scene(3, 4), scene(4, MENTOR_DONE)]);
    expect(validateMentor(m, locations).join(' ')).toContain('infinite loop');
  });

  it('catches a Beat 1 that never opens the relationship', () => {
    const m = mission([scene(1, 2), scene(2, 3), scene(3, 4), scene(4, MENTOR_DONE)]);
    expect(validateMentor(m, locations).join(' ')).toContain('never writes relationships.deja.metAt');
  });

  it('catches a skill granted before the unlock beat', () => {
    const early = scene(2, 3);
    early.nodes.a.effects = [
      { kind: 'skill', skill: 'sabotage', unlocked: true },
      { kind: 'beat', missionId: 'deja', beat: 3 },
    ];
    const m = mission([contact, early, scene(3, 4), scene(4, MENTOR_DONE)]);
    expect(validateMentor(m, locations).join(' ')).toContain('grants the skill before Beat 4');
  });

  it('catches a mission that grants the wrong skill', () => {
    const m = legal();
    m.skill = 'hacking';
    expect(validateMentor(m, locations).join(' ')).toContain('grants "sabotage", not hacking');
  });

  it('catches done flags that disagree with the sentinel', () => {
    const wrong = scene(4, 5);
    wrong.nodes.a.effects = [
      { kind: 'skill', skill: 'sabotage', unlocked: true },
      { kind: 'beat', missionId: 'deja', beat: 5, done: true },
    ];
    const m = mission([contact, scene(2, 3), scene(3, 4), wrong]);
    expect(validateMentor(m, locations).join(' ')).toContain('done=true');
  });
});

describe('the cursor', () => {
  it('starts unstarted missions at beat 1', () => {
    const save = createNewSave('Wren');
    expect(beatOf(save, 'deja')).toBe(1);
    expect(isMentorComplete(save, 'deja')).toBe(false);
    expect(progressOf(save, legal()).beatName).toBe('Contact');
  });

  it('advances, and parks on the sentinel when the mission is done', () => {
    let save = createNewSave('Wren');
    save = applyEffects(save, [{ kind: 'beat', missionId: 'deja', beat: 3 }]);
    expect(beatOf(save, 'deja')).toBe(3);
    expect(save.missions.deja.status).toBe('in_progress');

    save = applyEffects(save, [{ kind: 'beat', missionId: 'deja', beat: MENTOR_DONE, done: true }]);
    expect(isMentorComplete(save, 'deja')).toBe(true);
    expect(progressOf(save, legal()).beatName).toBeUndefined();
  });
});

describe('scenesOf', () => {
  it('flattens every mission, branches included', () => {
    expect(scenesOf([legal()])).toHaveLength(4);
  });
});
