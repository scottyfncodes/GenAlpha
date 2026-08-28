# GenAlpha Art Production Handoff

**Status: Run 2A complete and fully approved. Ready for external art
production. Run 2B (mass asset production) remains blocked pending actual
production assets and a visual approval checkpoint.**

This document is the minimum an external artist or an image-generation
workflow needs to execute GenAlpha's approved character art. It
consolidates decisions already made and documented in detail elsewhere —
read the linked documents for the full reasoning; this page exists so
nobody has to assemble that picture from five files themselves.

**Source documents** (this handoff summarizes; it does not replace them):

- `docs/art/genalpha-art-bible.md` — perspective, scale, anchors, layers,
  dimension standards for every asset category, derived from the live
  renderer.
- `docs/art/genalpha-character-animation-architecture.md` — the approved
  spritesheet/animation mechanism (`src/art/animation.ts`,
  `src/art/assetLoader.ts`), implemented and tested.
- `docs/art/genalpha-art-pipeline-run1-review.md` — the Run 1 checkpoint
  record (manifest, loader, gallery, validation tooling).
- `docs/art/genalpha-character-art-rnd-review.md` — the three explored
  character directions and why Direction A was chosen.
- `docs/art/genalpha-character-production-brief.md` — the full, detailed
  construction spec for Direction A. **This is the primary brief an
  artist actually executes against; read it in full before producing
  anything.** This handoff summarizes its headlines only.

---

## 1. APPROVED

Locked. Not open for reinterpretation by a production pass.

- **Perspective** — top-down ground plane; buildings as a flat roof-card
  over a flat face-card (not isometric, not a 3D box); characters as
  4-direction top-down figures. (`genalpha-art-bible.md` §1)
- **Scale system** — the player is the master reference: 16×22 drawn
  sprite over an 11×15 collision box; `TILE = 16` world units is the base
  grid every other category is measured against. (`genalpha-art-bible.md`
  §2)
- **Anchors** — bottom-center (feet) for characters/props/vehicles/
  landmarks; top-left (full bounding box) for buildings/terrain; center
  for technology nodes; explicit per-instance for effects.
  (`genalpha-art-bible.md` §4)
- **Layers** — `drawTown`'s fixed 20-step paint order (ground → objects →
  characters → player → airspace). (`genalpha-art-bible.md` §5)
- **16×22 character budget** — confirmed viable by both the Run 2A pilot
  and the character R&D pass; no readability problem found in either
  traced to insufficient pixel space.
- **Direction A character language ("Soft Chibi")** — large rounded head
  (~half total height), soft capsule torso, direction-specific hair
  silhouette, minimal facial vocabulary. Full spec:
  `genalpha-character-production-brief.md`.
- **4-direction spritesheet architecture** — 3 columns (walk-cycle frames,
  frame 1 = idle) × 4 rows (`left, down, up, right`), sliced by
  `src/art/assetLoader.ts`'s `drawAssetSlot`/`resolveFrameSourceRect` from
  a slot's declared `frames` grid. Implemented, tested (88 tests across
  `manifest.test.ts` + `animation.test.ts`), not wired into
  `world/draw.ts`.
- **24×24 UI icon baseline** — a baseline canvas, not a fill requirement;
  transparent padding is expected. (`genalpha-art-bible.md` §3)

---

## 2. NOT APPROVED

- **The current procedural character execution as final art.** The Run
  2A pilot's `character.player.png`/`character.npc.person.png` and every
  Direction A/B/C R&D image are reference material only — proof of
  concept, not shippable pixels. None of them ship as-is.
- **Direction B ("Stencil/Graphic").** Did not survive at 16×22 — reads
  as a plain figure with a visor rather than the angular silhouette it
  attempted. Not to be revisited for the player; may be worth reconsidering
  for a specific adult/antagonist character later, as its own separate
  design question. (`genalpha-character-art-rnd-review.md` §5, §7)
- **Any alternate perspective.** None was found necessary at any
  checkpoint; the live renderer's existing top-down/roof-card convention
  is the approved and only perspective.
- **Any renderer rewrite.** `world/draw.ts` has been verified untouched at
  every checkpoint since Run 1 and stays that way through this handoff.
- **Mass production before visual approval.** No further character assets
  (other NPC skins, the cop, any variant) and none of the remaining 51
  non-character manifest slots are produced until real production art
  passes the QA checkpoint (§5) and is explicitly authorized.

---

## 3. Production requirements

Full detail in `genalpha-character-production-brief.md` §1–§13; headline
requirements only, here:

- **Player spritesheet:** one file, `character.player.png`. **3 columns ×
  4 rows, 48×88px at native 1× authoring** (higher native resolution is
  fine — see below — as long as the total sheet stays an exact multiple of
  the 3×4 grid). Row order fixed: `left, down, up, right`. Column order:
  any consistent stride progression with the middle column (col 1) as the
  idle/neutral pose.
- **NPC spritesheet(s):** same construction, same grid, one additional
  file per skin variant (`character.npc.person.png` plus, if producing
  more than one skin in this pass, e.g. `character.npc.person.skin-2.png`
  — coordinate additional ids with the manifest before producing more than
  the two skins currently declared). Variation between skins is **color
  only** (clothing/hair) — proportions and silhouette stay identical to
  the player. Recommended first-pass variety: 5–6 skins, matching the
  game's existing convention.
- **Idle:** frame 1 (the middle column) of the same 3-frame cycle — no
  separate idle asset. Design it as a deliberate standing pose, not a
  mathematical midpoint.
- **Walk cycle:** 3 frames, symmetric around the idle frame; legs must
  visibly change position/length frame to frame (not just shift the whole
  sprite); arm swing opposes the same-side leg if arms are drawn.
- **Native-size readability:** every frame must be legible — silhouette,
  direction, and limb/outline contrast all judged — at actual 16×22 pixels,
  unscaled.
- **Gameplay-scale readability:** judged at 2× (`Overworld.tsx`'s real
  `SCALE`), in context next to other approved assets (the Run 2A pilot's
  `prop.tree.tall.png`/`vehicle.car.png`), not alone against a blank
  background.
- **Limb-contrast minimum (hard requirement):** limb color must be clearly
  distinct from both `PALETTE.outline` (`#20262f`) and the `PALETTE.ground`
  family (`#3d4759`–`#434e61`) — the pilot's headline failure, and the one
  rule production art will be rejected outright for violating.
  (production brief §6, §14.3)
- **Silhouette/direction requirements:** all four directions must be
  identifiable from a flattened, solid-black silhouette alone. This is the
  pilot's other headline failure and is graded as pass/fail, not a nice-
  to-have. (production brief §3, §14.1)
- **Transparent background required.** Every character frame is a
  standalone sprite composited over the game's own ground/scenery — no
  background fill, no ground shadow baked into the sheet as an opaque
  layer (a soft drop-shadow *is* acceptable if it's transparent-alpha, not
  a filled rect).
- **Native resolution is the artist's choice.** `assetLoader.ts` derives
  each frame's source rectangle from the delivered file's own decoded
  pixel size divided by the declared 3×4 grid — a sheet authored at 2× or
  4× (96×176, 192×352) and downscaled at draw time works identically, as
  long as the grid divides the sheet evenly. Do not deliver a sheet whose
  total dimensions aren't a clean multiple of 3×4.
- **Naming/output convention:** exactly `<manifest-slot-id>.png` (e.g.
  `character.player.png`), placed at `public/art/<id>.png` — matching
  `src/art/assetLoader.ts`'s `assetPath` exactly, case-sensitive, no
  suffixes. Do not deliver into `docs/art/rnd/` (R&D/reference only) or
  invent a new path convention.

---

## 4. Visual target

**Direction A, "Soft Chibi," in one paragraph:** a warm, rounded,
kid-proportioned figure — head close to half the total height, a soft
capsule torso in a two-tone jacket color, short stubby limbs, and a hair
silhouette that does most of the work of signaling which way the character
faces (a front fringe/swoop when facing the camera, a solid dark mass
covering the whole head from behind, an asymmetric side-swoop in profile).
Faces only appear on the camera-facing row — two dot eyes and a small
mouth mark, nothing more; every other direction has no facial detail at
all. It should read as approachable and specifically youthful — a
protagonist a player would believe is fourteen, not a generic RPG mascot.

**Reference images** (language reference only — proof the proportions and
silhouette rules work, not source pixels to trace or upscale):

- `docs/art/rnd/direction-a-soft-chibi-player.png` — the full 3×4 sheet.
- `docs/art/rnd/direction-a-soft-chibi-npc.png` — the same construction,
  one different jacket color, demonstrating the skin-variant rule.
- `docs/art/rnd/direction-a-soft-chibi-gameplay-scale.png` — the reference
  composition for gameplay-scale judgment (character at real 2× next to
  the approved tree and car).

**Explicit characteristics to preserve:**

- The head:body ratio (~half height) and the soft, rounded shape language
  throughout — no hard rectangular edges on the body or limbs.
- Hair silhouette carrying facing direction, especially the unbroken
  solid-mass treatment for the back-facing ("up") row, which is the
  single clearest directional read across everything produced so far.
- Two-tone, palette-disciplined color blocking (2–3 blocks beyond skin/
  hair) — colors pulled from `world/draw.ts`'s existing `PALETTE` wherever
  a suitable value already exists.
- A genuinely designed idle pose and a walk cycle where limbs visibly
  move, not just the whole sprite shifting.

**Explicit failure modes to avoid** (each traced to a documented,
already-observed failure — full list with reasoning in production brief
§18):

- Left/right facing differing only by a 1–3px detail nudge instead of a
  real silhouette change (the pilot's own failure).
- Limb color matching or nearly matching the outline color or the ground
  tones (the pilot's other headline failure).
- Flat, unrounded 1px-wide arms that read as body tabs, not limbs.
- Attempting an angular/sharp-edged silhouette at this pixel budget
  (Direction B's failure — the detail needed doesn't survive 16×22).
- Facial features (eyes/mouth) on any row but the camera-facing one.
- Varying NPC proportions or silhouette per skin instead of color only.
- Using the Gen A mark's own colors (`#e6402a`/`#2b4ed8`) as a character
  accent without separate narrative sign-off.

---

## 5. QA checkpoint

**No final character asset is accepted until it passes all eight of
these** (full detail and rationale: production brief §14–§16):

1. **Native-size readability** — legible, no stray/noise pixels, at
   actual 16×22, unscaled.
2. **Four-direction readability** — all four directions identifiable from
   a flattened solid-black silhouette alone.
3. **Idle/walk distinction** — the 3-frame cycle reads as continuous
   motion in sequence, not a flicker or a static pose with noise; idle
   (frame 1) reads as a deliberate standing pose.
4. **Silhouette readability** — the rounded/soft shape language and
   head:body proportion are consistent across every direction and frame.
5. **Limb contrast** — limb color visibly distinct from both the outline
   color and the game's ground tones (§3's hard minimum).
6. **Anchor correctness** — no transparent padding below the lowest foot
   pixel; the sprite's bottom edge sits exactly on the frame's bottom row,
   horizontally centered on the idle frame.
7. **Spritesheet correctness** — exact 3×4 grid, correct row order
   (`left, down, up, right`), total sheet dimensions an even multiple of
   the grid, filename matching the manifest slot id exactly.
8. **Gameplay-scale evaluation** — judged at 2×, in context next to the
   approved tree/car reference, both as a static frame and cycling the
   walk at ~150ms/frame.

A production asset that fails any one of these eight is not accepted,
regardless of how it looks on the others.

---

## 6. What happens next

External art production (a human pixel artist or an image-generation
workflow, working from `genalpha-character-production-brief.md` and this
handoff), producing real files for `public/art/character.player.png` and
`public/art/character.npc.person.png` (plus any additional NPC skins
coordinated against the manifest first). Those files then go through the
§5 QA checkpoint. Only after that checkpoint passes does Run 2B — the
remaining 51 non-character assets — get authorized, separately.

**Nothing in this document changes any file outside itself.**
`world/draw.ts`, the Art Bible, the animation architecture, and every file
under `public/art/` remain exactly as they were before this handoff was
written.
