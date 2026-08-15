/**
 * Named coordinates into `public/tiles/kenney-roguelike-city-pack.png` —
 * Kenney's Roguelike Modern City pack, brought in specifically for the
 * grey concrete industrial look `spriteIndex.ts`'s RPG Urban Pack doesn't
 * have (that pack is all warm brick/cozy-suburban; nothing in it reads as
 * a warehouse). Same idea as `spriteIndex.ts`: this names the handful of
 * tiles actually drawn out of the sheet's 1036, not an exhaustive catalog.
 */
import type { NineSlice, WallKit } from './spriteIndex';

const SHEET_COLS = 37;

function tileIndex(col: number, row: number): number {
  return row * SHEET_COLS + col;
}

/** Grey concrete — the wall band `drawWarehouse`/`drawGarage` use. Unlike
 * the RPG Urban Pack's brick kits, this one has its cap (the light trim
 * row) at the *bottom* of the block, not the top — the pack draws each
 * material's own block with the roof-facing trim last, so the row order
 * doesn't line up between the two packs even though the concept does. */
export const WALL_INDUSTRIAL: WallKit = { cap: tileIndex(6, 10), fill: tileIndex(6, 5) };

/** A flat industrial rooftop slab — one plain concrete tile repeated
 * everywhere, `drawNineSliceRect`'s corner/edge fields all pointing at the
 * same index. A warehouse roof reading as a uniform poured-concrete slab
 * is more accurate than borrowing the ornamented corner treatment the
 * civic-building roof kits use, not just simpler to extract. */
export const ROOF_INDUSTRIAL: NineSlice = (() => {
  const flat = tileIndex(10, 1);
  return { tl: flat, t: flat, tr: flat, l: flat, fill: flat, r: flat, bl: flat, b: flat, br: flat };
})();

/** Plain asphalt — no lane markings. The pack has marked variants (single
 * and double yellow lines, crosswalk stripes, turn arrows) but every one of
 * those bakes in an orientation, and the road hierarchy's existing centre
 * -line/crack/pedestrian-dot overlays (`drawRoads`) already encode tier and
 * direction procedurally, tuned per tier. Doubling that up on the sprite
 * would either conflict with it or need the tile picker to re-derive
 * exactly what the overlay logic already knows — this tile is the ground
 * `drawGroundGrid` blits under those overlays, nothing more. */
export const ASPHALT_TILE = tileIndex(10, 19);

/** A plain paver, no curb — `drawGroundGrid` uses this for `path`-tier
 * cells (pedestrian paths were always "gravel, not asphalt" per the road
 * hierarchy's own doc comment; this is that, now a real texture instead of
 * a flat fill colour). */
export const SIDEWALK_TILE = tileIndex(0, 19);

/** The base ground tile everywhere that isn't a road or a path — a grey
 * gravel swatch chosen to sit near `PALETTE.ground`'s cool blue-grey rather
 * than read as grass; Style Guide 07's ground is pavement-toned even where
 * nothing is built on it, and a bright green tile would fight that on
 * every district's own tint overlay drawn on top of it. */
export const GROUND_TILE = tileIndex(2, 24);
