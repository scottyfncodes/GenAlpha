#!/usr/bin/env node
/**
 * RUN 2A PILOT ART GENERATOR — produces the 10 pilot assets named in
 * `docs/art/genalpha-art-pilot-review.md`, written to `public/art/<id>.png`
 * at each slot's exact `src/art/manifest.ts` dimensions.
 *
 * Not a permanent pipeline component, and not `world/draw.ts`'s renderer in
 * disguise — a one-off production method for this pilot, chosen because no
 * external art tool is available in this environment. It draws with the
 * browser's real `<canvas>` 2D API, the same primitives (`fillRect`, `arc`,
 * `imageSmoothingEnabled = false`) and the same real palette hex values
 * `world/draw.ts`'s `PALETTE` already uses — continuing this game's own
 * established "shapes and light" procedural technique into static, hand-
 * tunable image assets, rather than inventing a different visual language
 * from nothing. See the pilot review doc for an honest assessment of
 * whether that production method is the right one to scale up.
 *
 * Uses Playwright the same way `scripts/mapshot.mjs` already does — not a
 * project dependency, installed on demand:
 *
 *   npm i --no-save playwright
 *   node scripts/generate-pilot-art.mjs
 *
 * Every asset is authored at its exact declared native resolution (no
 * higher-res source downscaled at draw time) — the simplest, least
 * ambiguous choice, and consistent with how the existing Kenney tiles are
 * already used (native 16x16, not resampled from something bigger).
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'art');

/** A subset of `world/draw.ts`'s real `PALETTE` — only the entries the
 * pilot assets actually use, copied verbatim (not re-derived) so these
 * pixels are provably the same colors the live renderer already paints
 * with. */
const PALETTE = {
  ground: '#3d4759',
  groundAlt: '#434e61',
  spriteSkin: '#e8c8a8',
  spriteShirt: '#ece2d0',
  outline: '#20262f',
  capCrown: '#1a1a1c',
  capBrim: '#000000',
  treeTrunk: '#3a2c22',
  treeCanopyDark: '#33513c',
  treeCanopy: '#456b4f',
  parkedCarBody: '#5a6270',
  parkedCarGlass: '#7d8ea0',
  crateBody: '#8a6a44',
  crateEdge: '#6e5334',
  wallA: '#4a5468',
  pitchRoofA: '#3a4a3d',
  pitchRoofDarkA: '#2c3830',
  doorColor: '#2a3242',
  windowLit: '#f0c07a',
  windowDark: '#2a3242',
  curb: '#272e3a',
  chimney: '#4a4038',
  camera: '#3f7fe0',
  cameraDark: '#1f3d73',
  cameraLens: '#0d1118',
  cameraLive: '#e6402a',
  // Same red/blue the Gen A mark's own CSS uses (tokens.css --b-red/--b-spot,
  // identical hex to draw.ts's PALETTE.genA) — reproducing GenAMark.tsx's
  // exact "closed" state path data as pixel art rather than inventing new
  // mark geometry.
  bRed: '#e6402a',
  bSpot: '#2b4ed8',
  // The NPC's own shirt — distinct from the player's cream spriteShirt so
  // the two read apart in the gallery, same "small fixed wardrobe" idea
  // draw.ts's NPC_SHIRTS already uses, just one color for this pilot.
  npcShirt: '#5a7a5f',
};

/** Runs entirely inside the page — everything here is browser-context code,
 * serialized across the Playwright bridge, so it can't reference anything
 * from the Node scope above except what's passed in as an argument. */
function renderAssetInBrowser([id, w, h, p]) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  function drawCharacterCell(ox, oy, dir, frame) {
    const stride = frame === 0 ? -1 : frame === 2 ? 1 : 0;
    const horizontal = dir === 'left' || dir === 'right';
    const shirt = p.__shirt;

    // Ground shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(ox + 3, oy + 21, 10, 1);

    // Legs — splay apart on a stride when facing the viewer/away, shift
    // and stagger length along the facing axis when facing sideways.
    let leftLegX = ox + 5, rightLegX = ox + 9, leftLegH = 6, rightLegH = 6;
    if (horizontal) {
      leftLegX += stride;
      rightLegX += stride;
      leftLegH = stride > 0 ? 5 : stride < 0 ? 7 : 6;
      rightLegH = stride > 0 ? 7 : stride < 0 ? 5 : 6;
    } else {
      leftLegX -= Math.abs(stride);
      rightLegX += Math.abs(stride);
    }
    ctx.fillStyle = p.outline;
    ctx.fillRect(leftLegX, oy + 22 - leftLegH, 2, leftLegH);
    ctx.fillRect(rightLegX, oy + 22 - rightLegH, 2, rightLegH);

    // Arms, thin, at the sides.
    ctx.fillStyle = shirt;
    ctx.fillRect(ox + 2, oy + 9, 1, 6);
    ctx.fillRect(ox + 13, oy + 9, 1, 6);

    // Body.
    ctx.fillStyle = shirt;
    ctx.fillRect(ox + 4, oy + 8, 8, 8);
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 3.5, oy + 7.5, 9, 9);

    // Head.
    ctx.fillStyle = p.spriteSkin;
    ctx.fillRect(ox + 5, oy + 2, 6, 6);
    ctx.strokeStyle = p.outline;
    ctx.strokeRect(ox + 4.5, oy + 1.5, 7, 7);

    // Cap crown, always visible from above the hairline.
    ctx.fillStyle = p.capCrown;
    ctx.fillRect(ox + 4, oy, 8, 2);

    // Cap brim — on whichever side is actually the back of the head,
    // same rule draw.ts's own drawPlayer cap follows.
    ctx.fillStyle = p.capBrim;
    if (dir === 'up') ctx.fillRect(ox + 4, oy, 8, 2); // back of head fully toward camera
    if (dir === 'left') ctx.fillRect(ox + 9, oy + 1, 3, 2); // back = right side
    if (dir === 'right') ctx.fillRect(ox + 4, oy + 1, 3, 2); // back = left side
    // 'down': no brim shown — the visor is pointed away from camera.

    // Eyes, only where the face is actually toward the camera.
    ctx.fillStyle = p.outline;
    if (dir === 'down') {
      ctx.fillRect(ox + 6, oy + 5, 1, 1);
      ctx.fillRect(ox + 9, oy + 5, 1, 1);
    } else if (dir === 'left') {
      ctx.fillRect(ox + 6, oy + 5, 1, 1);
    } else if (dir === 'right') {
      ctx.fillRect(ox + 9, oy + 5, 1, 1);
    }
  }

  function drawCharacterSheet(shirt) {
    p.__shirt = shirt;
    const directions = ['left', 'down', 'up', 'right']; // matches manifest.ts's DIRECTIONS row order
    directions.forEach((dir, row) => {
      for (let frame = 0; frame < 3; frame++) drawCharacterCell(frame * 16, row * 22, dir, frame);
    });
  }

  function drawCrate() {
    ctx.fillStyle = p.crateBody;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = p.crateEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(1, 1);
    ctx.lineTo(w - 1, h - 1);
    ctx.moveTo(w - 1, 1);
    ctx.lineTo(1, h - 1);
    ctx.stroke();
  }

  function drawTree() {
    const cx = w / 2;
    const trunkW = 4, trunkH = 10;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, h - 1, 7, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.treeTrunk;
    ctx.fillRect(cx - trunkW / 2, h - trunkH, trunkW, trunkH);
    ctx.fillStyle = p.treeCanopyDark;
    ctx.beginPath();
    ctx.arc(cx, h - trunkH - 9, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.treeCanopy;
    ctx.beginPath();
    ctx.arc(cx - 2, h - trunkH - 12, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCar() {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, h - 2, w, 2);
    ctx.fillStyle = p.parkedCarBody;
    ctx.fillRect(0, 0, w, h - 1);
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 2);
    ctx.fillStyle = p.parkedCarGlass;
    ctx.fillRect(3, 2, w - 6, h - 7);
  }

  function drawHouse() {
    const roofH = Math.round(h * 0.34);
    const bodyY = roofH;
    const bodyH = h - roofH;
    const apexX = w / 2;
    const overhang = 6;

    ctx.fillStyle = p.curb;
    ctx.fillRect(0, h - 3, w, 3);

    ctx.fillStyle = p.wallA;
    ctx.fillRect(0, bodyY, w, bodyH);

    ctx.fillStyle = p.pitchRoofDarkA;
    ctx.beginPath();
    ctx.moveTo(-overhang, bodyY + 2);
    ctx.lineTo(apexX, 0);
    ctx.lineTo(w + overhang, bodyY + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.pitchRoofA;
    ctx.beginPath();
    ctx.moveTo(-overhang, bodyY + 2);
    ctx.lineTo(apexX, 0);
    ctx.lineTo(apexX, bodyY + 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = p.chimney;
    ctx.fillRect(w * 0.68, h * 0.06, 8, roofH * 0.7);

    const doorW = 18, doorH = bodyH * 0.6;
    ctx.fillStyle = p.doorColor;
    ctx.fillRect(apexX - doorW / 2, h - doorH - 3, doorW, doorH);

    const winSize = 16;
    ctx.fillStyle = p.windowLit;
    ctx.fillRect(w * 0.16, bodyY + bodyH * 0.28, winSize, winSize);
    ctx.fillStyle = p.windowDark;
    ctx.fillRect(w * 0.68 - 4, bodyY + bodyH * 0.28, winSize, winSize);

    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, bodyY + 0.5, w - 1, bodyH - 1);
  }

  function drawGroundTile() {
    ctx.fillStyle = p.ground;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = p.groundAlt;
    // Fixed, deterministic speckle rather than a real RNG — a handful of
    // hand-placed offsets is enough texture for a tileable base tile.
    const speckles = [
      [2, 3], [11, 2], [6, 8], [13, 10], [3, 13], [9, 14],
    ];
    for (const [sx, sy] of speckles) ctx.fillRect(sx, sy, 1, 1);
  }

  function drawCameraDevice() {
    ctx.fillStyle = p.cameraDark;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 + 1, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.camera;
    ctx.fillRect(1, 1, w - 2, h - 2);
    ctx.strokeStyle = p.cameraDark;
    ctx.lineWidth = 1;
    ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
    ctx.fillStyle = p.cameraLens;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 + 1, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.camera;
    ctx.beginPath();
    ctx.arc(w / 2 - 1, h / 2, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.cameraLive;
    ctx.fillRect(w - 4, 2, 2, 2);
  }

  /** Reproduces GenAMark.tsx's own "closed" state path data exactly (same
   * viewBox, same coordinates, same stroke weights/colors from
   * gen-a-mark.css) as pixel art, rather than inventing new mark geometry —
   * the already-approved design, rasterized. */
  function drawGenAMarkClosed() {
    const legLeft = [[50, 10], [22, 92]];
    const legRight = [[50, 10], [78, 92]];
    const crossbarWide = [[8, 58], [92, 58]];
    const roughCircle = [
      [91, 50], [78, 74], [61, 92], [37, 86], [12, 72],
      [15, 44], [23, 18], [50, 12], [78, 16], [88, 43],
    ];

    function strokePolyline(points, close) {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      if (close) ctx.closePath();
      ctx.stroke();
    }

    function drawInk(offsetX, offsetY, rotateDeg, color, width, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.translate(offsetX, offsetY);
      strokePolyline(legLeft, false);
      strokePolyline(legRight, false);
      strokePolyline(crossbarWide, false);
      ctx.save();
      ctx.translate(50, 50);
      ctx.rotate((rotateDeg * Math.PI) / 180);
      ctx.translate(-50, -50);
      strokePolyline(roughCircle, true);
      ctx.restore();
      ctx.restore();
    }

    // Misregistration plate first (underneath), 1.5px offset, no rotation —
    // "nearly registered" per gen-a-mark.css's closed-state comment.
    drawInk(1.5, -1.5, -125, p.bSpot, 8, 0.85);
    // Main ink on top.
    drawInk(0, 0, -125, p.bRed, 10, 1);

    // Splatter, filled, on top of everything.
    ctx.fillStyle = p.bRed;
    ctx.beginPath();
    ctx.arc(100, 36, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(26, 82, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawUiIcon() {
    const cx = w / 2, cy = h / 2;
    ctx.strokeStyle = p.camera;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = p.camera;
    ctx.beginPath();
    ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  switch (id) {
    case 'character.player':
      drawCharacterSheet(p.spriteShirt);
      break;
    case 'character.npc.person':
      drawCharacterSheet(p.npcShirt);
      break;
    case 'prop.crate':
      drawCrate();
      break;
    case 'prop.tree.tall':
      drawTree();
      break;
    case 'vehicle.car':
      drawCar();
      break;
    case 'building.house':
      drawHouse();
      break;
    case 'terrain.ground':
      drawGroundTile();
      break;
    case 'technology.camera':
      drawCameraDevice();
      break;
    case 'effect.gen-a-mark':
      drawGenAMarkClosed();
      break;
    case 'ui-icon.generic':
      drawUiIcon();
      break;
    default:
      throw new Error(`no pilot drawer for ${id}`);
  }

  return canvas.toDataURL('image/png');
}

/** The 10 pilot assets, one per required category — id and exact size
 * copied from `src/art/manifest.ts`, not re-measured. */
const PILOT_ASSETS = [
  { id: 'character.player', w: 48, h: 88 },
  { id: 'character.npc.person', w: 48, h: 88 },
  { id: 'prop.crate', w: 16, h: 16 },
  { id: 'prop.tree.tall', w: 20, h: 40 },
  { id: 'vehicle.car', w: 18, h: 12 },
  { id: 'building.house', w: 130, h: 96 },
  { id: 'terrain.ground', w: 16, h: 16 },
  { id: 'technology.camera', w: 16, h: 16 },
  { id: 'effect.gen-a-mark', w: 100, h: 100 },
  { id: 'ui-icon.generic', w: 24, h: 24 },
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('about:blank');

for (const asset of PILOT_ASSETS) {
  const dataUrl = await page.evaluate(renderAssetInBrowser, [asset.id, asset.w, asset.h, PALETTE]);
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  const outPath = path.join(outDir, `${asset.id}.png`);
  writeFileSync(outPath, Buffer.from(base64, 'base64'));
  console.log(`wrote ${outPath} (${asset.w}x${asset.h})`);
}

await browser.close();
