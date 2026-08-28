import { DISTRICTS, HOME_LOCATION_ID, LOCATIONS, MAP_HEIGHT, MAP_WIDTH, type OverworldLocation } from './locations';
import { CELL, GRID_H, GRID_W, cellStatus, exploredSnapshot } from './exploration';
import type { ExplorationState } from '../state/schema';

/**
 * The one canvas-drawing routine behind both the minimap (`ui/Minimap.tsx`)
 * and the full map screen (`ui/Map.tsx`) — same data, same read, just more
 * of it at a bigger size. Reuses `DISTRICTS`' own accent colours
 * (`locations.ts`) rather than inventing a second palette, so the map
 * screen and the town it's a map *of* agree about which colour means which
 * neighbourhood.
 *
 * What the fog actually is: everywhere that isn't in `explored` or
 * `scouted` stays flat black. No road grid, no district outline leaks
 * through early — the whole point of this system is that the player's own
 * map is what the *protagonist* knows, not what the game knows exists, and
 * a ghost outline of an unvisited district would quietly break that.
 */
export const FOG = '#0a0c11';
const UNKNOWN_BORDER = 'rgba(236, 226, 208, 0.04)';
const SCOUTED_ALPHA = 0.34;
const EXPLORED_ALPHA = 0.72;
const PLAYER_DOT = '#e6402a';
const PLAYER_RING = 'rgba(230, 64, 42, 0.35)';
const LOCATION_DOT = '#f0c07a';
const LOCATION_DOT_SCOUTED = 'rgba(240, 192, 122, 0.55)';
const LOCATION_LABEL = '#ece2d0';
const GRID_LINE = 'rgba(0, 0, 0, 0.18)';
const OBJECTIVE_RING = '#e6402a';
const POI_DOT = '#3dff9a';
const POI_LABEL = 'rgba(61, 255, 154, 0.85)';

export interface MapViewOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  exploration: ExplorationState;
  player: { x: number; y: number } | null;
  visibleLocations: OverworldLocation[];
  /** The full map screen draws location labels and a legend; the minimap
   * (barely 80px across) draws dots only. */
  detailed: boolean;
  /**
   * The current open thread's own location (`systems/scenes.ts`'s
   * `nextObjectiveLocationId`), drawn regardless of fog state — this is a
   * beacon the story is pointing the player toward, not a thing they found by
   * exploring, so it's the one marker allowed to show through unrevealed
   * ground. `null`/omitted draws nothing: Bellhaven, evening, nothing asking
   * anything of you tonight.
   */
  objectiveLocationId?: string | null;
  /**
   * GPS tier 3's own "what's worth investigating" layer, Player-Freedom
   * Audit item #6 — a name, never what it actually is, and only ever drawn
   * over ground already `explored`/`scouted`, same as a location's own dot.
   * The caller (`ui/MapView.tsx`) is what decides a POI's fate once it's
   * cracked/collected (it stops sending it here at all) and what decides
   * the tier gate (an empty array below tier 3) — this file only draws
   * whatever list it's handed, the same "no logic, just paint" rule every
   * other layer above follows.
   */
  pois?: { x: number; y: number; label: string }[];
}

/** Whichever district's rect a point falls in — no fallback-to-nearest the
 * way `locations.ts`'s own `districtAt` has for road seams; the map view
 * only needs a colour for ground that's actually inside a block. */
function districtColorAt(x: number, y: number): string | null {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.color;
  }
  return null;
}

/** A location counts as found once its own centre point is known — every
 * real location on this map is bigger than one grid cell, so this is a
 * cheap stand-in for "any part of it revealed" that's only ever wrong at
 * the exact moment a reveal circle clips a corner without reaching the
 * middle, which the next few steps of walking always resolves anyway. */
function locationKnown(
  loc: OverworldLocation,
  snapshot: { explored: Set<number>; scouted: Set<number> },
): 'explored' | 'scouted' | 'unknown' {
  const gx = Math.floor((loc.x + loc.w / 2) / CELL);
  const gy = Math.floor((loc.y + loc.h / 2) / CELL);
  return cellStatus(snapshot, gx, gy);
}

export function drawMapView(opts: MapViewOptions): void {
  const { ctx, width, height, exploration, player, visibleLocations, detailed } = opts;
  const sx = width / MAP_WIDTH;
  const sy = height / MAP_HEIGHT;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = FOG;
  ctx.fillRect(0, 0, width, height);

  const snapshot = exploredSnapshot(exploration);
  const cellW = Math.max(1, CELL * sx);
  const cellH = Math.max(1, CELL * sy);

  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const status = cellStatus(snapshot, gx, gy);
      if (status === 'unknown') continue;
      const color = districtColorAt((gx + 0.5) * CELL, (gy + 0.5) * CELL);
      if (!color) continue;
      ctx.globalAlpha = status === 'explored' ? EXPLORED_ALPHA : SCOUTED_ALPHA;
      ctx.fillStyle = color;
      ctx.fillRect(gx * cellW, gy * cellH, cellW + 0.5, cellH + 0.5);
    }
  }
  ctx.globalAlpha = 1;

  // A faint grid over known ground only — texture, not a road system;
  // fully replaced by the district's own art once the player is close
  // enough for the real overworld canvas to be what they're looking at.
  if (detailed) {
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= GRID_W; gx += 4) {
      ctx.beginPath();
      ctx.moveTo(gx * cellW, 0);
      ctx.lineTo(gx * cellW, height);
      ctx.stroke();
    }
    for (let gy = 0; gy <= GRID_H; gy += 4) {
      ctx.beginPath();
      ctx.moveTo(0, gy * cellH);
      ctx.lineTo(width, gy * cellH);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = UNKNOWN_BORDER;
    ctx.strokeRect(0, 0, width, height);
  }

  for (const loc of visibleLocations) {
    if (loc.id === HOME_LOCATION_ID) continue; // drawn separately, below — it's the one pin that's never hidden
    const known = locationKnown(loc, snapshot);
    if (known === 'unknown') continue;
    const lx = (loc.x + loc.w / 2) * sx;
    const ly = (loc.y + loc.h / 2) * sy;
    ctx.fillStyle = known === 'explored' ? LOCATION_DOT : LOCATION_DOT_SCOUTED;
    ctx.beginPath();
    ctx.arc(lx, ly, detailed ? 3.5 : 2, 0, Math.PI * 2);
    ctx.fill();
    if (detailed) {
      ctx.fillStyle = LOCATION_LABEL;
      ctx.font = '10px var(--font-b, monospace)';
      ctx.textBaseline = 'middle';
      ctx.fillText(loc.label, lx + 6, ly);
    }
  }

  // GPS tier 3's POI layer — small, unlabelled-as-to-content dots, only
  // ever inside ground the fog has already given up. A name that says
  // there's something here, never what: the whole point is a reason to go
  // look, not a reason not to have to.
  for (const poi of opts.pois ?? []) {
    const gx = Math.floor(poi.x / CELL);
    const gy = Math.floor(poi.y / CELL);
    if (cellStatus(snapshot, gx, gy) === 'unknown') continue;
    const qx = poi.x * sx;
    const qy = poi.y * sy;
    ctx.strokeStyle = POI_DOT;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(qx, qy, detailed ? 4 : 2.5, 0, Math.PI * 2);
    ctx.stroke();
    if (detailed) {
      ctx.fillStyle = POI_LABEL;
      ctx.font = '9px var(--font-mono, monospace)';
      ctx.textBaseline = 'middle';
      ctx.fillText(poi.label, qx + 6, qy);
    }
  }

  // Home, always on the map once any part of it's been seen — the one
  // place a kid always knows how to find their own way back to.
  const home = LOCATIONS.find((l) => l.id === HOME_LOCATION_ID);
  if (home) {
    const hx = (home.x + home.w / 2) * sx;
    const hy = (home.y + home.h / 2) * sy;
    ctx.fillStyle = LOCATION_DOT;
    ctx.beginPath();
    ctx.arc(hx, hy, detailed ? 4.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = FOG;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (detailed) {
      ctx.fillStyle = LOCATION_LABEL;
      ctx.font = 'bold 10px var(--font-b, monospace)';
      ctx.fillText('Home', hx + 7, hy);
    }
  }

  // The open thread's own location, always drawn — the one marker in this
  // system allowed to point at ground the player hasn't set foot in, because
  // it isn't showing what's there, it's showing where the story wants them.
  if (opts.objectiveLocationId) {
    const objLoc = LOCATIONS.find((l) => l.id === opts.objectiveLocationId);
    if (objLoc) {
      const ox = (objLoc.x + objLoc.w / 2) * sx;
      const oy = (objLoc.y + objLoc.h / 2) * sy;
      const r = detailed ? 10 : 6;
      ctx.strokeStyle = OBJECTIVE_RING;
      ctx.lineWidth = detailed ? 2 : 1.5;
      ctx.setLineDash(detailed ? [4, 3] : [3, 2]);
      ctx.beginPath();
      ctx.arc(ox, oy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  if (player) {
    const px = player.x * sx;
    const py = player.y * sy;
    ctx.fillStyle = PLAYER_RING;
    ctx.beginPath();
    ctx.arc(px, py, detailed ? 9 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PLAYER_DOT;
    ctx.beginPath();
    ctx.arc(px, py, detailed ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
