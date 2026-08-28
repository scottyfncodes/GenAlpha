# GenAlpha custom asset pipeline — Run 1 review checkpoint

**Status:** Run 1 approved. This document is the review checkpoint requested
after approval — a record of what Run 1 actually did, verified fresh, before
any Run 2 (production art) work begins. **Run 2 has not started.** The asset
gallery screenshot referenced below is
`docs/art/genalpha-art-pipeline-run1-review-gallery.png`.

---

## Discovered vs Proposed

Kept as its own section on purpose, so the two categories can't be
conflated: **Discovered** is measured directly off the live renderer and is
not a design choice this run made. **Proposed** is this run's own
recommendation, flagged for approval, not yet acted on anywhere.

### Discovered (measured off `world/draw.ts` and neighbors, not invented)

- The game renders **top-down**, with buildings drawn as a flat **roof card
  over a flat face card** (not isometric, not a 3D box) and characters drawn
  as small 4-direction top-down figures — the exact convention Kenney's RPG
  Urban Pack uses, because that pack is where the one sprite-backed
  character in the game comes from.
- **Almost nothing in this game is image-based art today.** With the
  exception of three tinted Kenney tile sheets and two standalone
  drone-minigame PNGs, every building/character/vehicle/prop on screen is
  `ctx.fillRect`/`ctx.arc` procedural drawing against a 150-entry color
  palette. There was no existing sprite library to match against.
- **Master scale unit:** the player, 11×15 world-unit collision box, 16×22
  drawn sprite, feet-anchored. `TILE = 16` world units is the base grid.
- **Anchors are category-determined, not per-object:** characters/props/
  vehicles/landmarks anchor bottom-center (feet/ground contact); buildings
  and terrain anchor top-left (the full bounding box's own corner);
  technology nodes (cameras, scanners, junction boxes, drones) anchor center.
- **Paint order is fixed and entirely ordinal** — `drawTown()` has no
  z-index or depth field; occlusion is 100% "what got drawn earlier." Full
  20-step order transcribed in the art bible §5.
- **A `spriteSheetReady() → real art : procedural fallback` pattern already
  exists everywhere** (`world/spritesheet.ts`, `ui/minigames/droneSprites.ts`)
  — the asset-slot loader this run adds is the same pattern one layer
  earlier (placeholder art *is* the fallback, not a debug bolt-on).
- **Dev tooling precedent already exists:** `mapshot.html` — its own
  Vite entry, never built into `dist/`, every control mirrored into the
  query string. The asset gallery and `check-assets.mjs` are direct
  siblings of `mapshot.html`/`check-connectivity.mjs`, not a new pattern.
- Every concrete dimension in the manifest (§ below) — car 18×12, crate/
  barrel 16×16, tree ~20×40, truck 40×22, camera housing 16×16, drone body
  ~12×12, road widths 6–44 by tier, building footprints 80×64 to 210×130,
  the SafeTrace Tower at 50×168 — is read off an existing table
  (`obstacles.ts`, `locations.ts`, `spriteIndex.ts`, `draw.ts`'s
  `ROAD_WIDTH`), not invented.

### Proposed (this run's own recommendation — not yet approved, not acted on)

1. **Character size parity.** The player and every ambient NPC/cop share
   one sprite budget (16×22) today; there is no adult/child size
   distinction in any dimension table, even though the player's *collision*
   box is deliberately shortened for age. Whether custom art should
   introduce a real adult/child height difference is left open — flagged
   `PROPOSED / REQUIRES APPROVAL` in the art bible §2, not decided. Nothing
   in the manifest is blocked on it: every humanoid slot is locked to the
   current 16×22 box, and revisiting the decision only means widening that
   one box later.
2. **UI icon base grid (24×24).** There are **zero existing instances** to
   measure — HUD iconography today is text/CSS/SVG, not image-asset-backed
   at all. The 24×24 figure is a recommendation for *if and when* UI ships
   as image assets, not a discovered fact. Flagged `PROPOSED / REQUIRES
   APPROVAL` in the art bible §3, and the one manifest slot in this
   category (`ui-icon.generic`) is explicitly greenfield.

No other item in the art bible or manifest carries this flag. Every other
dimension, anchor, and layer figure is Discovered.

---

## What Run 1 implemented

1. **`docs/art/genalpha-art-bible.md`** — the art direction reference:
   perspective, the player-anchored scale table, per-category dimension
   standards, anchor conventions, and `drawTown`'s exact paint order.
2. **`src/art/manifest.ts`** — 61 typed `AssetSlot` entries, one per class
   of thing the renderer draws (not one per map instance), each carrying
   size, anchor, paint layer, and a `sourceRef` back to the exact `draw.ts`
   function/table it documents.
3. **`src/art/assetLoader.ts`** — draws a manifest slot from real art
   (`public/art/<id>.png`) once such a file exists, or a correctly-sized,
   anchor-marked placeholder until it does. Follows the codebase's existing
   `ensureLoading()`/`ready()`-with-fallback shape.
4. **`src/art/manifest.test.ts`** — 67 assertions validating the manifest's
   own self-consistency (unique ids, valid dimensions, a real paint layer,
   sane frame math, category-coverage, anchor-by-category invariants).
5. **`assetgallery.html` + `src/dev/AssetGallery.tsx` +
   `src/dev/assetgallery-main.tsx` + `src/dev/assetgallery.css`** — the
   dev-only placeholder gallery, sibling of `mapshot.html`, never built
   into `dist/`.
6. **`scripts/check-assets.mjs`** — CLI report of every slot's declared
   size/anchor/layer and real-art-vs-placeholder status, plus a check for
   orphaned files in `public/art/`.
7. **`public/art/NOTICE.txt`** — documents the (intentionally empty)
   directory real art will land in later.
8. **README.md** — a new "The custom asset pipeline" section pointing at
   all of the above.

**Nothing in `world/draw.ts` was touched, in Run 1 or in this checkpoint.**
The system is entirely additive: the live game still renders exactly as it
did before Run 1, and no manifest/loader code is imported from anywhere in
`src/world/`, `src/ui/`, `src/state/`, `src/systems/`, `src/content/`,
`src/main.tsx`, or `src/App.tsx` — verified by a repo-wide grep as part of
this checkpoint (zero matches).

---

## Files changed/added (exact)

Diffed against `4cae1d3` (the commit immediately before Run 1), all in
`static/`:

```
 README.md                                                    |  38 ++
 assetgallery.html                                             |  29 ++  (new)
 docs/art/genalpha-art-bible.md                                | 483 ++  (new)
 public/art/NOTICE.txt                                         |  13 +   (new)
 scripts/check-assets.mjs                                      |  71 +   (new)
 src/art/assetLoader.ts                                        | 218 +   (new)
 src/art/manifest.test.ts                                      | 102 +   (new)
 src/art/manifest.ts                                           | 267 +   (new)
 src/dev/AssetGallery.tsx                                       | 290 +   (new)
 src/dev/assetgallery-main.tsx                                  |  27 +   (new)
 src/dev/assetgallery.css                                       |  77 +   (new)
 11 files changed, 1615 insertions(+), 0 deletions(-)
```

This checkpoint adds two more, both documentation:

```
 docs/art/genalpha-art-pipeline-run1-review.md                 (new, this file)
 docs/art/genalpha-art-pipeline-run1-review-gallery.png        (new, ~208 KB)
```

No other file changed. `world/draw.ts` does not appear in either diff.

---

## The 61 asset slots, mapped to renderer categories

| Category | Slots | Renderer origin |
|---|---|---|
| character (6) | `player`, `npc.person`, `cop`, `npc.dog`, `npc.cat`, `npc.bird` | `spriteIndex.ts` `CHARACTERS`/`CHARACTER_DRAW_SIZE`; `draw.ts` `drawPlayer`/`drawPedestrian`/`drawCop`/`drawDog`/`drawCat`/`drawBird` |
| small-prop (5) | `bush`, `rock`, `bin`, `crate`, `barrel` | `obstacles.ts` kinds `bush`/`rock`/`bin`/`crate`/`barrel`; `spriteIndex.ts`/`spriteIndexCity.ts` tile refs |
| medium-prop (6) | `tree.tall`, `tree.small`, `hedge`, `fence.chainlink`, `bench`, `laundry-line` | `obstacles.ts` kinds `tree`/`hedge`/`fence`/`bench`/`laundry`; `draw.ts` `drawTree`/`drawHedge`/`drawFence`/`drawParkBench`/`drawWashingLine` |
| large-prop (1) | `playground` | `obstacles.ts` kind `playground`; `draw.ts` `drawPlayground` |
| building (18) | `house`, `school`, `library`, `shop`, `plaza`, `warehouse`, `garage`, `ballpark`, `pizza`, `arcade`, `treehouse`, `transit`, `civic`, `datacenter`, `bigbox`, `substation`, `generic`, `decorative` | `locations.ts` `render:` values; `draw.ts` `drawBuilding`/`drawHouse`/etc.; `decorative` is the obstacle-table background filler, not a real location |
| landmark (3) | `safetrace-tower`, `billboard.small`, `billboard.large` | `obstacles.ts` `safetrace_tower`/`plaza_pylon`/`commercial_billboard`; `draw.ts` `drawSafeTraceTower`/`drawBillboard` |
| vehicle (5) | `car`, `bus`, `truck.horizontal`, `truck.vertical`, `patrol-van` | `spriteIndex.ts` `CAR_TILES`/`BUS_TILES`; `obstacles.ts` kind `truck`; `spriteIndexCity.ts` `PATROL_VAN_TILES` |
| terrain (4) | `ground`, `road.surface`, `sidewalk`, `crosswalk` | `spriteIndexCity.ts` tile refs; `draw.ts` `drawGround`/`drawRoads`; `ROAD_WIDTH` table |
| technology (9) | `camera`, `camera.dead`, `street-hack.atm`, `street-hack.phone`, `junction-box`, `plate-scanner`, `security-gate`, `drone.recon`, `drone.interceptor` | `draw.ts` `drawSabotageCamera`/`drawDeadCamera`/`drawStreetHack`/`drawJunctionBox`/`drawPlateScanner`/`drawSecurityGate`/`drawDrone` |
| effect (3) | `gen-a-mark`, `sabotage-scar`, `sparkle` | `ui/GenAMark.tsx`; `draw.ts` `drawGenAMark`/`drawSabotageScar`/`drawSparkle` |
| ui-icon (1) | `generic` | none — greenfield, **PROPOSED** |

`node scripts/check-assets.mjs` (run fresh for this checkpoint) confirms all
61 as `placeholder`, 0 as `real art`, 0 orphaned files under `public/art/` —
the expected, correct state for Run 1.

---

## Perspective / scale / anchor conventions established

Summarized here; full detail and the worked scale table are in the art
bible itself.

- **Perspective:** top-down ground plane; buildings as a flat roof-card +
  face-card pair; characters as 4-direction top-down figures. Matches the
  existing game exactly — **no perspective change proposed.**
- **Scale:** player (16×22 sprite / 11×15 collision) is the master
  reference. Everything else in the manifest is sized as a measured ratio
  against it (car ≈1.1× player width, tree ≈1.25×/1.8×, house ≈6–8×/4–4.5×,
  SafeTrace Tower ≈3×/**7.6×** — the one deliberate grid-breaking landmark).
- **Anchors:** bottom-center (feet/ground) for characters, props, vehicles,
  landmarks; top-left (full bounding box) for buildings and terrain; center
  for technology nodes; explicit per-instance for effects/decals.
- **Layers:** 20 fixed ordinals, ground → objects → characters → player →
  airspace, with airborne drones as the sole exception to "player always on
  top."

---

## Remaining uncertainties / risks before production art begins

None of these are Run 1 defects — nothing here failed a test, broke the
build, or contradicts what Run 1 promised to deliver (a sized/anchored
placeholder system, not a finished art pipeline). They're open questions
worth the reviewer's attention before Run 2 art gets prepared against this
foundation:

1. **The two flagged `PROPOSED` items above are still open.** Character
   size parity and the UI icon grid both need an explicit decision before
   art keyed to them is produced.
2. **`assetLoader.ts`'s `drawAssetSlot` does not yet slice multi-frame
   sheets.** Two character slots (`character.player`,
   `character.npc.person`) declare a `frames: {cols:3, rows:4,
   directions:[...]}` block in the manifest, but the loader's current
   drawing path treats any `public/art/<id>.png` as **one single static
   image**, stretched to the slot's `width`×`height` — it has no code to
   pick a sub-rectangle by direction/frame. This is invisible today (no
   real art exists, so it's never exercised), but it means a walk-cycle
   sheet dropped in under `character.player.png` as authored would render
   wrong (the whole sheet squashed into one 16×22 box) rather than
   animating. **This needs a design decision — one file per frame, one
   sheet with slicing logic added to the loader, or CSS-sprite-style frame
   coordinates in the manifest — before character art production starts.**
   Deliberately left unfixed at this checkpoint: building that logic now
   would be scope expansion into Run 2 territory (a decision about the
   sheet format, plus new loader code), not a foundation bug.
3. **Building dimensions in the manifest are one representative instance
   per render type, not a hard constraint.** Real locations of the same
   `render` type vary in footprint (e.g. every `shop` isn't 100×74 — see
   `locations.ts`). Production building art will need to either be
   authored as a flexible/9-sliceable asset or the manifest will need
   per-instance sizing — a decision the art bible flags implicitly (§3's
   "match the nearest existing building's proportions") but doesn't fully
   resolve.
4. **No automated cross-check between the manifest and `draw.ts`'s actual
   call sites.** `sourceRef` is a manual trace, verified once by this audit,
   not asserted by any test. If `draw.ts` changes a dimension in a future,
   unrelated commit, the manifest can silently drift out of date — nothing
   currently catches that.
5. **Terrain is one generic 16×16 slot**, not per-tile-index entries (roads,
   sidewalks, and ground each have many distinct tile variants in the
   Kenney sheets). Fine for a placeholder-only run; a real terrain art pass
   will likely need either many more terrain slots or a different
   (tileset-based) mechanism than the single-image-per-slot model the
   loader currently supports.

---

## Test / build results (run fresh for this checkpoint)

All commands run from `static/` on branch `claude/genalpha-asset-pipeline-run1-ygjb51`, current commit at the time of this checkpoint's own commit.

| Check | Result |
|---|---|
| `npm test` (full suite) | **645 / 645 passed**, 41 files, ~53s — includes `src/art/manifest.test.ts` |
| `npx vitest run src/art/manifest.test.ts` (isolated) | **67 / 67 passed** |
| `npm run typecheck` (`tsc --noEmit`) | **clean, no errors** |
| `npm run build` (`tsc -b && vite build`) | **succeeds**; `dist/` contains only `index.html` + assets — confirmed no `mapshot.html`/`assetgallery.html` in the output |
| `node scripts/check-assets.mjs` | **61 slots reported, 0 real, 61 placeholder, 0 orphaned files** |
| `world/draw.ts` diff vs. pre-Run-1 | **empty** — confirmed untouched |
| Repo-wide grep for manifest/loader imports outside `src/art`/`src/dev` | **zero matches** — confirmed isolated from the live game |

Nothing failed. No foundation fix was needed or made at this checkpoint.

---

## Explicitly out of scope, still

Unchanged from the art bible's own §8, restated because this checkpoint is
a gate before it stops applying: no finished custom artwork, no change to
`draw.ts`'s live rendering, no perspective/camera/map/gameplay/progression
change. Run 2 begins only on separate, explicit authorization.
