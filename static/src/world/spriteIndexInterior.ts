/**
 * Named coordinates into `public/tiles/kenney-roguelike-interior-pack.png` —
 * Kenney's Roguelike Indoor pack, brought in for the small interior-backdrop
 * canvases (`InteriorBackdrop.tsx`) that give a location's own ambient panel
 * a peek of a real room instead of just text. Same grid as the RPG Urban
 * Pack (27 cols x 18 rows, 16x16 tiles, 1px spacing), so it reuses the same
 * `tileIndex` math; this only names the handful of tiles actually drawn.
 */
const SHEET_COLS = 27;

function tileIndex(col: number, row: number): number {
  return row * SHEET_COLS + col;
}

/** A seamless wood-plank floor swatch — tiled edge to edge across the
 * backdrop's width, the same "one repeated fill tile" trick the ground grid
 * and roof slabs already use. Picked from the middle of a 4-tile column of
 * identical repeats so there's no edge seam baked into this one tile. */
export const FLOOR_WOOD = tileIndex(24, 1);

/** A single bed, one tile wide x two tall — headboard on top, blanket below
 * — verified by stacking the two tiles and looking at the result rather
 * than assuming the sheet's row order, same as every other multi-tile pick
 * this pipeline has made. */
export const BED: { top: number; base: number } = { top: tileIndex(8, 6), base: tileIndex(8, 7) };

/** A small bedside table with a lamp lit on top — dressing the floor next
 * to the bed so the strip doesn't read as just a mattress floating alone.
 * Picked after rejecting two neighbours: col 4 is a wall-mounted shelf with
 * no legs (floats oddly on a floor), col 5 is close but this one's lamp
 * glow reads better next to a bed specifically. */
export const NIGHTSTAND = tileIndex(6, 5);

/** A framed picture, small enough to sit above the furniture line without
 * needing an actual wall tile behind it. */
export const PICTURE_FRAME = tileIndex(16, 12);
