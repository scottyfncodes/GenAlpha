/**
 * Ambient life — the town isn't just the player and vans. Decorative, but not
 * physics-exempt: a person or a dog wanders a short line back and forth
 * around a fixed anchor, and that line is authored (and test-checked, see
 * `npcs.test.ts`) to stay clear of every building and solid obstacle the
 * player themselves can't walk through — `direction` is a hand-picked
 * heading, not a random one, precisely so it can be aimed down open ground.
 * A bird is the one exception: it flies, so it's never checked against
 * ground-level collision.
 *
 * Position is still computed fresh from `now` each frame, the same way
 * `drawPlayer`'s stride and `drawSparkle`'s twinkle already are, so there's
 * no per-entity mutable state to own or reset — reload the page and
 * everyone's just further along the same loop.
 */
import { mulberry32, seedFrom } from '../systems/rng';

export type NpcKind = 'person' | 'dog' | 'cat' | 'bird';

export interface Npc {
  id: string;
  kind: NpcKind;
  /** The anchor a wander loops around, not a literal position. */
  x: number;
  y: number;
  /** Heading in degrees (0 = east, 90 = south, screen convention) the
   * wander walks out along and back. Authored per-npc so it can be pointed
   * down open ground rather than picked at random and hoping. */
  direction: number;
  /** How far the loop strays from the anchor, in world px. */
  wanderRadius: number;
  /** One full there-and-back walk, in ms — varies per npc via seeded noise
   * in `wanderPos`, this is only the midpoint the noise perturbs. */
  periodMs: number;
}

export const NPCS: Npc[] = [
  // Downtown — the Crossroads and the school run, the busiest ambient life
  // in town, matching the district's own "lots of people" character.
  { id: 'npc_1', kind: 'person', x: 650, y: 350, direction: 0, wanderRadius: 26, periodMs: 7000 },
  { id: 'npc_2', kind: 'person', x: 700, y: 350, direction: 0, wanderRadius: 20, periodMs: 9000 },
  { id: 'npc_dog_1', kind: 'dog', x: 675, y: 355, direction: 0, wanderRadius: 12, periodMs: 4000 },
  { id: 'npc_3', kind: 'person', x: 650, y: 175, direction: 0, wanderRadius: 24, periodMs: 8000 },
  { id: 'npc_cat_1', kind: 'cat', x: 650, y: 340, direction: 0, wanderRadius: 10, periodMs: 5200 },
  { id: 'npc_bird_1', kind: 'bird', x: 650, y: 90, direction: 220, wanderRadius: 60, periodMs: 5000 },

  // Warehouse District — Fenwick Lot's own frontage and the Rail Spur strip,
  // sparser than Downtown, matching the district's quieter character.
  { id: 'npc_4', kind: 'person', x: 1300, y: 260, direction: 0, wanderRadius: 14, periodMs: 6500 },
  { id: 'npc_5', kind: 'person', x: 1400, y: 260, direction: 0, wanderRadius: 20, periodMs: 7500 },
  { id: 'npc_7', kind: 'person', x: 1238, y: 564, direction: 0, wanderRadius: 14, periodMs: 7800 },

  // Downtown, north — Library sidewalk.
  { id: 'npc_6', kind: 'person', x: 900, y: 165, direction: 0, wanderRadius: 18, periodMs: 8200 },

  // Riverside Park — Ballpark's own street, the park's connective open
  // ground.
  { id: 'npc_8', kind: 'person', x: 700, y: 620, direction: 0, wanderRadius: 24, periodMs: 9500 },
  { id: 'npc_11', kind: 'person', x: 900, y: 590, direction: 0, wanderRadius: 18, periodMs: 7200 },
  { id: 'npc_bird_4', kind: 'bird', x: 950, y: 550, direction: 90, wanderRadius: 55, periodMs: 4800 },

  // Residential North — the street outside Home and Ellen's.
  { id: 'npc_10', kind: 'person', x: 400, y: 500, direction: 0, wanderRadius: 24, periodMs: 8800 },
  { id: 'npc_dog_2', kind: 'dog', x: 100, y: 260, direction: 0, wanderRadius: 20, periodMs: 3600 },
  { id: 'npc_cat_2', kind: 'cat', x: 460, y: 260, direction: 0, wanderRadius: 9, periodMs: 4600 },

  // South Residential and Commercial Strip — the town's own southern half,
  // quiet but not empty.
  { id: 'npc_12', kind: 'person', x: 208, y: 900, direction: 0, wanderRadius: 16, periodMs: 7000 },
  { id: 'npc_13', kind: 'person', x: 800, y: 900, direction: 0, wanderRadius: 16, periodMs: 7400 },
  { id: 'npc_9', kind: 'person', x: 1350, y: 950, direction: 0, wanderRadius: 18, periodMs: 6800 },
  { id: 'npc_cat_3', kind: 'cat', x: 1450, y: 950, direction: 0, wanderRadius: 11, periodMs: 5800 },
  { id: 'npc_cat_4', kind: 'cat', x: 300, y: 830, direction: 0, wanderRadius: 10, periodMs: 5000 },
  { id: 'npc_bird_2', kind: 'bird', x: 850, y: 850, direction: 45, wanderRadius: 70, periodMs: 6000 },

  // A bird over the Warehouse District's own far reach, where nothing at
  // ground level cares.
  { id: 'npc_bird_3', kind: 'bird', x: 1500, y: 100, direction: 45, wanderRadius: 65, periodMs: 5600 },
];

/** Same seeded-noise technique `draw.ts`'s own `noise()` uses. */
function rand01(seed: string): number {
  return mulberry32(seedFrom(seed))();
}

/**
 * Where an npc actually is right now: a straight there-and-back walk along
 * its authored `direction`, out to `wanderRadius` and back, on a loop of
 * roughly `periodMs`. Deterministic and stateless — the same `now` always
 * gives the same position, so this needs no ref, no effect, and no reset on
 * reload.
 */
export function wanderPos(npc: Npc, now: number): { x: number; y: number; facing: 1 | -1 } {
  const angle = (npc.direction * Math.PI) / 180;
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
