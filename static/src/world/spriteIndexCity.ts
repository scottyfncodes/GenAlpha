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

/** The SafeTrace patrol van — a front-facing grey utility truck, 1 col x
 * 2 rows (the sheet only draws this one at half the width of its
 * orange/red/green neighbours a few columns over — verified against a
 * labeled pixel crop after initially grabbing the wrong, wider truck at
 * col 32). Grey reads as institutional/municipal rather than as anyone's
 * personal car, which is the read a surveillance contractor's vehicle
 * wants; row-major, top to bottom, same convention `BUS_TILES` uses. */
export const PATROL_VAN_TILES: number[][] = [[tileIndex(31, 14)], [tileIndex(31, 15)]];

/** A single umbrella tile stands in for a market stall — a common enough
 * shorthand in top-down pixel art that it doesn't need a cart body under
 * it to read as one. Two colours so Town Square's stalls don't look
 * copy-pasted. */
export const MARKET_UMBRELLA_GREEN = tileIndex(34, 14);
export const MARKET_UMBRELLA_ORANGE = tileIndex(35, 14);

/**
 * Crosswalk stripes, one tile each — repeated side by side, they tile
 * seamlessly into a strip of any width. `H` runs its bars horizontally
 * (parallel to an east-west road, for pedestrians crossing north-south);
 * `V` runs them vertically (parallel to a north-south road). Used once,
 * hand-placed at the Downtown Crossroads only — not a general road-marking
 * system, just the one intersection the story already treats as the
 * town's busiest corner.
 */
export const CROSSWALK_H = tileIndex(9, 22);
export const CROSSWALK_V = tileIndex(12, 22);

/**
 * Loose debris for The Works' own ground — cable spools, a
 * boxcar, a crane, and stacked cars are all named in the district's own
 * ambient text (`locations.ts`) but nothing on the ground ever backed that
 * up before this; a bare grey lot doesn't read as a working (or abandoned)
 * yard. Three crate variants picked by id hash, the same "small fixed
 * wardrobe" trick `CAR_TILES` already uses, so a cluster of them doesn't
 * look copy-pasted.
 */
export const CRATE_TILES: number[] = [tileIndex(13, 15), tileIndex(14, 16), tileIndex(13, 14)];

/** A single rusty-orange barrel — Fenwick Lot's loading bays and the
 * Scrapyard both read as the kind of place these accumulate in. */
export const BARREL_TILE = tileIndex(15, 14);
