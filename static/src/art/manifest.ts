/**
 * THE ASSET SLOT MANIFEST — every class of thing `world/draw.ts` currently
 * draws procedurally, named, sized, anchored, and layered per
 * `docs/art/genalpha-art-bible.md`. One entry per *class* (there are
 * hundreds of trees on the map; one `prop.tree.tall` slot covers all of
 * them), not one per map instance.
 *
 * This is data, not renderer: nothing in `world/draw.ts` reads this file
 * yet (see the art bible §6/§8 — wiring real art into the live renderer is
 * Run 2, not this run). `assetLoader.ts` reads it to draw placeholders and
 * (once real files exist) real art; `AssetGallery.tsx` reads it to build the
 * placeholder gallery; `manifest.test.ts` reads it to validate itself.
 *
 * `width`/`height` are world units at 1x — the same coordinate space every
 * table in `world/` is already authored in (see the art bible §2). `layer`
 * is one of the 20 ordinals `drawTown()` actually paints in (art bible §5);
 * keeping it here means a future compositor doesn't have to re-derive paint
 * order by reading `draw.ts` a second time.
 */

export type AssetCategory =
  | 'character'
  | 'small-prop'
  | 'medium-prop'
  | 'large-prop'
  | 'building'
  | 'landmark'
  | 'vehicle'
  | 'terrain'
  | 'technology'
  | 'effect'
  | 'ui-icon';

export type AnchorPoint =
  | 'bottom-center'
  | 'top-left'
  | 'center'
  | 'explicit';

/**
 * `drawTown()`'s own paint order, art bible §5, transcribed 1:1 — index 0 is
 * step 1 (sky), index 19 is step 20 (home-interior mask). A slot's `layer`
 * must be one of these; `manifest.test.ts` asserts that.
 */
export const LAYERS = [
  'sky',
  'ground',
  'roads',
  'edge-geography',
  'language-b-glow',
  'streetlight-glow',
  'obstacles',
  'locations',
  'ambient-npcs',
  'sabotage-scars',
  'dead-cameras-and-marks',
  'live-cameras',
  'street-hack-nodes',
  'junction-boxes',
  'patrol-rings-and-vans',
  'cop-rings-and-cops',
  'drone-shadows-and-rings',
  'player',
  'drone-bodies',
  'home-interior-mask',
] as const;

export type Layer = (typeof LAYERS)[number];

export interface AssetFrames {
  /** Frames per direction/state (columns in the source sheet). */
  cols: number;
  /** Directions/states (rows in the source sheet). */
  rows: number;
  /** Row order, when it's a fixed compass set — matches `spriteIndex.ts`'s
   * `Direction` order for every directional character sheet in this game. */
  directions?: readonly string[];
}

export interface AssetSlot {
  /** kebab-case, dot-namespaced: `<category-ish prefix>.<name>[.<variant>]`. */
  id: string;
  category: AssetCategory;
  label: string;
  description: string;
  /** World units at 1x. See the art bible §3 for how each was measured. */
  width: number;
  height: number;
  anchor: AnchorPoint;
  layer: Layer;
  frames?: AssetFrames;
  /** Exactly what in the current renderer this slot documents — a function
   * name, a table, or both. Never empty; `manifest.test.ts` enforces it. */
  sourceRef: string;
}

const DIRECTIONS = ['left', 'down', 'up', 'right'] as const;

export const ASSET_MANIFEST: AssetSlot[] = [
  /* ================================================================ *
   * CHARACTERS — bottom-center (feet), art bible §2/§4. The player and
   * ambient NPCs share one sprite budget (16x22) — APPROVED as this run's
   * default at the Run 1 review checkpoint, not a hard ceiling: each slot
   * declares its own width/height, so a future character class with a real
   * reason to differ just declares a different box on its own slot.
   * ================================================================ */
  {
    id: 'character.player',
    category: 'character',
    label: 'Player',
    description: 'The protagonist, walking. Master scale reference for every other asset in the game.',
    width: 16,
    height: 22,
    anchor: 'bottom-center',
    layer: 'player',
    frames: { cols: 3, rows: 4, directions: DIRECTIONS },
    sourceRef: 'spriteIndex.ts CHARACTERS[0] (CHARACTER_DRAW_SIZE); draw.ts drawPlayer',
  },
  {
    id: 'character.npc.person',
    category: 'character',
    label: 'Ambient pedestrian',
    description: 'A townsperson wandering a short authored line. Cycles the pack\'s 6 skins by id hash.',
    width: 16,
    height: 22,
    anchor: 'bottom-center',
    layer: 'ambient-npcs',
    frames: { cols: 3, rows: 4, directions: DIRECTIONS },
    sourceRef: 'spriteIndex.ts CHARACTERS; draw.ts drawPedestrian (NpcKind "person")',
  },
  {
    id: 'character.cop',
    category: 'character',
    label: 'Officer on foot',
    description: 'Same pedestrian silhouette in a fixed uniform color, cap brim added. Procedural only today (no sheet variant).',
    width: 9,
    height: 15,
    anchor: 'bottom-center',
    layer: 'cop-rings-and-cops',
    sourceRef: 'draw.ts drawCop',
  },
  {
    id: 'character.npc.dog',
    category: 'character',
    label: 'Ambient dog',
    description: 'Low-slung body block with stub legs. Procedural only.',
    width: 12,
    height: 11,
    anchor: 'bottom-center',
    layer: 'ambient-npcs',
    sourceRef: 'draw.ts drawDog (NpcKind "dog")',
  },
  {
    id: 'character.npc.cat',
    category: 'character',
    label: 'Ambient cat',
    description: 'Smaller and slighter than the dog, tail held up rather than trailing. Procedural only.',
    width: 9,
    height: 10,
    anchor: 'bottom-center',
    layer: 'ambient-npcs',
    sourceRef: 'draw.ts drawCat (NpcKind "cat")',
  },
  {
    id: 'character.npc.bird',
    category: 'character',
    label: 'Ambient bird',
    description: 'Overhead only — never checked against ground collision. Procedural only.',
    width: 8,
    height: 4,
    anchor: 'center',
    layer: 'ambient-npcs',
    sourceRef: 'draw.ts drawBird (NpcKind "bird")',
  },

  /* ================================================================ *
   * SMALL / MEDIUM / LARGE PROPS — obstacle kinds, bottom-center.
   * ================================================================ */
  { id: 'prop.tree.tall', category: 'medium-prop', label: 'Tall tree', description: 'Two-tile canopy-over-trunk stack; teal and orange palette variants exist.', width: 20, height: 40, anchor: 'bottom-center', layer: 'obstacles', frames: { cols: 1, rows: 2 }, sourceRef: 'spriteIndex.ts TREE_TALL_TEAL/TREE_TALL_ORANGE; draw.ts drawTree' },
  { id: 'prop.tree.small', category: 'medium-prop', label: 'Small tree', description: 'Shorter canopy-over-trunk variant, same stacking convention as the tall tree.', width: 20, height: 40, anchor: 'bottom-center', layer: 'obstacles', frames: { cols: 1, rows: 2 }, sourceRef: 'spriteIndex.ts TREE_SMALL_TEAL/TREE_SMALL_ORANGE; draw.ts drawTree' },
  { id: 'prop.bush', category: 'small-prop', label: 'Bush', description: 'Single-tile round bush, no trunk. Also the hidden-pickup marker prop.', width: 16, height: 24, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'spriteIndex.ts BUSH_TEAL/BUSH_ORANGE; draw.ts drawBush' },
  { id: 'prop.rock', category: 'small-prop', label: 'Rock', description: 'Irregular polygon silhouette — the one prop that should not read as a soft blob. Procedural only.', width: 16, height: 16, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'draw.ts drawRock' },
  { id: 'prop.hedge', category: 'medium-prop', label: 'Hedge run', description: 'Trimmed, flat-topped row — the one obstacle with a deliberately architectural straight edge. Tiles along its own width; author as a repeatable strip.', width: 32, height: 16, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'draw.ts drawHedge' },
  { id: 'prop.fence.chainlink', category: 'medium-prop', label: 'Chain-link fence', description: 'One-row tiled fence band with its own post baked into the left edge of the tile.', width: 16, height: 16, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'spriteIndex.ts FENCE_CHAINLINK; draw.ts drawFence' },
  { id: 'prop.bin', category: 'small-prop', label: 'Bin / dumpster', description: 'Front-facing dumpster.', width: 16, height: 16, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'spriteIndex.ts BIN_DUMPSTER; draw.ts drawBin' },
  { id: 'prop.crate', category: 'small-prop', label: 'Crate', description: 'Stackable market/yard crate.', width: 16, height: 16, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'spriteIndexCity.ts CRATE_TILES; draw.ts drawCrate' },
  { id: 'prop.barrel', category: 'small-prop', label: 'Barrel', description: 'Industrial/market barrel.', width: 16, height: 16, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'spriteIndexCity.ts BARREL_TILE; draw.ts drawBarrel' },
  { id: 'prop.bench', category: 'medium-prop', label: 'Park bench', description: 'Slatted seat + back rail. Orientation (horizontal/vertical) picked from the obstacle rect\'s own proportions, not authored separately.', width: 28, height: 12, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'draw.ts drawParkBench' },
  { id: 'prop.playground', category: 'large-prop', label: 'Playground set', description: 'Swing frame + slide + roundabout over a wood-chip fall surface. Liberty Park only.', width: 60, height: 40, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'draw.ts drawPlayground' },
  { id: 'prop.laundry-line', category: 'medium-prop', label: 'Washing line', description: 'Two posts, a sagging line, 4-5 pegged garments. The Blocks\' own "this street is not afraid" signal.', width: 32, height: 16, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'draw.ts drawWashingLine' },
  { id: 'technology.plate-scanner', category: 'technology', label: 'Plate scanner', description: 'Mast + canted sensor head with a slow-blink red read-light. Watches a road, not a place.', width: 8, height: 24, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'draw.ts drawPlateScanner' },
  { id: 'technology.security-gate', category: 'technology', label: 'Security gate', description: 'Striped barrier arm on a post, always drawn down.', width: 32, height: 16, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'draw.ts drawSecurityGate' },

  /* ================================================================ *
   * VEHICLES — bottom-center ground footprint.
   * ================================================================ */
  { id: 'vehicle.car', category: 'vehicle', label: 'Parked car', description: '3 color-pair variants, picked per-obstacle by id hash.', width: 18, height: 12, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'spriteIndex.ts CAR_TILES; draw.ts drawParkedCar' },
  { id: 'vehicle.bus', category: 'vehicle', label: 'Transit bus', description: '2x3-tile block, the one vehicle tall enough to read as a bus.', width: 32, height: 48, anchor: 'bottom-center', layer: 'obstacles', frames: { cols: 2, rows: 3 }, sourceRef: 'spriteIndex.ts BUS_TILES' },
  { id: 'vehicle.truck.horizontal', category: 'vehicle', label: 'Box truck (horizontal)', description: 'Cab + container body, two body-color variants. Procedural only — neither Kenney pack ships a lorry.', width: 40, height: 22, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'draw.ts drawTruck (obstacle kind "truck")' },
  { id: 'vehicle.truck.vertical', category: 'vehicle', label: 'Box truck (vertical)', description: 'Same truck, rotated for a north/south-facing lot.', width: 22, height: 40, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'draw.ts drawTruck (obstacle kind "truck")' },
  { id: 'vehicle.patrol-van', category: 'vehicle', label: 'SafeTrace patrol van', description: 'The ground-patrol threat vehicle. Red body, dark cab, two running lights.', width: 16, height: 10, anchor: 'bottom-center', layer: 'patrol-rings-and-vans', sourceRef: 'spriteIndexCity.ts PATROL_VAN_TILES; draw.ts drawPatrol' },
  { id: 'technology.drone.recon', category: 'technology', label: 'Player recon drone', description: 'Small hovering quadcopter, altitude sold by a separate ground shadow.', width: 12, height: 12, anchor: 'center', layer: 'drone-bodies', sourceRef: 'draw.ts drawDrone (world drone, not the minigame sprite)' },
  { id: 'technology.drone.interceptor', category: 'technology', label: 'SafeTrace interceptor drone', description: 'The airborne threat drone. Minigame-only art already exists as a standalone PNG — see droneflight-interceptor.png.', width: 12, height: 12, anchor: 'center', layer: 'drone-bodies', sourceRef: 'draw.ts drawDrone; droneSprites.ts drawInterceptor (minigame variant)' },

  /* ================================================================ *
   * TECHNOLOGY — the surveillance network. Center-anchored point objects.
   * ================================================================ */
  { id: 'technology.camera', category: 'technology', label: 'Sabotage camera', description: 'Fixed 16x16 housing regardless of the location rect it stands at — a post with a lens, not a building.', width: 16, height: 16, anchor: 'center', layer: 'live-cameras', sourceRef: 'draw.ts drawSabotageCamera (size = 16)' },
  { id: 'technology.camera.dead', category: 'technology', label: 'Dead camera', description: 'Already-sabotaged-by-someone-else housing, cable hanging, sticker over the lens. 3 variants: bagged, tagged, cut.', width: 16, height: 16, anchor: 'center', layer: 'dead-cameras-and-marks', sourceRef: 'draw.ts drawDeadCamera' },
  { id: 'technology.street-hack.atm', category: 'technology', label: 'ATM hack node', description: 'Cash-register-green street hack point.', width: 16, height: 16, anchor: 'center', layer: 'street-hack-nodes', sourceRef: 'draw.ts drawStreetHack (kind "atm")' },
  { id: 'technology.street-hack.phone', category: 'technology', label: 'Payphone hack node', description: 'Sun-bleached-tan street hack point.', width: 16, height: 16, anchor: 'center', layer: 'street-hack-nodes', sourceRef: 'draw.ts drawStreetHack (kind "phone")' },
  { id: 'technology.junction-box', category: 'technology', label: 'Junction box', description: 'Tiers 1-5, same silhouette across tiers, cooldown/damaged states swap the paint only.', width: 16, height: 16, anchor: 'center', layer: 'junction-boxes', sourceRef: 'draw.ts drawJunctionBox' },

  /* ================================================================ *
   * BUILDINGS / LOCATIONS — top-left, full roof+face bounding box.
   * One representative real instance's size per render type; actual
   * per-location sizes vary (art bible §3) and are never forced to a
   * single fixed footprint.
   * ================================================================ */
  { id: 'building.house', category: 'building', label: 'House', description: 'Pitched roof (2 triangular faces), centered door, 2 hand-placed windows.', width: 130, height: 96, anchor: 'top-left', layer: 'locations', sourceRef: 'locations.ts render:"house"; draw.ts drawHouse' },
  { id: 'building.school', category: 'building', label: 'School', description: 'Flagpole, sign band.', width: 208, height: 124, anchor: 'top-left', layer: 'locations', sourceRef: 'locations.ts render:"school"' },
  { id: 'building.library', category: 'building', label: 'Library', description: 'Columns and pediment — the one building dressed up to look civic on purpose.', width: 168, height: 100, anchor: 'top-left', layer: 'locations', sourceRef: 'locations.ts render:"library"' },
  { id: 'building.shop', category: 'building', label: 'Storefront', description: 'General small-shop silhouette — laundromat, convenience store, pharmacy, etc.', width: 100, height: 74, anchor: 'top-left', layer: 'locations', sourceRef: 'locations.ts render:"shop"' },
  { id: 'building.plaza', category: 'building', label: 'Market plaza', description: 'Umbrella stalls over paving, no roof card.', width: 170, height: 100, anchor: 'top-left', layer: 'locations', sourceRef: 'locations.ts render:"plaza"' },
  { id: 'building.warehouse', category: 'building', label: 'Warehouse', description: 'Corrugated roofing, roll-up door, roof vents.', width: 168, height: 100, anchor: 'top-left', layer: 'locations', sourceRef: 'locations.ts render:"warehouse"' },
  { id: 'building.garage', category: 'building', label: 'Garage', description: 'The one location with a Build screen. Sizes vary widely by lot.', width: 100, height: 80, anchor: 'top-left', layer: 'locations', sourceRef: 'locations.ts render:"garage"' },
  { id: 'building.ballpark', category: 'building', label: 'Ballpark', description: 'Field, not a building — bleachers, dirt, floodlights. The hijack venue and the final image.', width: 146, height: 120, anchor: 'top-left', layer: 'locations', sourceRef: 'locations.ts render:"ballpark"' },
  { id: 'building.pizza', category: 'building', label: "Sal's (pizza)", description: 'Awning, round sign.', width: 98, height: 74, anchor: 'top-left', layer: 'locations', sourceRef: 'locations.ts render:"pizza"' },
  { id: 'building.arcade', category: 'building', label: 'Arcade', description: 'Marquee sign over the door instead of ordinary windows.', width: 98, height: 74, anchor: 'top-left', layer: 'locations', sourceRef: 'locations.ts render:"arcade"' },
  { id: 'building.treehouse', category: 'building', label: 'Treehouse', description: 'A platform in a tree, not a box — reuses the yard swing-set frame.', width: 80, height: 64, anchor: 'top-left', layer: 'locations', sourceRef: 'locations.ts render:"treehouse"' },
  { id: 'building.transit', category: 'building', label: 'Transit depot', description: 'Platform-and-shelter silhouette — the one bus depot in town.', width: 160, height: 108, anchor: 'top-left', layer: 'locations', sourceRef: 'locations.ts render:"transit"' },
  { id: 'building.civic', category: 'building', label: 'City Hall', description: 'Civic Zone anchor — stone, dome accent.', width: 190, height: 128, anchor: 'top-left', layer: 'locations', sourceRef: 'locations.ts render:"civic"' },
  { id: 'building.datacenter', category: 'building', label: 'Data centre', description: 'Cold, clean, vented — SafeTrace\'s own building (distinct from the SafeTrace Tower landmark obstacle).', width: 180, height: 124, anchor: 'top-left', layer: 'locations', sourceRef: 'locations.ts render:"datacenter"' },
  { id: 'building.bigbox', category: 'building', label: 'MegaMart (big-box retail)', description: 'The Plaza\'s anchor store.', width: 170, height: 106, anchor: 'top-left', layer: 'locations', sourceRef: 'locations.ts render:"bigbox"' },
  { id: 'building.substation', category: 'building', label: 'Electrical substation', description: 'Frame, coil, hazard striping, gravel yard.', width: 150, height: 104, anchor: 'top-left', layer: 'locations', sourceRef: 'locations.ts render:"substation"' },
  { id: 'building.generic', category: 'building', label: 'Generic building (default)', description: 'The plain flat-roofed box every location renders as when `render` is unset.', width: 100, height: 80, anchor: 'top-left', layer: 'locations', sourceRef: 'locations.ts render:"building" (default); draw.ts drawBuilding' },
  { id: 'building.decorative', category: 'building', label: 'Background filler building', description: 'Duller, flatter, unlit-by-default — never an interactive location, purely density.', width: 100, height: 62, anchor: 'top-left', layer: 'obstacles', sourceRef: 'obstacles.ts kind:"building"; draw.ts drawDecorativeBuilding' },

  /* ================================================================ *
   * LANDMARKS — singular, hand-placed, off the modular grid on purpose.
   * ================================================================ */
  { id: 'landmark.safetrace-tower', category: 'landmark', label: 'SafeTrace Tower', description: 'Downtown\'s skyline anchor and the tallest single object in the game. Heat-reactive belt screen.', width: 50, height: 168, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'obstacles.ts safetrace_tower; draw.ts drawSafeTraceTower' },
  { id: 'landmark.billboard.small', category: 'landmark', label: 'Small billboard/pylon', description: 'The Plaza\'s ad pylon.', width: 40, height: 26, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'obstacles.ts plaza_pylon; draw.ts drawBillboard' },
  { id: 'landmark.billboard.large', category: 'landmark', label: 'Large billboard', description: 'The loudest single object in town on purpose — pristine ad, tiny hand-written correction underneath.', width: 130, height: 50, anchor: 'bottom-center', layer: 'obstacles', sourceRef: 'obstacles.ts commercial_billboard; draw.ts drawBillboard' },

  /* ================================================================ *
   * TERRAIN — tiled fills, top-left, no single-object anchor.
   * ================================================================ */
  { id: 'terrain.ground', category: 'terrain', label: 'Ground fill', description: 'Base ground tile, district-tinted.', width: 16, height: 16, anchor: 'top-left', layer: 'ground', sourceRef: 'spriteIndexCity.ts GROUND_TILE; draw.ts drawGround' },
  { id: 'terrain.road.surface', category: 'terrain', label: 'Road surface', description: 'Tiled road fill; width varies by tier (major 44 / secondary 32 / local 20 / alley 11 / path 6 world units — see the art bible §2).', width: 16, height: 16, anchor: 'top-left', layer: 'roads', sourceRef: 'draw.ts ROAD_WIDTH, drawRoads' },
  { id: 'terrain.sidewalk', category: 'terrain', label: 'Sidewalk', description: 'Tiled sidewalk fill flanking a road surface.', width: 16, height: 16, anchor: 'top-left', layer: 'roads', sourceRef: 'spriteIndexCity.ts SIDEWALK_TILE' },
  { id: 'terrain.crosswalk', category: 'terrain', label: 'Crosswalk', description: 'Horizontal and vertical stripe sets.', width: 16, height: 16, anchor: 'top-left', layer: 'roads', sourceRef: 'spriteIndexCity.ts CROSSWALK_H/CROSSWALK_V' },

  /* ================================================================ *
   * EFFECTS / DECALS — explicit, per-instance origin.
   * ================================================================ */
  { id: 'effect.gen-a-mark', category: 'effect', label: 'Gen A mark', description: 'Three states (clean/claiming/closed) — see GenAMark.tsx. Authored on a square viewBox, scaled to whatever surface hosts it.', width: 100, height: 100, anchor: 'explicit', layer: 'dead-cameras-and-marks', sourceRef: 'ui/GenAMark.tsx; draw.ts drawGenAMark' },
  { id: 'effect.sabotage-scar', category: 'effect', label: 'Sabotage scar', description: "Paint left on a post the player has already taken apart at least once. Tagged/untagged variants.", width: 16, height: 16, anchor: 'explicit', layer: 'sabotage-scars', sourceRef: 'draw.ts drawSabotageScar' },
  { id: 'effect.sparkle', category: 'effect', label: 'Hidden-pickup sparkle', description: 'One soft pixel over a bush that still has something in it, on a slow twinkle cycle.', width: 2, height: 2, anchor: 'explicit', layer: 'obstacles', sourceRef: 'draw.ts drawSparkle' },

  /* ================================================================ *
   * UI ICON — 24x24 base grid APPROVED at the Run 1 review checkpoint
   * (docs/art/genalpha-art-pipeline-run1-review.md). No existing instances
   * still; HUD iconography today is text/CSS/SVG-drawn inline (ui/Hud.tsx),
   * not image-asset-backed at all. A baseline canvas, not a fill
   * requirement — see the art bible §3. Included so the manifest schema
   * and gallery cover the category the art bible calls out, not wired to
   * anything.
   * ================================================================ */
  { id: 'ui-icon.generic', category: 'ui-icon', label: 'Generic UI icon', description: 'Approved 24x24 base grid for future image-asset HUD icons. A baseline, not a fill requirement — preserve transparent padding where appropriate. Nothing in the game reads this slot today.', width: 24, height: 24, anchor: 'center', layer: 'player', sourceRef: 'none — greenfield, see the art bible §3' },
];
