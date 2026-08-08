import type { AcquiredVia, SaveState, SkillsState, StoryFlags, ThresholdTier } from '../state/schema';
import type { SkinId } from '../content/skins';
import { atLeast } from './heat';

/**
 * The dialogue/scene system. Scenes are data (see src/content/act1.ts) — this
 * file is the runner. Adding Act 2 means adding content objects, never touching
 * a component, which is the whole point of keeping story out of the UI.
 */

export type SkillId = keyof SkillsState;

export type Effect =
  | { kind: 'flag'; key: string; value?: boolean | string | number }
  | {
      kind: 'heat';
      eventId: string;
      delta: number;
      log?: boolean;
      /**
       * ADDED in 0.5.0. An item that cancels this charge while it's active —
       * `clean_sim` against the AI-shortcut penalty (module 03). The charge is
       * cancelled, not reduced: the item's whole promise is that this
       * particular thing doesn't get logged against you.
       */
      mitigatedBy?: string;
    }
  | { kind: 'trust'; npcId: string; delta: number; metAt?: string }
  | { kind: 'chapter'; chapterId: string }
  /**
   * ADDED in 0.4.0 for the mentor template. The only way content grants a
   * skill — Beat 4 of a mentor mission and nothing else should emit this.
   */
  | {
      kind: 'skill';
      skill: SkillId;
      unlocked?: boolean;
      tier?: number;
      trustedMode?: boolean;
      /**
       * ADDED in 0.5.0. `skills.resistanceIntel.compromised` is, per the
       * schema's own cross-module rules, the single flag that flips Act 2 into
       * Act 3 — and until now nothing in the codebase could write it and
       * nothing read it. The betrayal beat sets this; every scene that offers
       * "trust the resistance" checks it (see `SceneRequires.compromised`).
       */
      compromised?: boolean;
    }
  /**
   * ADDED in 0.4.0. Advances `missions.<id>.beat`, which is the mentor
   * template's equivalent of a chapter advance: it's what closes the door
   * behind a scene so a reload can't re-enter it and re-charge its Heat. Acts
   * own the chapter; mentor missions run in player-chosen order and can't, so
   * they get their own per-mission cursor instead.
   */
  | { kind: 'beat'; missionId: string; beat: number; done?: boolean }
  /**
   * ADDED in 0.5.0 for the economy. Content is the only thing that knows where
   * money comes from in the fiction, so it's the only thing that grants it —
   * there is deliberately no wage, no salvage rate and no ambient income
   * anywhere in the systems layer.
   */
  | { kind: 'cash'; delta: number; reason?: string }
  | { kind: 'item'; itemId: string; quantity?: number; via?: AcquiredVia }
  /** Ambient town sentiment. Robin Hood writes this; so can story beats. */
  | { kind: 'townTrust'; delta: number }
  /**
   * Recon output. A wallet the player hasn't found doesn't exist to them, and
   * a clue is what opens a heist method — so discovery and clue-gathering are
   * authored, not derived from having walked past the right building.
   */
  | {
      kind: 'wallet';
      walletId: string;
      discover?: boolean;
      clue?: string;
      /** Only meaningful alongside `discover` — see heist.ts `discoverEffects`. */
      balance?: number;
      securityTier?: 'low' | 'medium' | 'high';
    }
  /**
   * Marks a mission as prepped. Generalises the hacking-before-sabotage
   * synergy `resolveRun` already grants (module 05's Tier 4 hook) to anything
   * else that counts as having done your homework — a bought intel tip opens
   * the same hidden casing detail a trace would have.
   */
  | { kind: 'prep'; missionId: string }
  /**
   * Establishes a safehouse. `world.safehouses` has been in the schema since
   * 0.1.0 with nothing able to write to it; this is the writer.
   */
  | { kind: 'safehouse'; id: string };

export interface SceneLine {
  /** Omitted for narration. */
  speaker?: string;
  text: string;
  /** Fires the shared glitch effect on this line. Use sparingly — it's an
   *  exception, not a texture (Style Guide 07). */
  glitch?: boolean;
  /**
   * ADDED in 0.4.0. Heat-reactive dialogue: the line only appears at this tier
   * or above. This is how module 06's cross-module hook lands — at `flagged`+ a
   * mentor won't meet at the usual spot — without a second copy of the scene,
   * and without ever blocking progress. A node must still read correctly with
   * every gated line removed.
   */
  minTier?: ThresholdTier;
  /** Inverse: the line drops away once Heat reaches this tier. */
  maxTier?: ThresholdTier;
}

export interface SceneChoice {
  text: string;
  goto?: string;
  effects?: Effect[];
  /** Choice is hidden unless this story flag is set. */
  requiresFlag?: string;
  /**
   * Choice is hidden unless ALL of these are set.
   *
   * ADDED in 0.6.0. `requiresFlag` names one, which is enough for a branch but
   * not for a gate — Act 3's recon hub only opens its exit once all three
   * strands are done, because the villains are an arrangement and taking two
   * of them out is not a thing the story permits. Scene-level `requires.flags`
   * already had this; choices should not be weaker than the scenes they sit in.
   */
  requiresAllFlags?: string[];
  /** Choice is hidden if this story flag is set. */
  hiddenIfFlag?: string;
  /**
   * ADDED in 0.5.0. Choice is hidden unless the item is in inventory — module
   * 03's forged ID, which "unlocks certain physical-world dialogue/access
   * options". Hidden rather than shown-and-disabled: a door you can't open
   * shouldn't advertise the key you didn't buy.
   */
  requiresItem?: string;
  /**
   * ADDED in 0.4.0. Shown on the button itself. A choice whose effects charge
   * Heat must set this — a briefing screen would be absurd around a line of
   * dialogue, but "always visible, always explained" still applies to an
   * elective cost (Heat System guardrail 2). Tests enforce the pairing.
   */
  cost?: string;
}

interface SceneMinigameBase {
  missionId: string;
  /** Shown on the briefing screen. */
  brief?: string;
  /**
   * ADDED in 0.4.0, and load-bearing for where the Heat comes from.
   *
   * `practice: true` — the scene owns the cost. The node carries its own heat
   * effect, the briefing previews exactly that, and no mission record is
   * written. Act 1's library dig is this: digging costs the same whether
   * you're good at it or not.
   *
   * Unset — a real run. The shared Heat table (module 02) owns the cost, the
   * briefing previews its range, and the result writes a mission record with
   * hardening, cooldown and prep. The node must NOT carry a heat effect, or
   * the player pays twice. `validateScene` checks both directions.
   */
  practice?: boolean;
  onWin: string;
  /** Where a burned trace or a maxed Alertness meter lands. */
  onFail: string;
  /**
   * Where backing out lands — pulling out of the Window, or banking a partial
   * trace and leaving. Defaults to `onFail`, which is right when the fiction
   * of failing covers both, and wrong whenever the fail node describes getting
   * caught: a player who walked away calmly should not read about a torch beam.
   * Author it separately when the two aren't the same story.
   */
  onAbort?: string;
}

export type SceneMinigame =
  | (SceneMinigameBase & { kind: 'hacking'; tier: 1 | 2 | 3 | 4; skinId: SkinId })
  /** Tier, skin and beats all come off the authored SabotageConfig. */
  | (SceneMinigameBase & { kind: 'sabotage' });

export interface SceneNode {
  id: string;
  lines: SceneLine[];
  effects?: Effect[];
  choices?: SceneChoice[];
  next?: string;
  /**
   * Hands off to a minigame, then routes on the result. A minigame node's
   * `effects` are held until the player accepts the briefing, so the Heat cost
   * is previewed and then charged on commit — never charged on arrival.
   */
  minigame?: SceneMinigame;
  /**
   * ADDED in 0.5.0. Hands off to the Robin Hood split (module 03). Like a
   * minigame node this is a handoff rather than dialogue, but unlike one it
   * cannot fail and cannot route — the money is already taken by the time this
   * renders, and the only question left is what happens to it. So it carries a
   * plain `next` and the walk passes straight through it.
   */
  redistribute?: {
    /**
     * One wallet, or several drained in the same minute (Act 3's coordinated
     * drain). Several is why this is a list: the Story Bible's climax empties
     * three at once so there is no window to move the money, and three sliders
     * in a row would turn the biggest decision in the game into paperwork.
     *
     * Note that `systems/heist.ts` needed no change to support this — `drain`
     * is still called once per wallet, exactly as designed. The composition is
     * a UI concern and stayed one.
     */
    walletIds: string[];
  };
  /**
   * Shows the Gen A mark, in whatever state the story has got it to.
   *
   * Exists for exactly one node in the game — the frame on the big screen at
   * Founders' Day — and is a node flag rather than a content-authored asset so
   * that no scene can accidentally show the wrong state. Style Guide 07 tracks
   * the mark as a design checklist item across three acts, not as a beat
   * anybody writes, and this keeps it that way.
   */
  showMark?: boolean;
  /**
   * Terminal node — closes the scene even if `next` is set. A node with no
   * `next`, no choices and no minigame is terminal implicitly; this is for
   * making that explicit when the routing would otherwise be ambiguous.
   */
  end?: boolean;
}

export interface Scene {
  id: string;
  beat: number;
  locationId: string;
  /** Shown on the interaction prompt. */
  hook: string;
  /** Language the scene chrome renders in. */
  language: 'A' | 'B';
  requires?: SceneRequires;
  start: string;
  nodes: Record<string, SceneNode>;
}

export interface SceneRequires {
  chapter?: string;
  flags?: string[];
  /**
   * ADDED in 0.4.0. The mentor template's gate: this mission's cursor must be
   * sitting on this beat. Acts advance a single global chapter; mentor
   * missions run four at a time in whatever order the player picks, so each
   * carries its own.
   */
  mission?: { id: string; beat: number };
  /**
   * Module 06's one sequencing rule, expressed as a number rather than a
   * hardcoded list of mentors: Bishop comes after at least two others, so the
   * player has a functioning crew for the betrayal to cost them. Counted off
   * `skills`, so this file never needs to know who the mentors are.
   */
  mentorSkills?: number;
  /**
   * ADDED in 0.5.0. The resistance-intel stance this scene is written for.
   *
   * `false` — pre-betrayal. The scene trusts the adult resistance and must
   * stop being offered the moment that stops being true, or the player walks
   * into a scene about people who are on their side immediately after finding
   * out they aren't.
   * `true` — post-betrayal only.
   * Omitted — the scene reads correctly either way, which most won't.
   *
   * This is the mechanism the Act 2 content pass needs. It is deliberately
   * built and tested with no Act 2 content behind it yet.
   */
  compromised?: boolean;
  /**
   * ADDED in 0.5.0. Heat tier floor. Module 02's `hunted` tier is meant to
   * trigger a forced story beat rather than a punishment screen, and a scene
   * that only exists above a tier is how that lands — the beat simply appears
   * at the location, as an open thread, like everything else in the game.
   */
  minTier?: ThresholdTier;
}

export const completionFlag = (sceneId: string) => `scene:${sceneId}`;

/** Total Heat a node's own effects will apply — what the briefing must show. */
export function heatCostOf(node: SceneNode): number {
  return (node.effects ?? [])
    .filter((e): e is Extract<Effect, { kind: 'heat' }> => e.kind === 'heat')
    .reduce((sum, e) => sum + e.delta, 0);
}

/**
 * Choices the player can actually be shown, given their story flags and what
 * they're carrying. `items` is passed in rather than read off a save so this
 * stays usable from the reachability walk, which explores states no inventory
 * belongs to.
 */
export function visibleChoices(node: SceneNode, flags: StoryFlags, items: string[] = []): SceneChoice[] {
  return (node.choices ?? []).filter((c) => {
    if (c.requiresFlag && !flags[c.requiresFlag]) return false;
    if (c.requiresAllFlags && !c.requiresAllFlags.every((f) => flags[f])) return false;
    if (c.hiddenIfFlag && flags[c.hiddenIfFlag]) return false;
    if (c.requiresItem && !items.includes(c.requiresItem)) return false;
    return true;
  });
}

export function isComplete(flags: StoryFlags, sceneId: string): boolean {
  return Boolean(flags[completionFlag(sceneId)]);
}

/** Lines the player actually sees, after Heat-reactive variants are resolved. */
export function visibleLines(node: SceneNode, tier: ThresholdTier): SceneLine[] {
  return node.lines.filter((l) => {
    if (l.minTier && !atLeast(tier, l.minTier)) return false;
    if (l.maxTier && atLeast(tier, l.maxTier)) return false;
    return true;
  });
}

/** How many mentor skills the player has actually earned. */
function mentorSkillCount(save: SaveState): number {
  return Object.values(save.skills).filter((s) => s.unlocked).length;
}

/**
 * Every gate a scene can carry, in one place. Both the "what's here" and
 * "what's next" queries run through this, so they can never drift apart —
 * which they were already one gate away from doing.
 */
export function offered(save: SaveState, scene: Scene): boolean {
  const r = scene.requires;
  if (isComplete(save.player.flags, scene.id)) return false;
  if (!r) return true;
  if (r.chapter && save.player.currentChapter !== r.chapter) return false;
  if (r.flags?.some((f) => !save.player.flags[f])) return false;
  if (r.mission && (save.missions[r.mission.id]?.beat ?? 1) !== r.mission.beat) return false;
  if (r.mentorSkills && mentorSkillCount(save) < r.mentorSkills) return false;
  if (r.compromised !== undefined && save.skills.resistanceIntel.compromised !== r.compromised) {
    return false;
  }
  if (r.minTier && !atLeast(save.heat.threshold_tier, r.minTier)) return false;
  return true;
}

/**
 * Every scene this location is currently offering.
 *
 * More than one is normal and expected: two mentors can seed their Contact in
 * the same place, and by Act 2 four threads are open at once. The overworld
 * must show all of them and let the player choose, because module 06's whole
 * sequencing rule is that mentor order is player-directed except for Bishop.
 */
export function scenesAt(save: SaveState, scenes: Scene[], locationId: string): Scene[] {
  return scenes.filter((s) => s.locationId === locationId && offered(save, s));
}

/**
 * The first scene a location is offering, for callers that genuinely want one.
 *
 * Do NOT use this to decide what the player can reach. It silently drops every
 * other thread at the same location — which is how Files' Contact, seeded at
 * school alongside Deja's, became unreachable until Deja's was finished, and
 * turned a content-pacing suggestion into a hard gate nobody authored.
 */
export function sceneAt(save: SaveState, scenes: Scene[], locationId: string): Scene | null {
  return scenesAt(save, scenes, locationId)[0] ?? null;
}

/** Every thread currently open. Act 1 has one; Act 2 has up to four at once. */
export function pendingScenes(save: SaveState, scenes: Scene[]): Scene[] {
  return scenes.filter((s) => offered(save, s));
}

/**
 * A terminal node has to move the state its own scene is gated on, or the
 * scene stays offered and a reload walks back into it. Act content moves the
 * chapter; mentor content moves its mission's beat cursor. Either closes the
 * door — nothing else does, and the completion flag is written after the last
 * node, which is exactly too late to help.
 */
function closesDoor(node: SceneNode): boolean {
  return (node.effects ?? []).some((e) => e.kind === 'chapter' || e.kind === 'beat');
}

/**
 * Authoring invariants, checked by tests rather than trusted.
 *
 * Scene effects fire on node ENTRY, before the player reads the lines. That is
 * deliberate — it keeps a scene's consequences from depending on whether the
 * player sat through the last paragraph — but it means a node can commit Heat
 * and then be re-entered after a reload if nothing closed the door behind it.
 * Nothing in the type system enforces that, so this does.
 */
export function validateScene(scene: Scene, locationIds: string[]): string[] {
  const problems: string[] = [];
  const ids = new Set(Object.keys(scene.nodes));
  const at = (n: string) => `${scene.id}.${n}`;

  if (!locationIds.includes(scene.locationId)) {
    problems.push(`${scene.id}: unknown location "${scene.locationId}"`);
  }
  if (!ids.has(scene.start)) problems.push(`${scene.id}: start node "${scene.start}" is missing`);

  for (const [key, node] of Object.entries(scene.nodes)) {
    if (node.id !== key) problems.push(`${at(key)}: node id is "${node.id}"`);
    if (node.next && !ids.has(node.next)) problems.push(`${at(key)}: next -> "${node.next}" missing`);
    for (const c of node.choices ?? []) {
      if (c.goto && !ids.has(c.goto)) problems.push(`${at(key)}: goto -> "${c.goto}" missing`);
      // An elective Heat cost has to be on the button. A choice is the one
      // place content can charge the player without a briefing in the way.
      if ((c.effects ?? []).some((e) => e.kind === 'heat') && !c.cost) {
        problems.push(`${at(key)}: choice "${c.text}" charges Heat with no cost shown`);
      }
    }
    if (node.minigame) {
      const routes = [node.minigame.onWin, node.minigame.onFail, node.minigame.onAbort];
      for (const t of routes.filter((x): x is string => Boolean(x))) {
        if (!ids.has(t)) problems.push(`${at(key)}: minigame -> "${t}" missing`);
      }
      // Exactly one owner of the Heat cost — the scene or the mission table.
      const ownsHeat = heatCostOf(node) !== 0;
      if (node.minigame.practice && !ownsHeat) {
        problems.push(`${at(key)}: practice run charges nothing — the scene must own the cost`);
      }
      if (!node.minigame.practice && ownsHeat) {
        problems.push(`${at(key)}: real run also carries a heat effect — that charges twice`);
      }
    }
    // A node whose every line is Heat-gated renders empty at the wrong tier.
    if (node.lines.length > 0 && node.lines.every((l) => l.minTier || l.maxTier)) {
      problems.push(`${at(key)}: every line is tier-gated — this node can render empty`);
    }
    const terminal = !node.end
      ? !node.next && !node.choices?.length && !node.minigame
      : true;
    if (terminal && !closesDoor(node)) {
      problems.push(`${at(key)}: terminal node advances neither the chapter nor a mission beat`);
    }
  }

  // Reachability from start.
  const seen = new Set([scene.start]);
  const queue = [scene.start];
  while (queue.length) {
    const node = scene.nodes[queue.shift()!];
    if (!node) continue;
    const outs = [
      node.next,
      ...(node.choices ?? []).map((c) => c.goto),
      node.minigame?.onWin,
      node.minigame?.onFail,
      node.minigame?.onAbort,
    ].filter((x): x is string => Boolean(x));
    for (const o of outs) if (!seen.has(o)) (seen.add(o), queue.push(o));
  }
  for (const id of ids) if (!seen.has(id)) problems.push(`${at(id)}: unreachable`);

  return problems;
}

/** Substitutes the player's chosen name into authored copy. */
export function render(text: string, save: SaveState): string {
  return text.replace(/\{name\}/g, save.player.name);
}
