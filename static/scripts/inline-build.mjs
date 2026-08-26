#!/usr/bin/env node
/**
 * Fold `dist/` into one self-contained `static-game.html`.
 *
 * GitHub Actions is not enabled on this repository, so the Pages workflow
 * never registers and there is no CI-built site to link anybody to. This is
 * the fallback the `.gitignore` has always described: a single file with the
 * bundle, the stylesheet and every sprite sheet inlined, which can be opened
 * from a filesystem, emailed, or published as an Artifact and played on a
 * phone with no server involved.
 *
 * It is generated, never source — `.gitignore` keeps the output out of the
 * repo for the same reason `dist/` is out of it.
 *
 * Usage:  npm run build && node scripts/inline-build.mjs
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

const DIST = 'dist';
const OUT = 'static-game.html';

const MIME = { '.png': 'image/png', '.svg': 'image/svg+xml' };

/** Every image the bundle fetches at runtime, as `path -> data: URI`. The
 * loader builds these URLs as plain strings (`new Image().src = ...`), so
 * inlining is a substitution over the bundle text rather than anything the
 * bundler can do for us. */
async function dataUris() {
  const uris = new Map();
  for (const dir of ['tiles', 'sprites']) {
    for (const name of await readdir(join(DIST, dir))) {
      const ext = extname(name);
      if (!MIME[ext]) continue; // NOTICE.txt and friends stay behind
      const bytes = await readFile(join(DIST, dir, name));
      uris.set(`${dir}/${name}`, `data:${MIME[ext]};base64,${bytes.toString('base64')}`);
    }
  }
  return uris;
}

let html = await readFile(join(DIST, 'index.html'), 'utf8');
const assets = await readdir(join(DIST, 'assets'));
const jsName = assets.find((f) => f.endsWith('.js'));
const cssName = assets.find((f) => f.endsWith('.css'));

let js = await readFile(join(DIST, 'assets', jsName), 'utf8');
const css = await readFile(join(DIST, 'assets', cssName), 'utf8');

/*
 * Runtime image URLs -> data URIs.
 *
 * Two orderings matter here and both were got wrong first time round.
 * Longest *path* first, so `tiles/a-b.png` can never be partially matched
 * by a shorter sibling. And, per path, longest *prefix* first: Vite emits
 * these as `"./tiles/x.png"`, so substituting the bare `tiles/x.png`
 * leaves the `./` in front of the data URI and the browser goes looking
 * for a relative file called `./data:image/png;base64,...`. Which it did,
 * silently, until the single file was actually opened and played.
 */
const uris = await dataUris();
for (const [path, uri] of [...uris].sort((a, b) => b[0].length - a[0].length)) {
  for (const prefix of ['./', '/', '']) js = js.split(`${prefix}${path}`).join(uri);
}

const favicon = await readFile(join(DIST, 'favicon.svg'), 'utf8');
const faviconUri = `data:image/svg+xml;base64,${Buffer.from(favicon).toString('base64')}`;

html = html
  .replace(/<script type="module" crossorigin src="[^"]*"><\/script>/, '')
  .replace(/<link rel="stylesheet" crossorigin href="[^"]*">/, `<style>${css}</style>`)
  .replace(/href="\.\/favicon\.svg"/g, `href="${faviconUri}"`)
  // The bundle goes last, after #root exists, so the module has a mount
  // point the moment it runs — there is no `defer` on an inline module.
  .replace('</body>', `<script type="module">${js}</script></body>`);

await writeFile(OUT, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`${OUT} — ${kb} KB, self-contained (${uris.size} images inlined)`);
