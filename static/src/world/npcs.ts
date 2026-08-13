/**
 * Ambient life — the town isn't just the player and vans. Purely decorative:
 * no collision, no interaction, no save state. A person or animal wanders a
 * short line back and forth around a fixed anchor point, computed fresh from
 * `now` each frame the same way `drawPlayer`'s stride and `drawSparkle`'s
 * twinkle already are, so there's no per-entity mutable state to own or
 * reset — reload the page and everyone's just further along the same loop.
 */
import { mulberry32, seedFrom } from '../systems/rng';

export type NpcKind = 'person' | 'dog' | 'bird';

export interface Npc {
  id: string;
  kind: NpcKind;
  /** The anchor a wander loops around, not a literal position. */
  x: number;
  y: number;
  /** How far the loop strays from the anchor, in world px. */
  wanderRadius: number;
  /** One full there-and-back walk, in ms — varies per npc via seeded noise
   * in `wanderPos`, this is only the midpoint the noise perturbs. */
  periodMs: number;
}

export const NPCS: Npc[] = [
  // Near the town square — the one place in Language A that's actually
  // meant to have people milling around it.
  { id: 'npc_1', kind: 'person', x: 560, y: 320, wanderRadius: 36, periodMs: 7000 },
  { id: 'npc_2', kind: 'person', x: 640, y: 400, wanderRadius: 28, periodMs: 9000 },
  { id: 'npc_dog_1', kind: 'dog', x: 610, y: 410, wanderRadius: 44, periodMs: 4000 },

  // School crossing, sidewalk chatter.
  { id: 'npc_3', kind: 'person', x: 600, y: 180, wanderRadius: 30, periodMs: 8000 },
  { id: 'npc_bird_1', kind: 'bird', x: 650, y: 60, wanderRadius: 60, periodMs: 5000 },

  // Sal's / the Annex strip up top.
  { id: 'npc_4', kind: 'person', x: 790, y: 118, wanderRadius: 26, periodMs: 6500 },
  { id: 'npc_5', kind: 'person', x: 900, y: 130, wanderRadius: 32, periodMs: 7500 },

  // Library sidewalk.
  { id: 'npc_6', kind: 'person', x: 700, y: 320, wanderRadius: 30, periodMs: 8200 },

  // The Annex / Repair Shop block.
  { id: 'npc_7', kind: 'person', x: 1080, y: 300, wanderRadius: 28, periodMs: 7800 },

  // Ballpark and the Arcade, south side.
  { id: 'npc_8', kind: 'person', x: 400, y: 460, wanderRadius: 34, periodMs: 9500 },
  { id: 'npc_9', kind: 'person', x: 260, y: 460, wanderRadius: 26, periodMs: 6800 },
  { id: 'npc_bird_2', kind: 'bird', x: 450, y: 470, wanderRadius: 70, periodMs: 6000 },

  // Residential streets around Home / Ellen's / Casey's.
  { id: 'npc_10', kind: 'person', x: 150, y: 260, wanderRadius: 30, periodMs: 8800 },
  { id: 'npc_dog_2', kind: 'dog', x: 90, y: 420, wanderRadius: 40, periodMs: 3600 },

  // The Treehouse strip, quiet but not empty.
  { id: 'npc_11', kind: 'person', x: 1180, y: 140, wanderRadius: 24, periodMs: 7200 },
];

/** Same seeded-noise technique `draw.ts`'s own `noise()` uses. */
function rand01(seed: string): number {
  return mulberry32(seedFrom(seed))();
}

/**
 * Where an npc actually is right now: a straight there-and-back walk along
 * one fixed direction (picked once, per-id, via seeded noise) out to
 * `wanderRadius` and back, on a loop of roughly `periodMs`. Deterministic
 * and stateless — the same `now` always gives the same position, so this
 * needs no ref, no effect, and no reset on reload.
 */
export function wanderPos(npc: Npc, now: number): { x: number; y: number; facing: 1 | -1 } {
  const angle = rand01(`angle:${npc.id}`) * Math.PI * 2;
  const jitter = 0.7 + rand01(`period:${npc.id}`) * 0.6; // 0.7x - 1.3x the base period
  const period = npc.periodMs * jitter;
  const t = (now % (period * 2)) / period; // 0..2
  const progress = t <= 1 ? t : 2 - t; // triangle wave, 0 -> 1 -> 0
  const facing: 1 | -1 = t <= 1 ? 1 : -1;

  return {
    x: npc.x + Math.cos(angle) * npc.wanderRadius * progress,
    y: npc.y + Math.sin(angle) * npc.wanderRadius * progress,
    facing,
  };
}
