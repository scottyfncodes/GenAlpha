import { describe, expect, it } from 'vitest';
import { LOCATIONS } from './locations';
import { OBSTACLES } from './obstacles';
import { HIDDEN_PICKUP_OBSTACLE_IDS } from './collectibles';
import { NPCS, type Npc } from './npcs';

/**
 * Same rule the player themselves is held to (Overworld.tsx's own
 * `overlapsBuilding`/`solidObstacles`): every location and every obstacle
 * except a hidden-pickup bush is solid. An npc's whole wander line — anchor
 * to the far end and back — has to stay off all of it, or it reads as
 * walking through a wall.
 */
const SOLID_OBSTACLES = OBSTACLES.filter((o) => !HIDDEN_PICKUP_OBSTACLE_IDS.has(o.id));
const BLOCKERS: { x: number; y: number; w: number; h: number }[] = [...LOCATIONS, ...SOLID_OBSTACLES];

/** A small buffer around the npc's own point, not the player's full 10x8
 * foot — these sprites are smaller than the player on screen, but a few
 * px of margin keeps one from visually grazing a wall either. */
const NPC_PAD = 3;

function overlapsAny(x: number, y: number): { x: number; y: number; w: number; h: number } | undefined {
  return BLOCKERS.find(
    (rect) =>
      x - NPC_PAD < rect.x + rect.w &&
      x + NPC_PAD > rect.x &&
      y - NPC_PAD < rect.y + rect.h &&
      y + NPC_PAD > rect.y,
  );
}

describe('npc wander lines stay clear of every building and solid obstacle', () => {
  // A bird flies — it's the one kind never checked against ground-level
  // collision, same reasoning `draw.ts` gives it no shadow.
  const grounded = NPCS.filter((n): n is Npc => n.kind !== 'bird');

  it.each(grounded.map((n) => [n.id, n] as const))('%s', (_id, npc) => {
    const angle = (npc.direction * Math.PI) / 180;
    const samples = 40;
    for (let i = 0; i <= samples; i++) {
      const progress = i / samples;
      const x = npc.x + Math.cos(angle) * npc.wanderRadius * progress;
      const y = npc.y + Math.sin(angle) * npc.wanderRadius * progress;
      const hit = overlapsAny(x, y);
      expect(hit, `${npc.id} at progress ${progress.toFixed(2)} (${x.toFixed(0)},${y.toFixed(0)}) hit ${JSON.stringify(hit)}`).toBeUndefined();
    }
  });
});
