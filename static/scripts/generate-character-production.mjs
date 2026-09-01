#!/usr/bin/env node
/**
 * CHARACTER ART PRODUCTION GENERATOR — first controlled run under the
 * production method chosen in
 * `docs/art/genalpha-character-art-production-decision.md`: procedural,
 * vector-free pixel construction from a defined palette and silhouette
 * specification (that document's §3 approach C, §4 recommendation).
 *
 * Deliberately does NOT use `<canvas>` (unlike `generate-character-rnd.mjs`/
 * `generate-pilot-art.mjs`). Canvas path-fill anti-aliases shape edges
 * regardless of `imageSmoothingEnabled` (that flag only affects
 * `drawImage` scaling) — exactly the mechanism that let two independent
 * image-generation submissions ship continuous-tone data disguised as
 * "pixel art." This script instead computes every pixel directly: each of
 * a cell's 16x22 pixels is tested analytically (is this pixel's center
 * inside this circle/rounded-rect?) against a small set of shape
 * definitions and assigned exactly one palette RGBA value or left fully
 * transparent. There is no blending step anywhere in this file, so there
 * is no way for it to produce anti-aliased edges or a continuous color
 * ramp — discrete pixel data is a structural property of the approach, not
 * a hoped-for outcome to measure afterward.
 *
 * Output is NOT written to `public/art/` — per the proposed pipeline
 * (decision doc §5), a generated sheet is a QA *candidate* until it passes
 * both the automated gate (`check-character-art-quality.mjs`) and the
 * production brief's §14-16 human/gameplay-scale review. Candidates land in
 * `docs/art/candidates/`, parallel to `docs/art/rnd/`'s existing
 * reference-only convention. Promotion to `public/art/<slot-id>.png` is a
 * separate, later, explicitly human step.
 *
 * Iteration 2 folds in style cues from a user-supplied "style reference"
 * image (afro-style curly hair, a defined outline stroke, two-tone shoes,
 * a hoodie drawstring seam) — measured first, per the same discipline this
 * whole file exists to enforce: that reference PNG was ~38.5% partial-alpha
 * pixels, ~50,000 unique colors, and non-integer 3x4 cell dimensions,
 * i.e. the same continuous-tone failure as the two rejected submissions,
 * just styled convincingly enough to look like pixel art at a glance. It is
 * used here purely as a language reference (silhouette bumpiness, an
 * outline stroke, a shoe color block, a drawstring seam) — never as a
 * pixel source, and never past what the approved brief's facial-vocabulary
 * cap (§8: dot eyes, 1x1 to 2x1) actually allows.
 *
 * Usage: node scripts/generate-character-production.mjs [outfile]
 */
import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultOut = path.join(here, '..', 'docs', 'art', 'candidates', 'character.player.candidate1.png');
const outFile = process.argv[2] ?? defaultOut;

// ---------------------------------------------------------------------
// Palette — pulled from `world/draw.ts`'s PALETTE wherever a suitable
// value exists (production brief §7). One genuinely new hex:
//   - jeans: a new mid-saturation denim blue. The existing palette's
//     nearest blues (`skyMid` #54617f, `skyHigh` #2b3a55) are desaturated
//     blue-grays close enough in hue to `ground`/`groundAlt`/`outline`
//     that they weaken the brief §6 hard limb-contrast minimum; a
//     genuinely blue (not blue-gray) denim clears that minimum by a much
//     wider margin. This is the one new hex this script introduces.
// Everything else — including the black hoodie below — reuses an existing
// `world/draw.ts` value or an already-declared color in this file (`shoe`
// for the hoodie's shadow step), never a fresh addition just for looks.
// ---------------------------------------------------------------------
const PALETTE = {
  skin: [0xe8, 0xc8, 0xa8, 255],
  hair: [0x3a, 0x2c, 0x22, 255],
  // Black hoodie: pure black (= `shoe` below, reused — not a fresh hex)
  // reads as unambiguously "black" and holds real contrast against
  // `world/draw.ts`'s `PALETTE.ground` (#3d4759). copUniform, a dark navy
  // already in the palette, first sat in as the *main* fill, but at
  // (46,58,82) it's only ~21 RGB-distance from ground itself — the torso
  // nearly disappeared into the ground fill in a gameplay-scale render.
  // Demoted to the hem/accent step instead, where a smaller area blending
  // slightly is a minor cost, not the whole silhouette losing separation.
  hoodie: [0x00, 0x00, 0x00, 255],       // = shoe, reused
  hoodieShade: [0x2e, 0x3a, 0x52, 255],  // world/draw.ts PALETTE.copUniform
  jeans: [0x4a, 0x5a, 0x8a, 255],        // new — see note above
  bag: [0x8a, 0x6b, 0x4a, 255],          // world/draw.ts PALETTE.spriteBag
  bagStrap: [0x5c, 0x46, 0x30, 255],     // world/draw.ts PALETTE.spriteBagStrap
  eye: [0x14, 0x11, 0x0f, 255],          // world/draw.ts PALETTE.sprite
  outline: [0x20, 0x26, 0x2f, 255],      // world/draw.ts PALETTE.outline — style-reference cue: a defined edge stroke
  shoe: [0x00, 0x00, 0x00, 255],         // new — a small two-tone shoe accent, style-reference cue
  sole: [0xec, 0xe2, 0xd0, 255],         // world/draw.ts PALETTE.spriteShirt, reused as the shoe's sole highlight
};

// Reference contrast values this design is checked against (brief §6):
//   PALETTE.outline #20262f = (32,38,47)
//   PALETTE.ground  #3d4759 = (61,71,89)
//   PALETTE.groundAlt #434e61 = (67,78,97)
// jeans (74,90,138) is >100 RGB-distance from outline and >40 from both
// ground tones — comfortably clear of the hard minimum.

const W = 16, H = 22;
const COLS = 3, ROWS = 4;
const DIRECTIONS = ['left', 'down', 'up', 'right']; // manifest.ts row order — do not reorder

function dist2(x, y, cx, cy) {
  return (x - cx) ** 2 + (y - cy) ** 2;
}

/** Point-in-rounded-rect test using pixel centers; corners are quarter-circles. */
function inRoundedRect(px, py, x0, y0, x1, y1, r) {
  if (px < x0 || px >= x1 || py < y0 || py >= y1) return false;
  const cx = Math.max(x0 + r, Math.min(px, x1 - r));
  const cy = Math.max(y0 + r, Math.min(py, y1 - r));
  // Only apply the rounding test near a corner region; elsewhere the box
  // bound above already suffices.
  if ((px < x0 + r || px >= x1 - r) && (py < y0 + r || py >= y1 - r)) {
    return dist2(px, py, cx, cy) <= r * r;
  }
  return true;
}

/**
 * A curlier hair edge (style-reference cue: an afro-like bumpy silhouette
 * instead of a smooth arc) — several small bump circles unioned along an
 * angular arc range around the head's perimeter. Still a union of circles
 * (no gradient, no new color), so it stays exactly as discrete as a single
 * circle; it just makes the hair's outer edge irregular instead of smooth.
 */
function inHairBumps(x, y, headCx, headCy, headR, angleFrom, angleTo, count) {
  const bumpR = 1.6;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const angle = angleFrom + (angleTo - angleFrom) * t;
    const bcx = headCx + Math.cos(angle) * headR * 0.85;
    const bcy = headCy + Math.sin(angle) * headR * 0.85;
    if (dist2(x + 0.5, y + 0.5, bcx, bcy) <= bumpR * bumpR) return true;
  }
  return false;
}

/**
 * Build one 16x22 cell's pixel grid as an array of PALETTE keys or null
 * (transparent). `dir` is one of the four canonical directions; `frame` is
 * 0/1/2 (stride A / idle / stride B). Built for `down`, `up`, and `left`
 * directly; `right` is produced by mirroring `left` (see `buildCell`),
 * which makes the brief §3 "left/right must be true mirror images"
 * requirement a structural guarantee rather than a drawing-discipline hope.
 */
function buildDirectFrame(dir, frame) {
  const grid = Array.from({ length: H }, () => Array(W).fill(null));
  const set = (x, y, key) => {
    if (x >= 0 && x < W && y >= 0 && y < H) grid[y][x] = key;
  };

  const bounce = frame === 1 ? -1 : 0; // idle frame springs up 1px (brief §9)
  const stride = frame === 0 ? -1 : frame === 2 ? 1 : 0;
  const horizontal = dir === 'left' || dir === 'right';
  // The idle frame is the one a player actually looks at (brief §9: "the
  // pose a player sees more than any other... deserves to be designed
  // deliberately"). With facial detail capped to bare dot-eyes (brief §8 —
  // no eyebrows, no blush, no expression lines), personality has to come
  // from stance, not the face: a curious head tilt, a casual one-arm-tucked
  // asymmetry, and shoulders raised slightly toward the ears (shy/cold-
  // shoulder read). Applied only on frame 1, so the walk-cycle stride stays
  // the clean, symmetric motion the brief's §10 requires.
  const idle = frame === 1;

  // Legs — two rounded 3-wide nubs, 1px gap between them (brief §6), with a
  // small two-tone shoe (a dark body, a light sole row) at the very bottom —
  // a style-reference cue that reads as "feet," not a proportion change.
  let lx0 = 5, rx0 = 9;
  if (horizontal) { lx0 += stride; rx0 += stride; } else { lx0 -= Math.abs(stride); rx0 += Math.abs(stride); }
  // Feet stay planted on the anchor row regardless of the idle bounce —
  // only the upper body lifts (brief §13: the lowest opaque pixel must sit
  // on the same row in every frame).
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // y1=22 (exclusive), not 21 — inRoundedRect's bound is exclusive, so
      // 21 would have left row 21 (the cell's actual last row) untouched by
      // the leg shape entirely, floating the feet 1px above the true
      // anchor edge (brief §13: the lowest opaque pixel must sit exactly on
      // the frame's bottom row). The addOutlineStroke pass was masking this
      // by adding an outline pixel under the gap, which is exactly why the
      // QA gate's anchor check needed strengthening too (see below).
      const inLeftLeg = inRoundedRect(x, y, lx0, 16, lx0 + 3, 22, 1);
      const inRightLeg = inRoundedRect(x, y, rx0, 16, rx0 + 3, 22, 1);
      if (!inLeftLeg && !inRightLeg) continue;
      const key = y === 21 ? 'sole' : y === 20 ? 'shoe' : 'jeans';
      set(x, y, key);
    }
  }

  // Torso — soft capsule, two-tone (brief §5). A 2px-wide drawstring seam
  // down the center (style-reference cue) — 2px, not 1, because the cell's
  // true center (x=7.5) falls between columns, so a single-column seam
  // would not survive left/right mirroring symmetrically.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (inRoundedRect(x, y, 3, 8 + bounce, 13, 17 + bounce, 3)) {
        set(x, y, y >= 13 + bounce ? 'hoodieShade' : 'hoodie');
      }
    }
  }
  if (dir === 'down') {
    for (let y = 9 + bounce; y <= 12 + bounce; y++) { set(7, y, 'outline'); set(8, y, 'outline'); }
  }

  // Backpack — worn on the back; a clear rounded bump behind the torso on
  // the "up" (back-facing) row, and a single strap sliver crossing the
  // torso on left/right profile. Not drawn on "down" (a backpack isn't
  // visible from the front).
  if (dir === 'up') {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (inRoundedRect(x, y, 4, 9 + bounce, 12, 16 + bounce, 2)) set(x, y, 'bag');
      }
    }
  } else if (horizontal) {
    // 2px wide so it stays legible at gameplay scale (a 1px sliver was
    // borderline visible in the gameplay-scale review render).
    const strapX = dir === 'left' ? 5 : 9;
    for (let y = 9 + bounce; y < 15 + bounce; y++) { set(strapX, y, 'bagStrap'); set(strapX + 1, y, 'bagStrap'); }
  }

  // Arms — short rounded stubs at the torso's sides (brief §6). No swing
  // on horizontal-facing rows (only one arm is visible in profile and its
  // position is already implied by the stride); swing opposes the
  // vertical-row leg stride otherwise.
  const armSwing = horizontal ? 0 : stride;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (inRoundedRect(x, y, 1, 10 + bounce - armSwing, 3, 15 + bounce - armSwing, 1)) set(x, y, 'hoodie');
      if (inRoundedRect(x, y, 13, 10 + bounce + armSwing, 15, 15 + bounce + armSwing, 1)) set(x, y, 'hoodie');
    }
  }
  // On the idle frame, a small skin-toned hand rests near the front hem —
  // one arm reads as relaxed, the other as tucked in, a cool/casual/shy
  // asymmetry that a same-color arm shift alone can't show (the torso fill
  // would just swallow it): a hand only reads against the hoodie because
  // it's a genuinely different color, not a different position.
  if (idle && dir === 'down') {
    set(10, 15 + bounce, 'skin');
    set(11, 15 + bounce, 'skin');
    set(10, 16 + bounce, 'skin');
  }

  // Head — large, round (brief §2: close to half total height). A 1px
  // sideways tilt on the down-facing idle frame only — a curious,
  // quizzical lean, distinct from the walk-cycle's upright stride poses.
  const headTilt = idle && dir === 'down' ? -1 : 0;
  const headCx = 8 + headTilt, headCy = 5 + bounce, headR = 5.4;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (dist2(x + 0.5, y + 0.5, headCx, headCy) <= headR * headR) set(x, y, 'skin');
    }
  }

  // Hair — the primary directional signal (brief §4), drawn last over the
  // head so it can occlude skin pixels per direction.
  // Each direction's hair is built to change the flattened silhouette's
  // *outline*, not just its interior coloring (brief §3/§14.1: a solid-black
  // flatten test can only tell directions apart if the opaque footprint
  // itself differs — recoloring skin to hair inside the same head circle is
  // invisible to that test).
  if (dir === 'down') {
    // Front fringe: the top half of the head, bumpy-edged (style-reference
    // cue), plus two ear-flap locks that protrude past the bare head
    // circle on both sides.
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const inCap = dist2(x + 0.5, y + 0.5, headCx, headCy) <= headR * headR && y <= headCy - 1;
        const inBump = inHairBumps(x, y, headCx, headCy, headR, -Math.PI * 0.7, -Math.PI * 0.3, 3);
        if (inCap || inBump) set(x, y, 'hair');
      }
    }
    // Positioned lower than left/right's side-wedge (which sits at
    // headCy-5..headCy+1) specifically so the two directions' hair pixels
    // don't spatially coincide and understate how different they are.
    for (let y = headCy + 2; y <= headCy + 4; y++) {
      set(headCx - 7, y, 'hair');
      set(headCx - 6, y, 'hair');
      set(headCx + 5, y, 'hair');
      set(headCx + 6, y, 'hair');
    }
    // Face: two dot eyes + a short mouth mark (brief §8) — down-facing only.
    set(headCx - 2, headCy, 'eye');
    set(headCx + 1, headCy, 'eye');
    set(headCx - 1, headCy + 2, 'eye');
    set(headCx, headCy + 2, 'eye');
  } else if (dir === 'up') {
    // Unbroken solid mass covering the entire back of the head (brief §3),
    // sized and extended well past the bare head circle — including a
    // downward nape extension — so the outline itself, not just its color,
    // is unmistakably "hair from behind" rather than any other direction's
    // head shape. No facial detail at all (brief §8).
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const inMass = dist2(x + 0.5, y + 0.5, headCx, headCy) <= (headR + 1.8) ** 2;
        const inBump = inHairBumps(x, y, headCx, headCy, headR + 1.8, -Math.PI, Math.PI, 12);
        if (inMass || inBump) set(x, y, 'hair');
      }
    }
    for (let y = headCy + 2; y <= headCy + 6; y++) {
      for (let x = headCx - 4; x <= headCx + 4; x++) set(x, y, 'hair');
    }
  } else {
    // left (right is mirrored from this): a real hair wedge on the side
    // away from the facing direction — wide enough to change the outline,
    // not a 1px detail nudge (the pilot's own documented failure) — plus a
    // profile nose-tip pixel that protrudes past the head circle and one
    // near eye dot (brief §3, §8).
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const inCap = dist2(x + 0.5, y + 0.5, headCx, headCy) <= headR * headR && x >= headCx - 1;
        const inBump = inHairBumps(x, y, headCx, headCy, headR, -Math.PI / 2, Math.PI / 2, 6);
        if (inCap || inBump) set(x, y, 'hair');
      }
    }
    for (let y = headCy - 5; y <= headCy + 1; y++) {
      for (let x = headCx + 3; x <= headCx + 7; x++) {
        if (dist2(x + 0.5, y + 0.5, headCx, headCy) <= (headR + 2.2) ** 2) set(x, y, 'hair');
      }
    }
    // Eye and nose kept well-separated (vertically and horizontally) so
    // they read as two different facial landmarks rather than a pair of
    // adjacent dots that could be mistaken for two eyes (brief §8: never
    // both eyes on a profile view).
    set(headCx - 2, headCy - 2, 'eye'); // single near eye dot, upper-face
    set(headCx - 6, headCy + 1, 'eye'); // profile nose-tip, protrudes past the head circle, lower-forward
  }

  // Shoulders raised toward the ears on the idle frame — a shy, drawn-in
  // posture, cheap in silhouette terms (a couple of pixels at the collar).
  // Painted last, after the head/hair, so it isn't swallowed by either.
  if (idle) {
    for (let y = headCy + Math.round(headR) - 1; y <= headCy + Math.round(headR); y++) {
      set(3, y, 'hoodie'); set(12, y, 'hoodie');
    }
  }

  return addOutlineStroke(grid);
}

/**
 * Outward outline stroke (style-reference cue): any transparent pixel
 * adjacent to an opaque one becomes an outline pixel. Deliberately outward
 * (growing into the transparent margin) rather than inset (eating into the
 * existing fill) — at 16x22 the legs and arms are only 2-3px wide, and an
 * inset stroke on both sides would erase the jeans/hoodie color the brief
 * §6 limb-contrast rule depends on almost entirely. Growing outward instead
 * costs margin pixels, not limb-color pixels, and never moves the lowest
 * opaque row (feet already sit on the cell's last row, y=21, which has no
 * row below it to grow into) — so anchor consistency (brief §13) is
 * unaffected.
 */
function addOutlineStroke(grid) {
  const additions = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (grid[y][x]) continue;
      const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
      const touchesOpaque = neighbors.some(([nx, ny]) => nx >= 0 && nx < W && ny >= 0 && ny < H && grid[ny][nx]);
      if (touchesOpaque) additions.push([x, y]);
    }
  }
  for (const [x, y] of additions) grid[y][x] = 'outline';
  return grid;
}

function mirrorGrid(grid) {
  return grid.map((row) => [...row].reverse());
}

function buildCell(dir, frame) {
  if (dir === 'right') return mirrorGrid(buildDirectFrame('left', frame));
  return buildDirectFrame(dir, frame);
}

// ---------------------------------------------------------------------
// Assemble the 3x4 sheet (48x88px, native 1x authoring per brief §12).
// ---------------------------------------------------------------------
const sheetW = W * COLS, sheetH = H * ROWS;
const png = new PNG({ width: sheetW, height: sheetH });
png.data.fill(0); // fully transparent by default (RGBA all-zero)

for (let row = 0; row < ROWS; row++) {
  const dir = DIRECTIONS[row];
  for (let col = 0; col < COLS; col++) {
    const grid = buildCell(dir, col);
    const ox = col * W, oy = row * H;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const key = grid[y][x];
        if (!key) continue; // stays transparent
        const [r, g, b, a] = PALETTE[key];
        const i = ((oy + y) * sheetW + (ox + x)) * 4;
        png.data[i] = r;
        png.data[i + 1] = g;
        png.data[i + 2] = b;
        png.data[i + 3] = a;
      }
    }
  }
}

mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, PNG.sync.write(png));
console.log(`Wrote ${outFile} (${sheetW}x${sheetH}, candidate — not production art until it passes check-character-art-quality.mjs and human/gameplay-scale review).`);
