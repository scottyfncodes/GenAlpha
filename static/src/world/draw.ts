import {
  DISTRICTS,
  HOME_LOCATION_ID,
  MAP_HEIGHT,
  MAP_WIDTH,
  visibleLocations,
  type OverworldLocation,
} from './locations';
import type { Obstacle } from './obstacles';
import type { NpcKind } from './npcs';
import type { ThresholdTier } from '../state/schema';
import { mulberry32, seedFrom } from '../systems/rng';
import {
  citySheetReady,
  drawTileAt,
  drawCityTileAt,
  drawSpriteTile,
  ensureSpriteSheetLoading,
  spriteSheetReady,
  TILE,
} from './spritesheet';
import {
  BIN_DUMPSTER,
  BUSH_ORANGE,
  BUSH_TEAL,
  BUS_TILES,
  CAR_TILES,
  CHARACTERS,
  CHARACTER_DRAW_SIZE,
  FENCE_CHAINLINK,
  ROOF_GREY,
  ROOF_TAN,
  TREE_SMALL_ORANGE,
  TREE_SMALL_TEAL,
  TREE_TALL_ORANGE,
  TREE_TALL_TEAL,
  WALL_ORANGE,
  WALL_RED,
  type Direction,
  type NineSlice,
  type WallKit,
} from './spriteIndex';
import {
  ASPHALT_TILE,
  CROSSWALK_H,
  CROSSWALK_V,
  GROUND_TILE,
  MARKET_UMBRELLA_GREEN,
  MARKET_UMBRELLA_ORANGE,
  PATROL_VAN_TILES,
  ROOF_INDUSTRIAL,
  SIDEWALK_TILE,
  WALL_INDUSTRIAL,
} from './spriteIndexCity';

/**
 * THE TOWN, DRAWN.
 *
 * Style Guide 07 asks for limited-palette pixel art, small sprites, big skies —
 * "warm and a little melancholy, suburban dusk". This is that, at the fidelity
 * the budget note allows: shapes and light rather than drawn tiles, with the
 * hand-drawn allowance reserved for portraits, unlock scenes, the broadcast and
 * the final image.
 *
 * Three things it is doing on purpose, all of them theme rather than decoration:
 *
 * 1. **It is always dusk.** Not night, which would be sinister, and not day,
 *    which would be cheerful. Dusk is the hour a kid is still out and should
 *    probably be heading back, and the whole of Act 1 is that feeling.
 *
 * 2. **Windows are lit and the streets are empty.** Every house has somebody
 *    in it and the protagonist is outside all of them. Isolation is the
 *    starting wound (pillar 4), and this is the cheapest possible way to say so
 *    without a line of dialogue.
 *
 * 3. **Language B locations warm the ground around them.** Module 07: resistance
 *    places can shift toward the warmer palette as *pocket environments*,
 *    without re-theming the engine. So the town is cool and the places the crew
 *    have made are the only warm light at street level.
 *
 * Everything is drawn on integer coordinates with smoothing off, because
 * half-pixel edges are what makes pixel art look like scaled vector art.
 */

/** Disciplined sets, per the style guide's checklist. Cool town, warm pockets. */
const PALETTE = {
  skyHigh: '#2b3a55',
  skyMid: '#54617f',
  skyLow: '#8f8397',
  sun: '#d99a6c',
  ground: '#3d4759',
  groundAlt: '#434e61',
  road: '#333c4c',
  roadMajor: '#3a4358',
  roadSecondary: '#363f52',
  roadAlley: '#2d3542',
  roadLine: '#6b7488',
  roadLineFaint: 'rgba(107, 116, 136, 0.32)',
  river: '#2a4a5c',
  riverRipple: 'rgba(180, 220, 230, 0.16)',
  rail: '#2a2620',
  railTie: 'rgba(180, 170, 150, 0.28)',
  roofA: '#2f3a4d',
  wallA: '#4a5468',
  roofB: '#4a2f2a',
  wallB: '#6d4437',
  windowLit: '#f0c07a',
  windowDark: '#2a3242',
  warmGlow: 'rgba(240, 160, 60, 0.10)',
  hereGlow: 'rgba(236, 226, 208, 0.055)',
  curb: '#272e3a',
  crack: 'rgba(20, 24, 32, 0.35)',
  lampPost: '#232935',
  lampGlow: 'rgba(240, 190, 120, 0.9)',
  lampHalo: 'rgba(240, 190, 120, 0.14)',
  chainLink: 'rgba(180, 190, 200, 0.22)',
  chainPost: '#1c2129',
  tag: 'rgba(230, 64, 42, 0.5)',
  grit: 'rgba(0, 0, 0, 0.18)',
  sprite: '#14110f',
  spriteSkin: '#e8c8a8',
  spriteShirt: '#ece2d0',
  spriteBag: '#8a6b4a',
  spriteBagStrap: '#5c4630',
  capCrown: '#1a1a1c',
  capBrim: '#000000',
  outline: '#20262f',
  patrolBody: '#e6402a',
  patrolCab: '#100e0d',
  patrolLight: '#f0c07a',
  patrolRing: 'rgba(230, 64, 42, 0.22)',
  // A cooler, bluer read than the van's red — on foot, but still SafeTrace,
  // still worth telling apart from an ordinary pedestrian at a glance.
  copUniform: '#2e3a52',
  copCap: '#171d29',
  copRing: 'rgba(58, 110, 176, 0.22)',
  camera: '#3f7fe0',
  cameraDark: '#1f3d73',
  treeTrunk: '#3a2c22',
  treeCanopyDark: '#33513c',
  treeCanopy: '#456b4f',
  bush: '#3c5844',
  rockDark: '#454e5c',
  rockLight: '#5c6577',
  hedgeDark: '#38513e',
  hedge: '#48684f',
  atmBody: '#3c7a4e',
  atmDark: '#1f4029',
  phoneBody: '#8a7a5c',
  phoneDark: '#4a4030',
  panelBody: '#4a5468',
  panelDark: '#232935',
  parkedCarBody: '#5a6270',
  parkedCarGlass: '#7d8ea0',
  binBody: '#333a2c',
  binLid: '#242a1f',
  binRust: 'rgba(150, 96, 46, 0.4)',
  bgWall: '#3a4150',
  bgRoof: '#2a2f3a',
  bgWindow: 'rgba(240, 192, 122, 0.32)',
  bgWindowDark: 'rgba(42, 50, 66, 0.6)',
  // A house's own pitched roof, a shade warmer than a civic building's flat
  // inset one — this is somebody's home, not an institution.
  pitchRoofA: '#3a4a3d',
  pitchRoofDarkA: '#2c3830',
  pitchRoofB: '#5a3a2c',
  pitchRoofDarkB: '#452c20',
  doorColor: '#2a3242',
  chimney: '#4a4038',
  porchPost: '#2a3242',
  // The library's columns and pediment — the one building in town dressed
  // up to look civic on purpose.
  pillar: '#c7c2ac',
  pillarShade: '#a8a48f',
  pediment: '#8f8a72',
  // The school's flag and its own sign band.
  flagpole: '#4a5468',
  flag: '#c94a3a',
  schoolSign: '#e8dcc0',
  // The plaza — no roof, just paving, a bandstand and a banner strung
  // between posts.
  pavingLight: '#5a6478',
  pavingDark: '#4c5568',
  bandstandRoof: '#c8532e',
  bandstandPost: '#232935',
  bench: '#5a4530',
  banner: '#e8dcc0',
  bannerText: '#c8532e',
  // The Annex's warehouses and Repair Shop's garage — corrugated roofing,
  // a roll-up door, roof vents.
  corrugated: '#3a2620',
  corrugatedLine: 'rgba(20, 12, 8, 0.4)',
  rollDoor: '#8a7460',
  rollDoorLine: 'rgba(30, 20, 12, 0.5)',
  vent: '#2a3242',
  // Sal's — an awning, a round sign.
  awningRed: '#c8402a',
  awningWhite: '#e8dcc0',
  signRed: '#c8402a',
  // The Arcade — a marquee sign over the door instead of ordinary windows.
  marqueeBody: '#2a1f38',
  marqueeGlow: '#e84ac9',
  marqueeBulb: '#f0c07a',
  // The ballpark — a field, not a building at all.
  fieldGrass: '#3f5a45',
  fieldGrassAlt: '#38513e',
  dirt: '#6d5438',
  dirtLine: '#e8dcc0',
  bleacher: '#4a5468',
  bleacherDark: '#3a4152',
  floodlight: '#e8dcc0',
  // The treehouse — reuses the tree palette above for trunk/canopy, adds
  // its own plank platform, rope and ladder.
  plank: '#6d5030',
  plankDark: '#4a3620',
  rope: '#a89468',
  // Ambient life — a small, cheap palette so the town doesn't look empty
  // between the player and the vans.
  dogBody: '#8a6a4a',
  birdBody: '#2a2f3a',
  catEye: '#e8dcc0',
  junctionBody: '#3a3a2a',
  junctionDark: '#1e1e14',
  junctionStripe: '#e0c020',
  // FLACK Phase Two — a colder, higher hue than the ground patrol's red so
  // the two threats never read as the same thing from a glance.
  droneBody: '#4a4f5c',
  droneRotor: '#9aa4b4',
  droneLight: '#e84ac9',
  droneRing: 'rgba(232, 74, 201, 0.18)',
  droneShadow: 'rgba(0, 0, 0, 0.22)',
} as const;

const px = Math.round;

/** Deterministic per-location noise, so a window doesn't flicker every frame. */
function noise(seed: string): () => number {
  return mulberry32(seedFrom(seed));
}

export function drawTown(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  player: { x: number; y: number },
  facing: { x: number; y: number },
  here: OverworldLocation | null,
  flags: Record<string, unknown>,
  tier: ThresholdTier,
  scale: number,
  playerSize: { w: number; h: number },
  obstacles: Obstacle[],
  sparklingObstacleIds: Set<string>,
  npcs: { x: number; y: number; kind: NpcKind; facing: 1 | -1; id: string }[],
  patrols: { x: number; y: number; radius: number }[],
  cameraNodes: { x: number; y: number; dismantlable: boolean; damaged: boolean }[],
  hackNodes: { x: number; y: number; kind: 'atm' | 'phone' | 'building'; hackable: boolean; damaged: boolean }[],
  junctionBoxNodes: { x: number; y: number; tier: 1 | 2 | 3 | 4 | 5; crackable: boolean; damaged: boolean }[],
  drones: { x: number; y: number; radius: number; takeable: boolean }[],
  cops: { x: number; y: number; radius: number }[],
  moving: boolean,
  now: number,
  boardTier: number,
  confinedToHome: boolean,
) {
  ensureSpriteSheetLoading();

  const vw = canvas.clientWidth;
  const vh = canvas.clientHeight;

  ctx.imageSmoothingEnabled = false;

  drawSky(ctx, vw, vh);

  const camX = clamp(player.x - vw / (2 * scale), 0, Math.max(0, MAP_WIDTH - vw / scale));
  const camY = clamp(player.y - vh / (2 * scale), 0, Math.max(0, MAP_HEIGHT - vh / scale));

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(px(-camX), px(-camY));

  drawGround(ctx, camX, camY, vw, vh, scale);
  drawRoads(ctx);
  drawEdgeGeography(ctx);

  const locations = visibleLocations(flags);

  // Warm pockets first, under everything, so the light sits on the street.
  // A camera doesn't get one — it isn't a place the crew built, it's the
  // thing they're building around.
  for (const loc of locations) if (loc.language === 'B' && loc.render !== 'camera') drawGlow(ctx, loc);

  // A handful of lit islands on an otherwise empty street — before the
  // obstacles/buildings so a building in front of one just occludes it.
  for (const p of STREETLIGHT_POINTS) drawStreetlight(ctx, p);

  for (const obstacle of obstacles) {
    drawObstacle(ctx, obstacle);
    if (sparklingObstacleIds.has(obstacle.id)) drawSparkle(ctx, obstacle, now);
  }
  for (const loc of locations) drawLocation(ctx, loc, here?.id === loc.id, tier, now);

  // Ambient people and animals — decorative only, drawn after locations so
  // a building still occludes them, and well before the player so nothing
  // ambient can ever render on top of the one figure that matters.
  for (const n of npcs) drawNpc(ctx, n.x, n.y, n.kind, n.facing, n.id, now);

  // Ordinary cameras, worth taking apart — the same small box the story pole
  // renders as, so it reads as the same kind of object. `dismantlable` is
  // just whether the player is close enough to act on it right now; a camera
  // on cooldown after a dismantle isn't in this list at all.
  for (const c of cameraNodes) drawSabotageCamera(ctx, c, c.dismantlable, c.damaged, now);

  // ATMs and phone lines — a street hack is visible whether or not the
  // player owns the rig to actually crack it, same as a locked door is
  // still a door; the prompt itself is what says no.
  for (const h of hackNodes) drawStreetHack(ctx, h, now);

  // Junction boxes — always visible, on cooldown or not, same "locked door
  // is still a door" rule everything else on this list follows.
  for (const j of junctionBoxNodes) drawJunctionBox(ctx, j, now);

  // Detection rings under the vans, so a van sitting still doesn't visually
  // "arrive" on top of its own danger zone.
  for (const patrol of patrols) drawPatrolRing(ctx, patrol);
  for (const patrol of patrols) drawPatrol(ctx, patrol);

  // Officers on foot — same ring-first ground-level treatment as the vans.
  for (const cop of cops) drawCopRing(ctx, cop);
  for (const cop of cops) drawCop(ctx, cop.x, cop.y);

  // Drone shadows and rings at street level — the same "ring first so the
  // danger zone doesn't visually arrive with the object" rule the vans get.
  for (const drone of drones) drawDroneShadow(ctx, drone.x, drone.y);
  for (const drone of drones) drawDroneRing(ctx, drone);

  drawPlayer(ctx, player, facing, playerSize, moving, now, boardTier);

  // The drone bodies themselves render above the player, not under —
  // they're in the air, not on the street, and the one thing everything
  // else on this canvas keeps to ("player always on top") is about ground
  // traffic, not airspace.
  for (const drone of drones) drawDrone(ctx, drone, now, drone.takeable);

  // The opening's own beat: before the first prompt is ever tapped, the
  // player is inside the house, not standing on it — drawn over the
  // sprite rather than under it, so only whatever's lined up behind an
  // actual window shows through. See `drawHomeInteriorMask`.
  if (confinedToHome) {
    const home = locations.find((l) => l.id === HOME_LOCATION_ID);
    if (home) drawHomeInteriorMask(ctx, home);
  }

  ctx.restore();
}

/**
 * Maze filler: terrain, not architecture — no name, no lit windows, no "you
 * are here" outline, because it isn't a place, it's the town's edges. This
 * used to be drawn as a small unnamed building, which read as a mistake
 * (a house nobody lives in, never lit) rather than as scenery. `kind`
 * dispatches to one of four cheap, flat shapes, matching the sprite budget
 * everything else on this canvas keeps to.
 */
function drawObstacle(ctx: CanvasRenderingContext2D, obstacle: Obstacle) {
  switch (obstacle.kind) {
    case 'tree':
      return drawTree(ctx, obstacle);
    case 'bush':
      return drawBush(ctx, obstacle);
    case 'rock':
      return drawRock(ctx, obstacle);
    case 'hedge':
      return drawHedge(ctx, obstacle);
    case 'fence':
      return drawFence(ctx, obstacle);
    case 'car':
      return drawParkedCar(ctx, obstacle);
    case 'bin':
      return drawBin(ctx, obstacle);
    case 'building':
      return drawDecorativeBuilding(ctx, obstacle);
  }
}

/**
 * A very slight glimmer over a bush that still has something in it — one
 * soft pixel that brightens and fades on a slow cycle, offset per-obstacle
 * (`noise`) so a whole hedge of them doesn't pulse in lockstep. Deliberately
 * subtle: it's a reason to look twice at a particular bush, not a marker
 * that announces it from across the street.
 */
function drawSparkle(ctx: CanvasRenderingContext2D, o: Obstacle, now: number) {
  const offset = noise(`sparkle:${o.id}`)() * 2000;
  const t = ((now + offset) % 2200) / 2200;
  const twinkle = Math.max(0, Math.sin(t * Math.PI * 2));
  if (twinkle < 0.05) return;
  ctx.globalAlpha = 0.15 + twinkle * 0.4;
  ctx.fillStyle = PALETTE.windowLit;
  ctx.fillRect(px(o.x + o.w * 0.5) - 1, px(o.y + o.h * 0.2) - 1, 2, 2);
  ctx.globalAlpha = 1;
}

/** A two-tile sprite stack (canopy over canopy+trunk) when the sheet's
 * loaded; the old two-disc procedural tree while it isn't. Palette (teal
 * vs. the pack's autumn orange) and height (tall vs. small) are both picked
 * once per obstacle id, purely for variety — a whole street of identical
 * trees reads as tiled wallpaper, a mix doesn't. */
function drawTree(ctx: CanvasRenderingContext2D, o: Obstacle) {
  if (spriteSheetReady()) {
    const cx = o.x + o.w / 2;
    const tall = noise(`tree-height:${o.id}`)() < 0.6;
    const teal = noise(`tree-palette:${o.id}`)() < 0.75;
    const set = tall ? (teal ? TREE_TALL_TEAL : TREE_TALL_ORANGE) : teal ? TREE_SMALL_TEAL : TREE_SMALL_ORANGE;
    const halfH = o.h / 2;
    drawSpriteTile(ctx, set.top, cx, o.y + halfH / 2, o.w, halfH);
    drawSpriteTile(ctx, set.base, cx, o.y + halfH + halfH / 2, o.w, halfH);
    return;
  }

  const cx = o.x + o.w / 2;
  const trunkW = Math.max(4, o.w * 0.14);
  const trunkH = o.h * 0.32;

  ctx.fillStyle = PALETTE.treeTrunk;
  ctx.fillRect(px(cx - trunkW / 2), px(o.y + o.h - trunkH), px(trunkW), px(trunkH));

  const r = o.w / 2;
  const cy = o.y + o.h - trunkH - r * 0.55;
  ctx.fillStyle = PALETTE.treeCanopyDark;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.treeCanopy;
  ctx.beginPath();
  ctx.arc(cx - r * 0.28, cy - r * 0.22, r * 0.68, 0, Math.PI * 2);
  ctx.fill();
}

/** A cluster of overlapping blobs, seeded per-obstacle so it doesn't
 * reshuffle every frame but still varies from one bush to the next. */
function drawBush(ctx: CanvasRenderingContext2D, o: Obstacle) {
  if (spriteSheetReady()) {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    const idx = noise(`bush-palette:${o.id}`)() < 0.7 ? BUSH_TEAL : BUSH_ORANGE;
    drawSpriteTile(ctx, idx, cx, cy, o.w, o.h);
    return;
  }

  const rand = noise(`bush:${o.id}`);
  ctx.fillStyle = PALETTE.bush;
  for (let i = 0; i < 5; i++) {
    const bx = o.x + o.w * (0.18 + 0.64 * rand());
    const by = o.y + o.h * (0.35 + 0.55 * rand());
    const r = Math.min(o.w, o.h) * (0.24 + 0.14 * rand());
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** An irregular polygon rather than a circle — a rock is the one shape here
 * that should not read as a soft blob. */
function drawRock(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const rand = noise(`rock:${o.id}`);
  const cx = o.x + o.w / 2;
  const cy = o.y + o.h * 0.62;
  const spikes = 7;

  ctx.fillStyle = PALETTE.rockDark;
  ctx.beginPath();
  for (let i = 0; i < spikes; i++) {
    const angle = (i / spikes) * Math.PI * 2;
    const r = (Math.min(o.w, o.h) / 2) * (0.7 + 0.3 * rand());
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r * 0.7;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = PALETTE.rockLight;
  ctx.beginPath();
  ctx.arc(cx - o.w * 0.16, cy - o.h * 0.18, Math.min(o.w, o.h) * 0.16, 0, Math.PI * 2);
  ctx.fill();
}

/** A trimmed, flat-topped row — the one obstacle shape that's deliberately
 * architectural in silhouette (a straight edge), since a hedge is planted in
 * a line on purpose. */
function drawHedge(ctx: CanvasRenderingContext2D, o: Obstacle) {
  ctx.fillStyle = PALETTE.hedgeDark;
  ctx.fillRect(o.x, o.y, o.w, o.h);
  ctx.fillStyle = PALETTE.hedge;
  ctx.fillRect(o.x, o.y, o.w, px(o.h * 0.4));

  const rand = noise(`hedge:${o.id}`);
  ctx.fillStyle = PALETTE.hedgeDark;
  for (let i = 0; i < Math.floor(o.w / 12); i++) {
    const dx = o.x + rand() * o.w;
    const dy = o.y + o.h * 0.5 + rand() * o.h * 0.4;
    ctx.fillRect(px(dx), px(dy), 2, 2);
  }
}

/**
 * A background building — the fill-out pass's whole point: an empty block
 * reads as a gap in the town, and a building in it (even a mute one) reads
 * as more town. Deliberately duller and flatter than `drawBuilding`: no
 * colour band, no "you are here" outline, windows a third as bright — a
 * background layer that never competes with an actual, interactive
 * location for the eye. `noise` keyed on the obstacle's own id, same as
 * every other obstacle, so it doesn't reshuffle every frame.
 */
function drawDecorativeBuilding(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const roofH = 12;

  ctx.fillStyle = PALETTE.bgWall;
  ctx.fillRect(o.x, o.y + roofH, o.w, o.h - roofH);
  ctx.fillStyle = PALETTE.bgRoof;
  ctx.fillRect(o.x + 3, o.y, o.w - 6, roofH);

  const rand = noise(`deco:${o.id}`);
  const w = 7;
  const h = 9;
  const gap = 9;
  const top = o.y + roofH + 6;
  const cols = Math.max(1, Math.floor((o.w - gap) / (w + gap)));
  const rows = Math.max(1, Math.floor((o.h - roofH - 14) / (h + gap)));
  const startX = o.x + px((o.w - (cols * (w + gap) - gap)) / 2);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = rand() < 0.22 ? PALETTE.bgWindow : PALETTE.bgWindowDark;
      ctx.fillRect(startX + c * (w + gap), top + r * (h + gap), w, h);
    }
  }
}

/** Chain-link, the one obstacle that reads as industrial rather than grown —
 * posts at each end and a diamond lattice between, standing in for the
 * fencing Act 1's Annex Fence ambient text already talks about. The one
 * texture on this canvas that isn't organic on purpose: the Annex is the
 * district that got fenced. */
function drawFence(ctx: CanvasRenderingContext2D, o: Obstacle) {
  if (spriteSheetReady()) {
    drawWallBand(ctx, FENCE_CHAINLINK, o.x, o.y, o.w, o.h);
    return;
  }

  ctx.strokeStyle = PALETTE.chainPost;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px(o.x + 2), px(o.y));
  ctx.lineTo(px(o.x + 2), px(o.y + o.h));
  ctx.moveTo(px(o.x + o.w - 2), px(o.y));
  ctx.lineTo(px(o.x + o.w - 2), px(o.y + o.h));
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.rect(o.x, o.y, o.w, o.h);
  ctx.clip();
  ctx.strokeStyle = PALETTE.chainLink;
  ctx.lineWidth = 1;
  const mesh = 8;
  const diag = o.w + o.h;
  ctx.beginPath();
  for (let d = -o.h; d <= diag; d += mesh) {
    ctx.moveTo(px(o.x + d), px(o.y));
    ctx.lineTo(px(o.x + d + o.h), px(o.y + o.h));
  }
  for (let d = -o.h; d <= diag; d += mesh) {
    ctx.moveTo(px(o.x + d), px(o.y + o.h));
    ctx.lineTo(px(o.x + d + o.h), px(o.y));
  }
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = PALETTE.chainPost;
  ctx.fillRect(px(o.x), px(o.y + o.h - 3), o.w, 3);
}

/** A parked car, kerbside — a flat body and a glass strip, no wheel nubs and
 * no windshield stroke the way `drawBeater` gets: this one isn't going
 * anywhere, and the plainer shape is the tell that it's furniture, not a
 * vehicle either the player or a patrol will ever occupy. */
function drawParkedCar(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const x = px(o.x);
  const y = px(o.y);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x - 1, y + o.h - 1, o.w + 2, 2);

  if (spriteSheetReady()) {
    const idx = CAR_TILES[Math.floor(noise(`car:${o.id}`)() * CAR_TILES.length)];
    drawSpriteTile(ctx, idx, x + o.w / 2, y + o.h / 2, o.w, o.h);
    return;
  }

  ctx.fillStyle = PALETTE.parkedCarBody;
  ctx.fillRect(x, y, o.w, o.h);
  ctx.fillStyle = PALETTE.parkedCarGlass;
  ctx.fillRect(x + o.w * 0.2, y + 2, o.w * 0.6, o.h - 4);

  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, o.w + 1, o.h + 1);
}

/** A dumpster/bin: a dark box, a lid line, and a rust smear — the one piece
 * of furniture that leans into the Annex's own grit rather than every
 * district's, though nothing stops it turning up elsewhere. */
function drawBin(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const x = px(o.x);
  const y = px(o.y);

  if (spriteSheetReady()) {
    drawSpriteTile(ctx, BIN_DUMPSTER, x + o.w / 2, y + o.h / 2, o.w, o.h);
    return;
  }

  ctx.fillStyle = PALETTE.binBody;
  ctx.fillRect(x, y, o.w, o.h);
  ctx.fillStyle = PALETTE.binLid;
  ctx.fillRect(x, y, o.w, px(o.h * 0.3));
  ctx.fillStyle = PALETTE.binRust;
  ctx.fillRect(x + 1, y + o.h - 5, o.w - 2, 4);

  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, o.w + 1, o.h + 1);
}

/**
 * The danger zone, shown rather than hidden — Heat System guardrail 2 says
 * nothing charges Heat without showing it first, and a patrol's radius is
 * exactly that kind of cost. A soft filled disc, not an outline, so it reads
 * as "ground you're visible from" rather than a targeting reticle.
 */
function drawPatrolRing(ctx: CanvasRenderingContext2D, patrol: { x: number; y: number; radius: number }) {
  ctx.fillStyle = PALETTE.patrolRing;
  ctx.beginPath();
  ctx.arc(patrol.x, patrol.y, patrol.radius, 0, Math.PI * 2);
  ctx.fill();
}

/** A SafeTrace van: a body, a darker cab end, two headlights. Small and flat,
 * matching the sprite budget everything else here keeps to. */
/** The SafeTrace van — a real sprite once the city sheet's loaded (a
 * front-facing utility truck, grey rather than any personal car's colour,
 * reading as institutional the same way the old flat `patrolBody` red
 * rectangle was trying to). The old procedural shape stays as the
 * loading-state fallback. */
function drawPatrol(ctx: CanvasRenderingContext2D, patrol: { x: number; y: number }) {
  if (citySheetReady()) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(px(patrol.x - 9), px(patrol.y + 11), 18, 3);
    drawTileBlock(ctx, PATROL_VAN_TILES, patrol.x, patrol.y, drawCityTileAt);
    return;
  }

  const w = 16, h = 10;
  const x = px(patrol.x - w / 2);
  const y = px(patrol.y - h / 2);

  ctx.fillStyle = PALETTE.patrolBody;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PALETTE.patrolCab;
  ctx.fillRect(x + w - 5, y, 5, h);
  ctx.fillStyle = PALETTE.patrolLight;
  ctx.fillRect(x, y + 1, 2, 2);
  ctx.fillRect(x, y + h - 3, 2, 2);

  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
}

function drawCopRing(ctx: CanvasRenderingContext2D, cop: { x: number; y: number; radius: number }) {
  ctx.fillStyle = PALETTE.copRing;
  ctx.beginPath();
  ctx.arc(cop.x, cop.y, cop.radius, 0, Math.PI * 2);
  ctx.fill();
}

/** An officer on foot — a pedestrian's own silhouette (`drawPedestrian`),
 * but in a fixed uniform colour rather than a randomised shirt, and with
 * a cap brim on top: the one detail that reads "official" at this scale
 * without needing a badge nobody could actually see. */
function drawCop(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const cx = px(x);
  const feetY = px(y);
  const bodyW = 7;
  const bodyH = 10;
  const headR = 2.5;

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(cx - 4, feetY, 8, 2);

  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(cx - bodyW / 2 - 1, feetY - bodyH - 1, bodyW + 2, bodyH + 2);
  ctx.fillStyle = PALETTE.copUniform;
  ctx.fillRect(cx - bodyW / 2, feetY - bodyH, bodyW, bodyH);

  ctx.fillStyle = PALETTE.spriteSkin;
  ctx.beginPath();
  ctx.arc(cx, feetY - bodyH - headR, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = PALETTE.copCap;
  ctx.fillRect(cx - headR - 1, feetY - bodyH - headR * 2 - 1, headR * 2 + 2, 2);
}

/** How far above its own ground shadow a drone hovers — just enough that
 * the shadow reads as cast light rather than as the drone's own outline. */
const DRONE_ALTITUDE = 9;

function drawDroneRing(ctx: CanvasRenderingContext2D, drone: { x: number; y: number; radius: number }) {
  ctx.fillStyle = PALETTE.droneRing;
  ctx.beginPath();
  ctx.arc(drone.x, drone.y, drone.radius, 0, Math.PI * 2);
  ctx.fill();
}

/** Cast on the ground, not under the body — the one thing that tells the
 * player it's actually airborne rather than a very square bird. */
function drawDroneShadow(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = PALETTE.droneShadow;
  ctx.beginPath();
  ctx.ellipse(px(x), px(y), 5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * A quadcopter: a small body, four rotor blurs (a soft circle rather than
 * spokes — at this size a spinning blade reads as a smear, not a shape),
 * and a status light that blinks whether or not the player is close enough
 * to act on it. `takeable` adds the same soft-glow "you can act on this"
 * treatment every other point object on the map gets once it's in reach.
 */
function drawDrone(ctx: CanvasRenderingContext2D, drone: { x: number; y: number }, now: number, takeable: boolean) {
  const cx = px(drone.x);
  const cy = px(drone.y) - DRONE_ALTITUDE;
  const armR = 6;

  if (takeable) drawSoftGlow(ctx, cx, cy, armR + 1, 3, 3);

  ctx.fillStyle = PALETTE.droneRotor;
  for (const [dx, dy] of [
    [-armR, -armR],
    [armR, -armR],
    [-armR, armR],
    [armR, armR],
  ]) {
    ctx.beginPath();
    ctx.arc(cx + dx, cy + dy, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = PALETTE.droneRotor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - armR, cy - armR);
  ctx.lineTo(cx + armR, cy + armR);
  ctx.moveTo(cx + armR, cy - armR);
  ctx.lineTo(cx - armR, cy + armR);
  ctx.stroke();

  ctx.fillStyle = PALETTE.droneBody;
  ctx.fillRect(cx - 4, cy - 3, 8, 6);
  ctx.strokeStyle = PALETTE.outline;
  ctx.strokeRect(cx - 4.5, cy - 3.5, 9, 7);

  // A blink, not a steady glow — same on/off read as a camera's own status
  // light elsewhere, so "watching" always looks like the same thing.
  if (Math.floor(now / 500) % 2 === 0) {
    ctx.fillStyle = PALETTE.droneLight;
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
  }
}

/**
 * Big skies. A gradient, a low sun band that never quite sets, and nothing
 * else — no clouds, because a moving sky would pull the eye away from a screen
 * whose whole job is to be quiet.
 */
function drawSky(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, vh);
  sky.addColorStop(0, PALETTE.skyHigh);
  sky.addColorStop(0.5, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, vw, vh);

  // The last of the light, flat across the horizon. One band, no glow.
  ctx.fillStyle = PALETTE.sun;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, px(vh * 0.62), vw, 2);
  ctx.globalAlpha = 1;
}

/**
 * Ground, dithered in two tones on a fixed grid. A checker at this scale reads
 * as texture rather than as a pattern, and it is what stops a large flat area
 * looking like a missing asset.
 */
/**
 * Blend two hex colours (`#rrggbb`) by `t` (0 = all `a`, 1 = all `b`).
 * Ground tints below derive from each district's own accent colour instead
 * of a hand-picked hex pair per zone — eight districts would otherwise be
 * eight more PALETTE entries to keep in sync by hand every time the layout
 * changes, and this can't drift the way a parallel hand-authored list could.
 */
function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 0xff, ag = (pa >> 8) & 0xff, ab = pa & 0xff;
  const br = (pb >> 16) & 0xff, bg = (pb >> 8) & 0xff, bb = pb & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b2).toString(16).slice(1)}`;
}

/**
 * A whisper of each district's own accent colour worked into its ground —
 * `DISTRICTS` (world/locations.ts) carries the accent every legend/HUD
 * surface already uses; blending it faintly (12%/18%) into the default
 * ground/groundAlt pair is what makes a neighbourhood read as "its own
 * patch of pavement" without the map looking painted in blocks the way a
 * full-saturation fill would. Computed once at module load, not per frame.
 */
const DISTRICT_GROUND_TINTS = DISTRICTS.map((d) => ({
  ...d,
  base: mixHex(PALETTE.ground, d.color, 0.12),
  alt: mixHex(PALETTE.groundAlt, d.color, 0.18),
}));

/**
 * The ground/road tile grid — the first piece of the map that's a real
 * grid instead of floating-point rects with sprites patched onto them
 * after the fact. `GRID_TILE` matches the sheet's own 16px so cells line
 * up with the sprite pixels exactly; `surfaceGrid()` rasterizes the
 * *existing* `ROAD_SEGMENTS`/`DIAGONAL_ROADS` onto it once, lazily, on
 * first use rather than at module load (those are declared further down
 * this file — a function body can reference a later `const` freely since
 * nothing calls it until well after the whole module has finished
 * evaluating, but an eager top-level initializer here couldn't).
 * Locations, obstacles, and every route/coverage system downstream of
 * them are untouched — this only decides what the ground *looks like*.
 */
const GRID_TILE = TILE;
const GRID_COLS = Math.ceil(MAP_WIDTH / GRID_TILE);
const GRID_ROWS = Math.ceil(MAP_HEIGHT / GRID_TILE);

let surfaceGridCache: (RoadTier | null)[][] | null = null;

function surfaceGrid(): (RoadTier | null)[][] {
  if (surfaceGridCache) return surfaceGridCache;
  const grid: (RoadTier | null)[][] = Array.from({ length: GRID_ROWS }, () => new Array<RoadTier | null>(GRID_COLS).fill(null));

  for (const road of ROAD_SEGMENTS) {
    const c0 = Math.max(0, Math.floor(road.x / GRID_TILE));
    const c1 = Math.min(GRID_COLS - 1, Math.floor((road.x + road.w - 1) / GRID_TILE));
    const r0 = Math.max(0, Math.floor(road.y / GRID_TILE));
    const r1 = Math.min(GRID_ROWS - 1, Math.floor((road.y + road.h - 1) / GRID_TILE));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) grid[r][c] = road.tier;
    }
  }

  // The one rotated segment: an inverse-rotate point test per candidate
  // cell rather than teaching the grid about angles anywhere else.
  for (const { cx, cy, length, angleDeg } of DIAGONAL_ROADS) {
    const half = length / 2;
    const halfW = ROAD_WIDTH.local / 2;
    const rad = (-angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const reach = Math.ceil((half + halfW) / GRID_TILE) + 1;
    const cCenter = Math.floor(cx / GRID_TILE);
    const rCenter = Math.floor(cy / GRID_TILE);
    for (let r = Math.max(0, rCenter - reach); r <= Math.min(GRID_ROWS - 1, rCenter + reach); r++) {
      for (let c = Math.max(0, cCenter - reach); c <= Math.min(GRID_COLS - 1, cCenter + reach); c++) {
        const dx = c * GRID_TILE + GRID_TILE / 2 - cx;
        const dy = r * GRID_TILE + GRID_TILE / 2 - cy;
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        // Tagged 'secondary' — the tier `drawDiagonalRoad` already paints
        // this segment with (`PALETTE.roadSecondary`); there's no separate
        // tier field on a diagonal to read instead.
        if (Math.abs(lx) <= half && Math.abs(ly) <= halfW) grid[r][c] = 'secondary';
      }
    }
  }

  surfaceGridCache = grid;
  return grid;
}

/** Every road tier gets plain asphalt underneath — `drawRoads`' own
 * centreline/crack/pedestrian-dot overlays already carry the tier
 * distinction, tuned per tier; this only decides asphalt vs. paver vs.
 * bare ground. `path` gets the paver tile (pedestrian paths were always
 * "gravel, not asphalt" per the road hierarchy's own doc comment). */
function groundTileFor(tier: RoadTier | null): number {
  if (tier === 'path') return SIDEWALK_TILE;
  if (tier) return ASPHALT_TILE;
  return GROUND_TILE;
}

function drawGroundGrid(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number, scale: number) {
  const grid = surfaceGrid();
  const c0 = Math.max(0, Math.floor(camX / GRID_TILE));
  const c1 = Math.min(GRID_COLS - 1, Math.ceil((camX + vw / scale) / GRID_TILE));
  const r0 = Math.max(0, Math.floor(camY / GRID_TILE));
  const r1 = Math.min(GRID_ROWS - 1, Math.ceil((camY + vh / scale) / GRID_TILE));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      drawCityTileAt(ctx, groundTileFor(grid[r][c]), c * GRID_TILE, r * GRID_TILE);
    }
  }

  // Each district's own accent colour, as a faint wash over the real
  // texture now underneath it — same 12% strength `DISTRICT_GROUND_TINTS`
  // blended into a flat fill before; a wash over a tile serves the same
  // "this patch of pavement is its own neighbourhood" cue.
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.color;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(d.x, d.y, d.w, d.h);
  }
  ctx.globalAlpha = 1;
}

function drawGround(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number, scale: number) {
  if (citySheetReady()) {
    drawGroundGrid(ctx, camX, camY, vw, vh, scale);
    return;
  }

  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  ctx.fillStyle = PALETTE.groundAlt;
  for (let y = 0; y < MAP_HEIGHT; y += 8) {
    for (let x = ((y / 8) % 2) * 8; x < MAP_WIDTH; x += 16) {
      ctx.fillRect(x, y, 8, 8);
    }
  }

  for (const d of DISTRICT_GROUND_TINTS) {
    ctx.fillStyle = d.base;
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = d.alt;
    // Same global checker parity (`(y/8)%2`) the default pass above uses,
    // clipped to just this district's own rect, so the pattern's seams
    // stay continuous crossing from one zone's ground into the next
    // rather than visibly resetting at the boundary.
    const startY = Math.floor(d.y / 8) * 8;
    for (let y = startY; y < d.y + d.h; y += 8) {
      const rowStartX = ((y / 8) % 2) * 8;
      const startX = Math.floor((d.x - rowStartX) / 16) * 16 + rowStartX;
      for (let x = startX; x < d.x + d.w; x += 16) {
        if (x + 8 <= d.x || x >= d.x + d.w) continue;
        ctx.fillRect(Math.max(x, d.x), y, Math.min(x + 8, d.x + d.w) - Math.max(x, d.x), 8);
      }
    }
  }
}

/**
 * The road hierarchy the district redesign asked for: a street's width and
 * mood are supposed to tell the player something before they've read a
 * single sign. `tier` is the whole of that:
 *
 * - `major` — the two arterials that cross at the Downtown Crossroads.
 *   Widest, brightest, a hard dashed centreline. Fast, watched, exactly
 *   where a camera cluster and a patrol beat belong.
 * - `secondary` — the two roads bounding the Warehouse/Commercial column.
 *   Real streets, a step down in width and a fainter, sparser centreline.
 * - `local` — the streets inside a district's own blocks. No centreline —
 *   at this width painting one would read as a major road shrunk down
 *   rather than a different kind of street.
 * - `alley` — the shortcuts. Narrow, dark, textured rather than painted
 *   flat, no centreline, and deliberately placed alongside the obstacle
 *   layer's own tree cover so cutting through one is the quiet route in
 *   more than just colour (`systems/pursuit.ts` `underTreeCover`).
 * - `path` — pedestrian paths through Riverside Park, connecting districts
 *   the way a real park cut-through does. Thinnest, dotted, no fill mood
 *   at all — gravel, not asphalt.
 *
 * Every segment is a plain rect; roads carry no collision (Overworld.tsx's
 * collision only ever checks `LOCATIONS`/solid `OBSTACLES`), so a segment
 * spanning the whole map costs nothing extra and a short dead-end costs
 * nothing to leave unconnected. `DIAGONAL_ROADS` below is the one
 * exception — a couple of rotated segments for the "not everything is a
 * rectangle" texture the build note asked for, kept as a short, separate
 * list rather than teaching every consumer of `ROAD_SEGMENTS` about angles
 * it will almost never need.
 */
export type RoadTier = 'major' | 'secondary' | 'local' | 'alley' | 'path';

interface RoadSegment {
  x: number;
  y: number;
  w: number;
  h: number;
  tier: RoadTier;
}

const ROAD_WIDTH: Record<RoadTier, number> = { major: 44, secondary: 32, local: 20, alley: 11, path: 6 };

const ROAD_SEGMENTS: RoadSegment[] = [
  // The two majors — cross at (500,364), the Downtown Crossroads.
  { x: 478, y: 0, w: ROAD_WIDTH.major, h: MAP_HEIGHT, tier: 'major' },
  { x: 0, y: 342, w: MAP_WIDTH, h: ROAD_WIDTH.major, tier: 'major' },
  // The two secondaries — bound the Warehouse/Commercial column.
  { x: 1084, y: 0, w: ROAD_WIDTH.secondary, h: MAP_HEIGHT, tier: 'secondary' },
  { x: 0, y: 740, w: MAP_WIDTH, h: ROAD_WIDTH.secondary, tier: 'secondary' },

  // Local streets — inside each district's own blocks.
  { x: 0, y: 210, w: 440, h: ROAD_WIDTH.local, tier: 'local' }, // Residential North's own street
  { x: 700, y: 220, w: 170, h: ROAD_WIDTH.local, tier: 'local' }, // Downtown, Square to Marlow Street
  { x: 1128, y: 190, w: 472, h: ROAD_WIDTH.local, tier: 'local' }, // Warehouse Row 1
  { x: 1128, y: 530, w: 472, h: ROAD_WIDTH.local, tier: 'local' }, // Warehouse Row 2
  { x: 0, y: 520, w: 440, h: ROAD_WIDTH.local, tier: 'local' }, // West End
  { x: 528, y: 920, w: 544, h: ROAD_WIDTH.local, tier: 'local' }, // South Residential
  { x: 1128, y: 920, w: 472, h: ROAD_WIDTH.local, tier: 'local' }, // Commercial Strip
  { x: 40, y: 960, w: 160, h: ROAD_WIDTH.local, tier: 'local' }, // Transit Hub — a stub, not a through
  // Residential North's own cul-de-sac — a dead end off the district
  // street above, one of the "occasional dead ends" the brief asked for.
  { x: 380, y: 230, w: ROAD_WIDTH.local, h: 90, tier: 'local' },

  // Alleys — the shortcuts. See the tier comment above for why these matter
  // more than their width suggests.
  { x: 166, y: 430, w: 54, h: 90, tier: 'alley' }, // West End: Repair Shop <-> Wash & Fold, their own "cut through the laundromat"
  { x: 1340, y: 410, w: ROAD_WIDTH.alley, h: 220, tier: 'alley' }, // Warehouse: a quiet cut behind Annex Fence
  { x: 780, y: 164, w: ROAD_WIDTH.alley, h: 46, tier: 'alley' }, // Downtown: School's south side to Marlow Street, off the plaza
  { x: 348, y: 40, w: ROAD_WIDTH.alley, h: 160, tier: 'alley' }, // Residential North: the rear yards behind Ellen's

  // Pedestrian paths — Riverside Park's own connective tissue.
  { x: 472, y: 500, w: ROAD_WIDTH.major + 56, h: ROAD_WIDTH.path, tier: 'path' }, // West End into the park
  { x: 745, y: 500, w: 45, h: ROAD_WIDTH.path, tier: 'path' }, // Ballpark to the Green
  { x: 780, y: 650, w: ROAD_WIDTH.path, h: 90, tier: 'path' }, // the park south, toward South Residential
];

/**
 * A rotated rect — `ctx.save/translate/rotate/fillRect/restore` rather than
 * hand-authored path data (a plain rect rotated in place is one transform,
 * not a shape worth a bespoke path). The one deliberate exception to "every
 * road is axis-aligned": a diagonal corner-cut is real texture, but not
 * worth teaching the whole road model — and place, obstacle, patrol-route
 * and connectivity code all only ever look at `LOCATIONS`/solid
 * `OBSTACLES`, never at the road layer, so a diagonal here touches nothing
 * downstream.
 */
function drawDiagonalRoad(ctx: CanvasRenderingContext2D, cx: number, cy: number, length: number, angleDeg: number) {
  ctx.save();
  ctx.translate(px(cx), px(cy));
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.fillStyle = PALETTE.roadSecondary;
  ctx.fillRect(-length / 2, -ROAD_WIDTH.local / 2, length, ROAD_WIDTH.local);
  ctx.restore();
}

/** One corner-cut, at the seam between Downtown and Riverside Park — the
 * "10-15% weird geometry" the build note asked for, spent in one place
 * rather than spread thin enough to disappear. */
const DIAGONAL_ROADS: { cx: number; cy: number; length: number; angleDeg: number }[] = [
  { cx: 610, cy: 420, length: 130, angleDeg: -35 },
];

/** Streets, with a broken centre line on `major`/`secondary` tiers only —
 * at `local` width and below a painted centreline reads as a shrunk major
 * road, not a different kind of street. */
function drawRoads(ctx: CanvasRenderingContext2D) {
  // The surface itself is `drawGroundGrid`'s job once the sheet's loaded
  // (`surfaceGrid()` rasterizes these same `ROAD_SEGMENTS`/`DIAGONAL_ROADS`
  // onto the tile grid) — everything below is the overlay that was always
  // layered on top of a flat fill and still is, just on top of asphalt now.
  if (!citySheetReady()) {
    for (const road of ROAD_SEGMENTS) {
      ctx.fillStyle =
        road.tier === 'major' ? PALETTE.roadMajor
        : road.tier === 'secondary' ? PALETTE.roadSecondary
        : road.tier === 'alley' ? PALETTE.roadAlley
        : road.tier === 'path' ? PALETTE.curb
        : PALETTE.road;
      ctx.fillRect(road.x, road.y, road.w, road.h);
    }

    for (const { cx, cy, length, angleDeg } of DIAGONAL_ROADS) drawDiagonalRoad(ctx, cx, cy, length, angleDeg);
  }

  ctx.globalAlpha = 0.5;
  for (const road of ROAD_SEGMENTS) {
    if (road.tier !== 'major' && road.tier !== 'secondary') continue;
    ctx.fillStyle = road.tier === 'major' ? PALETTE.roadLine : PALETTE.roadLineFaint;
    const dash = road.tier === 'major' ? 20 : 32;
    if (road.h > road.w) {
      // vertical segment
      const cx = road.x + road.w / 2 - 1;
      for (let y = road.y + 4; y < road.y + road.h; y += dash) ctx.fillRect(cx, y, 2, 8);
    } else {
      const cy = road.y + road.h / 2 - 1;
      for (let x = road.x + 4; x < road.x + road.w; x += dash) ctx.fillRect(x, cy, 8, 2);
    }
  }
  ctx.globalAlpha = 1;

  // Pedestrian paths get a dotted gravel tread instead of a centreline.
  ctx.fillStyle = PALETTE.curb;
  for (const road of ROAD_SEGMENTS) {
    if (road.tier !== 'path') continue;
    if (road.w > road.h) {
      for (let x = road.x + 4; x < road.x + road.w; x += 14) ctx.fillRect(x, road.y + road.h / 2 - 1, 3, 2);
    } else {
      for (let y = road.y + 4; y < road.y + road.h; y += 14) ctx.fillRect(road.x + road.w / 2 - 1, y, 2, 3);
    }
  }

  drawCracks(ctx);
  if (citySheetReady()) drawCrossroadsCrosswalks(ctx);
}

/**
 * Real zebra stripes, hand-placed at the Downtown Crossroads only — the
 * one intersection the story already treats as the town's busiest corner
 * (a camera cluster and a patrol beat both live here). Not a general road-
 * marking system: the other ~20 intersections in town stay exactly as
 * they are, plain asphalt. One short strip on each of the four legs,
 * oriented so the stripes always run parallel to that leg's own road.
 */
function drawCrossroadsCrosswalks(ctx: CanvasRenderingContext2D) {
  const roadX = 478;
  const roadW = ROAD_WIDTH.major;
  const roadY = 342;
  const roadH = ROAD_WIDTH.major;

  const vStripX = roadX + roadW / 2 - (3 * TILE) / 2;
  for (let i = 0; i < 3; i++) {
    drawCityTileAt(ctx, CROSSWALK_V, vStripX + i * TILE, roadY - TILE);
    drawCityTileAt(ctx, CROSSWALK_V, vStripX + i * TILE, roadY + roadH);
  }

  const hStripY = roadY + roadH / 2 - (3 * TILE) / 2;
  for (let i = 0; i < 3; i++) {
    drawCityTileAt(ctx, CROSSWALK_H, roadX - TILE, hStripY + i * TILE);
    drawCityTileAt(ctx, CROSSWALK_H, roadX + roadW, hStripY + i * TILE);
  }
}

/** Hairline cracks in the asphalt — fixed per road segment (seeded on its own
 * coordinates, not per-frame) so a street reads as old rather than new,
 * without ever reshuffling under the player's feet. Cheap grit: a handful of
 * short broken lines, not a texture pass. Only major/secondary roads get
 * them — an alley or a path is already rough by design. */
function drawCracks(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = PALETTE.crack;
  ctx.lineWidth = 1;
  for (const road of ROAD_SEGMENTS) {
    if (road.tier !== 'major' && road.tier !== 'secondary') continue;
    const rand = noise(`crack:${road.x}:${road.y}`);
    const vertical = road.h > road.w;
    for (let i = 0; i < 6; i++) {
      if (vertical) {
        const cy = road.y + rand() * road.h;
        const len = 6 + rand() * 10;
        const branch = (rand() - 0.5) * 10;
        ctx.beginPath();
        ctx.moveTo(px(road.x + 4 + rand() * (road.w - 8)), px(cy));
        ctx.lineTo(px(road.x + 4 + rand() * (road.w - 8) + branch), px(cy + len));
        ctx.stroke();
      } else {
        const cx = road.x + rand() * road.w;
        const len = 6 + rand() * 10;
        const branch = (rand() - 0.5) * 10;
        ctx.beginPath();
        ctx.moveTo(px(cx), px(road.y + 4 + rand() * (road.h - 8)));
        ctx.lineTo(px(cx + len), px(road.y + 4 + rand() * (road.h - 8) + branch));
        ctx.stroke();
      }
    }
  }
}

/**
 * The river along the west/south-west edge and the rail line along the
 * north edge into the Warehouse District — the geography that gives the
 * town's own boundary a reason to be there, rather than the map just
 * stopping. Both are pure ground texture: neither carries collision
 * (Overworld.tsx's collision only ever checks `LOCATIONS`/solid
 * `OBSTACLES`), so crossing either is exactly as free as crossing an
 * ordinary street — no bridge or crossing mechanic needed for a feature
 * that was only ever asked to give the edge an identity, not to gate it.
 */
function drawEdgeGeography(ctx: CanvasRenderingContext2D) {
  // The river: West End and Transit Hub's own waterfront edge.
  const riverX = 0;
  const riverW = 36;
  const riverY = 392;
  const riverH = MAP_HEIGHT - riverY;
  ctx.fillStyle = PALETTE.river;
  ctx.fillRect(riverX, riverY, riverW, riverH);
  ctx.fillStyle = PALETTE.riverRipple;
  const rand = noise('river');
  for (let y = riverY + 6; y < riverY + riverH; y += 18) {
    const w = 10 + rand() * 14;
    ctx.fillRect(riverX + rand() * (riverW - w), y, w, 2);
  }

  // The rail line: the north edge, continuing along the Warehouse
  // District's own western flank down toward the Rail Spur.
  ctx.fillStyle = PALETTE.rail;
  ctx.fillRect(0, 0, MAP_WIDTH, 18);
  ctx.fillRect(1128, 18, 30, 420);
  ctx.fillStyle = PALETTE.railTie;
  for (let x = 8; x < MAP_WIDTH; x += 16) ctx.fillRect(x, 3, 4, 12);
  for (let y = 26; y < 438; y += 16) ctx.fillRect(1132, y, 22, 4);
}

/**
 * Streetlights at a handful of intersections — fixed points, not one per
 * corner, because the point is a lit island on an empty street (Style Guide
 * 07's isolation rule), not municipal coverage. Drawn after roads and glows,
 * before buildings, so a building in front of one simply occludes it, the
 * same depth order everything else on this canvas already uses.
 */
const STREETLIGHT_POINTS: { x: number; y: number }[] = [
  { x: 500, y: 364 }, // the Downtown Crossroads itself — the brightest corner in town
  { x: 200, y: 220 }, // Residential North's own street
  { x: 900, y: 100 }, // Downtown, between the school and the library
  { x: 1300, y: 220 }, // Warehouse District, Row 1
  { x: 1300, y: 720 }, // Warehouse District, Row 2
  { x: 200, y: 540 }, // West End, near the Repair Shop/Wash & Fold alley
  { x: 700, y: 500 }, // Riverside Park, on the path
  { x: 200, y: 900 }, // Transit Hub
  { x: 1300, y: 900 }, // Commercial Strip
];

function drawStreetlight(ctx: CanvasRenderingContext2D, p: { x: number; y: number }) {
  const x = px(p.x);
  const topY = px(p.y - 22);

  ctx.fillStyle = PALETTE.lampHalo;
  ctx.beginPath();
  ctx.arc(x, topY, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = PALETTE.lampPost;
  ctx.fillRect(x - 1, topY, 2, 22);
  ctx.fillRect(x - 3, p.y - 2, 6, 2);

  ctx.fillStyle = PALETTE.lampGlow;
  ctx.beginPath();
  ctx.arc(x, topY, 3, 0, Math.PI * 2);
  ctx.fill();
}

/** A resistance place, warming the street it stands on. */
function drawGlow(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  ctx.fillStyle = PALETTE.warmGlow;
  for (let ring = 3; ring > 0; ring--) {
    const pad = ring * 14;
    ctx.fillRect(loc.x - pad, loc.y - pad, loc.w + pad * 2, loc.h + pad * 2);
  }
}

/**
 * Every named location, dispatched to a shape that actually reads as the
 * thing it is — a treehouse looks like a platform in a tree, a school reads
 * as a school, per the fill-out note that a town of identical boxes with a
 * different colour band underneath doesn't actually look like anything.
 * `'building'` (missing/unrecognised too, defensively) falls back to the
 * original plain box every location used to render as. The "you're close
 * enough to act on this" tell is a soft glow underneath the shape rather
 * than an outline traced on top of it — one glow shape works for every
 * silhouette instead of needing bespoke tracing per building type, and it
 * reads as "this place is lit up" rather than "this place is selected".
 */
function drawLocation(ctx: CanvasRenderingContext2D, loc: OverworldLocation, isHere: boolean, tier: ThresholdTier, now: number) {
  if (isHere && loc.render !== 'camera') drawHereGlow(ctx, loc);

  switch (loc.render) {
    case 'camera':
      drawCamera(ctx, loc, isHere, now);
      return;
    case 'house':
      drawHouse(ctx, loc, tier);
      break;
    case 'school':
      drawSchool(ctx, loc, tier);
      break;
    case 'library':
      drawLibrary(ctx, loc, tier);
      break;
    case 'plaza':
      drawPlaza(ctx, loc);
      break;
    case 'warehouse':
      drawWarehouse(ctx, loc);
      break;
    case 'garage':
      drawGarage(ctx, loc);
      break;
    case 'ballpark':
      drawBallpark(ctx, loc);
      break;
    case 'pizza':
      drawPizza(ctx, loc, tier);
      break;
    case 'arcade':
      drawArcade(ctx, loc, tier);
      break;
    case 'treehouse':
      drawTreehouse(ctx, loc, tier);
      break;
    case 'shop':
      drawShop(ctx, loc, tier);
      break;
    case 'transit':
      drawTransit(ctx, loc);
      break;
    default:
      drawBuilding(ctx, loc, tier);
  }
}

/**
 * A soft halo, same layered-rings trick `drawGlow` uses for a resistance
 * place's ambient warmth: several same-alpha circles, largest first, so
 * they stack additively into a glow that's brightest at the centre and
 * falls off softly at the edge. Shared by everything the player can act
 * on — a location, a camera, a street hack node — so "you're close enough"
 * reads the same low-key way everywhere, rather than a location getting a
 * halo and a camera getting a hard-edged ring.
 */
function drawSoftGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, baseR: number, rings: number, step: number) {
  ctx.fillStyle = PALETTE.hereGlow;
  for (let ring = rings; ring > 0; ring--) {
    ctx.beginPath();
    ctx.arc(cx, cy, baseR + ring * step, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * The "tap me" tell for a camera, junction box, or street hack that's
 * actually in reach right now — a single ring breathing in and out rather
 * than `drawSoftGlow`'s fixed static rings, since this one's job changed:
 * it used to just mark "close enough" while the prompt opened on its own,
 * and now it's the only sign the object is waiting on an actual tap
 * (Overworld.tsx no longer opens the action prompt on proximity alone).
 * A glow that visibly pulses reads as "touch this" in a way a static ring
 * never quite did.
 */
function drawPulseGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, baseR: number, now: number) {
  const phase = (Math.sin(now / 420) + 1) / 2; // 0..1, ~1.5s breathing cycle
  const r = baseR + 3 + phase * 4;
  ctx.fillStyle = `rgba(236, 226, 208, ${0.1 + phase * 0.08})`;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The revolving lens on top of an active FLACK camera — the dome stays put,
 * only the little bright lens inside sweeps, the same "shell fixed, gaze
 * moving" language `ui/TitleEye.tsx` uses for the title screen's own camera.
 * Never drawn once a camera's sabotaged (`drawSabotageDamage` takes over
 * instead) — a dead camera's lens has stopped moving, which is the whole
 * point of it being dead.
 */
function drawRevolvingLens(ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number) {
  const r = 3.2;
  ctx.fillStyle = PALETTE.cameraDark;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const angle = (now / 1300) % (Math.PI * 2);
  const lx = cx + Math.cos(angle) * (r - 1.3);
  const ly = cy + Math.sin(angle) * (r - 1.3) * 0.55; // flattened, so it reads as a lens tilting in a dome, not a ball spinning
  ctx.fillStyle = '#bcd9ff';
  ctx.beginPath();
  ctx.arc(lx, ly, 1.1, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Frayed wire and an irregular spark — the tell that whatever this is sits
 * on right now (`onCooldown`) is because the player already took it apart,
 * not because it was never there. Shared by every sabotage-able point
 * object (camera, junction box, street hack) rather than three copies, same
 * "one shape, different paint" reasoning `drawStreetHack` already uses for
 * its own three kinds.
 */
function drawSabotageDamage(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, now: number) {
  ctx.strokeStyle = PALETTE.junctionDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + size * 0.28, y + size);
  ctx.lineTo(x + size * 0.18, y + size + 3);
  ctx.lineTo(x + size * 0.34, y + size + 5);
  ctx.moveTo(x + size * 0.68, y + size);
  ctx.lineTo(x + size * 0.8, y + size + 4);
  ctx.stroke();

  // Same irregular double-flicker every other "this is live" tell on this
  // canvas uses (the title screen's REC dot, a camera's own status light) —
  // a spark reads as electrical, not decorative, when it stutters like one.
  const t = now % 1700;
  if (t < 80 || (t > 260 && t < 320)) {
    ctx.fillStyle = '#ffe37a';
    ctx.beginPath();
    ctx.arc(x + size * 0.72, y + size * 0.12, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The location-sized version: `drawSoftGlow` scaled to the building's own
 * footprint rather than a small fixed object. */
function drawHereGlow(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  const cx = px(loc.x + loc.w / 2);
  const cy = px(loc.y + loc.h / 2);
  const baseR = Math.max(loc.w, loc.h) / 2;
  drawSoftGlow(ctx, cx, cy, baseR, 3, 5);
}

/**
 * At `flagged` and above, Language A elements get a one-line scanline tear
 * (Style Guide 07: "Language A elements can start subtly glitching at the
 * edges … a shader/filter toggle on existing UI"). Language B never glitches
 * — it was never claiming to be smooth — so this is only ever called for A.
 * Shared by every walled Language A shape; a plaza, a ballpark and a
 * treehouse aren't claiming a corporate-clean surface in the first place, so
 * they don't call it, the same reasoning a camera doesn't get a warm glow.
 */
function drawGlitchTear(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier, roofH: number) {
  if (tier !== 'flagged' && tier !== 'hunted') return;
  const rand = noise(`glitch:${loc.id}:${tier}`);
  const y = px(loc.y + roofH + rand() * (loc.h - roofH - 6));
  ctx.fillStyle = PALETTE.windowLit;
  ctx.globalAlpha = tier === 'hunted' ? 0.35 : 0.18;
  ctx.fillRect(loc.x + px(rand() * 6), y, loc.w - px(rand() * 10), 2);
  ctx.globalAlpha = 1;
}

/**
 * A multi-tile sprite (a vehicle wider or taller than one tile) blitted at
 * native size, centred on `(cx, cy)` — the vehicle/prop equivalent of
 * `drawSpriteTile`'s single-tile centring, for the handful of sprites
 * (the patrol van, the transit bus) that are a fixed 2D block of tiles
 * rather than one. `tiles` is row-major, top to bottom; `blit` picks which
 * sheet, same convention every multi-tile helper on this canvas uses.
 */
function drawTileBlock(ctx: CanvasRenderingContext2D, tiles: number[][], cx: number, cy: number, blit: typeof drawTileAt) {
  const rows = tiles.length;
  const cols = tiles[0].length;
  const startX = cx - (cols * TILE) / 2;
  const startY = cy - (rows * TILE) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      blit(ctx, tiles[r][c], startX + c * TILE, startY + r * TILE);
    }
  }
}

/**
 * A flat rect, tiled with a 9-slice kit (corner/edge/fill) at the sheet's
 * native 16px pitch — a roof slab of any size, clipped to its own rect so a
 * width that isn't a clean multiple of the tile just ends cleanly at the
 * edge rather than stretching the last tile to fit.
 *
 * `blit` defaults to the main sheet (`drawTileAt`) but takes `drawCityTileAt`
 * for the industrial kit — same tiling math, different sheet underneath.
 */
function drawNineSliceRect(
  ctx: CanvasRenderingContext2D,
  slice: NineSlice,
  x: number,
  y: number,
  w: number,
  h: number,
  blit: typeof drawTileAt = drawTileAt,
) {
  const cols = Math.ceil(w / TILE);
  const rows = Math.ceil(h / TILE);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const left = c === 0;
      const right = c === cols - 1;
      const top = r === 0;
      const bottom = r === rows - 1;
      let idx = slice.fill;
      if (top && left) idx = slice.tl;
      else if (top && right) idx = slice.tr;
      else if (bottom && left) idx = slice.bl;
      else if (bottom && right) idx = slice.br;
      else if (top) idx = slice.t;
      else if (bottom) idx = slice.b;
      else if (left) idx = slice.l;
      else if (right) idx = slice.r;
      blit(ctx, idx, x + c * TILE, y + r * TILE);
    }
  }
  ctx.restore();
}

/**
 * A wall band — the cap row (the trimmed seam under the roof) once, then
 * the plain fill row repeated for whatever's left, tiled and clipped the
 * same way `drawNineSliceRect` is.
 *
 * `originX`/`originY` default to `x`/`y` but can be pinned elsewhere —
 * `drawHomeInteriorMask` punches several smaller rects out of the *same*
 * wall (everything except the window cutouts) and needs its brick to line
 * up seamlessly with `drawHouse`'s own wall behind it, which only happens
 * if every rect tiles from one shared grid origin instead of each restarting
 * its own count at its own corner.
 *
 * `blit` defaults to the main sheet (`drawTileAt`) but takes `drawCityTileAt`
 * for the industrial kit — same tiling math, different sheet underneath.
 */
function drawWallBand(
  ctx: CanvasRenderingContext2D,
  kit: WallKit,
  x: number,
  y: number,
  w: number,
  h: number,
  originX: number = x,
  originY: number = y,
  blit: typeof drawTileAt = drawTileAt,
) {
  const startCol = Math.floor((x - originX) / TILE);
  const endCol = Math.ceil((x + w - originX) / TILE);
  const startRow = Math.floor((y - originY) / TILE);
  const endRow = Math.ceil((y + h - originY) / TILE);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let r = startRow; r < endRow; r++) {
    for (let c = startCol; c < endCol; c++) {
      blit(ctx, r === 0 ? kit.cap : kit.fill, originX + c * TILE, originY + r * TILE);
    }
  }
  ctx.restore();
}

/** Grey stone + red brick, or tan stone + orange brick — picked once per
 * location id, the same "small fixed wardrobe" trick everything else this
 * pass varied by id hash. Shared so a location's wall always agrees with
 * itself across separate draw calls (`drawHouse` and its own
 * `drawHomeInteriorMask`, in particular). */
function wallKitFor(id: string): WallKit {
  return noise(`building-palette:${id}`)() < 0.5 ? WALL_RED : WALL_ORANGE;
}

function roofKitFor(id: string): NineSlice {
  return noise(`building-palette:${id}`)() < 0.5 ? ROOF_GREY : ROOF_TAN;
}

/**
 * The sprite-sheet building shell: a tiled roof slab over a tiled brick
 * wall band. Callers still draw their own curb, colour band, windows and
 * signage on top; this only replaces the flat-fill wall/roof rects
 * underneath them.
 */
function drawSpriteBuildingShell(ctx: CanvasRenderingContext2D, loc: OverworldLocation, roofH: number) {
  drawNineSliceRect(ctx, roofKitFor(loc.id), loc.x, loc.y, loc.w, roofH);
  drawWallBand(ctx, wallKitFor(loc.id), loc.x, loc.y + roofH, loc.w, loc.h - roofH);
}

/**
 * A building: body, roof, a row of windows. The roof reads as pitched by being
 * inset — at eight pixels of detail that is enough, and cheaper than an angle
 * that would need anti-aliasing to survive. The fallback shape now — every
 * named location has picked something more specific — kept for whatever a
 * future location doesn't bother picking a render for.
 */
function drawBuilding(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const isB = loc.language === 'B';
  const roofH = 14;

  // A curb: the building sits on ground, not floats on it. A single dark
  // step at the foot of the wall, cheap enough to afford on every building
  // without a texture pass.
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  if (spriteSheetReady() && !isB) {
    // Language B keeps its own warmer, hand-built flat colour — the sheet's
    // brick-and-stone kit reads as Language A's corporate-clean surface
    // (Style Guide 07), the opposite of what a resistance space is meant to
    // say, so this only ever swaps in for the cool, ordinary town.
    drawSpriteBuildingShell(ctx, loc, roofH);
  } else {
    ctx.fillStyle = isB ? PALETTE.wallB : PALETTE.wallA;
    ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);

    ctx.fillStyle = isB ? PALETTE.roofB : PALETTE.roofA;
    ctx.fillRect(loc.x + 4, loc.y, loc.w - 8, roofH);
    ctx.fillRect(loc.x, loc.y + roofH - 4, loc.w, 4);
  }

  // The location's own colour survives as a band at the base — it is how the
  // player has learned to tell these apart since Phase 1.
  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x, loc.y + loc.h - 5, loc.w, 5);

  drawWindows(ctx, loc, isB);

  // A tag, low on the wall, Language B only — the resistance's own places
  // are the hand-cut ones (Style Guide 07), and a mark somebody left is
  // cheaper than it looks: two or three angled strokes, fixed per building.
  if (isB) drawTag(ctx, loc, roofH);
  else drawGlitchTear(ctx, loc, tier, roofH);
}

/**
 * A house's window geometry, computed once so `drawHouse` and
 * `drawHomeInteriorMask` can never drift against each other the way two
 * independent copies of the same maths eventually do. Bigger than a civic
 * building's windows ever get, and bigger again at `home` specifically —
 * the one house whose insides the player actually needs to read while
 * confined to it before the opening's first prompt.
 */
function houseWindowGeometry(loc: OverworldLocation) {
  const roofH = Math.round(loc.h * 0.34);
  const bodyY = loc.y + roofH;
  const bodyH = loc.h - roofH;
  const winSize = loc.id === HOME_LOCATION_ID ? 20 : 14;
  const winY = px(bodyY + bodyH * 0.32);
  const win1X = px(loc.x + loc.w * 0.16);
  const win2X = px(loc.x + loc.w * 0.68);
  return { roofH, bodyY, bodyH, winSize, winY, win1X, win2X };
}

/** A cottage: walls, a proper pitched roof (two triangular faces, not the
 * flat inset band every civic building gets), a chimney, a centred door
 * flanked by two hand-placed windows rather than a generated grid — small
 * enough that the grid math reads as cramped instead of homely. */
function drawHouse(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const roofH = Math.round(loc.h * 0.34);
  const bodyY = loc.y + roofH;
  const bodyH = loc.h - roofH;
  const overhang = 6;
  const apexX = loc.x + loc.w / 2;

  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  // Only the wall texture swaps in — the pitched roof stays hand-drawn.
  // The sheet has no sloped-roof art (every roof in it is a flat slab
  // viewed from directly above), and the two triangular faces are the one
  // thing the doc comment above calls out as deliberately *not* the flat
  // civic-building band, so trading them for a flat sprite roof would
  // erase the exact distinction this shape exists to make.
  if (spriteSheetReady()) {
    drawWallBand(ctx, wallKitFor(loc.id), loc.x, bodyY, loc.w, bodyH);
  } else {
    ctx.fillStyle = PALETTE.wallA;
    ctx.fillRect(loc.x, bodyY, loc.w, bodyH);
  }

  ctx.fillStyle = PALETTE.pitchRoofDarkA;
  ctx.beginPath();
  ctx.moveTo(px(loc.x - overhang), px(bodyY + 2));
  ctx.lineTo(px(apexX), px(loc.y));
  ctx.lineTo(px(loc.x + loc.w + overhang), px(bodyY + 2));
  ctx.closePath();
  ctx.fill();
  // A lighter near-face, offset off the same apex, so the roof reads as two
  // pitched planes instead of one flat card.
  ctx.fillStyle = PALETTE.pitchRoofA;
  ctx.beginPath();
  ctx.moveTo(px(apexX), px(loc.y));
  ctx.lineTo(px(loc.x + loc.w + overhang), px(bodyY + 2));
  ctx.lineTo(px(loc.x + loc.w * 0.58), px(bodyY + 2));
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = PALETTE.chimney;
  ctx.fillRect(px(loc.x + loc.w * 0.74), loc.y - 2, 6, roofH * 0.6 + 2);

  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x, loc.y + loc.h - 5, loc.w, 5);

  const doorW = 10;
  const doorH = 16;
  ctx.fillStyle = PALETTE.porchPost;
  ctx.fillRect(px(apexX - doorW / 2 - 3), loc.y + loc.h - doorH - 5, 2, doorH);
  ctx.fillRect(px(apexX + doorW / 2 + 1), loc.y + loc.h - doorH - 5, 2, doorH);
  ctx.fillStyle = PALETTE.doorColor;
  ctx.fillRect(px(apexX - doorW / 2), loc.y + loc.h - doorH - 5, doorW, doorH);

  const rand = noise(`house:${loc.id}`);
  const win = houseWindowGeometry(loc);
  ctx.fillStyle = rand() < 0.7 ? PALETTE.windowLit : PALETTE.windowDark;
  ctx.fillRect(win.win1X, win.winY, win.winSize, win.winSize);
  ctx.fillStyle = rand() < 0.7 ? PALETTE.windowLit : PALETTE.windowDark;
  ctx.fillRect(win.win2X, win.winY, win.winSize, win.winSize);

  drawGlitchTear(ctx, loc, tier, roofH);
}

/**
 * Redrawn over the player rather than under them: the wall, in five pieces
 * that trace around the two window cutouts `drawHouse` already put there,
 * so the only place the sprite (drawn just before this) still shows through
 * is exactly where a window already was. Same geometry `drawHouse` computes
 * — this has to match it exactly or the "windows" stop lining up with the
 * ones already painted underneath.
 */
function drawHomeInteriorMask(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  const { bodyY, winY, winSize, win1X, win2X } = houseWindowGeometry(loc);
  const bodyBottom = loc.y + loc.h;

  // Same sprite-or-flat branch `drawHouse` took on its own wall — the two
  // never disagree within a frame (`spriteSheetReady` only ever flips once,
  // on load), but if this drew flat while the wall itself was sprite tile,
  // every non-window inch of the house would show a mismatched colour patch
  // the moment the game opens confined to it.
  if (spriteSheetReady()) {
    const kit = wallKitFor(loc.id);
    const origin: [number, number] = [loc.x, bodyY];
    drawWallBand(ctx, kit, loc.x, bodyY, loc.w, winY - bodyY, ...origin); // above the windows
    drawWallBand(ctx, kit, loc.x, winY + winSize, loc.w, bodyBottom - (winY + winSize), ...origin); // below
    drawWallBand(ctx, kit, loc.x, winY, win1X - loc.x, winSize, ...origin); // left of window 1
    drawWallBand(ctx, kit, win1X + winSize, winY, win2X - (win1X + winSize), winSize, ...origin); // between
    drawWallBand(ctx, kit, win2X + winSize, winY, loc.x + loc.w - (win2X + winSize), winSize, ...origin); // right of window 2
    return;
  }

  ctx.fillStyle = PALETTE.wallA;
  ctx.fillRect(loc.x, bodyY, loc.w, winY - bodyY); // above the windows
  ctx.fillRect(loc.x, winY + winSize, loc.w, bodyBottom - (winY + winSize)); // below
  ctx.fillRect(loc.x, winY, win1X - loc.x, winSize); // left of window 1
  ctx.fillRect(win1X + winSize, winY, win2X - (win1X + winSize), winSize); // between
  ctx.fillRect(win2X + winSize, winY, loc.x + loc.w - (win2X + winSize), winSize); // right of window 2
}

/** The school: the plain flat-roofed civic box, plus the two things that
 * actually say "school" — a pediment band over the entrance, steps, and a
 * flagpole taller than the roofline at one corner. */
function drawSchool(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const roofH = 14;
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  if (spriteSheetReady()) {
    drawSpriteBuildingShell(ctx, loc, roofH);
  } else {
    ctx.fillStyle = PALETTE.wallA;
    ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
    ctx.fillStyle = PALETTE.roofA;
    ctx.fillRect(loc.x + 4, loc.y, loc.w - 8, roofH);
    ctx.fillRect(loc.x, loc.y + roofH - 4, loc.w, 4);
  }

  const doorW = loc.w * 0.16;
  ctx.fillStyle = PALETTE.schoolSign;
  ctx.fillRect(px(loc.x + loc.w / 2 - doorW / 2 - 4), loc.y + roofH, doorW + 8, 5);

  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x, loc.y + loc.h - 5, loc.w, 5);

  drawWindows(ctx, loc, false);

  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(px(loc.x + loc.w / 2 - doorW / 2), loc.y + loc.h - 3, doorW, 3);

  const poleX = loc.x + loc.w - 10;
  ctx.fillStyle = PALETTE.flagpole;
  ctx.fillRect(px(poleX), loc.y - 16, 2, 16 + roofH);
  ctx.fillStyle = PALETTE.flag;
  ctx.fillRect(px(poleX + 2), loc.y - 14, 8, 6);

  drawGlitchTear(ctx, loc, tier, roofH);
}

/** The library: columns and a triangular pediment instead of a flat inset
 * roof — the one building in town dressed up to look civic on purpose,
 * which is exactly what the blurb's "public records" gravity calls for. */
function drawLibrary(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const roofH = 16;
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  // No separate roof rect to sprite — the pediment triangle below covers
  // everything above the wall, same as it always has.
  if (spriteSheetReady()) {
    drawWallBand(ctx, wallKitFor(loc.id), loc.x, loc.y + roofH, loc.w, loc.h - roofH);
  } else {
    ctx.fillStyle = PALETTE.wallA;
    ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
  }

  ctx.fillStyle = PALETTE.pediment;
  ctx.beginPath();
  ctx.moveTo(px(loc.x), px(loc.y + roofH));
  ctx.lineTo(px(loc.x + loc.w / 2), px(loc.y));
  ctx.lineTo(px(loc.x + loc.w), px(loc.y + roofH));
  ctx.closePath();
  ctx.fill();

  const cols = Math.max(3, Math.floor(loc.w / 28));
  const colW = 5;
  ctx.fillStyle = PALETTE.pillar;
  for (let i = 0; i < cols; i++) {
    const cx = loc.x + ((i + 0.5) * loc.w) / cols;
    ctx.fillRect(px(cx - colW / 2), loc.y + roofH, colW, loc.h - roofH - 4);
  }
  ctx.fillStyle = PALETTE.pillarShade;
  for (let i = 0; i < cols; i++) {
    const cx = loc.x + ((i + 0.5) * loc.w) / cols;
    ctx.fillRect(px(cx - colW / 2), loc.y + loc.h - 6, colW, 2);
  }

  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x, loc.y + loc.h - 4, loc.w, 4);

  drawGlitchTear(ctx, loc, tier, roofH);
}

/** Town Square: paving, not a wall — this is ground the town built around,
 * not a building. A bandstand at the centre (the ambient text's own
 * "cameras on the bandstand" line), a banner strung between posts, benches
 * — and, at the four corners, the town's own dead-centre park: this is
 * both halves of "city hall and park in the middle of town" at once, the
 * civic authority (the banner, the bandstand) and the green space people
 * actually use, in the one spot on the map every district borders. */
function drawPlaza(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  if (spriteSheetReady()) {
    drawNineSliceRect(ctx, roofKitFor(loc.id), loc.x, loc.y, loc.w, loc.h);
  } else {
    ctx.fillStyle = PALETTE.pavingDark;
    ctx.fillRect(loc.x, loc.y, loc.w, loc.h);
    ctx.fillStyle = PALETTE.pavingLight;
    for (let y = loc.y; y < loc.y + loc.h; y += 10) {
      for (let x = loc.x + (((y - loc.y) / 10) % 2) * 10; x < loc.x + loc.w; x += 20) {
        ctx.fillRect(x, y, 10, 10);
      }
    }
  }

  for (const [cx, cy] of [
    [loc.x + 14, loc.y + 14],
    [loc.x + loc.w - 14, loc.y + 14],
    [loc.x + 14, loc.y + loc.h - 14],
    [loc.x + loc.w - 14, loc.y + loc.h - 14],
  ]) {
    drawTree(ctx, { id: `plaza:${loc.id}:${cx}:${cy}`, x: cx - 10, y: cy - 20, w: 20, h: 40, kind: 'tree' });
  }

  // A couple of market stalls — a single umbrella tile is shorthand enough
  // to read as one, no cart body needed. "City hall and the park people
  // actually use" wants a square that looks occupied, not just landscaped.
  if (spriteSheetReady()) {
    drawCityTileAt(ctx, MARKET_UMBRELLA_GREEN, px(loc.x + loc.w * 0.25 - TILE / 2), px(loc.y + loc.h * 0.65 - TILE / 2));
    drawCityTileAt(ctx, MARKET_UMBRELLA_ORANGE, px(loc.x + loc.w * 0.75 - TILE / 2), px(loc.y + loc.h * 0.65 - TILE / 2));
  }

  const bx = loc.x + loc.w / 2;
  const by = loc.y + loc.h * 0.4;
  const bw = 36;
  const bh = 8;
  ctx.fillStyle = PALETTE.bandstandPost;
  ctx.fillRect(px(bx - bw / 2 + 2), px(by - 2), 3, 20);
  ctx.fillRect(px(bx + bw / 2 - 5), px(by - 2), 3, 20);
  ctx.fillStyle = PALETTE.bandstandRoof;
  ctx.fillRect(px(bx - bw / 2), px(by - bh), bw, bh);

  ctx.strokeStyle = PALETTE.bandstandPost;
  ctx.lineWidth = 2;
  const py = loc.y + loc.h - 20;
  ctx.beginPath();
  ctx.moveTo(loc.x + 8, py);
  ctx.lineTo(loc.x + loc.w - 8, py);
  ctx.stroke();
  ctx.fillStyle = PALETTE.banner;
  ctx.fillRect(px(loc.x + loc.w * 0.28), py, loc.w * 0.44, 10);
  ctx.fillStyle = PALETTE.bannerText;
  ctx.fillRect(px(loc.x + loc.w * 0.3), py + 3, loc.w * 0.4, 3);

  ctx.fillStyle = PALETTE.bench;
  ctx.fillRect(loc.x + 10, loc.y + loc.h - 12, 16, 4);
  ctx.fillRect(loc.x + loc.w - 26, loc.y + loc.h - 12, 16, 4);
}

/** The Annex's warehouses: corrugated roofing (ridge lines, roof vents) and
 * a roll-up door taking up most of the front wall — the industrial building
 * every generic box in the Annex used to stand in for, whichever of the
 * three (deja_jobsite, fenwick_lot, annex_fence) is asking for it. */
function drawWarehouse(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  const roofH = 10;
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  // The Roguelike City Pack's grey concrete, not the RPG Urban Pack's brick
  // — this one reads as industrial/utilitarian rather than corporate-clean,
  // so unlike `drawBuilding`'s Language A/B split it's fair game regardless
  // of which language a given warehouse location is coded.
  if (citySheetReady()) {
    drawNineSliceRect(ctx, ROOF_INDUSTRIAL, loc.x, loc.y, loc.w, roofH, drawCityTileAt);
    drawWallBand(ctx, WALL_INDUSTRIAL, loc.x, loc.y + roofH, loc.w, loc.h - roofH, loc.x, loc.y + roofH, drawCityTileAt);
  } else {
    ctx.fillStyle = PALETTE.wallB;
    ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
    ctx.fillStyle = PALETTE.corrugated;
    ctx.fillRect(loc.x, loc.y, loc.w, roofH);
  }

  // The ridge lines still draw over either the flat colour or the sprite
  // slab — a ribbed-roof detail neither one has on its own.
  ctx.strokeStyle = PALETTE.corrugatedLine;
  ctx.lineWidth = 1;
  for (let x = loc.x + 4; x < loc.x + loc.w; x += 6) {
    ctx.beginPath();
    ctx.moveTo(px(x), loc.y);
    ctx.lineTo(px(x), loc.y + roofH);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.vent;
  ctx.fillRect(px(loc.x + loc.w * 0.25), loc.y - 3, 5, 4);
  ctx.fillRect(px(loc.x + loc.w * 0.65), loc.y - 3, 5, 4);

  const doorW = loc.w * 0.5;
  const doorH = loc.h - roofH - 10;
  const doorX = loc.x + loc.w / 2 - doorW / 2;
  ctx.fillStyle = PALETTE.rollDoor;
  ctx.fillRect(px(doorX), loc.y + roofH + 4, doorW, doorH);
  ctx.strokeStyle = PALETTE.rollDoorLine;
  for (let y = loc.y + roofH + 8; y < loc.y + roofH + 4 + doorH; y += 5) {
    ctx.beginPath();
    ctx.moveTo(px(doorX), y);
    ctx.lineTo(px(doorX + doorW), y);
    ctx.stroke();
  }

  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x, loc.y + loc.h - 5, loc.w, 5);

  drawTag(ctx, loc, roofH);
}

/** The Repair Shop: a smaller warehouse — one roll-up door instead of a
 * building-wide one, and a hand-lettered sign panel where the rest of the
 * front wall would be. */
function drawGarage(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  const roofH = 10;
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  if (citySheetReady()) {
    drawNineSliceRect(ctx, ROOF_INDUSTRIAL, loc.x + 3, loc.y, loc.w - 6, roofH, drawCityTileAt);
    drawWallBand(ctx, WALL_INDUSTRIAL, loc.x, loc.y + roofH, loc.w, loc.h - roofH, loc.x, loc.y + roofH, drawCityTileAt);
  } else {
    ctx.fillStyle = PALETTE.wallB;
    ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
    ctx.fillStyle = PALETTE.corrugated;
    ctx.fillRect(loc.x + 3, loc.y, loc.w - 6, roofH);
  }

  const doorW = loc.w * 0.42;
  const doorH = loc.h - roofH - 8;
  ctx.fillStyle = PALETTE.rollDoor;
  ctx.fillRect(loc.x + 8, loc.y + roofH + 4, doorW, doorH);
  ctx.strokeStyle = PALETTE.rollDoorLine;
  ctx.lineWidth = 1;
  for (let y = loc.y + roofH + 8; y < loc.y + roofH + 4 + doorH; y += 5) {
    ctx.beginPath();
    ctx.moveTo(loc.x + 8, y);
    ctx.lineTo(loc.x + 8 + doorW, y);
    ctx.stroke();
  }

  ctx.fillStyle = PALETTE.schoolSign;
  ctx.fillRect(px(loc.x + loc.w - 34), loc.y + roofH + 6, 26, 10);

  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x, loc.y + loc.h - 5, loc.w, 5);

  drawTag(ctx, loc, roofH);
}

/** The Ballpark: a field, not a building — grass, a dirt diamond, a
 * bleacher row and two floodlight poles. No wall to glitch or tag; this
 * isn't claiming a corporate-clean surface any more than a camera is. */
function drawBallpark(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  ctx.fillStyle = PALETTE.fieldGrass;
  ctx.fillRect(loc.x, loc.y, loc.w, loc.h);
  ctx.fillStyle = PALETTE.fieldGrassAlt;
  for (let y = loc.y; y < loc.y + loc.h; y += 12) {
    for (let x = loc.x + (((y - loc.y) / 12) % 2) * 12; x < loc.x + loc.w; x += 24) {
      ctx.fillRect(x, y, 12, 12);
    }
  }

  const cx = loc.x + loc.w * 0.42;
  const cy = loc.y + loc.h * 0.6;
  const r = Math.min(loc.w, loc.h) * 0.3;
  ctx.fillStyle = PALETTE.dirt;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.dirtLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx - r, cy);
  ctx.stroke();

  ctx.fillStyle = PALETTE.bleacherDark;
  ctx.fillRect(loc.x, loc.y, loc.w, 10);
  ctx.fillStyle = PALETTE.bleacher;
  ctx.fillRect(loc.x, loc.y, loc.w, 4);

  ctx.fillStyle = PALETTE.bleacherDark;
  ctx.fillRect(px(loc.x + 6), loc.y - 20, 2, 30);
  ctx.fillRect(px(loc.x + loc.w - 8), loc.y - 20, 2, 30);
  ctx.fillStyle = PALETTE.floodlight;
  ctx.fillRect(px(loc.x + 2), loc.y - 22, 10, 4);
  ctx.fillRect(px(loc.x + loc.w - 12), loc.y - 22, 10, 4);
}

/** Sal's: a striped awning over the entrance and a round sign above the
 * roofline — the two tells of a corner pizza place, on an otherwise
 * ordinary Language A box. */
function drawPizza(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const roofH = 10;
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  if (spriteSheetReady()) {
    drawSpriteBuildingShell(ctx, loc, roofH);
  } else {
    ctx.fillStyle = PALETTE.wallA;
    ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
    ctx.fillStyle = PALETTE.roofA;
    ctx.fillRect(loc.x + 3, loc.y, loc.w - 6, roofH);
  }

  const awnW = loc.w * 0.6;
  const awnX = loc.x + loc.w / 2 - awnW / 2;
  const stripes = 5;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? PALETTE.awningRed : PALETTE.awningWhite;
    ctx.fillRect(px(awnX + (i * awnW) / stripes), loc.y + roofH, awnW / stripes, 6);
  }

  drawWindows(ctx, loc, false);

  ctx.fillStyle = PALETTE.signRed;
  ctx.beginPath();
  ctx.arc(px(loc.x + loc.w * 0.78), loc.y - 4, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x, loc.y + loc.h - 5, loc.w, 5);

  drawGlitchTear(ctx, loc, tier, roofH);
}

/** The Arcade: a glowing marquee sign over the door doing the work a row of
 * windows does everywhere else, and the windows that remain stay dark —
 * screens inside, not daylight, which is most of the appeal. */
function drawArcade(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const roofH = 10;
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  if (spriteSheetReady()) {
    drawSpriteBuildingShell(ctx, loc, roofH);
  } else {
    ctx.fillStyle = PALETTE.wallA;
    ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
    ctx.fillStyle = PALETTE.roofA;
    ctx.fillRect(loc.x + 3, loc.y, loc.w - 6, roofH);
  }

  const mW = loc.w * 0.8;
  const mX = loc.x + loc.w / 2 - mW / 2;
  ctx.fillStyle = PALETTE.marqueeBody;
  ctx.fillRect(px(mX), loc.y + roofH + 2, mW, 10);
  ctx.fillStyle = PALETTE.marqueeGlow;
  ctx.fillRect(px(mX + 3), loc.y + roofH + 4, mW - 6, 4);
  const rand = noise(`arcade:${loc.id}`);
  const bulbs = Math.floor(mW / 6);
  for (let i = 0; i < bulbs; i++) {
    ctx.fillStyle = rand() < 0.8 ? PALETTE.marqueeBulb : PALETTE.bgWindowDark;
    ctx.fillRect(px(mX + i * 6 + 1), loc.y + roofH + 1, 2, 2);
  }

  ctx.fillStyle = PALETTE.windowDark;
  ctx.fillRect(px(loc.x + 6), loc.y + roofH + 16, loc.w - 12, loc.h - roofH - 22);

  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x, loc.y + loc.h - 5, loc.w, 5);

  drawGlitchTear(ctx, loc, tier, roofH);
}

/**
 * The Treehouse — the flagship of the fill-out pass: a trunk and a canopy
 * (the same two-disc trick `drawTree` uses for the obstacle version), a
 * platform nested inside it with plank seams, a lit window standing in for
 * the blurb's beach-towel roof corner, and a rope ladder down to the
 * ground. Nothing here is a building with a different paint job.
 */
function drawTreehouse(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const cx = loc.x + loc.w / 2;
  const groundY = loc.y + loc.h;

  const trunkW = Math.max(6, loc.w * 0.12);
  ctx.fillStyle = PALETTE.treeTrunk;
  ctx.fillRect(px(cx - trunkW / 2), loc.y, trunkW, loc.h);

  const r = loc.w * 0.55;
  const canopyCy = loc.y + loc.h * 0.28;
  ctx.fillStyle = PALETTE.treeCanopyDark;
  ctx.beginPath();
  ctx.arc(cx, canopyCy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.treeCanopy;
  ctx.beginPath();
  ctx.arc(cx - r * 0.25, canopyCy - r * 0.2, r * 0.7, 0, Math.PI * 2);
  ctx.fill();

  const platW = loc.w * 0.7;
  const platH = loc.h * 0.3;
  const platY = loc.y + loc.h * 0.42;
  ctx.fillStyle = PALETTE.plankDark;
  ctx.fillRect(px(cx - platW / 2), platY, platW, platH);
  ctx.fillStyle = PALETTE.plank;
  ctx.fillRect(px(cx - platW / 2), platY, platW, 4);
  ctx.strokeStyle = PALETTE.plankDark;
  ctx.lineWidth = 1;
  for (let x = cx - platW / 2 + 6; x < cx + platW / 2; x += 8) {
    ctx.beginPath();
    ctx.moveTo(px(x), platY + 4);
    ctx.lineTo(px(x), platY + platH);
    ctx.stroke();
  }

  // The beach towel doing the job of a roof, read as a lit corner square —
  // the blurb's own line, drawn rather than described.
  ctx.fillStyle = PALETTE.windowLit;
  ctx.fillRect(px(cx + platW / 2 - 12), platY + 6, 8, 8);

  ctx.strokeStyle = PALETTE.rope;
  ctx.lineWidth = 1;
  const ladderX = cx - platW / 2 + 6;
  ctx.beginPath();
  ctx.moveTo(px(ladderX - 3), platY + platH);
  ctx.lineTo(px(ladderX - 3), groundY);
  ctx.moveTo(px(ladderX + 3), platY + platH);
  ctx.lineTo(px(ladderX + 3), groundY);
  for (let y = platY + platH + 4; y < groundY; y += 6) {
    ctx.moveTo(px(ladderX - 3), y);
    ctx.lineTo(px(ladderX + 3), y);
  }
  ctx.stroke();

  drawGlitchTear(ctx, loc, tier, 0);
}

/**
 * A small storefront — general enough for a laundromat, a convenience
 * store, a pharmacy or the safehouse's own corner unit without a bespoke
 * shape each, the district redesign's own new render type. A solid awning
 * in the location's own `color` rather than Sal's specific red-and-white
 * stripe (`drawPizza`) is what keeps four different shops reading as four
 * different shops sharing one silhouette, not four repaints of a pizzeria.
 */
function drawShop(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const roofH = 8;
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  if (spriteSheetReady()) {
    drawSpriteBuildingShell(ctx, loc, roofH);
  } else {
    ctx.fillStyle = PALETTE.wallA;
    ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
    ctx.fillStyle = PALETTE.roofA;
    ctx.fillRect(loc.x + 2, loc.y, loc.w - 4, roofH);
  }

  // The awning — a flat band in the shop's own colour, not a stripe pattern,
  // so the render type stays legible as "generic shop" rather than "pizza
  // place in a different colour".
  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x, loc.y + roofH, loc.w, 6);

  drawWindows(ctx, loc, false);

  // A signboard over the door, plain — the name is what the blurb already
  // carries, this is just "a shop sign is here" at a glance.
  ctx.fillStyle = PALETTE.windowLit;
  ctx.fillRect(px(loc.x + loc.w * 0.32), loc.y + roofH + 8, loc.w * 0.36, 5);

  drawGlitchTear(ctx, loc, tier, roofH);
}

/**
 * The Bus Depot: an open-air platform and shelter, not a building — the one
 * district-redesign location deliberately drawn with no walls at all, so
 * "people passing through, nobody stays" reads in the silhouette itself
 * before a single line of ambient text says so.
 */
function drawTransit(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  const postW = 4;
  const canopyH = 10;
  const postH = loc.h - canopyH - 6;

  // The platform slab.
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x, loc.y + loc.h - 6, loc.w, 6);

  // Two support posts holding up a flat canopy roof — open underneath.
  ctx.fillStyle = PALETTE.lampPost;
  ctx.fillRect(px(loc.x + loc.w * 0.12), loc.y + canopyH, postW, postH);
  ctx.fillRect(px(loc.x + loc.w * 0.88 - postW), loc.y + canopyH, postW, postH);

  ctx.fillStyle = PALETTE.roofA;
  ctx.fillRect(loc.x, loc.y, loc.w, canopyH);
  ctx.fillStyle = PALETTE.wallA;
  ctx.fillRect(loc.x, loc.y + canopyH - 2, loc.w, 2);

  // A bench, under the canopy — the "somebody who isn't waiting for a bus"
  // the blurb describes.
  ctx.fillStyle = PALETTE.plank;
  ctx.fillRect(px(loc.x + loc.w * 0.3), loc.y + canopyH + postH - 10, loc.w * 0.4, 4);

  // A lit route sign, the one warm point in an otherwise unlit shelter.
  ctx.fillStyle = PALETTE.windowLit;
  ctx.fillRect(px(loc.x + loc.w * 0.5 - 5), loc.y + canopyH + 3, 10, 6);

  // A bus, actually stopped at the depot — one parked under its own end of
  // the canopy, the same "this place is used" cue a parked car gives any
  // ordinary street. Bellhaven's whole point about this stop is that
  // service is thin, not that it's abandoned; a bus that's just arrived
  // says that better than an empty platform does.
  if (spriteSheetReady()) {
    const busX = loc.x + loc.w * 0.82;
    const busY = loc.y + loc.h - 30;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(px(busX - 17), loc.y + loc.h - 8, 34, 4);
    drawTileBlock(ctx, BUS_TILES, busX, busY, drawTileAt);
  }
}

/**
 * A camera: a fixed 2x2-tile blue box on its post, nothing more — per the
 * build note, a camera is a post with a lens on it, not a building with a
 * different paint job. Drawn at a fixed size centred in the location's own
 * (larger) rect, so the interaction radius and collision footprint —
 * unchanged, still the full rect — stay generous even though the thing the
 * player actually sees is small.
 */
function drawCamera(ctx: CanvasRenderingContext2D, loc: OverworldLocation, isHere: boolean, now: number) {
  const size = 16; // two of drawGround's 8px tiles, on each side
  const x = px(loc.x + loc.w / 2 - size / 2);
  const y = px(loc.y + loc.h / 2 - size / 2);

  if (isHere) drawSoftGlow(ctx, x + size / 2, y + size / 2, size / 2, 3, 4);

  drawCameraPost(ctx, x + size / 2, y + size);
  ctx.fillStyle = PALETTE.camera;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = PALETTE.cameraDark;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, size + 1, size + 1);
  drawCameraDetail(ctx, x, y, size);
  drawRevolvingLens(ctx, x + size / 2, y - 3, now);
}

/** The pole a camera box actually sits on — per the build note, "a post
 * with a lens on it", which the box alone never quite read as without
 * something under it to be posted on. A short conduit stub bridges the two
 * so the wiring reads as running down the pole, not floating between them. */
function drawCameraPost(ctx: CanvasRenderingContext2D, cx: number, boxBottomY: number) {
  const postH = 9;
  ctx.fillStyle = PALETTE.cameraDark;
  ctx.fillRect(px(cx - 1), boxBottomY - 2, 2, postH);
  ctx.fillRect(px(cx - 3), boxBottomY + postH - 3, 6, 2); // base flare
  ctx.strokeStyle = PALETTE.cameraDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px(cx + 1), boxBottomY - 1);
  ctx.lineTo(px(cx + 3), boxBottomY + 2);
  ctx.stroke();
}

/** Panel seam and corner rivets — the same "this is a manufactured object,
 * not a flat sprite" texture `drawCameraPost` gives the pole, applied to
 * the housing itself. Kept to single pixels at this scale (a 16px box has
 * no room for more) so it reads as detail rather than clutter. */
function drawCameraDetail(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.strokeStyle = PALETTE.cameraDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 1, y + size * 0.6);
  ctx.lineTo(x + size - 1, y + size * 0.6);
  ctx.stroke();

  ctx.fillStyle = PALETTE.cameraDark;
  ctx.globalAlpha = 0.7;
  for (const [bx, by] of [
    [x + 1.5, y + 1.5],
    [x + size - 2.5, y + 1.5],
    [x + 1.5, y + size - 2.5],
    [x + size - 2.5, y + size - 2.5],
  ]) {
    ctx.fillRect(px(bx), px(by), 1, 1);
  }
  ctx.globalAlpha = 1;
}

/**
 * An ordinary camera, worth taking apart — the same fixed 2x2-tile blue box
 * as `drawCamera` above, because it is the same kind of object; the only
 * difference is this one sits on a bare point rather than centred in a named
 * location's rect, so the two take slightly different inputs and it wasn't
 * worth forcing one shape to fit both. A slow pulse instead of a static ring
 * marks "close enough, tap it" now that the prompt itself no longer opens on
 * proximity alone (Overworld.tsx) — the object has to actually read as
 * something worth touching, not just circled.
 */
function drawSabotageCamera(
  ctx: CanvasRenderingContext2D,
  node: { x: number; y: number },
  dismantlable: boolean,
  damaged: boolean,
  now: number,
) {
  const size = 16;
  const x = px(node.x - size / 2);
  const y = px(node.y - size / 2);

  if (dismantlable) drawPulseGlow(ctx, x + size / 2, y + size / 2, size / 2, now);

  drawCameraPost(ctx, x + size / 2, y + size);
  ctx.globalAlpha = damaged ? 0.6 : 1;
  ctx.fillStyle = PALETTE.camera;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = PALETTE.cameraDark;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, size + 1, size + 1);
  if (!damaged) drawCameraDetail(ctx, x, y, size);
  ctx.globalAlpha = 1;

  if (damaged) drawSabotageDamage(ctx, x, y, size, now);
  else drawRevolvingLens(ctx, x + size / 2, y - 3, now);
}

/**
 * A street hack — cash-register green for an ATM, sun-bleached tan for a
 * payphone, so the two read apart at a glance the same way a camera's blue
 * reads apart from either. Same footprint and the same pulsing "close
 * enough to act on it" tell as `drawSabotageCamera`, because it's the same
 * kind of object wearing different paint.
 */
function drawStreetHack(
  ctx: CanvasRenderingContext2D,
  node: { x: number; y: number; kind: 'atm' | 'phone' | 'building'; hackable: boolean; damaged: boolean },
  now: number,
) {
  const size = 14;
  const x = px(node.x - size / 2);
  const y = px(node.y - size / 2);
  const body =
    node.kind === 'atm' ? PALETTE.atmBody : node.kind === 'building' ? PALETTE.panelBody : PALETTE.phoneBody;
  const dark =
    node.kind === 'atm' ? PALETTE.atmDark : node.kind === 'building' ? PALETTE.panelDark : PALETTE.phoneDark;

  if (node.hackable) drawPulseGlow(ctx, x + size / 2, y + size / 2, size / 2, now);

  ctx.globalAlpha = node.damaged ? 0.6 : 1;
  ctx.fillStyle = body;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, size + 1, size + 1);

  // A small pale slot/screen so the kinds also read apart at a distance, not
  // just by hue — a card slot low and wide, a keypad centred and square, a
  // building panel a 2x2 grid of tiny lights (the one kind that isn't a
  // machine bolted to the street, it's a way into the wall itself).
  ctx.fillStyle = PALETTE.windowLit;
  if (node.kind === 'atm') ctx.fillRect(x + 2, y + size - 5, size - 4, 2);
  else if (node.kind === 'phone') ctx.fillRect(x + size / 2 - 2, y + 3, 4, 4);
  else {
    ctx.fillRect(x + 3, y + 3, 3, 3);
    ctx.fillRect(x + size - 6, y + 3, 3, 3);
    ctx.fillRect(x + 3, y + size - 6, 3, 3);
    ctx.fillRect(x + size - 6, y + size - 6, 3, 3);
  }
  ctx.globalAlpha = 1;

  if (node.damaged) drawSabotageDamage(ctx, x, y, size, now);
}

/**
 * A junction box: a squat olive-drab utility cabinet with a hazard-stripe
 * lid, the one point object on this map that isn't trying to blend in —
 * it's supposed to read as "there's something worth prying open in here"
 * from across the street. `tier` darkens the stripe toward the higher
 * tiers, a cheap tell that the box behind it is worth more before the
 * player's even close enough to read the prompt.
 */
function drawJunctionBox(
  ctx: CanvasRenderingContext2D,
  node: { x: number; y: number; tier: 1 | 2 | 3 | 4 | 5; crackable: boolean; damaged: boolean },
  now: number,
) {
  const size = 14;
  const x = px(node.x - size / 2);
  const y = px(node.y - size / 2);

  if (node.crackable) drawPulseGlow(ctx, x + size / 2, y + size / 2, size / 2, now);

  ctx.globalAlpha = node.damaged ? 0.6 : 1;
  ctx.fillStyle = PALETTE.junctionBody;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = PALETTE.junctionDark;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, size + 1, size + 1);

  // A hazard-stripe lid, higher tiers a shade darker/duller — worn from more
  // hands trying to get into it. Skipped once cracked open — a box mid-
  // cooldown reads as pried open, not just dimmer, so the stripe's gone
  // until it's fixed.
  if (!node.damaged) {
    ctx.fillStyle = PALETTE.junctionStripe;
    ctx.globalAlpha = 1 - (node.tier - 1) * 0.12;
    ctx.fillRect(x + 2, y + 2, size - 4, 3);
  }
  ctx.globalAlpha = node.damaged ? 0.6 : 1;

  // A centre seam, like a hinged double-door cabinet, plus a rivet at each
  // corner and a couple of grille slats above the handle — the same
  // "manufactured object, not a flat sprite" texture the camera post gets,
  // scaled to a squat 14px cabinet instead of a slim housing.
  ctx.strokeStyle = PALETTE.junctionDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + size / 2, y + 6);
  ctx.lineTo(x + size / 2, y + size - 2);
  ctx.stroke();
  for (let gy = y + size - 6; gy < y + size - 2; gy += 2) {
    ctx.beginPath();
    ctx.moveTo(x + 2, gy);
    ctx.lineTo(x + size - 2, gy);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.junctionDark;
  ctx.globalAlpha = (node.damaged ? 0.6 : 1) * 0.7;
  for (const [bx, by] of [
    [x + 1.5, y + 1.5],
    [x + size - 2.5, y + 1.5],
    [x + 1.5, y + size - 2.5],
    [x + size - 2.5, y + size - 2.5],
  ]) {
    ctx.fillRect(px(bx), px(by), 1, 1);
  }

  ctx.globalAlpha = node.damaged ? 0.6 : 1;
  ctx.fillStyle = PALETTE.junctionDark;
  ctx.fillRect(x + size / 2 - 1, y + size - 6, 2, 4);
  ctx.globalAlpha = 1;

  if (node.damaged) drawSabotageDamage(ctx, x, y, size, now);
}

/**
 * Lit windows. Roughly two in three, fixed per building so the town doesn't
 * blink — everybody is in, and the protagonist is out here.
 */
function drawWindows(ctx: CanvasRenderingContext2D, loc: OverworldLocation, isB: boolean) {
  const rand = noise(`windows:${loc.id}`);
  const w = 8;
  const h = 10;
  const gap = 10;
  const top = loc.y + 22;
  const cols = Math.max(1, Math.floor((loc.w - gap) / (w + gap)));
  const rows = Math.max(1, Math.floor((loc.h - 34) / (h + gap)));
  const startX = loc.x + px((loc.w - (cols * (w + gap) - gap)) / 2);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = rand() < (isB ? 0.45 : 0.66);
      ctx.fillStyle = lit ? PALETTE.windowLit : PALETTE.windowDark;
      ctx.fillRect(startX + c * (w + gap), top + r * (h + gap), w, h);
    }
  }
}

/** A tag on the wall, low enough to be reached by hand — two or three angled
 * strokes in the same red the resistance's own signage already uses, fixed
 * per building so it reads as something somebody actually left rather than a
 * texture. Deliberately crude: this is a spray mark, not a mural. */
function drawTag(ctx: CanvasRenderingContext2D, loc: OverworldLocation, roofH: number) {
  const rand = noise(`tag:${loc.id}`);
  const baseY = loc.y + loc.h - 9;
  const strokes = 2 + Math.floor(rand() * 2);
  ctx.strokeStyle = PALETTE.tag;
  ctx.lineWidth = 2;
  for (let i = 0; i < strokes; i++) {
    const sx = loc.x + 6 + rand() * Math.max(1, loc.w - 20);
    const sy = baseY - rand() * 6;
    const len = 6 + rand() * 8;
    const slant = (rand() - 0.5) * 6;
    ctx.beginPath();
    ctx.moveTo(px(sx), px(Math.max(loc.y + roofH + 2, sy)));
    ctx.lineTo(px(sx + slant), px(sy + len));
    ctx.stroke();
  }
}

/**
 * Under the player's feet once a board's actually owned — walking (tier 0)
 * draws nothing here at all. Tiers 1–3 are wheels-on-ground: a deck plank
 * that gets a cleaner tone each tier, wheel nubs at the corners. Tiers 4–5
 * are the hover tiers: the deck lifts off a visible gap above the ground
 * with its own soft glow underneath, brighter and closer to the terminal
 * green the whole hacking side of the game already uses for "this is the
 * good tech" at tier 5 — the Hoverboard and the Cyberdeck read as the same
 * kind of object on purpose.
 */
function drawBoard(ctx: CanvasRenderingContext2D, cx: number, feetY: number, tier: number, now: number) {
  const w = 14;
  if (tier <= 0) return;

  if (tier <= 3) {
    const deck = [PALETTE.plank, '#8a6b42', PALETTE.parkedCarBody][tier - 1];
    const h = 4;
    const y = px(feetY - 1);
    ctx.fillStyle = deck;
    ctx.fillRect(px(cx - w / 2), y, w, h);
    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(px(cx - w / 2 + 1), y + h, 2, 2);
    ctx.fillRect(px(cx + w / 2 - 3), y + h, 2, 2);
    return;
  }

  const hover5 = tier >= 5;
  const gap = hover5 ? 5 : 3;
  const glowColor = hover5 ? PALETTE.marqueeGlow : PALETTE.camera;
  const bodyColor = hover5 ? '#e8f8ee' : '#dce8f4';
  const bob = Math.sin(now / 220) * 0.8; // a slight float, not a bounce
  const y = px(feetY - gap + bob);

  ctx.fillStyle = glowColor;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.ellipse(cx, feetY + 1, w / 2 + 1, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = bodyColor;
  ctx.fillRect(px(cx - w / 2), y, w, 3);
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(px(cx - w / 2) - 0.5, y - 0.5, w + 1, 4);
}

/**
 * A limb: an outline stroke, then a thinner fill stroke on top, same
 * two-pass trick every filled shape on this canvas uses for its outline —
 * just applied to a line instead of a rect, since a stick figure's arms and
 * legs are lines, not bars.
 */
function limb(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px(x1), px(y1));
  ctx.lineTo(px(x2), px(y2));
  ctx.stroke();

  ctx.strokeStyle = PALETTE.spriteShirt;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px(x1), px(y1));
  ctx.lineTo(px(x2), px(y2));
  ctx.stroke();
}

/** A small fixed wardrobe so ambient pedestrians don't all wear the same
 * shirt — picked once per npc id, never reshuffled. */
const NPC_SHIRTS = ['#7a8a9c', '#9c7a6a', '#6a9c7e', '#c2a15c', '#8a6a9c', '#5c8fae'];

/** Same idea as `NPC_SHIRTS` — a small fixed set of coats so the town's
 * cats don't all read as one cat copy-pasted around. */
const CAT_COATS = ['#4a4038', '#8a7460', '#2a2620', '#a89468'];

/**
 * Ambient life, dispatched by kind — cheap on purpose, the same sprite
 * budget every obstacle on this canvas keeps to. None of these are the
 * player: no cap, no backpack, no board, so the protagonist never gets lost
 * in a crowd of themselves.
 */
function drawNpc(ctx: CanvasRenderingContext2D, x: number, y: number, kind: NpcKind, facing: 1 | -1, id: string, now: number) {
  switch (kind) {
    case 'person':
      return drawPedestrian(ctx, x, y, id, facing, now);
    case 'dog':
      return drawDog(ctx, x, y);
    case 'cat':
      return drawCat(ctx, x, y, facing, id);
    case 'bird':
      return drawBird(ctx, x, y, facing);
  }
}

/** Which of the pack's 6 character skins a given id wears — the same "small
 * fixed wardrobe, picked once, never reshuffled" trick the old `NPC_SHIRTS`
 * used, just indexing a skin instead of a color. */
function characterSkinFor(id: string): number {
  return Math.floor(noise(`skin:${id}`)() * CHARACTERS.length);
}

/** A 3-frame walk cycle when moving, held on the middle (most neutral)
 * frame when standing still — same two-beat cadence `drawPlayer`'s old
 * `stride` used, just indexing a frame instead of flipping a sign. */
function walkFrame(now: number, moving: boolean): 0 | 1 | 2 {
  if (!moving) return 1;
  return (Math.floor(now / 150) % 3) as 0 | 1 | 2;
}

/** A plain townsperson, drawn from the sprite sheet once it's loaded — the
 * old torso-and-head block otherwise. Ambient pedestrians only ever face
 * left or right (`Npc.direction`/`wanderPos` don't track a vertical axis),
 * so this always reads off the `left`/`right` columns, walking in place at
 * a fixed animation rate rather than syncing to true movement speed —
 * plenty for something this small and this far from the camera's focus. */
function drawPedestrian(ctx: CanvasRenderingContext2D, x: number, y: number, id: string, facing: 1 | -1, now: number) {
  if (spriteSheetReady()) {
    const character = CHARACTERS[characterSkinFor(id)];
    const frames = facing < 0 ? character.left : character.right;
    const offset = noise(`walk-phase:${id}`)() * 900;
    const frame = frames[Math.floor(((now + offset) / 260) % 3)];
    drawSpriteTile(ctx, frame, px(x), px(y) - CHARACTER_DRAW_SIZE.h / 2, CHARACTER_DRAW_SIZE.w, CHARACTER_DRAW_SIZE.h);
    return;
  }

  const cx = px(x);
  const feetY = px(y);
  const bodyW = 6;
  const bodyH = 9;
  const headR = 2.5;
  const shirt = NPC_SHIRTS[Math.floor(noise(`shirt:${id}`)() * NPC_SHIRTS.length)];

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(cx - 4, feetY, 8, 2);

  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(cx - bodyW / 2 - 1, feetY - bodyH - 1, bodyW + 2, bodyH + 2);
  ctx.fillStyle = shirt;
  ctx.fillRect(cx - bodyW / 2, feetY - bodyH, bodyW, bodyH);

  ctx.fillStyle = PALETTE.spriteSkin;
  ctx.beginPath();
  ctx.arc(cx, feetY - bodyH - headR, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** A dog, low to the ground — a body block, a head-end bump, and four short
 * stub legs so it reads as an animal rather than a rock. */
function drawDog(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const cx = px(x);
  const cy = px(y);

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(cx - 5, cy + 3, 10, 2);

  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(cx - 6, cy - 3, 12, 7);
  ctx.fillStyle = PALETTE.dogBody;
  ctx.fillRect(cx - 5, cy - 2, 10, 5);
  ctx.fillRect(cx - 6, cy - 4, 4, 3);

  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(cx - 5, cy + 2, 2, 3);
  ctx.fillRect(cx + 3, cy + 2, 2, 3);
}

/** A cat — smaller and slighter than the dog, with a tail held up rather
 * than trailing low, and two pointed ear-tips instead of a floppy one,
 * so the two read as different animals rather than the same block at
 * different sizes. `coat` varies per npc id the same way a pedestrian's
 * shirt does. */
function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, facing: 1 | -1, id: string) {
  const cx = px(x);
  const cy = px(y);
  const coat = CAT_COATS[Math.floor(noise(`coat:${id}`)() * CAT_COATS.length)];

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(cx - 4, cy + 2, 8, 2);

  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(cx - 5, cy - 2, 9, 5);
  ctx.fillRect(cx + 3 * facing, cy - 4, 3, 3);
  ctx.fillStyle = coat;
  ctx.fillRect(cx - 4, cy - 1, 7, 3);
  ctx.fillRect(cx + 3 * facing, cy - 3, 3, 2);

  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(cx + 3 * facing, cy - 5, 1, 1);
  ctx.fillRect(cx + 5 * facing, cy - 5, 1, 1);

  // Held up, not trailing — the tail is the one thing at this scale that
  // reads "cat" before anything else does.
  ctx.fillStyle = coat;
  ctx.fillRect(cx - 6 * facing, cy - 5, 2, 4);
}

/** A bird overhead — a body dash and two wing flicks angled off whichever
 * way it's travelling, no more detail than that reads at this size. */
function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, facing: 1 | -1) {
  const cx = px(x);
  const cy = px(y);

  ctx.fillStyle = PALETTE.birdBody;
  ctx.fillRect(cx - 2, cy - 1, 4, 2);
  ctx.fillRect(cx - 5 * facing, cy - 2, 3, 1);
  ctx.fillRect(cx + 2 * facing, cy - 2, 3, 1);
}

/** The last-nonzero `{x,y}` facing vector (`Overworld.tsx` never lets it
 * settle back to zero) collapsed to one of the sprite sheet's 4 columns.
 * Diagonal movement sets both axes at once; horizontal wins the tie, purely
 * an arbitrary but consistent choice. */
function facingDirection(facing: { x: number; y: number }): Direction {
  if (Math.abs(facing.x) >= Math.abs(facing.y)) return facing.x < 0 ? 'left' : 'right';
  return facing.y < 0 ? 'up' : 'down';
}

/**
 * The protagonist. A real character sprite once the sheet's loaded, walking
 * a 3-frame cycle in whichever of the 4 sheet directions `facing` resolves
 * to; the old hand-drawn stick figure while it isn't. The board and its
 * shadow are drawn either way — Style Guide 07's build, not the sheet's.
 */
function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: { x: number; y: number },
  facing: { x: number; y: number },
  size: { w: number; h: number },
  moving: boolean,
  now: number,
  boardTier: number,
) {
  const cx = px(player.x);
  const feetY = px(player.y);

  // A flat shadow, so the figure stands on the street instead of floating on it.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(cx - size.w / 2 - 1, feetY, size.w + 2, 2);

  drawBoard(ctx, cx, feetY, boardTier, now);

  if (spriteSheetReady()) {
    const direction = facingDirection(facing);
    const frame = CHARACTERS[0][direction][walkFrame(now, moving)];
    drawSpriteTile(ctx, frame, cx, feetY - CHARACTER_DRAW_SIZE.h / 2, CHARACTER_DRAW_SIZE.w, CHARACTER_DRAW_SIZE.h);
    return;
  }

  const headR = 3;
  const headCy = feetY - size.h + headR;
  const neckY = headCy + headR;
  const hipY = feetY - 6;

  const stride = moving ? (Math.floor(now / 220) % 2 === 0 ? 1 : -1) : 0;

  // A backpack behind the spine — chunkier than a bare "holdover" bag on
  // purpose, with its own strap line, since a skater's backpack is half the
  // silhouette. Still drawn under the limbs so it reads as worn, not glued on.
  ctx.fillStyle = PALETTE.spriteBag;
  ctx.fillRect(cx - 3, neckY, 6, hipY - neckY + 2);
  ctx.fillStyle = PALETTE.spriteBagStrap;
  ctx.fillRect(cx - 3, neckY, 6, 1);
  ctx.fillRect(cx - 1, neckY + 1, 1, hipY - neckY);

  limb(ctx, cx, hipY, cx - 3 - stride, feetY);
  limb(ctx, cx, hipY, cx + 3 + stride, feetY);
  limb(ctx, cx, neckY, cx, hipY);
  limb(ctx, cx, neckY, cx - 3 + stride, neckY + 6);
  limb(ctx, cx, neckY, cx + 3 - stride, neckY + 6);

  ctx.fillStyle = PALETTE.spriteSkin;
  ctx.beginPath();
  ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  ctx.stroke();

  // A cap, worn backwards — the crown covers just the top of the head, the
  // way a real cap sits, leaving the face visible underneath instead of
  // reading as a solid helmet. The brim sits on whichever side is actually
  // the *back* of the head (opposite the direction they're facing), not the
  // front. Facing away from the camera puts the back of the head — brim
  // included — toward the viewer, same as the old hair logic's "you see the
  // back of it" rule.
  ctx.fillStyle = PALETTE.capCrown;
  ctx.beginPath();
  ctx.arc(cx, headCy, headR + 0.5, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = PALETTE.capBrim;
  if (facing.x !== 0) {
    ctx.fillRect(facing.x > 0 ? cx - headR - 2 : cx + headR, headCy - 2, 2, 2);
  } else if (facing.y < 0) {
    ctx.fillRect(cx - 1, headCy + headR - 2, 2, 2);
  } else {
    ctx.fillRect(cx - 1, headCy - headR - 1, 2, 1);
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
