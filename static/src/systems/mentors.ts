import type { SaveState } from '../state/schema';
import type { Effect, Scene, SkillId } from './scenes';
import { validateScene } from './scenes';

/**
 * The four-beat mentor template (module 06) — the thing that replaces a party
 * system. Four characters, one shape, reskinned. This file is the runner; the
 * content that fills it lives in src/content/mentors/. There is deliberately
 * no per-mentor code path anywhere, the same way there's no per-mission code
 * path in trace.ts or sabotage.ts.
 *
 * Beats are scenes, run by the existing scene system rather than a second
 * dialogue engine. What makes them a *mission* rather than four loose scenes
 * is the cursor: `missions.<mentorId>.beat`, advanced by a `beat` effect on
 * each scene's terminal node, and read back by `Scene.requires.mission`.
 *
 *   1 Contact          writes relationships.<mentor>.metAt
 *   2 The Ask          a specific, in-character reason for gatekeeping
 *   3 The Trust Mission  reuses an existing system — never a bespoke mechanic
 *   4 The Unlock       writes the trust delta AND flips skills.<x>.unlocked
 *
 * Beats past 4 are legal and are how a mentor branches: Aaron's recovery path
 * runs 4 -> 5 -> 6 because failing his test must cost something without
 * locking the player out of hacking for the rest of the game.
 */

export type MentorId = 'deja' | 'files' | 'milo' | 'bishop';

export const BEAT_NAMES = ['Contact', 'The Ask', 'The Trust Mission', 'The Unlock'] as const;

/**
 * Where the cursor parks when a mentor mission finishes. A sentinel rather
 * than "one past the last beat", because the last beat isn't the same number
 * for every mentor — Aaron's recovery path runs two beats longer than the
 * template — and a finished mission landing on a number some other branch also
 * uses would silently re-offer that branch's scene. No scene may gate on this.
 */
export const MENTOR_DONE = 0;

export interface MentorMission {
  id: MentorId;
  /** Display name, for the crew readout and debug. */
  name: string;
  /** What Beat 4 grants. */
  skill: SkillId;
  /** Human label for the skill, e.g. "Sabotage". */
  teaches: string;
  /**
   * Every scene in this mission, including branch variants. Order is authoring
   * order only — what actually sequences them is each scene's beat gate.
   */
  scenes: Scene[];
}

/** The cursor. Unstarted missions sit at beat 1. */
export function beatOf(save: SaveState, id: MentorId): number {
  return save.missions[id]?.beat ?? 1;
}

export function isMentorComplete(save: SaveState, id: MentorId): boolean {
  return save.missions[id]?.status === 'complete';
}

export function isMentorStarted(save: SaveState, id: MentorId): boolean {
  return save.missions[id] !== undefined;
}

export interface MentorProgress {
  id: MentorId;
  name: string;
  beat: number;
  /** 1–4 while the template is running; undefined once it's done. */
  beatName?: string;
  started: boolean;
  complete: boolean;
  /** The skill is only real once Beat 4 has written it. */
  unlocked: boolean;
  trust: number;
}

export function progressOf(save: SaveState, mission: MentorMission): MentorProgress {
  const beat = beatOf(save, mission.id);
  const complete = isMentorComplete(save, mission.id);
  return {
    id: mission.id,
    name: mission.name,
    beat,
    beatName: complete ? undefined : BEAT_NAMES[beat - 1],
    started: isMentorStarted(save, mission.id),
    complete,
    unlocked: save.skills[mission.skill].unlocked,
    trust: save.relationships[mission.id]?.trust ?? 0,
  };
}

/** Every scene across every mentor, for the overworld's scene list. */
export function scenesOf(missions: MentorMission[]): Scene[] {
  return missions.flatMap((m) => m.scenes);
}

const effectsOf = (scene: Scene): Effect[] =>
  Object.values(scene.nodes).flatMap((n) => [
    ...(n.effects ?? []),
    ...(n.choices ?? []).flatMap((c) => c.effects ?? []),
  ]);

const beatEffects = (scene: Scene) =>
  effectsOf(scene).filter((e): e is Extract<Effect, { kind: 'beat' }> => e.kind === 'beat');

/**
 * Template invariants, checked by tests rather than trusted — the mentor
 * equivalent of `validateScene`, and for the same reason: these are all things
 * that are invisible when reading the content and fatal when playing it.
 *
 * The big one is reachability. Four mentors × four-plus branching beats is
 * exactly the shape where a beat number gets fat-fingered and a mission
 * silently dead-ends with the skill unreachable — which, since skills are the
 * whole progression system, is a soft game-over. So this walks the cursor.
 */
export function validateMentor(mission: MentorMission, locationIds: string[]): string[] {
  const problems: string[] = [];
  const tag = `mentor:${mission.id}`;

  for (const scene of mission.scenes) {
    problems.push(...validateScene(scene, locationIds));

    const gate = scene.requires?.mission;
    if (!gate) {
      problems.push(`${tag}: ${scene.id} is not gated on a mission beat`);
      continue;
    }
    if (gate.id !== mission.id) {
      problems.push(`${tag}: ${scene.id} is gated on mission "${gate.id}"`);
    }
    if (gate.beat === MENTOR_DONE) {
      problems.push(`${tag}: ${scene.id} gates on the done sentinel`);
    }
    for (const e of beatEffects(scene)) {
      if (e.missionId !== mission.id) {
        problems.push(`${tag}: ${scene.id} writes a beat on "${e.missionId}"`);
      }
      if (e.beat === gate.beat) {
        problems.push(`${tag}: ${scene.id} exits to its own beat ${e.beat} — infinite loop`);
      }
      if (Boolean(e.done) !== (e.beat === MENTOR_DONE)) {
        problems.push(`${tag}: ${scene.id} exits to beat ${e.beat} with done=${Boolean(e.done)}`);
      }
    }
  }

  // Beat 1 must open a relationship. This is the one thing every mentor does
  // identically, and the thing dialogue variants downstream depend on.
  const contact = mission.scenes.filter((s) => s.requires?.mission?.beat === 1);
  if (contact.length !== 1) {
    problems.push(`${tag}: expected exactly one Beat 1 scene, found ${contact.length}`);
  }
  const opensRelationship = contact.some((s) =>
    effectsOf(s).some((e) => e.kind === 'trust' && e.npcId === mission.id && e.metAt),
  );
  if (!opensRelationship) problems.push(`${tag}: Beat 1 never writes relationships.${mission.id}.metAt`);

  // Beat 4 is the unlock, and it's the only thing allowed to grant the skill.
  const grants = mission.scenes.flatMap((s) =>
    effectsOf(s)
      .filter((e): e is Extract<Effect, { kind: 'skill' }> => e.kind === 'skill')
      .map((e) => ({ scene: s, effect: e })),
  );
  if (!grants.length) problems.push(`${tag}: nothing grants ${mission.skill}`);
  for (const g of grants) {
    if (g.effect.skill !== mission.skill) {
      problems.push(`${tag}: ${g.scene.id} grants "${g.effect.skill}", not ${mission.skill}`);
    }
    if ((g.scene.requires?.mission?.beat ?? 0) < 4) {
      problems.push(`${tag}: ${g.scene.id} grants the skill before Beat 4`);
    }
  }

  problems.push(...walkBeats(mission));
  return problems;
}

/**
 * Follow the cursor from beat 1 the way the game will. Every beat reachable
 * from the start must have a scene; every scene must be reachable; and every
 * path must terminate in a scene that marks the mission done — which is what
 * proves the skill can actually be earned on the failure branch too, not just
 * the happy one.
 */
function walkBeats(mission: MentorMission): string[] {
  const problems: string[] = [];
  const tag = `mentor:${mission.id}`;

  /*
   * The cursor is not the only gate. A scene can also require story flags, and
   * a beat whose every scene is flag-gated is unofferable unless some earlier
   * scene actually writes one of those flags. A one-character typo in a flag
   * name parks the cursor forever with the skill unreachable — which, since
   * skills are the whole progression system, is a soft game-over, and it is
   * exactly what this walk exists to prevent. Following beat effects alone
   * could not see it.
   *
   * Flags gating the Beat 1 scene are treated as external prerequisites (Act 1
   * writes `resistance_hint_found`); reaching Beat 1 at all means they hold.
   */
  const contact = mission.scenes.find((s) => s.requires?.mission?.beat === 1);
  const available = new Set<string>(contact?.requires?.flags ?? []);
  const reached = new Set<number>([1]);
  const visitedScenes = new Set<string>();
  let terminated = false;

  const offerable = (scene: Scene) =>
    (scene.requires?.flags ?? []).every((f) => available.has(f));

  // Fixpoint rather than a single queue pass: a scene can become offerable
  // only after some other branch writes the flag it waits on, so the walk has
  // to be re-run until nothing new opens up.
  for (let pass = 0; pass < mission.scenes.length + 2; pass++) {
    let grew = false;
    for (const beat of [...reached]) {
      for (const scene of mission.scenes) {
        if (scene.requires?.mission?.beat !== beat) continue;
        if (!offerable(scene) || visitedScenes.has(scene.id)) continue;
        visitedScenes.add(scene.id);
        grew = true;
        for (const e of effectsOf(scene)) {
          if (e.kind === 'flag' && !available.has(e.key)) available.add(e.key);
        }
        for (const e of beatEffects(scene)) {
          if (e.beat === MENTOR_DONE) terminated = true;
          else if (!reached.has(e.beat)) reached.add(e.beat);
        }
      }
    }
    if (!grew) break;
  }

  for (const beat of reached) {
    const scenes = mission.scenes.filter((s) => s.requires?.mission?.beat === beat);
    if (!scenes.length) {
      problems.push(`${tag}: beat ${beat} is reachable but has no scene`);
    } else if (!scenes.some((s) => visitedScenes.has(s.id))) {
      const gates = [...new Set(scenes.flatMap((s) => s.requires?.flags ?? []))];
      problems.push(
        `${tag}: beat ${beat} is reachable but every scene on it is gated on flags nothing writes (${gates.join(', ')})`,
      );
    }
  }

  for (const scene of mission.scenes) {
    if (!visitedScenes.has(scene.id) && reached.has(scene.requires?.mission?.beat ?? -1)) continue;
    if (!visitedScenes.has(scene.id)) {
      problems.push(`${tag}: ${scene.id} sits on beat ${scene.requires?.mission?.beat} and is unreachable`);
    }
  }
  if (!terminated) problems.push(`${tag}: no path marks the mission done`);

  return problems;
}
