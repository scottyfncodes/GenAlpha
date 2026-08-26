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
  /*
   * Authored per district rather than sprinkled, because "who is out on
   * this street and why" is half of what tells a player which block they
   * are standing in. Liberty Park is the busiest ground on the map and the
   * Civic Zone is the emptiest — nobody loiters outside City Hall — which
   * is the same gradient the camera table runs, read from the other end.
   */

  // 1. The Heights — a dog being walked, a cat on a wall, somebody coming
  // back from somewhere. Quiet, but not empty.
  { id: 'npc_dog_2', kind: 'dog', x: 100, y: 250, direction: 0, wanderRadius: 22, periodMs: 3600 },
  { id: 'npc_10', kind: 'person', x: 152, y: 336, direction: 0, wanderRadius: 26, periodMs: 8800 },
  { id: 'npc_cat_2', kind: 'cat', x: 440, y: 296, direction: 0, wanderRadius: 9, periodMs: 4600 },
  { id: 'npc_heights_1', kind: 'person', x: 340, y: 336, direction: 0, wanderRadius: 18, periodMs: 7600 },

  // 2. Main Street — the school run and the shopfronts, the busiest
  // pavement in town outside the park.
  { id: 'npc_1', kind: 'person', x: 620, y: 350, direction: 0, wanderRadius: 26, periodMs: 7000 },
  { id: 'npc_2', kind: 'person', x: 700, y: 350, direction: 0, wanderRadius: 20, periodMs: 9000 },
  { id: 'npc_dog_1', kind: 'dog', x: 668, y: 358, direction: 0, wanderRadius: 12, periodMs: 4000 },
  { id: 'npc_3', kind: 'person', x: 600, y: 174, direction: 0, wanderRadius: 24, periodMs: 8000 },
  { id: 'npc_6', kind: 'person', x: 900, y: 168, direction: 0, wanderRadius: 24, periodMs: 8200 },
  { id: 'npc_main_1', kind: 'person', x: 960, y: 300, direction: 0, wanderRadius: 20, periodMs: 7400 },
  { id: 'npc_cat_1', kind: 'cat', x: 866, y: 320, direction: 0, wanderRadius: 10, periodMs: 5200 },
  { id: 'npc_bird_1', kind: 'bird', x: 700, y: 90, direction: 220, wanderRadius: 60, periodMs: 5000 },

  // 3. Civic Zone — two people who work here and nobody who doesn't.
  { id: 'npc_civic_1', kind: 'person', x: 1290, y: 336, direction: 0, wanderRadius: 22, periodMs: 8600 },
  { id: 'npc_civic_2', kind: 'person', x: 1180, y: 196, direction: 0, wanderRadius: 16, periodMs: 6400 },

  // 4. Old Market — the strip's own trade: somebody outside the pawn shop,
  // somebody crossing to the diner, a cat that lives behind the bins.
  { id: 'npc_market_1', kind: 'person', x: 60, y: 496, direction: 0, wanderRadius: 22, periodMs: 7800 },
  { id: 'npc_market_2', kind: 'person', x: 240, y: 700, direction: 0, wanderRadius: 24, periodMs: 8400 },
  { id: 'npc_cat_5', kind: 'cat', x: 214, y: 660, direction: 0, wanderRadius: 10, periodMs: 5400 },

  // 5. Liberty Park — the most populated ground on the map, on purpose.
  // The commons is only a commons if somebody is on it.
  { id: 'npc_8', kind: 'person', x: 600, y: 700, direction: 0, wanderRadius: 26, periodMs: 9500 },
  { id: 'npc_11', kind: 'person', x: 900, y: 620, direction: 0, wanderRadius: 22, periodMs: 7200 },
  { id: 'npc_park_1', kind: 'person', x: 760, y: 636, direction: 0, wanderRadius: 24, periodMs: 8100 },
  { id: 'npc_park_2', kind: 'person', x: 528, y: 470, direction: 90, wanderRadius: 26, periodMs: 8900 },
  { id: 'npc_park_3', kind: 'person', x: 1068, y: 452, direction: 90, wanderRadius: 24, periodMs: 7700 },
  { id: 'npc_dog_3', kind: 'dog', x: 740, y: 656, direction: 0, wanderRadius: 20, periodMs: 3800 },
  { id: 'npc_bird_4', kind: 'bird', x: 880, y: 560, direction: 90, wanderRadius: 55, periodMs: 4800 },
  { id: 'npc_bird_5', kind: 'bird', x: 760, y: 470, direction: 20, wanderRadius: 48, periodMs: 5200 },

  // 6. The Works — workers, not passers-by, and fewer of them than any
  // district this size would have if anybody still had the contract.
  { id: 'npc_4', kind: 'person', x: 1300, y: 700, direction: 0, wanderRadius: 20, periodMs: 6500 },
  { id: 'npc_5', kind: 'person', x: 1348, y: 568, direction: 0, wanderRadius: 24, periodMs: 7500 },
  { id: 'npc_7', kind: 'person', x: 1420, y: 730, direction: 0, wanderRadius: 16, periodMs: 7800 },
  { id: 'npc_bird_3', kind: 'bird', x: 1480, y: 640, direction: 45, wanderRadius: 65, periodMs: 5600 },

  // 7. Southside — the whole district is people passing through.
  { id: 'npc_12', kind: 'person', x: 60, y: 976, direction: 0, wanderRadius: 24, periodMs: 7000 },
  { id: 'npc_south_1', kind: 'person', x: 130, y: 800, direction: 0, wanderRadius: 20, periodMs: 8300 },
  { id: 'npc_cat_4', kind: 'cat', x: 160, y: 1080, direction: 0, wanderRadius: 10, periodMs: 5000 },

  // 8. The Blocks — front steps and the kerb, which is where this
  // district's life actually happens.
  { id: 'npc_13', kind: 'person', x: 780, y: 976, direction: 0, wanderRadius: 22, periodMs: 7400 },
  { id: 'npc_blocks_1', kind: 'person', x: 600, y: 792, direction: 0, wanderRadius: 22, periodMs: 8000 },
  { id: 'npc_blocks_2', kind: 'person', x: 960, y: 792, direction: 0, wanderRadius: 20, periodMs: 6900 },
  { id: 'npc_bird_2', kind: 'bird', x: 850, y: 850, direction: 45, wanderRadius: 70, periodMs: 6000 },

  // 9. The Plaza — a car park with a crowd in it, which is the one crowd
  // in Bellhaven nobody has to explain being part of.
  { id: 'npc_9', kind: 'person', x: 1290, y: 976, direction: 90, wanderRadius: 22, periodMs: 6800 },
  { id: 'npc_plaza_1', kind: 'person', x: 1460, y: 976, direction: 0, wanderRadius: 24, periodMs: 7600 },
  { id: 'npc_plaza_2', kind: 'person', x: 1200, y: 812, direction: 0, wanderRadius: 20, periodMs: 8200 },
  { id: 'npc_cat_3', kind: 'cat', x: 1560, y: 1060, direction: 0, wanderRadius: 11, periodMs: 5800 },
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
