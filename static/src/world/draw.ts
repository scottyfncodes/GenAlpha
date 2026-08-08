import { MAP_HEIGHT, MAP_WIDTH, visibleLocations, type OverworldLocation } from './locations';
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
  outline: '#20262f',
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
  for (const loc of locations) if (loc.language === 'B') drawGlow(ctx, loc);

  for (const loc of locations) drawBuilding(ctx, loc, here?.id === loc.id, tier);

  drawPlayer(ctx, player, facing, playerSize);

  ctx.restore();
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
 * The protagonist. Deliberately small against the map — big skies, small
 * sprites — and drawn as four flat shapes: legs, body, head, and a hairline
 * that shifts with facing so the sprite reads as turning without needing four
 * sheets of frames.
 */
function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: { x: number; y: number },
  facing: { x: number; y: number },
  size: { w: number; h: number },
) {
  const x = px(player.x - size.w / 2);
  const y = px(player.y - size.h + 2);

  // A flat shadow, so the sprite sits on the street instead of floating on it.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(x - 1, px(player.y), size.w + 2, 2);

  ctx.fillStyle = PALETTE.sprite;
  ctx.fillRect(x, y + size.h - 5, size.w, 5); // legs
  ctx.fillStyle = PALETTE.spriteShirt;
  ctx.fillRect(x, y + 4, size.w, size.h - 9); // body
  ctx.fillStyle = PALETTE.spriteSkin;
  ctx.fillRect(x + 1, y, size.w - 2, 5); // head

  // Hair, offset by facing. Away from the camera means you see the back of it.
  ctx.fillStyle = PALETTE.sprite;
  const back = facing.y < 0;
  ctx.fillRect(x + 1, y, size.w - 2, back ? 4 : 2);
  if (facing.x !== 0) ctx.fillRect(facing.x > 0 ? x + size.w - 2 : x + 1, y, 1, 4);

  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, size.w + 1, size.h + 1);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
