#!/usr/bin/env node
/**
 * Flood-fill connectivity check for the overworld map. Referenced by comments
 * in obstacles.ts and patrols.ts ("the same flood-fill/overlap script") but
 * never actually checked into the repo — this is that script, written once
 * so future edits have something real to re-run instead of a comment
 * promising a tool that doesn't exist.
 *
 * What it checks, on an 8px grid over the whole map:
 *   1. Every open cell is reachable from the player's spawn point.
 *   2. Every location's doorway (its own edge, one cell out) is reachable.
 *   3. No location or solid obstacle rect overlaps another.
 *
 * Run with: node scripts/check-connectivity.mjs
 */
const CELL = 8;

const { LOCATIONS, MAP_WIDTH, MAP_HEIGHT, HOME_LOCATION_ID } = await import('../src/world/locations.ts');
const { OBSTACLES } = await import('../src/world/obstacles.ts');
const { HIDDEN_PICKUP_OBSTACLE_IDS } = await import('../src/world/collectibles.ts');

const SOLID_OBSTACLES = OBSTACLES.filter((o) => !HIDDEN_PICKUP_OBSTACLE_IDS.has(o.id));
const BLOCKERS = [...LOCATIONS, ...SOLID_OBSTACLES];

const GW = Math.ceil(MAP_WIDTH / CELL);
const GH = Math.ceil(MAP_HEIGHT / CELL);
const blocked = new Uint8Array(GW * GH);

function markRect(x, y, w, h) {
  const minGx = Math.max(0, Math.floor(x / CELL));
  const maxGx = Math.min(GW - 1, Math.ceil((x + w) / CELL));
  const minGy = Math.max(0, Math.floor(y / CELL));
  const maxGy = Math.min(GH - 1, Math.ceil((y + h) / CELL));
  for (let gy = minGy; gy <= maxGy; gy++) {
    for (let gx = minGx; gx <= maxGx; gx++) blocked[gy * GW + gx] = 1;
  }
}
for (const b of BLOCKERS) markRect(b.x, b.y, b.w, b.h);

// Overlap check: any two blockers occupying the same ground.
const overlaps = [];
for (let i = 0; i < BLOCKERS.length; i++) {
  for (let j = i + 1; j < BLOCKERS.length; j++) {
    const a = BLOCKERS[i], b = BLOCKERS[j];
    if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
      overlaps.push(`${a.id ?? '(obstacle)'} @ ${a.x},${a.y} overlaps ${b.id ?? '(obstacle)'} @ ${b.x},${b.y}`);
    }
  }
}

// Flood fill from just outside Home's front door (its bottom edge, a few px
// clear) — the player does spawn dead-centre inside a location's own rect,
// but this checker cares about the open ground everything else has to
// connect to, the same "can you get from any doorway to any other doorway"
// question the doorway check below asks per-location.
const home = LOCATIONS.find((l) => l.id === HOME_LOCATION_ID);
const startX = Math.floor((home.x + home.w / 2) / CELL);
const startY = Math.floor((home.y + home.h + CELL) / CELL);
const seen = new Uint8Array(GW * GH);
const stack = [[startX, startY]];
seen[startY * GW + startX] = 1;
let visited = 0;
while (stack.length) {
  const [gx, gy] = stack.pop();
  visited++;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = gx + dx, ny = gy + dy;
    if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
    const idx = ny * GW + nx;
    if (seen[idx] || blocked[idx]) continue;
    seen[idx] = 1;
    stack.push([nx, ny]);
  }
}

const openCells = GW * GH - blocked.reduce((a, b) => a + b, 0);
const unreachable = [];
for (let i = 0; i < GW * GH; i++) if (!blocked[i] && !seen[i]) unreachable.push(i);

// Doorway check: a ring of cells just outside each location's rect should
// have at least one reachable cell — otherwise the location itself is sealed
// off even though the open ground elsewhere is fine.
const doorwayFails = [];
for (const loc of LOCATIONS) {
  const pad = CELL;
  const minGx = Math.max(0, Math.floor((loc.x - pad) / CELL));
  const maxGx = Math.min(GW - 1, Math.ceil((loc.x + loc.w + pad) / CELL));
  const minGy = Math.max(0, Math.floor((loc.y - pad) / CELL));
  const maxGy = Math.min(GH - 1, Math.ceil((loc.y + loc.h + pad) / CELL));
  let ok = false;
  for (let gy = minGy; gy <= maxGy && !ok; gy++) {
    for (let gx = minGx; gx <= maxGx && !ok; gx++) {
      if (!blocked[gy * GW + gx] && seen[gy * GW + gx]) ok = true;
    }
  }
  if (!ok) doorwayFails.push(loc.id);
}

console.log(`grid: ${GW}x${GH} cells (${CELL}px) over ${MAP_WIDTH}x${MAP_HEIGHT}`);
console.log(`open cells: ${openCells}, reachable from spawn: ${visited}`);
console.log(`unreachable open cells: ${unreachable.length}`);
console.log(`overlaps: ${overlaps.length}`);
if (overlaps.length) console.log(overlaps.slice(0, 20).join('\n'));
console.log(`sealed-off locations: ${doorwayFails.length}`);
if (doorwayFails.length) console.log(doorwayFails.join(', '));

const ok = unreachable.length === 0 && overlaps.length === 0 && doorwayFails.length === 0;
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
