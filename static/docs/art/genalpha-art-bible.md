# The GenAlpha Art Bible

**Status: Run 1 approved; foundation frozen.** This document establishes the
visual foundation that future custom artwork plugs into. It is derived
entirely from the game as it actually renders today — `src/world/draw.ts` and
its neighbors are the source of truth throughout; nothing here is
aspirational or copied from a design document that predates the code. Where
the implementation and an older design note (the in-code comments cite a
"Style Guide 07" and a "map redesign brief" — neither exists as a file in
this repository) disagree, the implementation wins, because it's the only
version anyone has actually seen run.

This is Run 1 of the custom asset pipeline: art direction and the asset-slot
system only. **No finished custom artwork ships in this run.** Every
dimension and anchor below is either measured off the live renderer, or was
`PROPOSED / REQUIRES APPROVAL` and has since been approved (character size
parity, §2; the UI icon base grid, §3 — both recorded at the Run 1 review
checkpoint, `docs/art/genalpha-art-pipeline-run1-review.md`), or remains an
open design recommendation awaiting approval
(`docs/art/genalpha-character-animation-architecture.md`).

---

## 0. What the game actually is, today

Before anything else: an audit, because the implementation is the only
trustworthy source.

**GenAlpha** (working title in-repo: "STATIC") is a browser-based top-down
2D narrative RPG. It is playable start to finish across three acts. Rendering
is a single `<canvas>` element (`Overworld.tsx` mounts it, `world/draw.ts`'s
`drawTown()` repaints it every frame) with `ctx.imageSmoothingEnabled = false`
— strict pixel art, no anti-aliasing, ever.

**The world is not built from sprite art today.** With the narrow exceptions
listed below, every building, character, vehicle, and prop on screen is drawn
procedurally — `ctx.fillRect`/`ctx.arc`/`ctx.beginPath` calls against a fixed
150-entry color palette (`PALETTE` in `draw.ts`), not `drawImage()` calls
against picture files. This is the single most important fact for anyone
producing custom art: **there is no existing sprite library to match stylistically
by pixel-peeping reference files, because almost none exist.** The "reference"
is the shape language and palette discipline of the procedural drawing code
itself, described below.

**Where real images already exist**, three patterns are already established
and this pipeline extends them rather than inventing a fourth:

1. **Tinted Kenney tile sheets.** Three CC0 packs (`public/tiles/`), all
   16×16px tiles, 1px spacing: `kenney-rpg-urban-pack.png` (27×18 tiles, the
   main sheet — trees, bushes, cars, a bus, roof/wall nine-slice kits, the
   6-skin walk-cycle character block), `kenney-roguelike-city-pack.png`
   (37×28 tiles — industrial concrete, the patrol van), and
   `kenney-roguelike-interior-pack.png` (27×18 tiles — furniture/floor for
   the small interior-backdrop canvases). Loaded once at module import
   (`world/spritesheet.ts`), tinted exactly once off-screen
   (`saturate(0.4) brightness(0.74) contrast(1.18)` plus a flat color wash
   blended with `source-atop`) so every later per-frame blit reads
   pre-tinted pixels at zero extra cost, and painted over with the game's own
   dusk palette rather than the pack's brighter default.
2. **The fallback-until-ready pattern.** Every sprite-backed draw call checks
   `spriteSheetReady()` first and falls back to the original procedural shape
   when it isn't (true for a handful of frames on first load, and — this is
   the important part for this pipeline — exactly the shape a "real art not
   dropped in yet" placeholder needs to take). `drawTree`, `drawBush`,
   `drawBuilding`, `drawPlayer`, `drawPatrol` all follow this exact shape.
3. **Standalone PNGs outside the tile grid.** `droneflight-player.png` and
   `droneflight-interceptor.png` (`public/sprites/`, from Kenney's Space
   Shooter Remastered pack) are loaded as plain, ungridded images for the
   drone-flight minigame only — proof that this codebase already knows how to
   load an arbitrary picture file and doesn't need the tile-grid machinery to
   do it.

**Dev tooling already exists and this run extends it, not replaces it.**
`mapshot.html` (`src/dev/MapShot.tsx`) is a second Vite entry point — Vite's
production build only takes `index.html` as input, so this page is served by
`npm run dev` and never ships — that calls the real `drawTown()` at any
position/zoom/day/Heat-tier with no save file or story gating in the way, with
every control mirrored into the query string so a view is a shareable URL.
`scripts/mapshot.mjs` drives it headlessly for screenshots.
`scripts/check-connectivity.mjs` flood-fills the map and fails on an
unreachable cell or overlapping rect. The asset gallery and validator this run
adds (§7) are siblings of these two tools, not a new pattern.

**What was playable and reviewed for this audit:** the opening (`act1_glitch_01`
through leaving Home), walking Bellhaven's nine districts via `mapshot.html`
at every district anchor and at whole-map zoom, the camera/hack/junction-box
interaction prompts, and the drone-flight minigame (the one place today with
image-based sprites and real rotation/animation). The reachability and
connectivity test suites (`npm test`) were read for what they assert about
world geometry, since they're the closest thing to living documentation for
placement rules.

---

## 1. Perspective

**Matches the existing game exactly. No perspective change is proposed.**

- **Camera angle:** fixed, top-down, no rotation, no tilt. `drawTown()` never
  rotates the canvas — it translates and uniformly scales, nothing else.
- **World orientation:** a single continuous 2D plane, 1600×1100 world units
  (`MAP_WIDTH`/`MAP_HEIGHT`, `world/locations.ts`), north-up. Roads, rivers,
  rail all run in world-space straight lines; "up" on screen is north.
- **Ground-plane treatment:** the ground, roads, sidewalks, and district
  ground-tint are drawn as flat, direct top-down fills — true bird's-eye,
  no foreshortening. This part of the frame is orthographic.
- **Vertical surfaces / building perspective:** buildings are **not** drawn in
  true orthographic top-down (which would show only a roof silhouette). They
  use the classic 16-bit RPG "roof-plus-face" convention: the location's full
  `(x, y, w, h)` rect is split into a **roof band** at the top (`roofH`,
  typically ~14px or ~34% of height for a pitched house) and a **wall/face
  band** below it, and the wall band is where windows, doors, doorway color
  bands, tags, and glitch tears all render. There is no true side elevation —
  no visible depth on the building's flanks — this is a single flattened
  "roof card over a face card," not a 3D box. Treat every building as
  **two flat, vertically-stacked cards**: roof card (no detail beyond a color
  band and, on a pitched house, a triangular gable), face card (windows, door,
  ground-floor detail).
- **Sprite facing:** characters (player, NPCs, cops) are drawn in the
  classic 4-direction top-down RPG convention — **left / down / up / right**,
  each with its own walk-cycle frames, selected by whichever axis of movement
  dominates (see `facingDirection()`). This is a ¾-style character read (you
  see a front, back, or profile of a small figure), sitting on top of a true
  top-down ground plane — again, matching Kenney's RPG Urban Pack convention
  exactly, because that pack is where the one sprite-backed character in the
  game comes from.
- **Depth relationships:** depth is entirely **paint-order** (see §5), not
  perspective projection or scale-with-distance. An object further "north"
  on the map is not drawn smaller; it is only ever drawn earlier or later in
  the frame's paint order, which is what produces correct occlusion (a
  building in front of a streetlight hides it; the player always draws over
  ground traffic; drones draw over the player because they're airborne).

**Summary for an artist or an image-generation prompt:** *top-down bird's-eye
ground plane, with buildings rendered as a flat roof card over a flat face
card (not isometric, not a true 3D box), and characters/vehicles rendered as
small ¾-readable top-down figures in 4-way directional sets. No perspective
lines converge; nothing recedes with distance. Think "Kenney RPG Urban Pack" /
classic 16-bit top-down RPG, not "isometric strategy game."*

---

## 2. Gameplay scale

**Master reference: the player.**

| Quantity | Value | Notes |
|---|---|---|
| World unit | 1px at 1× | The coordinate space every table in `world/` is authored in. |
| Display scale | 2× (`SCALE`, `Overworld.tsx`) | Integer pixel-art zoom applied once at paint time — world units are still the authoring unit for every table. `mapshot.html` exposes 0.5×–4× for inspection; gameplay ships at 2×. |
| **Tile unit** | **16×16 world units** (`TILE`, `spritesheet.ts`) | The base grid every Kenney tile is cut to, and the modular unit new pixel-art assets should be authored as multiples/fractions of. |
| **Player — collision box** | **11w × 15h** (`PLAYER_W`/`PLAYER_H`, `Overworld.tsx`) | What movement and collision actually test against. Deliberately shorter than a grown mentor: "fourteen, not a grown mentor's height" per the code comment — the collision box itself encodes the protagonist's age. |
| **Player — drawn sprite** | **16w × 22h** (`CHARACTER_DRAW_SIZE`, `spriteIndex.ts`) | What's actually blitted once the sheet is ready: exactly one tile wide, one tile plus 6px tall (headroom baked into the source tile). This is larger than the collision box — the sprite reads slightly bigger than the hitbox it stands on, which is normal for top-down RPG readability and should be preserved. |

**Everything else, measured against the player:**

| Object | World size (w × h) | Relative to player sprite (16×22) | Source |
|---|---|---|---|
| Ambient NPC / cop (procedural fallback) | ~9×15 (cop), same 16×22 sprite budget as player when sheet-backed | ~1.0× | `drawCop`, `CHARACTER_DRAW_SIZE` |
| Car | 18×12 | 1.1× wide, 0.5× tall | `obstacles.ts` (every `kind:'car'` entry) |
| Crate / barrel | 16×16 | 1.0× wide, 0.7× tall | one tile, flat |
| Bush (sprite) | one tile, scaled to obstacle rect (~16–24 sq) | ~1.0–1.5× | `BUSH_TEAL`/`BUSH_ORANGE` |
| Tree | ~20×40 obstacle rect; sprite version is two stacked 16×16 tiles (canopy over canopy+trunk) | 1.25× wide, 1.8× tall | `TREE_TALL_*`/`TREE_SMALL_*` |
| Bin (dumpster) | ~16×16–20 | ~1.0× | `drawBin` |
| Truck | 40×22 (horizontal) / 22×40 (vertical) | 2.5× long axis | `obstacles.ts` (`kind:'truck'`) |
| Camera housing | 16×16, fixed regardless of location | 1.0× | `drawSabotageCamera`, `size = 16` |
| Drone (quadcopter) | ~12×12 body, hovers ~9px above its ground shadow | 0.75× | `drawDrone`, `armR = 6` |
| Small shopfront building | ~90–110 × 66–80 | ~5.6–6.9× wide, 3–3.6× tall | e.g. `pizza`/`shop` locations |
| House | ~100–130 × 90–100 | ~6.5–8× wide, 4–4.5× tall | e.g. `home`, `220,40,128,100` |
| Large civic building | ~180–210 × 100–130 | ~11–13× wide, 4.5–6× tall | `civic`, `datacenter` |
| Landmark (SafeTrace Tower) | 50×168 | 3× wide, **7.6× tall** | `safetrace_tower` obstacle — deliberately breaks the grid; it's a singular, hand-placed skyline anchor, not a repeatable class |
| Billboard | 40×26 (small) to 130×50 (Plaza pylon) | up to 8× wide | `plaza_pylon`, `commercial_billboard` |
| District block | 472–544 × 316–336 | ~30× wide, ~15× tall | `DISTRICTS` — nine of these tile the 1600×1100 map |

**Street widths** (`ROAD_WIDTH`, `draw.ts`), for scaling street furniture and
judging how big a vehicle should read against the road it sits on:

| Road tier | Width (world units) | ≈ player widths |
|---|---|---|
| Major arterial | 44 | 4× |
| Secondary | 32 | 2.9× |
| Local street | 20 | 1.8× |
| Alley | 11 | ~1× (a player fits, snugly — this is deliberate, see `underTreeCover()`) |
| Path (park/pedestrian) | 6 | narrower than the player |

**Simple scale reference** (all bottom-aligned to a common ground line, world
units, not to display scale):

```
                                                              ▐█▌ 168
                                                              ▐█▌  landmark
                                                              ▐█▌  (tower)
                                                              ▐█▌
                          ▄▄▄▄▄▄▄▄▄▄▄                         ▐█▌
                        ▟███████████▙  ~100  house           ▐█▌
                        █████████████        (incl. roof)    ▐█▌
              ▄▄▄▄       █████████████                       ▐█▌
        🌳   ▟████▙  🧍  █████[door]███                       ▐█▌
   ▂▂   40   ██████  22  █████████████                       ▐█▌
  car  tree  truck  player                house              tower
  18    20    22     16w                  ~110w                50w
```

*(Rough silhouette; not to a single fixed scale — the point is the rank
order: player < car ≈ tree < truck < house-width < house-height <
landmark, which is the order every existing table above already implies.)*

**Character size parity — APPROVED.** The game today draws adult NPCs, cops,
and the player at the **same sprite budget** (16×22, or the same procedural
proportions); only the player's own collision box is deliberately shortened,
and that shortening isn't mirrored in the sprite size. **Decision: Player and
NPCs use the same 16×22 world-space sprite budget initially. No separate
adult/child size system.** This is a starting default, not a permanent
constraint — every `AssetSlot` already declares its own `width`/`height`
independently (§6), so a future character *class* (an adult vs. a kid, a
vehicle-scale character, anything with a real reason to differ) can simply
declare a different box on its own slot without restructuring the manifest
or touching any other slot's dimensions. Nothing in the schema hard-codes
16×22 as a universal ceiling or floor for "character" — it's this run's
measured default for the two slots that exist today
(`character.player`, `character.npc.person`), not a rule the category
itself enforces.

---

## 3. Asset dimensions — standards by category

Every figure below is read off an existing table, not invented. Where a
category has no existing instances to measure (UI icons), that's stated
explicitly and the recommendation is marked accordingly.

| Category | Standard size | Anchor (§4) | Basis |
|---|---|---|---|
| **Character** (player, NPC, cop) | **16w × 22h**, drawn from a 4-direction × 3-frame walk-cycle sheet (12 frames per character) | bottom-center | `CHARACTER_DRAW_SIZE`, `spriteIndex.ts`'s `CharacterSprite` |
| **Small prop** (crate, barrel, bin, bush, single street-furniture item) | **16×16** to **24×24** | bottom-center | crate/barrel/bush tables |
| **Medium prop** (tree, hedge run, bench, playground piece, laundry line, parked car) | **~20×40** (tree) down to **18×12** (car) — medium props span the widest range of any category; author to the specific object's own footprint, not a single fixed box | bottom-center | tree/car/bench tables |
| **Large prop** (truck, bus, patrol van, security gate) | **~22×40** to **44×22** | bottom-center | truck table, `BUS_TILES` (2×3 tiles = 32×48) |
| **Building** (house through large civic) | **90×66** (smallest shopfront) up to **210×130** (largest civic) — always **wider than tall**, roof band ≈ 14–34% of total height | top-left, full bounding rect | `LOCATIONS` table |
| **Landmark building** (singular, hand-placed skyline anchors — tower, billboard) | breaks the modular grid on purpose; SafeTrace Tower is 50×168, the tallest single object in the game | top-left, full bounding rect | `safetrace_tower`, billboard obstacles |
| **Vehicle** (car, truck, bus, patrol van) | car **18×12**; truck **40×22** / **22×40**; bus **32×48** (2×3 tiles); patrol van **~16×10** procedural / 2-tile block sprite | bottom-center (ground footprint) | vehicle tables above |
| **Terrain** (ground, road, sidewalk, curb) | tiled at the **16×16** base unit; road width is per-tier (§2 table) | top-left, tiled fill (no single-object anchor) | `ROAD_WIDTH`, `TILE` |
| **Technology** (camera, plate scanner, security gate, junction box, ATM/phone hack node, drone) | **12×12** (drone body) to **16×16** (camera, most street-hack nodes) — small, fixed-size, deliberately *not* scaled to the location it stands at, because these are point objects, not architecture | center (camera/hack/junction nodes are stored and drawn by center point) | `drawSabotageCamera` (`size = 16`), `drawDrone` (`armR = 6`) |
| **Effect / decal** (Gen A mark, sabotage scar) | drawn to fit whatever surface hosts it (a wall mark scales to the wall it's tagging); the Gen A mark component itself is authored on a **100×100 viewBox** and scaled by its container | explicit origin, per-instance (see `WallMark`'s own `x, y` plus the surface it's keyed to) | `GenAMark.tsx`, `drawGenAMark`/`drawSabotageScar` |
| **UI icon** | **APPROVED — 24×24 base grid.** No existing instances to measure against — HUD iconography today is text/CSS/SVG-drawn inline (`Hud.tsx`), not sourced from image assets at all. 24×24 (matches neither the 16px world tile nor an arbitrary web-icon size, splitting the difference so icons stay crisp at both the in-game HUD scale and a settings/menu scale) is the approved **baseline canvas**, not a fill requirement — an icon's own glyph can and often should sit inside it with transparent padding rather than touch every edge, the same restraint the rest of this game's iconography (see the Gen A mark, §6) already shows. Still not wired into anything this run. | center | none — greenfield |

**Modular sizing rule for new art:** author small and medium props as
multiples of **8px** (half a tile) where the object doesn't already have a
measured footprint above, so anything new sits on the same grid the existing
16px tile system already assumes. Buildings and landmarks are the one
category where the existing table shows genuine hand-tuned variety (no clean
modulus) — match the nearest existing building's proportions rather than
inventing a new footprint size.

---

## 4. Anchor conventions

Every category anchors one of three ways. This has to be exact, because
`draw.ts` positions everything off these anchors with no per-object offset
fields — get the anchor wrong and the object either floats above its shadow
or clips into the ground.

### Bottom-center ("feet") — characters, most props, vehicles

The stored `(x, y)` is the **horizontal center, at ground contact**. The
sprite/shape is drawn so its lowest visible pixel sits at `y`, centered
horizontally on `x`. This is how the player, NPCs, cops, and (via their
obstacle rect's `x + w/2, y + h`) trees, bushes, cars, trucks, and every
other "footprint" object anchor.

```
        ┌────┐
        │    │   sprite extends UP and
        │    │   OUT from the anchor
        │    │
   ─────●────────   ← (x, y) is here: bottom-center
        ↑
      anchor
```

Concretely, for a character: `drawSpriteTile(ctx, frame, cx, feetY -
CHARACTER_DRAW_SIZE.h / 2, w, h)` — the sprite is centered on a point half its
own height *above* the stored feet position, which is the same as saying "the
sprite's bottom edge sits exactly on `y`." A shadow (`ctx.fillRect` a thin
dark bar) is drawn at the same `y`, which is what sells ground contact.

**New character or prop art must be authored with its own ground-contact
point at the bottom-center of its canvas**, with no transparent padding below
that point — the same discipline the existing Kenney tiles already follow (a
tree's canopy floats up and to the sides of its anchor, never down past it).

### Top-left, full bounding rect — buildings and terrain tiles

Buildings store `(x, y, w, h)` as the **entire visual bounding box** — roof
and face card together, from the topmost roof pixel to the ground-line curb
at the bottom. `(x, y)` is the top-left corner of that whole box, not a
footprint-only rect with the roof implicitly extending above it. Terrain
tiles (ground, road surface) tile the same way: top-left origin, filled
edge-to-edge, no gaps.

```
   (x,y) ┌──────────────┐
         │     roof      │ ← roofH (~14px, or ~34% of h for a pitched house)
         ├──────────────┤
         │  face / wall  │
         │   [door]      │
         └──────────────┘ ← curb drawn at y + h
                w
```

**New building art must include the roof card in the same image/frame as the
face card**, sized to the full `w × h` the location table gives it — there is
no separate roof layer to composite in `draw.ts` today, and this run does not
add one (that would be a rendering-pipeline change, not a slot/anchor
convention, and is out of scope — see §8).

### Center — technology nodes, drones, effects

Cameras, plate scanners, junction boxes, street-hack nodes (ATM/phone) and
drones all store and are drawn from their **true center point** — `(x, y)` is
neither the top-left nor the ground contact, it's the geometric middle of the
object, because these are compact point objects with no meaningful "front"
or "base" (a camera is mounted mid-air on a post; a drone hovers). The Gen A
mark and sabotage-scar decals are the exception within this group: they carry
an **explicit per-instance origin** tied to the wall or post they're painted
on (a `WallMark`'s own coordinates), not a generic centering rule — treat
"effect" as always explicit-origin, never inferred.

### Anchor summary table

| Category | Anchor | What `(x, y)` means |
|---|---|---|
| Character (player, NPC, cop) | bottom-center | feet, at ground contact |
| Small/medium/large prop, vehicle | bottom-center | ground footprint center-bottom |
| Building, landmark building | top-left | corner of the full roof+face bounding box |
| Terrain tile | top-left | corner of the tile, tiled edge-to-edge |
| Technology (camera, scanner, gate, junction box, drone) | center | geometric middle of the object |
| Effect / decal | explicit, per-instance | wherever the surface it's painted on says |
| UI icon (proposed) | center | — no existing convention; recommend center so an icon can be scaled without repositioning |

---

## 5. Layering / depth

There is no z-index or depth-sort field anywhere in this codebase — depth is
**entirely determined by paint order** inside `drawTown()`. This is the
authoritative order, transcribed directly from the function body
(`world/draw.ts`, top-level `drawTown`), because a slot system that doesn't
respect this order will produce visibly wrong occlusion the moment a
placeholder or real asset is swapped in.

```
 1. Sky (gradient wash, drawn in screen space before the world transform)
 2. Ground fill + district ground tint
 3. Roads (surface, then lane/edge lines)
 4. Edge geography (river, rail — decorative, non-solid)
 5. Language-B "pocket" glow (under every warm/resistance location, skipped for cameras)
 6. Streetlight glow (fixed points, pre-authored)
 7. Obstacles (trees, bushes, rocks, hedges, fences, cars, bins, background
    buildings, crates, barrels, the SafeTrace Tower, billboards, scanners,
    gates, benches, playgrounds, trucks, laundry lines) — plus any active
    "sparkle" overlay on a hidden-pickup bush
 8. Locations (real, interactive buildings) — "here" location gets its
    highlight ring in the same pass
 9. Ambient NPCs (people, dogs, cats, birds)
10. The player's own sabotage scars (paint on a post) — drawn UNDER any
    camera that might currently occupy the same spot
11. Dead cameras (already-sabotaged-by-someone-else) + the Gen A marks
    painted near them
12. Live, dismantlable cameras
13. Street-hack nodes (ATM / phone / building)
14. Junction boxes
15. Patrol detection rings (ground-level danger-zone wash), THEN patrol vans
    themselves — ring always under the vehicle that casts it
16. Cop detection rings, THEN cops on foot — same ring-under-body rule
17. Drone ground shadows, THEN drone detection rings
18. THE PLAYER
19. Drone bodies (airborne — the ONE exception to "player always on top":
    drones render after/above the player because they occupy airspace, not
    the ground plane the "player always wins" rule governs)
20. Home-interior mask overlay (only while `confinedToHome` — painted over
    everything, including the player, so only what lines up behind an actual
    window shows through)
```

**The rules worth stating explicitly, because they're easy to violate by
accident when wiring in a new asset:**

- **Ground → objects → characters → player → airspace**, in that order, is
  the whole system. Anything that isn't airborne draws before the player;
  the player draws before anything airborne.
- **A danger zone's ring always draws before the thing casting it** (patrol
  vans, cops, drones) — the ring must never appear to "pop in" on top of an
  already-visible vehicle.
- **Paint on a surface draws before the hardware that might be mounted on
  that surface** (a scar under a live camera).
- **Decorative/background layers never draw over interactive ones.**
  Obstacles (§7 in the list above) draw before real locations specifically so
  a background filler building never occludes a real, tappable one.
- **There is exactly one exception to "ground layer before player": airborne
  objects.** No other category should ever be added above the player without
  a similarly explicit reason (the way drones have one: they aren't on the
  ground).

A future asset-slot renderer (Run 2+) that composites real images instead of
procedural shapes must preserve this exact ordinal list — the slot manifest
(§6) carries a `layer` field for this reason, keyed to the numbered steps
above, so nothing has to be re-derived by reading `draw.ts` a second time.

---

## 6. The asset-slot system

This is the mechanism this run actually ships: a typed manifest of every
asset **class** the game currently draws (not one entry per map instance —
there are hundreds of trees and five of them is plenty to prove the system),
paired with a loader that will draw real art when it exists and a
correctly-sized, anchor-marked placeholder when it doesn't.

- **`src/art/manifest.ts`** — the manifest. One `AssetSlot` entry per class
  of thing this bible defines above (`character.player`, `prop.tree.tall`,
  `building.house`, `vehicle.car`, `technology.camera`, `effect.genA-mark`,
  …). Each entry carries: `id`, `category`, `label`, `description`,
  `width`/`height` (§3), `anchor` (§4), `layer` (§5's ordinal), an optional
  `frames` block for animated/directional sheets (characters), and a
  `sourceRef` pointing at the exact `draw.ts` function or table it
  documents, so the manifest can never silently drift from the renderer it
  describes.
- **`src/art/assetLoader.ts`** — given a manifest entry, tries to load a real
  image from `public/art/<id>.png`; if the file is absent (the expected state
  for every slot this run), it draws a **procedural placeholder at the
  entry's exact declared dimensions**: a checkerboard fill in a category-coded
  color, the slot's `id` and `w×h` printed across it, and a crosshair marking
  the anchor point. This is the literal meaning of "correctly sized
  placeholders" — when real art lands later, it drops into the same
  `public/art/<id>.png` path at the same declared size and nothing else has
  to change.
- **`src/art/manifest.test.ts`** — validation tooling (Vitest, same
  convention as every other `.test.ts` in this repo): every `id` is unique
  and kebab-case-with-dots, every `width`/`height` is a positive integer,
  every `layer` is one of the 20 ordinals in §5, every `frames` block (where
  present) has `cols/rows` consistent with `width`/`height`, and every
  `sourceRef` string is non-empty (a manual, not automated, trace back to the
  renderer — automated cross-checking against `draw.ts`'s actual call sites
  is future work, not this run's).
- **`assetgallery.html` / `src/dev/AssetGallery.tsx`** — the placeholder
  visual test scene, a third Vite dev-only entry alongside `mapshot.html`,
  same "never ships to `dist/`" guarantee. Renders every manifest slot,
  grouped by category, at 1×/2×/4×, each with its anchor point marked and its
  id/dimensions/layer printed underneath — the page a reviewer opens to
  sanity-check the whole manifest at a glance, and the page a future artist
  or image-generation pipeline uses as a live spec sheet.

**This run does not touch `draw.ts`'s existing call sites.** The manifest,
loader, gallery, and validator are additive and inert with respect to the
live game — `drawTown()` still draws everything procedurally today, exactly
as it did before this run. Wiring individual `draw*` functions over to
`assetLoader`-backed slots (so real art actually starts appearing in the
live game) is Run 2 production work, requires the actual art, and is
explicitly **not** part of this milestone.

---

## 7. Dev tooling this run adds

| Tool | Purpose | Pattern matched |
|---|---|---|
| `assetgallery.html` + `AssetGallery.tsx` | Visual gallery of every manifest slot at correct size, with anchor markers | `mapshot.html` / `MapShot.tsx` |
| `src/art/manifest.test.ts` | Manifest self-consistency (unique ids, valid dimensions, valid layer ordinals, valid frame math) | every other `*.test.ts` in the repo, run by `npm test` |
| `scripts/check-assets.mjs` | CLI report: every slot, its declared size/anchor/layer, and whether `public/art/<id>.png` exists yet (placeholder vs. real) | `scripts/check-connectivity.mjs` |

---

## 8. Explicitly out of scope for Run 1

Per the run brief, and restated here so a reviewer can check the branch
against it directly:

- No finished custom artwork ships.
- No change to `draw.ts`'s live rendering — the procedural renderer remains
  the one the game actually plays with.
- No perspective or visual-direction change — none was found to be
  necessary, and §1 states that explicitly rather than silently.
- Two open questions this audit surfaced (character size parity, §2; the UI
  icon base grid, §3) have since been **approved** at the Run 1 review
  checkpoint — see `docs/art/genalpha-art-pipeline-run1-review.md` for the
  checkpoint record and `docs/art/genalpha-character-animation-architecture.md`
  for the one design question the checkpoint left open (how a manifest slot's
  declared `frames` block should actually be sliced and animated) — a design
  recommendation only, not yet implemented.

Run 2 (finished asset production) begins only on separate, explicit
authorization.
