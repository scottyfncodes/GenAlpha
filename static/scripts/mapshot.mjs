#!/usr/bin/env node
/**
 * Screenshot every district off the map inspector (`/mapshot.html`, see
 * `src/dev/MapShot.tsx`), so a layout change can be reviewed as ten images
 * instead of ten minutes of walking.
 *
 * Every control on that page writes itself into the query string, which is
 * the whole reason this script can exist without knowing anything about the
 * page's own markup: a view is a URL, and this just visits eleven of them.
 *
 * Run through `tsx`, the same way `check-connectivity.mjs` is, because it
 * reads the district table straight out of `world/locations.ts` rather than
 * keeping a second copy of the nine block centres that could drift:
 *
 *   npm run dev                              # in one terminal
 *   npx tsx scripts/mapshot.mjs              # in another
 *   npx tsx scripts/mapshot.mjs --out /tmp/shots --stage 0 --patrols --damaged
 *
 * Flags: --out --url --stage --tier --width --height --settle --patrols
 *        --damaged
 *
 * Playwright is deliberately not a dependency — a couple of hundred megabytes
 * for a tool nobody needs to run the game or the tests. Install it ad hoc:
 *
 *   npm i --no-save playwright && npx playwright install chromium
 *
 * If Chromium is already on the machine but not where this Playwright build
 * expects it (a shared browser cache, a CI image that pins a different
 * build), point at it rather than downloading a second copy:
 *
 *   npx tsx scripts/mapshot.mjs --exe /path/to/chrome
 *   CHROMIUM_PATH=/path/to/chrome npx tsx scripts/mapshot.mjs
 */
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

const OUT = flag('out', 'mapshots');
const BASE = flag('url', 'http://localhost:5173');
const STAGE = flag('stage', '3');
const TIER = flag('tier', 'watched');
const WIDTH = Number(flag('width', 1200));
const HEIGHT = Number(flag('height', 820));
/** Long enough for the two sprite sheets to decode and the walk cycle to be
 * somewhere other than frame zero — a shot taken on the first frame is a map
 * of flat fill colours, which is the fallback rendering, not the game. */
const SETTLE_MS = Number(flag('settle', 2500));

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error(
    'playwright is not installed (it is deliberately not a dependency).\n' +
      '  npm i --no-save playwright && npx playwright install chromium',
  );
  process.exit(1);
}

const { DISTRICTS, MAP_WIDTH, MAP_HEIGHT } = await import('../src/world/locations.ts');

const shots = [
  ...DISTRICTS.map((d, i) => ({
    name: `${i + 1}-${d.id}`,
    x: Math.round(d.x + d.w / 2),
    y: Math.round(d.y + d.h / 2),
    s: 2,
  })),
  { name: 'whole-map', x: Math.round(MAP_WIDTH / 2), y: Math.round(MAP_HEIGHT / 2), s: 0.75 },
];

const { mkdir } = await import('node:fs/promises');
await mkdir(OUT, { recursive: true });

const exe = flag('exe', process.env.CHROMIUM_PATH);
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
page.on('pageerror', (e) => console.error('page error:', e.message));

for (const shot of shots) {
  const q = new URLSearchParams({
    x: String(shot.x),
    y: String(shot.y),
    s: String(shot.s),
    stage: STAGE,
    tier: TIER,
    damaged: has('damaged') ? '1' : '0',
    patrols: has('patrols') ? '1' : '0',
  });
  await page.goto(`${BASE}/mapshot.html?${q}`, { waitUntil: 'load' });
  await page.waitForTimeout(SETTLE_MS);
  await page.locator('.mapshot__canvas').screenshot({ path: `${OUT}/${shot.name}.png` });
  console.log(`${OUT}/${shot.name}.png`);
}

await browser.close();
