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
