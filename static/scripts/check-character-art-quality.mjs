#!/usr/bin/env node
/**
 * Character-art discrete-pixel-data QA gate — the tool that should have
 * existed before the last two image-generation submissions were judged by
 * eye. Those submissions measured at ~87,000-93,000 unique colors with
 * median 1px color-runs: continuous-tone illustration, not pixel art, no
 * matter how "pixel art" the prompt asked for. This script makes that
 * distinction mechanical instead of a judgment call.
 *
 * Implements the objective gates from
 * `docs/art/genalpha-character-art-production-decision.md` §6: dimensions,
 * grid/cell count, transparency behavior, unique color count, color-run
 * characteristics, palette consistency, anchor consistency, accidental
 * anti-aliasing/near-duplicate colors, and direction completeness.
 *
 * Deliberately NOT covered here (stays human judgment, per the production
 * brief's own §14-16): does it read as Soft Chibi, does the walk cycle read
 * as motion, row order (left/down/up/right) is correct. This script only
 * answers "is this discrete pixel data assembled the way the manifest
 * expects," not "is this good art."
 *
 * Usage:
 *   node scripts/check-character-art-quality.mjs <path-to-png> [options]
 *
 * Options:
 *   --cols=3            columns in the sprite grid (default 3, per manifest)
 *   --rows=4            rows in the sprite grid (default 4, per manifest)
 *   --cell-w=16         expected cell width in world-space pixels (default 16)
 *   --cell-h=22         expected cell height in world-space pixels (default 22)
 *   --max-colors=24     ceiling on unique opaque colors across the sheet
 *   --min-run=2         floor on median same-color horizontal run length
 *   --near-dup=24       minimum Euclidean RGB distance between two palette
 *                       colors before they're flagged as near-duplicates
 *
 * Exit code 0 if every gate passes, 1 if any gate fails or the file can't be
 * read/decoded as a PNG.
 */
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

function parseArgs(argv) {
  const [file, ...rest] = argv;
  const opts = {
    cols: 3,
    rows: 4,
    cellW: 16,
    cellH: 22,
    maxColors: 24,
    minRun: 2,
    nearDup: 24,
  };
  for (const arg of rest) {
    const m = arg.match(/^--([a-z-]+)=(.+)$/);
    if (!m) continue;
    const [, key, value] = m;
    const n = Number(value);
    switch (key) {
      case 'cols': opts.cols = n; break;
      case 'rows': opts.rows = n; break;
      case 'cell-w': opts.cellW = n; break;
      case 'cell-h': opts.cellH = n; break;
      case 'max-colors': opts.maxColors = n; break;
      case 'min-run': opts.minRun = n; break;
      case 'near-dup': opts.nearDup = n; break;
    }
  }
  return { file, opts };
}

const { file, opts } = parseArgs(process.argv.slice(2));
if (!file) {
  console.error('Usage: node scripts/check-character-art-quality.mjs <path-to-png> [options]');
  process.exit(1);
}

let png;
try {
  png = PNG.sync.read(readFileSync(file));
} catch (err) {
  console.error(`Could not read/decode ${file} as a PNG: ${err.message}`);
  process.exit(1);
}

const { width, height, data } = png; // data: RGBA, 4 bytes/pixel, row-major

function pixelAt(x, y) {
  const i = (y * width + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
}

function colorKey(p) {
  return `${p.r},${p.g},${p.b},${p.a}`;
}

const results = []; // { gate, pass, detail }
function report(gate, pass, detail) {
  results.push({ gate, pass, detail });
}

// ---------- Gate 1: Dimensions ----------
const { cols, rows, cellW, cellH } = opts;
const dimsOk = width % cols === 0 && height % rows === 0;
let aspectOk = false;
let actualCellW = 0, actualCellH = 0;
if (dimsOk) {
  actualCellW = width / cols;
  actualCellH = height / rows;
  const expectedRatio = cellW / cellH;
  const actualRatio = actualCellW / actualCellH;
  aspectOk = Math.abs(expectedRatio - actualRatio) < 0.01;
}
report(
  'Dimensions',
  dimsOk && aspectOk,
  dimsOk
    ? `${width}x${height} -> cell ${actualCellW}x${actualCellH} (expected aspect ${cellW}:${cellH} = ${(cellW / cellH).toFixed(4)}, got ${(actualCellW / actualCellH).toFixed(4)})`
    : `${width}x${height} is not an exact multiple of the ${cols}x${rows} grid`
);

if (!dimsOk) {
  // Every remaining gate depends on being able to slice the sheet into cells.
  printReportAndExit();
}

// ---------- Slice into cells ----------
function cellBounds(col, row) {
  return {
    x0: col * actualCellW,
    y0: row * actualCellH,
    x1: (col + 1) * actualCellW,
    y1: (row + 1) * actualCellH,
  };
}

const cellCount = cols * rows;
report('Grid/cell count', cellCount === 12, `${cols}x${rows} = ${cellCount} cells (manifest expects 12: 3 frames x 4 directions)`);

// ---------- Gate: Transparency behavior ----------
let partialAlphaCount = 0;
let partialAlphaExample = null;
const cellHasTransparent = [];
const cellHasOpaque = [];
for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    const { x0, y0, x1, y1 } = cellBounds(col, row);
    let hasT = false, hasO = false;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const p = pixelAt(x, y);
        if (p.a === 0) hasT = true;
        else if (p.a === 255) hasO = true;
        else {
          partialAlphaCount++;
          if (!partialAlphaExample) partialAlphaExample = { x, y, a: p.a, col, row };
        }
      }
    }
    cellHasTransparent.push(hasT);
    cellHasOpaque.push(hasO);
  }
}
const allCellsHaveBoth = cellHasTransparent.every(Boolean) && cellHasOpaque.every(Boolean);
report(
  'Transparency behavior',
  partialAlphaCount === 0 && allCellsHaveBoth,
  partialAlphaCount === 0
    ? (allCellsHaveBoth
        ? 'every pixel is alpha 0 or 255; every cell has both transparent and opaque pixels'
        : 'every pixel is alpha 0 or 255, but at least one cell is entirely transparent or entirely opaque')
    : `${partialAlphaCount} pixel(s) with partial alpha (e.g. x=${partialAlphaExample.x},y=${partialAlphaExample.y} col=${partialAlphaExample.col} row=${partialAlphaExample.row} alpha=${partialAlphaExample.a}) — likely anti-aliased edges or a soft gradient`
);

// ---------- Gate: Unique color count (opaque only) ----------
const opaqueColorCounts = new Map();
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const p = pixelAt(x, y);
    if (p.a !== 255) continue;
    const key = `${p.r},${p.g},${p.b}`;
    opaqueColorCounts.set(key, (opaqueColorCounts.get(key) ?? 0) + 1);
  }
}
const uniqueColors = [...opaqueColorCounts.keys()];
report(
  'Unique color count',
  uniqueColors.length <= opts.maxColors,
  `${uniqueColors.length} unique opaque colors (ceiling: ${opts.maxColors})`
);

// ---------- Gate: Color-run characteristics ----------
const runLengths = [];
for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    const { x0, y0, x1, y1 } = cellBounds(col, row);
    for (let y = y0; y < y1; y++) {
      let runStart = x0;
      let prevKey = colorKey(pixelAt(x0, y));
      for (let x = x0 + 1; x <= x1; x++) {
        const key = x < x1 ? colorKey(pixelAt(x, y)) : null;
        if (key !== prevKey) {
          runLengths.push(x - runStart);
          runStart = x;
          prevKey = key;
        }
      }
    }
  }
}
runLengths.sort((a, b) => a - b);
const medianRun = runLengths.length > 0 ? runLengths[Math.floor(runLengths.length / 2)] : 0;
report(
  'Color-run characteristics',
  medianRun >= opts.minRun,
  `median horizontal same-color run length: ${medianRun}px (floor: ${opts.minRun}px, n=${runLengths.length} runs)`
);

// ---------- Gate: Palette consistency ----------
// Each cell's opaque color set must be a subset of the sheet-wide palette
// (trivially true by construction) — the meaningful check is that no single
// cell alone accounts for a disproportionate share of the palette, which
// would indicate one frame drifted onto colors the rest of the sheet never
// uses (e.g. an independently-regenerated frame).
const perCellPalettes = [];
for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    const { x0, y0, x1, y1 } = cellBounds(col, row);
    const set = new Set();
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const p = pixelAt(x, y);
        if (p.a === 255) set.add(`${p.r},${p.g},${p.b}`);
      }
    }
    perCellPalettes.push(set);
  }
}
let strayColorCells = 0;
for (const set of perCellPalettes) {
  for (const c of set) {
    // A color used by only one cell out of twelve is a plausible drift signal.
    let usedElsewhere = false;
    for (const other of perCellPalettes) {
      if (other !== set && other.has(c)) { usedElsewhere = true; break; }
    }
    if (!usedElsewhere) { strayColorCells++; break; }
  }
}
report(
  'Palette consistency',
  strayColorCells <= 1,
  `${strayColorCells} of ${cellCount} cells contain a color no other cell uses (0-1 expected; skin/hair-only cells can legitimately be unique)`
);

// ---------- Gate: Anchor consistency ----------
const lowestOpaqueRow = [];
const idleCentroidX = [];
for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    const { x0, y0, x1, y1 } = cellBounds(col, row);
    let lowest = -1;
    let sumX = 0, count = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const p = pixelAt(x, y);
        if (p.a === 255) {
          lowest = Math.max(lowest, y - y0);
          sumX += (x - x0);
          count++;
        }
      }
    }
    lowestOpaqueRow.push(lowest);
    if (col === 1) idleCentroidX.push(count > 0 ? sumX / count : null); // idle column
  }
}
const definedLowest = lowestOpaqueRow.filter((v) => v >= 0);
const anchorRowSpread = definedLowest.length > 0 ? Math.max(...definedLowest) - Math.min(...definedLowest) : 0;
const expectedCenterX = (actualCellW - 1) / 2;
const centeringOk = idleCentroidX.every((cx) => cx === null || Math.abs(cx - expectedCenterX) <= 1);
report(
  'Anchor consistency',
  anchorRowSpread === 0 && centeringOk,
  `lowest-opaque-pixel row varies by ${anchorRowSpread}px across cells (expect 0); idle-column horizontal centroid ${centeringOk ? 'within 1px of center' : 'off-center'} (cell center x=${expectedCenterX.toFixed(1)})`
);

// ---------- Gate: Accidental anti-aliasing / near-duplicate colors ----------
function toRgb(key) {
  const [r, g, b] = key.split(',').map(Number);
  return { r, g, b };
}
function dist(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}
const rgbColors = uniqueColors.map(toRgb);
let nearDupPairs = [];
for (let i = 0; i < rgbColors.length; i++) {
  for (let j = i + 1; j < rgbColors.length; j++) {
    const d = dist(rgbColors[i], rgbColors[j]);
    if (d < opts.nearDup) nearDupPairs.push([uniqueColors[i], uniqueColors[j], d.toFixed(1)]);
  }
}
report(
  'Accidental anti-aliasing / near-duplicate colors',
  nearDupPairs.length === 0,
  nearDupPairs.length === 0
    ? `no two palette colors within ${opts.nearDup} RGB distance of each other`
    : `${nearDupPairs.length} near-duplicate pair(s), e.g. rgb(${nearDupPairs[0][0]}) vs rgb(${nearDupPairs[0][1]}) at distance ${nearDupPairs[0][2]} (review: intentional shade step, or anti-aliasing artifact?)`
);

// ---------- Gate: Direction completeness ----------
// Row order per manifest: left, down, up, right. Compare each row's idle
// (middle column) opaque/transparent mask against the others.
function idleMask(row) {
  const { x0, y0, x1, y1 } = cellBounds(1, row);
  const mask = [];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      mask.push(pixelAt(x, y).a === 255 ? 1 : 0);
    }
  }
  return mask;
}
function maskDiffCount(a, b) {
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  return diff;
}
function mirroredMask(mask, w) {
  const h = mask.length / w;
  const out = new Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[y * w + x] = mask[y * w + (w - 1 - x)];
    }
  }
  return out;
}

let directionGateOk = true;
let directionDetail = '';
if (rows === 4) {
  const [leftMask, downMask, upMask, rightMask] = [0, 1, 2, 3].map(idleMask);
  const totalPixels = leftMask.length;
  const minDiffForDistinct = Math.max(1, Math.floor(totalPixels * 0.05)); // at least 5% of pixels must differ
  const pairs = [
    ['left', 'down', leftMask, downMask],
    ['left', 'up', leftMask, upMask],
    ['down', 'up', downMask, upMask],
    ['down', 'right', downMask, rightMask],
    ['up', 'right', upMask, rightMask],
  ];
  const indistinct = pairs.filter(([, , a, b]) => maskDiffCount(a, b) < minDiffForDistinct);
  const mirrorDiff = maskDiffCount(leftMask, mirroredMask(rightMask, actualCellW));
  const mirrorTolerance = Math.max(1, Math.floor(totalPixels * 0.1)); // 10% tolerance for asymmetric detail (profile bump, etc.)
  const mirrorOk = mirrorDiff <= mirrorTolerance;
  directionGateOk = indistinct.length === 0 && mirrorOk;
  directionDetail = `${indistinct.length === 0 ? 'all non-mirror direction pairs distinct' : `${indistinct.map(([a, b]) => `${a}/${b}`).join(', ')} nearly identical silhouettes`}; left/right mirror diff ${mirrorDiff}px (tolerance ${mirrorTolerance}px) — ${mirrorOk ? 'within tolerance' : 'left and right are not mirror images'}`;
} else {
  directionDetail = `rows=${rows} !== 4, skipping direction-specific mirror/distinctness check`;
}
report('Direction completeness', directionGateOk, directionDetail);

printReportAndExit();

function printReportAndExit() {
  const w = Math.max(...results.map((r) => r.gate.length));
  console.log(`Character art QA — ${file}\n`);
  let allPass = true;
  for (const r of results) {
    if (!r.pass) allPass = false;
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.gate.padEnd(w)}  ${r.detail}`);
  }
  console.log(`\n${allPass ? 'All gates passed.' : 'One or more gates failed — not a valid discrete-pixel-data production candidate.'}`);
  process.exit(allPass ? 0 : 1);
}
