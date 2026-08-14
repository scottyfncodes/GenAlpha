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
  // Just south of the town square — the square's own rectangle is solid
  // like every other location (Overworld.tsx doesn't special-case a plaza),
  // so "milling around it" means the street below it, not the paving.
  { id: 'npc_1', kind: 'person', x: 600, y: 480, direction: 0, wanderRadius: 26, periodMs: 7000 },
  { id: 'npc_2', kind: 'person', x: 660, y: 480, direction: 180, wanderRadius: 20, periodMs: 9000 },
  { id: 'npc_dog_1', kind: 'dog', x: 630, y: 485, direction: 0, wanderRadius: 12, periodMs: 4000 },

  // School crossing — the open strip south of the school, north of the
  // Town Square block.
  { id: 'npc_3', kind: 'person', x: 600, y: 172, direction: 0, wanderRadius: 24, periodMs: 8000 },
  { id: 'npc_bird_1', kind: 'bird', x: 650, y: 60, direction: 45, wanderRadius: 60, periodMs: 5000 },

  // Sal's / the Annex strip up top — the open ground between Sal's bottom
  // edge and the Utility Yard's top edge.
  { id: 'npc_4', kind: 'person', x: 770, y: 140, direction: 0, wanderRadius: 14, periodMs: 6500 },
  { id: 'npc_5', kind: 'person', x: 860, y: 140, direction: 180, wanderRadius: 20, periodMs: 7500 },

  // Library sidewalk, south of the building.
  { id: 'npc_6', kind: 'person', x: 700, y: 330, direction: 90, wanderRadius: 18, periodMs: 8200 },

  // The gap between the Repair Shop and the Annex Fence, below the fence
  // line that separates Fenwick Lot from the block underneath it.
  { id: 'npc_7', kind: 'person', x: 994, y: 330, direction: 0, wanderRadius: 14, periodMs: 7800 },

  // Ballpark and the Arcade, south side — the street between them, clear of
  // the trees planted along the Arcade's east edge.
  { id: 'npc_8', kind: 'person', x: 400, y: 470, direction: 0, wanderRadius: 24, periodMs: 9500 },
  { id: 'npc_9', kind: 'person', x: 210, y: 471, direction: 0, wanderRadius: 18, periodMs: 6800 },
  { id: 'npc_bird_2', kind: 'bird', x: 450, y: 470, direction: 200, wanderRadius: 70, periodMs: 6000 },

  // The alley between Home and Ellen's, and the open ground east of
  // Casey's — residential streets, not front lawns.
  { id: 'npc_10', kind: 'person', x: 176, y: 230, direction: 90, wanderRadius: 24, periodMs: 8800 },
  { id: 'npc_dog_2', kind: 'dog', x: 180, y: 400, direction: 0, wanderRadius: 20, periodMs: 3600 },

  // The Treehouse strip, quiet but not empty — open ground just south of it.
  { id: 'npc_11', kind: 'person', x: 1180, y: 150, direction: 135, wanderRadius: 18, periodMs: 7200 },

  // Cats — smaller wander radii than a dog's, and generally somewhere
  // quieter than the middle of a street, the way an actual cat picks its
  // ground.
  { id: 'npc_cat_1', kind: 'cat', x: 634, y: 190, direction: 180, wanderRadius: 10, periodMs: 5200 },
  { id: 'npc_cat_2', kind: 'cat', x: 555, y: 495, direction: 90, wanderRadius: 9, periodMs: 4600 },
  { id: 'npc_cat_3', kind: 'cat', x: 164, y: 250, direction: 0, wanderRadius: 11, periodMs: 5800 },
  { id: 'npc_cat_4', kind: 'cat', x: 240, y: 480, direction: 180, wanderRadius: 10, periodMs: 5000 },

  // A couple more birds, over open sky where nothing at ground level cares.
  { id: 'npc_bird_3', kind: 'bird', x: 1150, y: 90, direction: 220, wanderRadius: 65, periodMs: 5600 },
  { id: 'npc_bird_4', kind: 'bird', x: 950, y: 250, direction: 100, wanderRadius: 55, periodMs: 4800 },
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
