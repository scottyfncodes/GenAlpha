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

  for (const obstacle of obstacles) drawObstacle(ctx, obstacle);
  for (const loc of locations) {
    if (loc.render === 'camera') drawCamera(ctx, loc, here?.id === loc.id);
    else drawBuilding(ctx, loc, here?.id === loc.id, tier);
  }

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
 * A building: body, roof, a row of windows. The roof reads as pitched by being
 * inset — at eight pixels of detail that is enough, and cheaper than an angle
 * that would need anti-aliasing to survive.
 *
 * At `flagged` and above, Language A buildings get a one-line scanline tear
 * (Style Guide 07: "Language A elements can start subtly glitching at the
 * edges … a shader/filter toggle on existing UI"). Language B never glitches;
 * it was never claiming to be smooth.
 */
function drawBuilding(
  ctx: CanvasRenderingContext2D,
  loc: OverworldLocation,
  isHere: boolean,
  tier: ThresholdTier,
) {
  const isB = loc.language === 'B';
  const roofH = 14;

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

  if (!isB && (tier === 'flagged' || tier === 'hunted')) {
    const rand = noise(`glitch:${loc.id}:${tier}`);
    const y = px(loc.y + roofH + rand() * (loc.h - roofH - 6));
    ctx.fillStyle = PALETTE.windowLit;
    ctx.globalAlpha = tier === 'hunted' ? 0.35 : 0.18;
    ctx.fillRect(loc.x + px(rand() * 6), y, loc.w - px(rand() * 10), 2);
    ctx.globalAlpha = 1;
  }

  if (isHere) {
    ctx.strokeStyle = PALETTE.spriteShirt;
    ctx.lineWidth = 2;
    ctx.strokeRect(loc.x - 2, loc.y - 2, loc.w + 4, loc.h + 4);
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
