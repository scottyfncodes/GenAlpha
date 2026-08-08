import { describe, expect, it } from 'vitest';
import { ACT1_SCENES } from './act1';
import { LOCATIONS } from '../world/locations';
import { validateScene, type Effect, type Scene } from '../systems/scenes';

const locationIds = LOCATIONS.map((l) => l.id);
const allEffects = (): Effect[] =>
  ACT1_SCENES.flatMap((s) =>
    Object.values(s.nodes).flatMap((n) => [
      ...(n.effects ?? []),
      ...(n.choices ?? []).flatMap((c) => c.effects ?? []),
    ]),
  );

describe('Act 1 structure', () => {
  it.each(ACT1_SCENES.map((s) => [s.id, s] as const))('%s is well formed', (_id: string, scene: Scene) => {
    expect(validateScene(scene, locationIds)).toEqual([]);
  });

  it('chains every beat from the opening to act1_complete with no orphans', () => {
    const visited: string[] = [];
    let chapter = 'act1_glitch_01';
    for (let i = 0; i < ACT1_SCENES.length + 2; i++) {
      const scene = ACT1_SCENES.find((s) => s.requires?.chapter === chapter);
      if (!scene) break;
      visited.push(scene.id);
      const advances = Object.values(scene.nodes)
        .flatMap((n) => n.effects ?? [])
        .filter((e): e is Extract<Effect, { kind: 'chapter' }> => e.kind === 'chapter');
      expect(advances.length, `${scene.id} has no chapter exit`).toBeGreaterThan(0);
      chapter = advances[advances.length - 1].chapterId;
    }
    expect(chapter).toBe('act1_complete');
    expect(visited).toHaveLength(ACT1_SCENES.length);
  });
});

describe('Act 1 system touches', () => {
  /** Content skeleton: "Heat should sit around 10-15 by end of Act 1". */
  it('lands Heat inside the close condition', () => {
    const total = allEffects()
      .filter((e): e is Extract<Effect, { kind: 'heat' }> => e.kind === 'heat')
      .reduce((sum, e) => sum + e.delta, 0);
    expect(total).toBeGreaterThanOrEqual(10);
    expect(total).toBeLessThanOrEqual(15);
  });

  it('writes the flags the skeleton names', () => {
    const flags = allEffects()
      .filter((e): e is Extract<Effect, { kind: 'flag' }> => e.kind === 'flag')
      .map((e) => e.key);
    for (const required of ['casey_missing_noticed', 'nova_channel_seen', 'resistance_hint_found']) {
      expect(flags).toContain(required);
    }
  });

  it('gives Nova the +10 from beat 5 and nothing else', () => {
    const trust = allEffects().filter(
      (e): e is Extract<Effect, { kind: 'trust' }> => e.kind === 'trust',
    );
    expect(trust).toEqual([{ kind: 'trust', npcId: 'nova', delta: 10 }]);
  });

  it('keeps the glitch rare — it is an exception, not a texture', () => {
    const lines = ACT1_SCENES.flatMap((s) => Object.values(s.nodes).flatMap((n) => n.lines));
    const glitched = lines.filter((l) => l.glitch).length;
    expect(glitched).toBeGreaterThan(0);
    expect(glitched / lines.length).toBeLessThan(0.05);
  });
});
