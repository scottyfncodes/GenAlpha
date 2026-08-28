#!/usr/bin/env node
/**
 * Asset-slot pipeline report — the "asset validation/debug tooling" the
 * art-pipeline run calls for, and the CLI sibling of `assetgallery.html`
 * (same relationship `check-connectivity.mjs` has to `mapshot.html`).
 *
 * `src/art/manifest.test.ts` (run via `npm test`) validates the manifest's
 * own self-consistency — unique ids, sane dimensions, a real layer, frame
 * math. This script instead reports the thing a human or a CI step actually
 * wants to know at a glance: for every declared slot, its size/anchor/layer,
 * and whether real art exists yet at `public/art/<id>.png` or it's still
 * drawing its placeholder. In Run 1, every slot is a placeholder — that's
 * the expected, asserted-below state, not a failure.
 *
 * Run with: node scripts/check-assets.mjs
 * Exits non-zero only if the manifest itself is malformed enough that this
 * report can't be produced (empty manifest, unreadable `public/art/`) —
 * everything else is informational.
 */
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const artDir = path.join(here, '..', 'public', 'art');

const { ASSET_MANIFEST } = await import('../src/art/manifest.ts');

if (ASSET_MANIFEST.length === 0) {
  console.error('Manifest is empty — nothing to report.');
  process.exit(1);
}

const byCategory = new Map();
for (const slot of ASSET_MANIFEST) {
  const list = byCategory.get(slot.category) ?? [];
  list.push(slot);
  byCategory.set(slot.category, list);
}

let realCount = 0;
let placeholderCount = 0;

console.log(`Asset slot manifest — ${ASSET_MANIFEST.length} slots, ${byCategory.size} categories\n`);

for (const [category, slots] of [...byCategory.entries()].sort()) {
  console.log(`${category} (${slots.length})`);
  for (const slot of slots.sort((a, b) => a.id.localeCompare(b.id))) {
    const file = path.join(artDir, `${slot.id}.png`);
    const real = existsSync(file);
    if (real) realCount++;
    else placeholderCount++;
    const status = real ? 'real art' : 'placeholder';
    console.log(`  ${slot.id.padEnd(34)} ${String(slot.width).padStart(3)}x${slot.height.toString().padEnd(3)} ${slot.anchor.padEnd(13)} ${slot.layer.padEnd(24)} ${status}`);
  }
}

// Flag any file sitting in public/art/ with no matching manifest slot — a
// stray asset dropped in under the wrong id would silently never draw,
// which is exactly the kind of thing this tool exists to catch early.
let orphans = [];
if (existsSync(artDir)) {
  const knownIds = new Set(ASSET_MANIFEST.map((s) => `${s.id}.png`));
  orphans = readdirSync(artDir).filter((f) => f.endsWith('.png') && !knownIds.has(f));
}

console.log(`\n${realCount} real, ${placeholderCount} placeholder, ${ASSET_MANIFEST.length} total.`);
if (orphans.length > 0) {
  console.log(`\n${orphans.length} file(s) in public/art/ with no matching manifest slot:`);
  for (const f of orphans) console.log(`  ${f}`);
}
