# Run 2A — Art Pilot Review

**Status: pilot complete, awaiting decision.** Ten representative assets, one
per required category, produced and dropped into the asset-slot pipeline to
answer one question before any further production: *does this art direction
actually look like the game we want?* This document is that answer, plus a
GO / ADJUST / STOP recommendation. **No further production assets have been
made beyond these ten.** `world/draw.ts` was not touched; nothing here is
wired into the live game (see the art bible §6/§8 — that's still true).

---

## 1. The assets produced

| # | Slot id | Category | What it demonstrates |
|---|---|---|---|
| 1 | `character.player` | character | The player's own 4-direction, 3-frame walk sheet |
| 2 | `character.npc.person` | character | Skin/palette reuse of the same sheet mechanism |
| 3 | `prop.crate` | small-prop | A filled, chunky static prop |
| 4 | `prop.tree.tall` | medium-prop | The single most common prop in the whole map |
| 5 | `vehicle.car` | vehicle | Player-to-world scale reference against real traffic |
| 6 | `building.house` | building | The roof-card/face-card convention, at its default footprint |
| 7 | `terrain.ground` | terrain | A tileable base surface |
| 8 | `technology.camera` | technology | The surveillance network's own visual signature |
| 9 | `effect.gen-a-mark` | effect | The game's single most narratively important symbol |
| 10 | `ui-icon.generic` | ui-icon | The one approved-but-unused UI category |

**Prop selection note:** the brief asked for "one small prop" and "one
larger prop." `prop.crate` (small-prop, 16×16) and `prop.tree.tall`
(medium-prop, 20×40) were picked over the manifest's only `large-prop` slot
(`prop.playground`, 60×40) deliberately — a tree is the single
highest-frequency object on the entire map (dozens of instances across
every district) and by far the most informative pick for "does the prop
language work," where the playground is a singular, one-off landmark. This
is a scope choice, not a deviation from the brief's intent.

**Production method — stated up front because it matters for the
recommendation below:** no external art tool or image-generation model was
available in this environment. All ten assets were produced by
`scripts/generate-pilot-art.mjs`, a Playwright-driven script that draws with
the browser's real `<canvas>` 2D API — the same primitives and the same
real hex values as `world/draw.ts`'s own `PALETTE` — and exports the result
as a PNG. This is procedural/programmatic pixel art, not hand-illustration
and not AI-generated art. It's a legitimate continuation of this game's own
established "shapes and light" technique (see the art bible §1's audit of
the live renderer), not an ad hoc substitute — but it is a specific
production *method* with its own strengths and limits, and §5/§7 below are
about exactly where those limits showed up.

---

## 2. Source / output paths, dimensions, anchors

All output paths match the manifest's own `public/art/<id>.png` convention
exactly (`src/art/assetLoader.ts`'s `assetPath`) — no path deviation.

| Slot id | Source | Output | Dimensions | Anchor |
|---|---|---|---|---|
| `character.player` | `scripts/generate-pilot-art.mjs` (`drawCharacterSheet`) | `public/art/character.player.png` | 48×88 (3×16 cols, 4×22 rows) | bottom-center |
| `character.npc.person` | same script (`drawCharacterSheet`, alt shirt color) | `public/art/character.npc.person.png` | 48×88 | bottom-center |
| `prop.crate` | same script (`drawCrate`) | `public/art/prop.crate.png` | 16×16 | bottom-center |
| `prop.tree.tall` | same script (`drawTree`) | `public/art/prop.tree.tall.png` | 20×40 | bottom-center |
| `vehicle.car` | same script (`drawCar`) | `public/art/vehicle.car.png` | 18×12 | bottom-center |
| `building.house` | same script (`drawHouse`) | `public/art/building.house.png` | 130×96 | top-left |
| `terrain.ground` | same script (`drawGroundTile`) | `public/art/terrain.ground.png` | 16×16 | top-left |
| `technology.camera` | same script (`drawCameraDevice`) | `public/art/technology.camera.png` | 16×16 | center |
| `effect.gen-a-mark` | same script (`drawGenAMarkClosed`) | `public/art/effect.gen-a-mark.png` | 100×100 | explicit |
| `ui-icon.generic` | same script (`drawUiIcon`) | `public/art/ui-icon.generic.png` | 24×24 | center |

Every dimension and anchor is copied verbatim from `src/art/manifest.ts` —
none were adjusted, re-measured, or second-guessed during production. All
ten were authored at their exact **native** declared resolution (no
higher-resolution source downscaled at draw time), the simplest and least
ambiguous choice per the architecture doc §3.

**`check-assets.mjs`, re-run after production:**

```
10 real, 51 placeholder, 61 total.
```

Exactly the ten above; every other slot is still an unbacked placeholder,
as expected.

---

## 3. Animation frame layout

`character.player` and `character.npc.person` are both 3-column × 4-row
sheets, exactly matching their existing `manifest.ts` `frames` declaration
(`{cols: 3, rows: 4, directions: ['left','down','up','right']}`) — no
schema change, no deviation. Row order top-to-bottom is `left, down, up,
right`; column order left-to-right is the 3-frame stride (`frame 0` =
mid-step one way, `frame 1` = neutral/together, `frame 2` = mid-step the
other way).

**"Idle" needed no separate art.** Per `animation.ts`'s own
`frameColForTime` (`Math.floor(cols / 2)` when not moving), frame 1 — the
sheet's middle column — already *is* the idle pose; it was never drawn as a
distinct asset, only as the neutral midpoint of the same 3-frame stride.
This was verified conceptually against `frameForCharacter`'s real behavior,
not just asserted — the same function the animation-infrastructure
checkpoint's own tests exercise resolves `{col: 1, row: N}` for a
standing-still character on this exact sheet shape.

---

## 4. Deviations from the Art Bible

**None.** Every dimension, anchor, and layer assignment matches
`src/art/manifest.ts` exactly, which in turn matches the art bible's own
measured tables. No PROPOSED changes are being made to the art bible as a
result of this pilot — see §7: the gap this pilot surfaced is in
**production quality/method** for one category, not in the **architecture**
(dimensions, anchors, perspective, layering) that category sits inside.
That's a meaningful distinction to hold onto, per the instruction not to
conflate the two: nothing here asks for a different box, a different
anchor rule, or a different paint-order layer. It asks for a different way
of filling the box that's already correctly sized and correctly placed.

---

## 5. What worked

- **The roof-card/face-card building convention reads immediately and
  correctly.** `building.house` produces an unambiguous house silhouette —
  roof, wall band, a lit and an unlit window, a centered door, a chimney —
  on the first attempt, with zero fighting against the declared 130×96 box.
  This is the strongest single validation in the pilot: the art bible's
  most structurally important convention (§1) holds up in practice, not
  just on paper.
- **The prop language matches the existing renderer almost exactly**,
  because it uses the literal same construction (`prop.tree.tall`: a dark
  canopy circle, a lighter offset highlight circle, a trunk rect — the
  same three-shape recipe `draw.ts`'s own procedural `drawTree` fallback
  uses). A tree dropped into the live game today would be visually
  continuous with the ones already there.
- **The Gen A mark is the standout asset.** Reproducing `GenAMark.tsx`'s
  exact "closed"-state path data (§ generator script) rather than
  inventing new mark geometry paid off directly — the pixel version is
  instantly recognizable as the same symbol, misregistration plate and
  all. Reusing an already-approved design, rather than reinterpreting it,
  is the reason this one needed no iteration.
- **The technology silhouette (camera) is clear and on-palette** — the
  lens, the housing, and the recording light all read at 16×16, using the
  same blue/dark-lens/red-light relationship `draw.ts`'s own
  `drawSabotageCamera` already established.
- **Anchors and layering required zero rework.** Every asset dropped into
  its declared anchor point cleanly in the gallery (§8's screenshot) — no
  asset needed its anchor rule adjusted to look right, which is real
  evidence the anchor conventions (§4 of the art bible) are correctly
  specified, not just internally consistent on paper.
- **The whole set reads as one palette family.** Because every color used
  is a literal copy of a `world/draw.ts` `PALETTE` hex value (not
  eyeballed or re-picked), nothing in the pilot clashes with anything
  else, or with the town itself — the "one game" test (the brief's most
  important ask) passes for hue and value, even where a specific asset's
  *shape* quality is weak (§6).

## 6. What did not work

- **The player and NPC character sheets are the pilot's clear weak point,
  and characters are the highest-stakes category in the game** — the
  player is on screen essentially 100% of playtime. Specific problems,
  visible at 4x/8x inspection (§8):
  - **Left/right facing is barely distinguishable from each other.** The
    only differences are a 3px cap-brim shift and a single eye-dot moving
    one pixel — too subtle to read at gameplay scale and speed. A player
    watching their own character turn around would likely not notice.
  - **The stride/walk cycle is nearly invisible.** The leg color (the
    game's own `outline` navy, `#20262f`) has too little contrast against
    a dark ground, and the per-frame leg offset is only 1px — the walk
    reads as a flicker, not a stride, at native or even 2x scale.
  - **Arms read as body tabs, not limbs.** Flat 1px-wide vertical bars in
    the shirt color don't separate visually from the torso block they're
    attached to.
  - **The silhouette is generic** — a head-block over a body-block with no
    distinguishing shape, hairstyle, or proportion choice beyond what's
    already implied by the 16×22 box itself. It doesn't yet look like
    *this* game's protagonist specifically, the way the game's other
    hand-considered elements (the Gen A mark, the SafeTrace tower, the
    dusk palette) already do.
  - This is a **production-method finding, not an architecture finding**
    (§4): the 16×22 budget is not the constraint — Kenney's own
    off-the-shelf character sprite already proves a readable, directional,
    animated character fits in exactly this box. The gap is that
    programmatic rectangle-and-arc placement, done by this process without
    genuine pixel-art or character-design skill behind it, doesn't reach
    the bar real character art (hand-drawn, AI-generated, or a licensed
    pack) would.
- **`vehicle.car` and `terrain.ground` are functional but visually
  inert.** Both read correctly (a car, a ground tile) but contribute
  nothing distinctive — flat fills with a glass rectangle, flat fill with
  six speckle pixels. Lower stakes than the character problem (a parked
  car and a ground tile are background elements, not a screen-filling
  focal point), but worth naming: at full production scale, a whole map of
  this exact car and this exact ground tile would read as *plain* rather
  than *deliberately minimal* — there's a real difference between the two,
  and this pilot's versions land on the wrong side of it.
- **The house's chimney placement is slightly awkward** — it sits close
  enough to the roof ridge that the two-tone roof shading reads as
  intersecting it rather than sitting behind it. A minor fix (nudge the
  chimney a few pixels off the ridge line, or draw it before the roof's
  second shading pass), not a structural problem.

## 7. Recommended adjustments

None of these are art bible changes — restated from §4 so it can't be
misread: **no dimension, anchor, layer, or perspective rule is being
proposed for change.** These are production-method and per-asset notes for
whoever does the next pass:

1. **Characters need a different production method before Run 2B.**
   Programmatic canvas generation validated the *mechanism* (the sheet
   slices and animates correctly — see §3, and the animation-infrastructure
   checkpoint's own 21 tests) but not the *art*. Recommend one of: a human
   pixel artist for just the character category, an image-generation pass
   evaluated specifically for 16×22 directional character sheets, or —
   lowest-risk — adapting art from an existing CC0/licensed asset pack the
   way `world/spritesheet.ts` already does for tiles today. Whichever is
   chosen, the fix should specifically target: stronger left/right
   differentiation, higher-contrast limb color against dark ground, and a
   silhouette with at least one distinguishing feature.
2. **`vehicle.car` and `terrain.ground` would benefit from one more
   detail pass** (a windshield split line and wheel hint for the car; a
   second, coarser noise layer or a crack/patch detail for the ground) —
   low effort, meaningfully raises "deliberate" over "empty."
3. **Nudge `building.house`'s chimney** a few pixels toward the eave, off
   the roof ridge line.
4. **Keep everything else as-is.** `prop.crate`, `prop.tree.tall`,
   `technology.camera`, `effect.gen-a-mark`, and `ui-icon.generic` need no
   changes to proceed into full production at their current quality bar.

---

## 8. Screenshots — the gallery as primary QA surface

**Full pilot, all 61 slots, real art visible against the remaining
placeholders** (`assetgallery.html?scale=2&category=all&markers=1`):
`docs/art/genalpha-art-pilot-review-gallery.png`. This is the direct visual
record of scale, anchor placement, and category organization for all ten
pilot assets in context — `building.house`, `prop.tree.tall`, and
`effect.gen-a-mark` are immediately visible as real, textured images
against the surrounding checkerboard placeholders; the anchor crosshairs
land exactly where each category's convention says they should (bottom-
center at the feet/base for characters, props, and the tree; top-left at
the building's own corner; center on the camera and the icon).

**Close inspection of the character sheet at 4x**, cropped from
`assetgallery.html?scale=4&category=character`, and a further hand-upscaled
8x detail view of `character.player.png` alone (not through the gallery —
direct pixel inspection) are both referenced from this review;
the second is saved at `docs/art/genalpha-art-pilot-character-detail.png`
and is the image §6's character critique is written against.

---

## 9. Recommendation: **ADJUST**

Not GO, not STOP.

**Why not STOP:** six of the pilot's ten categories (buildings, props,
terrain, technology, effects, UI icons) validated cleanly on the first
attempt, using the existing palette and the existing structural
conventions with zero art-bible rework needed. The architecture — dimensions,
anchors, layering, the manifest-as-source-of-truth workflow, the animation
mechanism — is proven, not just on paper but by ten real files rendering
correctly in the real gallery. There is no foundational problem here.

**Why not GO:** the character category — the single most-seen asset in
the entire game — is not yet at a quality bar worth scaling to every NPC
skin, cop, and future customization option. Producing 50 more assets before
fixing the one category everyone will stare at for the whole game would be
optimizing for "assets done" over "does this look like the game we want,"
which is exactly the failure mode this checkpoint exists to catch.

**What ADJUST means concretely:** the non-character pilot assets
(`building.house`, `prop.crate`, `prop.tree.tall`, `vehicle.car`,
`terrain.ground`, `technology.camera`, `effect.gen-a-mark`,
`ui-icon.generic` — 8 of 10) are approved to serve as the production
reference for their categories going into full Run 2B, with the two minor
touch-ups noted in §7 (car/ground detail pass, chimney nudge) optional
rather than blocking. `character.player` and `character.npc.person` need a
second pass — same manifest slot, same 16×22/3×4 sheet shape, same anchor
— before any of the remaining character-class assets (cop, the five other
NPC skins, any future customization option) are produced, per §7.1's
recommendation on production method.

---

## 10. Validation

Run fresh after producing the pilot assets, from `static/` on branch
`claude/genalpha-asset-pipeline-run1-ygjb51`:

| Check | Result |
|---|---|
| `npm test` (full suite) | **666 / 666 passed**, 42 files |
| `npx vitest run src/art/` (isolated: manifest + animation) | **88 / 88 passed** (67 manifest + 21 animation) |
| `npm run typecheck` (`tsc --noEmit`) | **clean, no errors** |
| `npm run build` (`tsc -b && vite build`) | **succeeds**; output JS hash identical to before the pilot (no code reachable from the game's entry point changed); `dist/art/` carries the 10 new PNGs as static files (expected — `public/` ships as-is — and still unreferenced by any live code) alongside `NOTICE.txt`; no `mapshot.html`/`assetgallery.html` in the output |
| `node scripts/check-assets.mjs` | **10 real, 51 placeholder, 61 total** — exactly the ten pilot assets, zero orphaned files |

Nothing failed. No test, typecheck, or build change was needed to
accommodate the pilot art — it dropped into the existing loader/manifest/
gallery pipeline exactly as the Run 1 and animation-infrastructure
checkpoints said it would.

**`world/draw.ts`: untouched.** No gameplay, movement, map composition,
progression, perspective, or renderer change was made or is proposed.
