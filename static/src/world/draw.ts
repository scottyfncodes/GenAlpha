import { MAP_HEIGHT, MAP_WIDTH, visibleLocations, type OverworldLocation } from './locations';
import type { Obstacle } from './obstacles';
import type { ThresholdTier } from '../state/schema';
import { mulberry32, seedFrom } from '../systems/rng';

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
  roadLine: '#6b7488',
  roofA: '#2f3a4d',
  wallA: '#4a5468',
  roofB: '#4a2f2a',
  wallB: '#6d4437',
  windowLit: '#f0c07a',
  windowDark: '#2a3242',
  warmGlow: 'rgba(240, 160, 60, 0.10)',
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
  outline: '#20262f',
  patrolBody: '#e6402a',
  patrolCab: '#100e0d',
  patrolLight: '#f0c07a',
  patrolRing: 'rgba(230, 64, 42, 0.22)',
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
  carBody: '#7a8a5c',
  carGlass: '#a9c4d6',
  atmBody: '#3c7a4e',
  atmDark: '#1f4029',
  phoneBody: '#8a7a5c',
  phoneDark: '#4a4030',
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
  patrols: { x: number; y: number; radius: number }[],
  cameraNodes: { x: number; y: number; dismantlable: boolean }[],
  hackNodes: { x: number; y: number; kind: 'atm' | 'phone'; hackable: boolean }[],
  moving: boolean,
  now: number,
  driving: boolean,
) {
  const vw = canvas.clientWidth;
  const vh = canvas.clientHeight;

  ctx.imageSmoothingEnabled = false;

  drawSky(ctx, vw, vh);

  const camX = clamp(player.x - vw / (2 * scale), 0, Math.max(0, MAP_WIDTH - vw / scale));
  const camY = clamp(player.y - vh / (2 * scale), 0, Math.max(0, MAP_HEIGHT - vh / scale));

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(px(-camX), px(-camY));

  drawGround(ctx);
  drawRoads(ctx);

  const locations = visibleLocations(flags);

  // Warm pockets first, under everything, so the light sits on the street.
  // A camera doesn't get one — it isn't a place the crew built, it's the
  // thing they're building around.
  for (const loc of locations) if (loc.language === 'B' && loc.render !== 'camera') drawGlow(ctx, loc);

  // A handful of lit islands on an otherwise empty street — before the
  // obstacles/buildings so a building in front of one just occludes it.
  for (const p of STREETLIGHT_POINTS) drawStreetlight(ctx, p);

  for (const obstacle of obstacles) drawObstacle(ctx, obstacle);
  for (const loc of locations) drawLocation(ctx, loc, here?.id === loc.id, tier);

  // Ordinary cameras, worth taking apart — the same small box the story pole
  // renders as, so it reads as the same kind of object. `dismantlable` is
  // just whether the player is close enough to act on it right now; a camera
  // on cooldown after a dismantle isn't in this list at all.
  for (const c of cameraNodes) drawSabotageCamera(ctx, c, c.dismantlable);

  // ATMs and phone lines — a street hack is visible whether or not the
  // player owns the rig to actually crack it, same as a locked door is
  // still a door; the prompt itself is what says no.
  for (const h of hackNodes) drawStreetHack(ctx, h);

  // Detection rings under the vans, so a van sitting still doesn't visually
  // "arrive" on top of its own danger zone.
  for (const patrol of patrols) drawPatrolRing(ctx, patrol);
  for (const patrol of patrols) drawPatrol(ctx, patrol);

  if (driving) drawBeater(ctx, player);
  else drawPlayer(ctx, player, facing, playerSize, moving, now);

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

/** Trunk, then a canopy as two overlapping discs so it doesn't read as a
 * perfect ball. */
function drawTree(ctx: CanvasRenderingContext2D, o: Obstacle) {
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

/** A Helio van: a body, a darker cab end, two headlights. Small and flat,
 * matching the sprite budget everything else here keeps to. */
function drawPatrol(ctx: CanvasRenderingContext2D, patrol: { x: number; y: number }) {
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
function drawGround(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  ctx.fillStyle = PALETTE.groundAlt;
  for (let y = 0; y < MAP_HEIGHT; y += 8) {
    for (let x = ((y / 8) % 2) * 8; x < MAP_WIDTH; x += 16) {
      ctx.fillRect(x, y, 8, 8);
    }
  }
}

/** Streets, with a broken centre line. Empty ones, all the way across. */
function drawRoads(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = PALETTE.road;
  for (let x = 0; x < MAP_WIDTH; x += 160) ctx.fillRect(x, 0, 24, MAP_HEIGHT);
  for (let y = 0; y < MAP_HEIGHT; y += 152) ctx.fillRect(0, y, MAP_WIDTH, 24);

  ctx.fillStyle = PALETTE.roadLine;
  ctx.globalAlpha = 0.5;
  for (let x = 0; x < MAP_WIDTH; x += 160) {
    for (let y = 4; y < MAP_HEIGHT; y += 20) ctx.fillRect(x + 11, y, 2, 8);
  }
  for (let y = 0; y < MAP_HEIGHT; y += 152) {
    for (let x = 4; x < MAP_WIDTH; x += 20) ctx.fillRect(x, y + 11, 8, 2);
  }
  ctx.globalAlpha = 1;

  drawCracks(ctx);
}

/** Hairline cracks in the asphalt — fixed per road segment (seeded on its own
 * coordinates, not per-frame) so a street reads as old rather than new,
 * without ever reshuffling under the player's feet. Cheap grit: a handful of
 * short broken lines, not a texture pass. */
function drawCracks(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = PALETTE.crack;
  ctx.lineWidth = 1;
  for (let x = 0; x < MAP_WIDTH; x += 160) {
    const rand = noise(`crack:v:${x}`);
    for (let i = 0; i < 6; i++) {
      const cy = rand() * MAP_HEIGHT;
      const len = 6 + rand() * 10;
      const branch = (rand() - 0.5) * 10;
      ctx.beginPath();
      ctx.moveTo(px(x + 4 + rand() * 16), px(cy));
      ctx.lineTo(px(x + 4 + rand() * 16 + branch), px(cy + len));
      ctx.stroke();
    }
  }
  for (let y = 0; y < MAP_HEIGHT; y += 152) {
    const rand = noise(`crack:h:${y}`);
    for (let i = 0; i < 6; i++) {
      const cx = rand() * MAP_WIDTH;
      const len = 6 + rand() * 10;
      const branch = (rand() - 0.5) * 10;
      ctx.beginPath();
      ctx.moveTo(px(cx), px(y + 4 + rand() * 16));
      ctx.lineTo(px(cx + len), px(y + 4 + rand() * 16 + branch));
      ctx.stroke();
    }
  }
}

/**
 * Streetlights at a handful of intersections — fixed points, not one per
 * corner, because the point is a lit island on an empty street (Style Guide
 * 07's isolation rule), not municipal coverage. Drawn after roads and glows,
 * before buildings, so a building in front of one simply occludes it, the
 * same depth order everything else on this canvas already uses.
 */
const STREETLIGHT_POINTS: { x: number; y: number }[] = [
  { x: 332, y: 164 },
  { x: 172, y: 316 },
  { x: 652, y: 164 },
  { x: 812, y: 468 },
  { x: 1132, y: 164 },
  { x: 492, y: 650 },
  { x: 972, y: 650 },
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
 * original plain box every location used to render as. The "you are here"
 * outline is centralised here rather than in each shape, since it's the same
 * bounding-box rectangle regardless of what's drawn inside it — except a
 * camera, which keeps its own tighter ring around the small box it actually
 * draws.
 */
function drawLocation(ctx: CanvasRenderingContext2D, loc: OverworldLocation, isHere: boolean, tier: ThresholdTier) {
  switch (loc.render) {
    case 'camera':
      drawCamera(ctx, loc, isHere);
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
    default:
      drawBuilding(ctx, loc, tier);
  }
  drawHereOutline(ctx, loc, isHere);
}

function drawHereOutline(ctx: CanvasRenderingContext2D, loc: OverworldLocation, isHere: boolean) {
  if (!isHere) return;
  ctx.strokeStyle = PALETTE.spriteShirt;
  ctx.lineWidth = 2;
  ctx.strokeRect(loc.x - 2, loc.y - 2, loc.w + 4, loc.h + 4);
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

  ctx.fillStyle = isB ? PALETTE.wallB : PALETTE.wallA;
  ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);

  ctx.fillStyle = isB ? PALETTE.roofB : PALETTE.roofA;
  ctx.fillRect(loc.x + 4, loc.y, loc.w - 8, roofH);
  ctx.fillRect(loc.x, loc.y + roofH - 4, loc.w, 4);

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

  ctx.fillStyle = PALETTE.wallA;
  ctx.fillRect(loc.x, bodyY, loc.w, bodyH);

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
  const winY = bodyY + bodyH * 0.32;
  const winSize = 10;
  ctx.fillStyle = rand() < 0.7 ? PALETTE.windowLit : PALETTE.windowDark;
  ctx.fillRect(px(loc.x + loc.w * 0.16), px(winY), winSize, winSize);
  ctx.fillStyle = rand() < 0.7 ? PALETTE.windowLit : PALETTE.windowDark;
  ctx.fillRect(px(loc.x + loc.w * 0.68), px(winY), winSize, winSize);

  drawGlitchTear(ctx, loc, tier, roofH);
}

/** The school: the plain flat-roofed civic box, plus the two things that
 * actually say "school" — a pediment band over the entrance, steps, and a
 * flagpole taller than the roofline at one corner. */
function drawSchool(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const roofH = 14;
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  ctx.fillStyle = PALETTE.wallA;
  ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
  ctx.fillStyle = PALETTE.roofA;
  ctx.fillRect(loc.x + 4, loc.y, loc.w - 8, roofH);
  ctx.fillRect(loc.x, loc.y + roofH - 4, loc.w, 4);

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

  ctx.fillStyle = PALETTE.wallA;
  ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);

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
 * "cameras on the bandstand" line), a banner strung between posts, benches. */
function drawPlaza(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  ctx.fillStyle = PALETTE.pavingDark;
  ctx.fillRect(loc.x, loc.y, loc.w, loc.h);
  ctx.fillStyle = PALETTE.pavingLight;
  for (let y = loc.y; y < loc.y + loc.h; y += 10) {
    for (let x = loc.x + (((y - loc.y) / 10) % 2) * 10; x < loc.x + loc.w; x += 20) {
      ctx.fillRect(x, y, 10, 10);
    }
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

  ctx.fillStyle = PALETTE.wallB;
  ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);

  ctx.fillStyle = PALETTE.corrugated;
  ctx.fillRect(loc.x, loc.y, loc.w, roofH);
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

  ctx.fillStyle = PALETTE.wallB;
  ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
  ctx.fillStyle = PALETTE.corrugated;
  ctx.fillRect(loc.x + 3, loc.y, loc.w - 6, roofH);

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

  ctx.fillStyle = PALETTE.wallA;
  ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
  ctx.fillStyle = PALETTE.roofA;
  ctx.fillRect(loc.x + 3, loc.y, loc.w - 6, roofH);

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

  ctx.fillStyle = PALETTE.wallA;
  ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
  ctx.fillStyle = PALETTE.roofA;
  ctx.fillRect(loc.x + 3, loc.y, loc.w - 6, roofH);

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
 * A camera: a fixed 2x2-tile blue box on its post, nothing more — per the
 * build note, a camera is a post with a lens on it, not a building with a
 * different paint job. Drawn at a fixed size centred in the location's own
 * (larger) rect, so the interaction radius and collision footprint —
 * unchanged, still the full rect — stay generous even though the thing the
 * player actually sees is small.
 */
function drawCamera(ctx: CanvasRenderingContext2D, loc: OverworldLocation, isHere: boolean) {
  const size = 16; // two of drawGround's 8px tiles, on each side
  const x = px(loc.x + loc.w / 2 - size / 2);
  const y = px(loc.y + loc.h / 2 - size / 2);

  ctx.fillStyle = PALETTE.camera;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = PALETTE.cameraDark;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, size + 1, size + 1);

  if (isHere) {
    ctx.strokeStyle = PALETTE.spriteShirt;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 4, y - 4, size + 8, size + 8);
  }
}

/**
 * An ordinary camera, worth taking apart — the same fixed 2x2-tile blue box
 * as `drawCamera` above, because it is the same kind of object; the only
 * difference is this one sits on a bare point rather than centred in a named
 * location's rect, so the two take slightly different inputs and it wasn't
 * worth forcing one shape to fit both. The highlight ring is the same
 * "you're close enough" tell a location gets, doubling here as the only
 * signal that dismantling is actually available right now.
 */
function drawSabotageCamera(
  ctx: CanvasRenderingContext2D,
  node: { x: number; y: number },
  dismantlable: boolean,
) {
  const size = 16;
  const x = px(node.x - size / 2);
  const y = px(node.y - size / 2);

  ctx.fillStyle = PALETTE.camera;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = PALETTE.cameraDark;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, size + 1, size + 1);

  if (dismantlable) {
    ctx.strokeStyle = PALETTE.spriteShirt;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 4, y - 4, size + 8, size + 8);
  }
}

/**
 * A street hack — cash-register green for an ATM, sun-bleached tan for a
 * payphone, so the two read apart at a glance the same way a camera's blue
 * reads apart from either. Same footprint and the same "close enough to act
 * on it" ring as `drawSabotageCamera`, because it's the same kind of object
 * wearing different paint.
 */
function drawStreetHack(
  ctx: CanvasRenderingContext2D,
  node: { x: number; y: number; kind: 'atm' | 'phone'; hackable: boolean },
) {
  const size = 14;
  const x = px(node.x - size / 2);
  const y = px(node.y - size / 2);
  const body = node.kind === 'atm' ? PALETTE.atmBody : PALETTE.phoneBody;
  const dark = node.kind === 'atm' ? PALETTE.atmDark : PALETTE.phoneDark;

  ctx.fillStyle = body;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, size + 1, size + 1);

  // A small pale slot/screen so the two kinds also read apart at a distance,
  // not just by hue — a card slot low and wide, a keypad centred and square.
  ctx.fillStyle = PALETTE.windowLit;
  if (node.kind === 'atm') ctx.fillRect(x + 2, y + size - 5, size - 4, 2);
  else ctx.fillRect(x + size / 2 - 2, y + 3, 4, 4);

  if (node.hackable) {
    ctx.strokeStyle = PALETTE.spriteShirt;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 4, y - 4, size + 8, size + 8);
  }
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
 * The Beater, seen from above: a body, a windshield strip, four wheel nubs at
 * the corners. Doesn't rotate with facing — same simplification the patrol
 * vans already make, a fixed top-down silhouette rather than four headings
 * of sprite. Distinct from a patrol van's red on purpose: this one is yours.
 */
function drawBeater(ctx: CanvasRenderingContext2D, player: { x: number; y: number }) {
  const w = 18;
  const h = 12;
  const x = px(player.x - w / 2);
  const y = px(player.y - h / 2);

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(x - 1, px(player.y + h / 2 - 1), w + 2, 2);

  ctx.fillStyle = PALETTE.carBody;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PALETTE.carGlass;
  ctx.fillRect(x + 3, y + 2, w - 6, h - 7);
  ctx.fillStyle = PALETTE.sprite;
  ctx.fillRect(x + 2, y - 1, 3, 2);
  ctx.fillRect(x + w - 5, y - 1, 3, 2);
  ctx.fillRect(x + 2, y + h - 1, 3, 2);
  ctx.fillRect(x + w - 5, y + h - 1, 3, 2);

  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
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

/**
 * The protagonist, redrawn as an actual stick figure — a head, a spine, two
 * arms and two legs, all lines rather than filled bars. `stride` splays the
 * limbs opposite each other and opposite the same-side leg (left leg wide
 * pairs with right arm wide), the same two-beat gait as before, just walking
 * a skeleton instead of sliding a block. Facing still reads off the hair,
 * same trick as always, so this is still one phase number and no sprite
 * sheet.
 */
function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: { x: number; y: number },
  facing: { x: number; y: number },
  size: { w: number; h: number },
  moving: boolean,
  now: number,
) {
  const cx = px(player.x);
  const feetY = px(player.y);
  const headR = 3;
  const headCy = feetY - size.h + headR;
  const neckY = headCy + headR;
  const hipY = feetY - 6;

  const stride = moving ? (Math.floor(now / 220) % 2 === 0 ? 1 : -1) : 0;

  // A flat shadow, so the figure stands on the street instead of floating on it.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(cx - size.w / 2 - 1, feetY, size.w + 2, 2);

  // A small bag behind the spine — the one holdover from a "physical
  // character" that a bare skeleton would otherwise lose entirely.
  ctx.fillStyle = PALETTE.spriteBag;
  ctx.fillRect(cx - 2, neckY, 4, hipY - neckY);

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

  // Hair, offset by facing. Away from the camera means you see the back of it.
  ctx.fillStyle = PALETTE.sprite;
  const back = facing.y < 0;
  if (back) {
    ctx.beginPath();
    ctx.arc(cx, headCy, headR, Math.PI, 0);
    ctx.fill();
  } else {
    ctx.fillRect(cx - 2, headCy - headR, 4, 2);
  }
  if (facing.x !== 0) {
    ctx.fillRect(facing.x > 0 ? cx + headR - 1 : cx - headR, headCy - 1, 1, 2);
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
