import type { ExplorationState, SaveState } from '../state/schema';
import { HOME_LOCATION_ID, LOCATIONS, MAP_HEIGHT, MAP_WIDTH } from './locations';

/**
 * What the protagonist actually knows about Bellhaven — the fog-of-war grid
 * everything else in this file (and the minimap/full map screens) reads and
 * writes. Deliberately coarse: 32px cells over a 1600x1100 map is a 50x35
 * grid, small enough that a save can store "every cell visited" as a flat
 * array of numbers rather than a bitset, and coarse enough that a circle of
 * revealed cells still reads as a street's width, not a laser dot.
 *
 * Two separate sets, not one — see `ExplorationState`'s own doc comment in
 * `state/schema.ts`. `explored` is "I've been here" (on foot, or standing
 * somewhere GPS's own passive radius covers); `scouted` is "I've seen this
 * from a distance" (drone recon). A cell only ever needs to exist in one:
 * `explored` always wins, so a cell already walked never gets demoted back
 * to scouted-only by a later drone flight over the same ground.
 */
export const CELL = 32;
export const GRID_W = Math.ceil(MAP_WIDTH / CELL);
export const GRID_H = Math.ceil(MAP_HEIGHT / CELL);

/** How far a player reveals just by walking — no gear required. Small: this
 * is "you can see the street you're standing on," not a sensor. */
export const FOOT_REVEAL_RADIUS = 100;

/** The GPS build line's own passive radius, centred on the player and live
 * the whole time it's carried — wider than foot range at every tier, but
 * tier 3 ("near-town-wide" per the design brief) is still well short of the
 * whole map's own diagonal, so carrying the best GPS is a real advantage
 * over walking blind without making walking pointless. */
export const GPS_REVEAL_RADIUS: Record<1 | 2 | 3, number> = { 1: 170, 2: 300, 3: 480 };

function cellIndex(gx: number, gy: number): number {
  return gy * GRID_W + gx;
}

export function cellCoords(index: number): { gx: number; gy: number } {
  return { gx: index % GRID_W, gy: Math.floor(index / GRID_W) };
}

/** Every grid cell whose centre falls within `radiusPx` of (cx, cy), clipped
 * to the map's own bounds — a circle, not the square its bounding box would
 * give, so a big radius doesn't reveal a courtyard's corners a player was
 * never actually within sight of. */
function cellsInRadius(cx: number, cy: number, radiusPx: number): number[] {
  const cells: number[] = [];
  const minGx = Math.max(0, Math.floor((cx - radiusPx) / CELL));
  const maxGx = Math.min(GRID_W - 1, Math.floor((cx + radiusPx) / CELL));
  const minGy = Math.max(0, Math.floor((cy - radiusPx) / CELL));
  const maxGy = Math.min(GRID_H - 1, Math.floor((cy + radiusPx) / CELL));
  const r2 = radiusPx * radiusPx;
  for (let gy = minGy; gy <= maxGy; gy++) {
    for (let gx = minGx; gx <= maxGx; gx++) {
      const dx = (gx + 0.5) * CELL - cx;
      const dy = (gy + 0.5) * CELL - cy;
      if (dx * dx + dy * dy <= r2) cells.push(cellIndex(gx, gy));
    }
  }
  return cells;
}

/**
 * The one entry point every reveal (foot, GPS, drone) goes through — see
 * `state/GameContext.tsx`'s `REVEAL_AREA` action. Returns `state` itself,
 * same reference, when nothing in the circle was actually new: this gets
 * dispatched every time the player moves a few pixels (`world/Overworld.tsx`),
 * so once an area is fully known, walking back through it has to be a
 * genuine no-op or the reducer would be doing real work on every frame for
 * the rest of the game.
 */
export function revealArea(
  state: SaveState,
  x: number,
  y: number,
  radiusPx: number,
  kind: 'explored' | 'scouted' = 'explored',
): SaveState {
  const exploration = state.world.exploration;
  const exploredSet = new Set(exploration.explored);
  const scoutedSet = new Set(exploration.scouted);
  const targetSet = kind === 'explored' ? exploredSet : scoutedSet;
  let changed = false;

  for (const idx of cellsInRadius(x, y, radiusPx)) {
    // A cell already `explored` never regresses to scouted-only, so a scout
    // pass never needs to touch it either way.
    if (kind === 'scouted' && exploredSet.has(idx)) continue;
    if (!targetSet.has(idx)) {
      targetSet.add(idx);
      changed = true;
    }
  }
  if (!changed) return state;

  // A cell newly walked also drops out of `scouted` — it's not a demotion,
  // it's the array that was standing in for "known, not visited yet"
  // finally being visited, so it has nothing left to record there.
  if (kind === 'explored') {
    for (const idx of cellsInRadius(x, y, radiusPx)) scoutedSet.delete(idx);
  }

  return {
    ...state,
    world: {
      ...state.world,
      exploration: { explored: Array.from(exploredSet), scouted: Array.from(scoutedSet) },
    },
  };
}

/** A cheap-to-query snapshot for a single render pass — the map/minimap
 * screens call this once and then look up many cells against it, rather
 * than rebuilding a `Set` from the save's own array on every cell. */
export function exploredSnapshot(exploration: ExplorationState): { explored: Set<number>; scouted: Set<number> } {
  return { explored: new Set(exploration.explored), scouted: new Set(exploration.scouted) };
}

export type CellStatus = 'unknown' | 'scouted' | 'explored';

export function cellStatus(
  snapshot: { explored: Set<number>; scouted: Set<number> },
  gx: number,
  gy: number,
): CellStatus {
  const idx = cellIndex(gx, gy);
  if (snapshot.explored.has(idx)) return 'explored';
  if (snapshot.scouted.has(idx)) return 'scouted';
  return 'unknown';
}

/**
 * A new save's own starting knowledge: home turf, not a blank grid. The
 * opening brief's own note — "a kid who knows the neighbourhood somewhat" —
 * made literal as a small revealed patch around Home rather than a line of
 * dialogue claiming it. Also what a save migrated from before this field
 * existed gets (`state/persistence.ts`): nobody's map goes backwards.
 */
export function initialExploration(): ExplorationState {
  const home = LOCATIONS.find((l) => l.id === HOME_LOCATION_ID);
  if (!home) return { explored: [], scouted: [] };
  const cx = home.x + home.w / 2;
  const cy = home.y + home.h / 2;
  return { explored: cellsInRadius(cx, cy, FOOT_REVEAL_RADIUS * 2.2), scouted: [] };
}
