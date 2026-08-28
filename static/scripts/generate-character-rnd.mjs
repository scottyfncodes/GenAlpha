#!/usr/bin/env node
/**
 * CHARACTER ART R&D GENERATOR — three substantially different character
 * directions, exploring the visual-language question the Run 2A pilot
 * review left open. Outputs go to `docs/art/rnd/`, NOT `public/art/` —
 * these are exploratory, unapproved, and must never be mistaken for
 * production assets or counted as "real art" by `check-assets.mjs`. The
 * existing `public/art/character.player.png` / `character.npc.person.png`
 * from the Run 2A pilot are left exactly as they are; nothing here
 * overwrites them.
 *
 * Same production method as the pilot (see
 * `docs/art/genalpha-art-pilot-review.md` §1) for the same reason: no
 * external art tool or image-generation model is available in this
 * environment (checked before writing this script — see the R&D review
 * doc's "production method" section). Real `<canvas>` 2D primitives, real
 * `world/draw.ts` `PALETTE` hex values reused where a direction calls for
 * an existing color, a small number of new but palette-disciplined hex
 * values where a direction genuinely needs one (documented per-direction
 * in the review doc, not invented ad hoc).
 *
 * Usage: npm i --no-save playwright && node scripts/generate-character-rnd.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const artDir = path.join(here, '..', 'public', 'art');
const outDir = path.join(here, '..', 'docs', 'art', 'rnd');

/** `world/draw.ts`'s real PALETTE, the subset used here, plus each
 * direction's own small addition (labelled inline, never invented without
 * a note — see the review doc for the full accounting). */
const PALETTE = {
  ground: '#3d4759',
  outline: '#20262f',
  spriteSkin: '#e8c8a8',
  // Direction A — Soft Chibi.
  aHair: '#3a2c22', // = draw.ts's treeTrunk, repurposed as a warm hair brown
  aJacket: '#d99a6c', // = draw.ts's PALETTE.sun, repurposed as a warm jacket color
  aJacketShade: '#b97c50', // new: a shadow tone one step down from aJacket
  aPants: '#5c6270', // = draw.ts's swingFrame/panel tone
  // Direction B — Stencil/Graphic.
  bBase: '#232935', // = draw.ts's panelDark
  bBaseShade: '#171b23', // new: darker step for the trapezoid's shaded half
  bAccent: '#c8952e', // new: a muted ochre accent patch — deliberately NOT
  // the Gen A red/blue (b-red #e6402a / b-spot #2b4ed8) so this exploration
  // doesn't unilaterally imply a story affiliation; see the review doc.
  bVisor: '#7d8ea0', // = draw.ts's parkedCarGlass, repurposed as a visor tint
  // Direction C — Refined Kenney-adjacent.
  cJacket: '#48684f', // = draw.ts's hedge
  cShirt: '#ece2d0', // = draw.ts's spriteShirt
  cHair: '#4a4038', // = draw.ts's chimney tone, repurposed as hair
  cLimb: '#8f9bb0', // new: a mid-tone blue-gray, readable against both light and dark ground — direct fix for the pilot's low-contrast-limb finding
};

function renderInBrowser([kind, args]) {
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { c, ctx };
  }

  // ---------- Direction A: Soft Chibi ----------
  function drawCellA(ctx, ox, oy, dir, frame, p, shirtOverride) {
    const jacket = shirtOverride ?? p.aJacket;
    const bounce = frame === 1 ? -1 : 0; // springs up 1px on the together frame
    const stride = frame === 0 ? -1 : frame === 2 ? 1 : 0;
    const horizontal = dir === 'left' || dir === 'right';

    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(ox + 8, oy + 21, 5, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs — rounded nubs.
    let lx = ox + 5, rx = ox + 9;
    if (horizontal) { lx += stride; rx += stride; } else { lx -= Math.abs(stride); rx += Math.abs(stride); }
    ctx.fillStyle = p.aPants;
    ctx.beginPath(); ctx.roundRect(lx, oy + 16 + bounce, 3, 5, 1); ctx.fill();
    ctx.beginPath(); ctx.roundRect(rx, oy + 16 + bounce, 3, 5, 1); ctx.fill();

    // Body — soft capsule.
    ctx.fillStyle = jacket;
    ctx.beginPath(); ctx.roundRect(ox + 3, oy + 8 + bounce, 10, 9, 3); ctx.fill();
    ctx.fillStyle = p.aJacketShade;
    ctx.beginPath(); ctx.roundRect(ox + 3, oy + 13 + bounce, 10, 4, [0, 0, 3, 3]); ctx.fill();
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(ox + 3, oy + 8 + bounce, 10, 9, 3); ctx.stroke();

    // Arms — short rounded stubs, swing opposite legs.
    ctx.fillStyle = jacket;
    const armSwing = horizontal ? 0 : stride;
    ctx.beginPath(); ctx.roundRect(ox + 1, oy + 10 + bounce - armSwing, 2, 5, 1); ctx.fill();
    ctx.beginPath(); ctx.roundRect(ox + 13, oy + 10 + bounce + armSwing, 2, 5, 1); ctx.fill();

    // Head — large and round.
    const headCx = ox + 8, headCy = oy + 4 + bounce;
    ctx.fillStyle = p.spriteSkin;
    ctx.beginPath(); ctx.arc(headCx, headCy, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p.outline;
    ctx.stroke();

    // Hair — a rounded swoop, shaped per direction so the silhouette itself
    // carries the facing, not just a brim shift.
    ctx.fillStyle = p.aHair;
    if (dir === 'down') {
      ctx.beginPath(); ctx.arc(headCx, headCy - 1, 5.5, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.roundRect(headCx - 3, headCy - 6, 2, 3, 1); ctx.fill(); // side swoop
    } else if (dir === 'up') {
      ctx.beginPath(); ctx.arc(headCx, headCy, 5.6, 0, Math.PI * 2); ctx.fill(); // full back-of-head coverage
    } else if (dir === 'left') {
      ctx.beginPath(); ctx.arc(headCx, headCy - 1, 5.5, Math.PI * 0.9, Math.PI * 2.3); ctx.fill();
      ctx.beginPath(); ctx.roundRect(headCx + 2, headCy - 6, 3, 3, 1); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(headCx, headCy - 1, 5.5, Math.PI * -0.3, Math.PI * 1.1); ctx.fill();
      ctx.beginPath(); ctx.roundRect(headCx - 5, headCy - 6, 3, 3, 1); ctx.fill();
    }

    // Face — only where the face actually points at the camera.
    ctx.fillStyle = p.outline;
    if (dir === 'down') {
      ctx.fillRect(headCx - 2, headCy + 1, 1, 1);
      ctx.fillRect(headCx + 1, headCy + 1, 1, 1);
      ctx.beginPath(); ctx.arc(headCx, headCy + 2.5, 1.2, 0.2, Math.PI - 0.2); ctx.stroke();
    } else if (dir === 'left') {
      ctx.fillRect(headCx - 2, headCy + 1, 1, 1);
    } else if (dir === 'right') {
      ctx.fillRect(headCx + 1, headCy + 1, 1, 1);
    }
  }

  // ---------- Direction B: Stencil/Graphic ----------
  function drawCellB(ctx, ox, oy, dir, frame, p, accentOverride) {
    const accent = accentOverride ?? p.bAccent;
    const stride = frame === 0 ? -1.5 : frame === 2 ? 1.5 : 0.4; // never fully neutral — alert stance
    const horizontal = dir === 'left' || dir === 'right';

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(ox + 3, oy + 21, 10, 1);

    // Legs — angled parallelograms via polygon, never perfectly symmetric.
    ctx.fillStyle = p.bBaseShade;
    function leg(cx, lean) {
      ctx.beginPath();
      ctx.moveTo(cx - 1.5, oy + 15);
      ctx.lineTo(cx + 1.5, oy + 15);
      ctx.lineTo(cx + 1.5 + lean, oy + 21);
      ctx.lineTo(cx - 1.5 + lean, oy + 21);
      ctx.closePath();
      ctx.fill();
    }
    if (horizontal) { leg(ox + 6, stride); leg(ox + 10, stride * 0.6); }
    else { leg(ox + 6, stride * 0.5); leg(ox + 10, -stride * 0.5); }

    // Body — trapezoid, shoulders wider than waist.
    ctx.fillStyle = p.bBase;
    ctx.beginPath();
    ctx.moveTo(ox + 2, oy + 7);
    ctx.lineTo(ox + 14, oy + 7);
    ctx.lineTo(ox + 12, oy + 16);
    ctx.lineTo(ox + 4, oy + 16);
    ctx.closePath();
    ctx.fill();
    // Shaded half — the side away from the facing direction.
    ctx.fillStyle = p.bBaseShade;
    const shadeX = dir === 'left' ? ox + 8 : ox + 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(shadeX, oy + 7, 6, 9);
    ctx.clip();
    ctx.fillRect(ox, oy, 16, 22);
    ctx.restore();
    // Accent patch — asymmetric, one shoulder only.
    ctx.fillStyle = accent;
    ctx.fillRect(ox + 10, oy + 8, 3, 2);
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox + 2, oy + 7); ctx.lineTo(ox + 14, oy + 7); ctx.lineTo(ox + 12, oy + 16); ctx.lineTo(ox + 4, oy + 16); ctx.closePath();
    ctx.stroke();

    // Arms — thin angled bars, swing with the lean.
    ctx.fillStyle = p.bBase;
    ctx.fillRect(ox + 1, oy + 8 + stride * 0.6, 1.5, 6);
    ctx.fillRect(ox + 13.5, oy + 8 - stride * 0.6, 1.5, 6);

    // Head — angular hex via polygon, spiky hair.
    const cx = ox + 8, cy = oy + 4;
    ctx.fillStyle = p.spriteSkin;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - 3); ctx.lineTo(cx + 3, cy - 3); ctx.lineTo(cx + 4, cy);
    ctx.lineTo(cx + 3, cy + 3.5); ctx.lineTo(cx - 3, cy + 3.5); ctx.lineTo(cx - 4, cy);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = p.outline;
    ctx.stroke();

    ctx.fillStyle = p.bBaseShade;
    // Spikes — count/angle varies slightly per direction for silhouette read.
    const spikes = dir === 'up' ? [[-3, -3], [0, -4], [3, -3]] : dir === 'down' ? [[-2, -3], [1, -4], [3, -2]] : dir === 'left' ? [[-4, -2], [-3, -4], [1, -3]] : [[4, -2], [3, -4], [-1, -3]];
    for (const [dx, dy] of spikes) {
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy + dy);
      ctx.lineTo(cx + dx + 1.5, cy + dy - 2);
      ctx.lineTo(cx + dx + 1, cy + dy + 1);
      ctx.closePath();
      ctx.fill();
    }

    // Face — a single angled visor line, not eyes. Deliberately stylized.
    if (dir !== 'up') {
      ctx.strokeStyle = p.bVisor;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      const vx = dir === 'left' ? cx - 2 : dir === 'right' ? cx + 2 : cx;
      ctx.moveTo(vx - 2, cy + 0.5);
      ctx.lineTo(vx + 2, cy + 0.5);
      ctx.stroke();
    }
  }

  // ---------- Direction C: Refined Kenney-adjacent ----------
  function drawCellC(ctx, ox, oy, dir, frame, p, jacketOverride) {
    const jacket = jacketOverride ?? p.cJacket;
    const stride = frame === 0 ? -1 : frame === 2 ? 1 : 0;
    const horizontal = dir === 'left' || dir === 'right';

    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(ox + 4, oy + 21, 8, 1);

    // Legs.
    let lx = ox + 5, rx = ox + 9, lh = 6, rh = 6;
    if (horizontal) { lx += stride; rx += stride; lh = stride > 0 ? 5 : stride < 0 ? 7 : 6; rh = stride > 0 ? 7 : stride < 0 ? 5 : 6; }
    else { lx -= Math.abs(stride); rx += Math.abs(stride); }
    ctx.fillStyle = p.cLimb;
    ctx.fillRect(lx, oy + 22 - lh, 2, lh);
    ctx.fillRect(rx, oy + 22 - rh, 2, rh);

    // Arms — genuine cross-swing: opposite the same-side leg.
    ctx.fillStyle = p.cLimb;
    const armOffset = horizontal ? 0 : -stride;
    ctx.fillRect(ox + 2, oy + 9 + armOffset, 1, 5);
    ctx.fillRect(ox + 13, oy + 9 - armOffset, 1, 5);
    ctx.fillStyle = p.spriteSkin;
    ctx.fillRect(ox + 2, oy + 13 + armOffset, 1, 1);
    ctx.fillRect(ox + 13, oy + 13 - armOffset, 1, 1);

    // Body — two-tone: jacket band over a shirt band.
    ctx.fillStyle = p.cShirt;
    ctx.fillRect(ox + 4, oy + 12, 8, 4);
    ctx.fillStyle = jacket;
    ctx.fillRect(ox + 4, oy + 8, 8, 5);
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 3.5, oy + 7.5, 9, 9);

    // Head.
    ctx.fillStyle = p.spriteSkin;
    ctx.fillRect(ox + 5, oy + 2, 6, 6);
    ctx.strokeStyle = p.outline;
    ctx.strokeRect(ox + 4.5, oy + 1.5, 7, 7);

    // Hair — a distinct side-swept crop, extending past the head box on
    // the forward side so the silhouette itself changes per direction
    // (the pilot's own finding: a brim shift alone wasn't enough).
    ctx.fillStyle = p.cHair;
    ctx.fillRect(ox + 4, oy + 1, 8, 2);
    if (dir === 'down') { ctx.fillRect(ox + 3, oy + 2, 2, 3); ctx.fillRect(ox + 11, oy + 2, 2, 2); }
    else if (dir === 'up') { ctx.fillRect(ox + 4, oy, 8, 3); }
    else if (dir === 'left') { ctx.fillRect(ox + 2, oy + 1, 3, 4); }
    else { ctx.fillRect(ox + 11, oy + 1, 3, 4); }

    ctx.fillStyle = p.outline;
    if (dir === 'down') {
      ctx.fillRect(ox + 6, oy + 5, 1, 1);
      ctx.fillRect(ox + 9, oy + 5, 1, 1);
      ctx.fillRect(ox + 7, oy + 7, 2, 1); // mouth
    } else if (dir === 'left') {
      ctx.fillRect(ox + 5, oy + 5, 1, 1);
      ctx.fillRect(ox + 4, oy + 6, 1, 1); // nose bump
    } else if (dir === 'right') {
      ctx.fillRect(ox + 10, oy + 5, 1, 1);
      ctx.fillRect(ox + 11, oy + 6, 1, 1);
    }
  }

  const DRAWERS = { a: drawCellA, b: drawCellB, c: drawCellC };

  function drawSheet(ctx, direction, variantColor, palette) {
    const directions = ['left', 'down', 'up', 'right'];
    directions.forEach((dir, row) => {
      for (let frame = 0; frame < 3; frame++) DRAWERS[direction](ctx, frame * 16, row * 22, dir, frame, palette, variantColor);
    });
  }

  if (kind === 'sheet') {
    const [direction, variantColor, palette] = args;
    const { c, ctx } = makeCanvas(48, 88);
    drawSheet(ctx, direction, variantColor, palette);
    return c.toDataURL('image/png');
  }

  if (kind === 'gameplay-scene') {
    const [direction, variantColor, treeDataUrl, carDataUrl, palette] = args;
    return (async () => {
      const { c, ctx } = makeCanvas(240, 140);
      ctx.fillStyle = palette.ground;
      ctx.fillRect(0, 0, 240, 140);
      // Faint ground speckle, same fixed offsets as the pilot's terrain tile.
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (let x = 4; x < 240; x += 17) for (let y = 6; y < 140; y += 15) ctx.fillRect(x, y, 2, 2);

      const SCALE = 2; // world/Overworld.tsx's real SCALE constant

      const tree = new Image();
      tree.src = treeDataUrl;
      await tree.decode();
      ctx.drawImage(tree, 20, 140 - 40 * SCALE - 4, 20 * SCALE, 40 * SCALE);

      const car = new Image();
      car.src = carDataUrl;
      await car.decode();
      ctx.drawImage(car, 170, 140 - 12 * SCALE - 6, 18 * SCALE, 12 * SCALE);

      // The character itself, standing (down, neutral frame), at 2x — the
      // exact physical size a real player actually sees on screen.
      const cellCanvas = document.createElement('canvas');
      cellCanvas.width = 16;
      cellCanvas.height = 22;
      const cellCtx = cellCanvas.getContext('2d');
      cellCtx.imageSmoothingEnabled = false;
      DRAWERS[direction](cellCtx, 0, 0, 'down', 1, palette, variantColor);
      ctx.drawImage(cellCanvas, 110, 140 - 22 * SCALE - 2, 16 * SCALE, 22 * SCALE);

      return c.toDataURL('image/png');
    })();
  }

  throw new Error(`unknown kind ${kind}`);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('about:blank');

const DIRECTIONS = [
  { key: 'a', label: 'soft-chibi', playerColor: undefined, npcColor: '#4fb5a8' },
  { key: 'b', label: 'stencil-graphic', playerColor: undefined, npcColor: '#8a6b4a' },
  { key: 'c', label: 'refined-kenney', playerColor: undefined, npcColor: '#7d8ea0' },
];

for (const d of DIRECTIONS) {
  const playerUrl = await page.evaluate(renderInBrowser, ['sheet', [d.key, d.playerColor, PALETTE]]);
  writeFileSync(path.join(outDir, `direction-${d.key}-${d.label}-player.png`), Buffer.from(playerUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));

  const npcUrl = await page.evaluate(renderInBrowser, ['sheet', [d.key, d.npcColor, PALETTE]]);
  writeFileSync(path.join(outDir, `direction-${d.key}-${d.label}-npc.png`), Buffer.from(npcUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));

  const treeDataUrl = `data:image/png;base64,${readFileSync(path.join(artDir, 'prop.tree.tall.png')).toString('base64')}`;
  const carDataUrl = `data:image/png;base64,${readFileSync(path.join(artDir, 'vehicle.car.png')).toString('base64')}`;
  const sceneUrl = await page.evaluate(renderInBrowser, ['gameplay-scene', [d.key, d.playerColor, treeDataUrl, carDataUrl, PALETTE]]);
  writeFileSync(path.join(outDir, `direction-${d.key}-${d.label}-gameplay-scale.png`), Buffer.from(sceneUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));

  console.log(`wrote direction ${d.key} (${d.label}): player sheet, npc sheet, gameplay-scale scene`);
}

await browser.close();
