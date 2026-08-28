# Character Art R&D Review

**Status: exploration complete, awaiting a CHARACTER STYLE decision.** Three
substantially different character directions, produced to find a visual
language for GenAlpha's player and NPCs — not "a better rectangle," an
actual design language — after the Run 2A pilot's own character sheets were
explicitly rejected as not production-quality. **No mass production has
happened.** Only these three directions' player/NPC/gameplay-scale examples
exist; `public/art/character.player.png` and
`public/art/character.npc.person.png` (the Run 2A pilot's weak originals)
are untouched — nothing here overwrites them, and nothing here is counted
as "real art" by `check-assets.mjs` (see §6). `world/draw.ts` was not
touched.

---

## 1. Production method — checked before anything else was drawn

Per the brief: *"If a better source/production method is available in the
environment, evaluate it. If no better art-generation capability is
available, STOP after documenting the limitation rather than pretending
procedural output is production-ready."*

**Checked, via `ToolSearch`, for any image-generation or art-source
capability in this environment — none exists.** The only external
capabilities available are GitHub, Vercel, Spotify, and Uber Eats MCP
connectors, plus this session's standard coding tools. There is no
DALL-E/Stable-Diffusion/Midjourney-class tool, no licensed art-asset
search, and no way to commission or fetch existing character art. The
`design` skill produces HTML/CSS artboards (mockups, layouts) — not raster
pixel-art sprite sheets with per-pixel control, and not a fit for a 16×22
directional character grid.

**Conclusion: no better production method is available.** Per the brief's
own instruction, this is stated plainly rather than worked around by
lowering the bar. What follows is the best result achievable with the one
method available (real `<canvas>` 2D drawing, the same primitives and real
palette `world/draw.ts` already uses) — produced with substantially more
design intent than the Run 2A pilot's rushed rectangles, and judged
honestly against the brief's actual criteria in §5, not against how much
better it is than the pilot. "Better than the pilot" and "production-ready"
are not the same claim, and §7's recommendation does not conflate them.

**Script:** `scripts/generate-character-rnd.mjs`. **Output:**
`docs/art/rnd/direction-{a,b,c}-*-{player,npc,gameplay-scale}.png` — nine
files, none in `public/art/`.

---

## 2. The three directions

All three share the same hard technical constraints, unchanged: 16×22
world-space budget, 4 directions (row order `left, down, up, right`,
matching `manifest.ts`'s existing `frames.directions`), a 3-frame walk
cycle per direction (col order, frame 1 = idle, exactly `animation.ts`'s
existing `frameColForTime` convention), bottom-center anchor, the
`player`/`ambient-npcs` layers, the existing spritesheet slicing mechanism
(`assetLoader.ts`'s `drawAssetSlot` + `frame` parameter, unchanged). No
architecture, no anchor, no layer, no dimension was touched to make any of
these three work.

### Direction A — "Soft Chibi"

Large rounded head (~half the total height), soft capsule body via
rounded-rect shapes, a hair silhouette that changes shape per direction
(a fringe + side-swoop facing the camera, a solid dark disc covering the
whole head from behind), dot eyes and a small mouth-curve on the
camera-facing row only. Idle/walk exaggeration: the whole figure springs up
1px on the neutral frame, for a bouncier gait than the pilot's flat stride.

**Colors used:** `spriteSkin` (existing) for skin; `treeTrunk`
(`#3a2c22`, existing, repurposed as hair) for hair; `PALETTE.sun`
(`#d99a6c`, existing, repurposed as a jacket color) for the jacket, plus
one new shadow tone one step down from it (`#b97c50`) for a two-tone
jacket band; `swingFrame`-adjacent gray (`#5c6270`, existing) for pants.

### Direction B — "Stencil / Graphic"

Angular hexagonal head, a trapezoid torso (shoulders wider than waist)
instead of a rectangle, spiked hair via small triangles, a single angled
"visor" line instead of dot eyes, an asymmetric accent patch on one
shoulder, legs drawn as leaning parallelograms rather than straight
rectangles so the stance is never perfectly symmetric even at rest — meant
to echo the game's own hand-cut, stencilled visual language (the Gen A
mark, Language B's tag marks) rather than a generic RPG-cute proportion
set.

**Colors used:** `panelDark`/new darker step (`#232935` existing /
`#171b23` new) for the base garment; `parkedCarGlass` (`#7d8ea0`, existing,
repurposed as a visor tint); one new muted ochre accent (`#c8952e`) for the
shoulder patch. **Deliberately not** the Gen A mark's own red/blue
(`#e6402a`/`#2b4ed8`) — see §4.

### Direction C — "Refined Kenney-adjacent"

Closest in proportion to the game's one already-proven sprite (the Kenney
character), evolved rather than reinvented: a two-tone body (a jacket band
over a shirt band), a hair silhouette that extends past the head's own box
outline on the forward side per direction (not just a cap-brim shift, per
the pilot's own finding that a brim shift alone doesn't read), and —
the direct fix for the pilot's worst-cited problem — limbs in a mid-tone
blue-gray instead of the same dark outline color as everything else, with
a genuine cross-body arm swing (opposite arm advances with the opposite
leg) rather than static side-bars.

**Colors used:** `hedge` (`#48684f`, existing, repurposed as a jacket
color) and `spriteShirt` (`#ece2d0`, existing) for the two-tone body;
`chimney` (`#4a4038`, existing, repurposed as hair); one new mid-tone
blue-gray (`#8f9bb0`) for limbs, chosen specifically to read against both
light and dark ground, which is what the pilot's outline-colored legs
failed to do.

---

## 3. Player + NPC examples, spritesheets, gameplay-scale previews

Every direction produced all three requested views:

| Direction | Player sheet (48×88, native) | NPC variant (color-swap reuse) | Gameplay-scale scene (2×, real `Overworld.tsx` `SCALE`) |
|---|---|---|---|
| A — Soft Chibi | `docs/art/rnd/direction-a-soft-chibi-player.png` | `docs/art/rnd/direction-a-soft-chibi-npc.png` | `docs/art/rnd/direction-a-soft-chibi-gameplay-scale.png` |
| B — Stencil/Graphic | `docs/art/rnd/direction-b-stencil-graphic-player.png` | `docs/art/rnd/direction-b-stencil-graphic-npc.png` | `docs/art/rnd/direction-b-stencil-graphic-gameplay-scale.png` |
| C — Refined Kenney | `docs/art/rnd/direction-c-refined-kenney-player.png` | `docs/art/rnd/direction-c-refined-kenney-npc.png` | `docs/art/rnd/direction-c-refined-kenney-gameplay-scale.png` |

**NPC reuse validated for all three:** each NPC sheet is the exact same
construction as its player sheet, called with one different variant color
(teal for A, brown for B, gray-blue for C) — proving the "one manifest slot
= one file, a skin variant = another file, same slicing code" model from
the animation-infrastructure checkpoint holds for genuinely different
character constructions, not just the one shape it was designed against.

**Gameplay-scale scenes** place each direction's player (standing, facing
the camera, neutral/idle frame) at 2× — `Overworld.tsx`'s real `SCALE`
constant, the exact physical pixel size a player actually sees — next to
the Run 2A pilot's own already-approved `prop.tree.tall.png` and
`vehicle.car.png`, both drawn at the same 2× scale, on the real
`PALETTE.ground` fill. This is the single most useful evaluation view: it's
the only one of the three requested scales (native 16×22, gameplay scale,
enlarged gallery) that shows a character in context against other approved
assets rather than alone against a checkerboard.

**All nine files were also inspected at 6×/4× hand-upscaled detail**
(nearest-neighbor, no smoothing — same discipline `ctx.imageSmoothingEnabled
= false` enforces everywhere else) for the close-reading in §5; those
detail crops are not committed (they're inspection scratch, not part of
the deliverable set) but the judgments below were made against them, not
against the native 48×88 thumbnails alone.

---

## 4. A boundary I held, not a decision I made

Direction B's accent patch was designed to echo the game's own visual
grammar of "one marked detail on an otherwise plain figure" (the same
instinct behind the Gen A mark). It was deliberately given a **neutral
ochre** color rather than the actual Gen A red/blue
(`#e6402a`/`#2b4ed8`) — using the real mark colors on a character asset
would be a narrative/story decision (does the player canonically wear a
Gen A marker before the story says so?), not a visual-language one, and
that decision belongs to whoever owns the story, not to this art pass.
Flagging this explicitly rather than deciding it unilaterally.

---

## 5. Strengths and weaknesses, evaluated against the brief's own criteria

*(front/back/left/right readability, walking vs. idle readability,
silhouette at a glance, head/body separation, limb movement, visual
personality, contrast, "does it feel like a protagonist")*

### Direction A — Soft Chibi

- **Front/back/left/right:** Strong on front (clear face, smile) and back
  (an unambiguous solid dark disc — the single clearest directional read of
  any of the three). Left/right are the weakest link — the hair-swoop
  shift is present but subtle at native size; distinguishable at gameplay
  scale but not instantly.
- **Silhouette at a glance:** Reads immediately as "a person," rounded and
  soft — the strongest, most legible silhouette of the three.
- **Head/body separation:** Clear — the capsule body and round head are
  visually distinct shapes, not a stacked block.
- **Limb movement / contrast:** Legs and arms are small but present, in a
  mid-gray that contrasts adequately against `PALETTE.ground`. The
  1px-bounce idle/walk trick is a genuine improvement over the pilot's
  flicker-only stride, though it's subtle in a static sheet grab and would
  need to be judged in actual motion.
- **Visual personality / "protagonist":** The strongest of the three on
  this specific criterion — it reads as warm, approachable, and
  deliberately youthful, which fits a fourteen-year-old protagonist far
  better than either alternative.
- **Weakness worth naming honestly:** the warmth may be *too* cheerful.
  The game's own established tone is "warm and a little melancholy," not
  storybook-cute — this is a tonal judgment call, not a technical one, and
  is the main open question against this direction (see §7).

### Direction B — Stencil / Graphic

- **Front/back/left/right:** The weakest of the three. The angular
  head/spiked-hair concept doesn't survive at 16×22 — at this pixel
  budget the spikes read as a slightly uneven hairline, not as a distinct
  angular silhouette, and the head shape itself reads close to round
  once anti-aliased edges are accounted for. The visor line is the one
  detail that reads clearly and consistently.
- **Silhouette at a glance:** The trapezoid torso is a genuine, correct
  silhouette difference from the other two — it's the one place this
  direction's intent actually landed.
- **Head/body separation:** Fine, no worse than the others.
- **Limb movement / contrast:** The leaning-parallelogram legs are a nice
  idea but too subtle to read as "never fully at rest" at native size;
  at gameplay scale they mostly disappear into the dark base color.
- **Visual personality / "protagonist":** This is the direction's real
  problem. It reads as moody, adult, and somewhat guarded — closer to an
  operative or an older resistance member than a fourteen-year-old
  protagonist. That may be exactly the right register for *some* future
  character (an older mentor, a SafeTrace agent), but it's a poor fit for
  the player specifically, independent of execution quality.
- **Honest verdict:** underdelivered on its own premise. The angular/
  graphic *idea* may still be worth exploring for a different character
  (an adult NPC), but not at this resolution with this production method,
  and not for the player.

### Direction C — Refined Kenney-adjacent

- **Front/back/left/right:** Solid and consistent. The hair silhouette
  genuinely differs per direction (extends past the head box on the
  forward side, per §2), and the down-facing face (eyes + mouth) and
  left/right nose-bump details both read clearly at native size.
- **Silhouette at a glance:** Reads immediately as "an ordinary kid" —
  correct, familiar, unremarkable in the specific sense of not calling
  attention to itself, which is arguably right for a protagonist the story
  wants to feel like *anyone*, not a designed hero.
- **Head/body separation:** Clear.
- **Limb movement / contrast:** This direction's whole reason for being —
  the mid-tone blue-gray limbs are the direct, deliberate fix for the
  pilot's worst-cited flaw, and it works: legs and the genuine cross-body
  arm swing are both visible at native size and hold up at gameplay scale,
  which the pilot's version did not.
- **Visual personality / "protagonist":** Present but modest — this
  direction optimizes for correctness and legibility over distinctiveness.
  It is the safest choice and the most consistent with the game's existing
  sprite (the Kenney character players already see today), at the cost of
  being the least visually memorable of the three.
- **Honest verdict:** the lowest-risk direction, and a legitimate one — it
  solves the pilot's actual technical complaint precisely, without
  introducing a new tonal question the way A does or a new execution risk
  the way B does.

---

## 6. Validation

Run fresh after producing the R&D assets, from `static/` on branch
`claude/genalpha-asset-pipeline-run1-ygjb51`:

| Check | Result |
|---|---|
| `npm test` (full suite) | **666 / 666 passed**, 42 files — unchanged from the animation-infrastructure and Run 2A checkpoints, since nothing in `src/` changed |
| `npx vitest run src/art/` (isolated) | **88 / 88 passed** |
| `npm run typecheck` | **clean** |
| `npm run build` | **succeeds**; output JS hash unchanged from prior checkpoints (no source file changed); `docs/art/rnd/*.png` are documentation assets, not under `public/`, so they do not appear in `dist/` at all |
| `node scripts/check-assets.mjs` | **10 real, 51 placeholder, 61 total — unchanged.** The nine R&D files are not manifest-backed paths (`public/art/character.player.png` is still the Run 2A pilot's original), so they correctly do not register as "real art" for any slot. |

Nothing failed. No code changed this round — only new documentation and
`docs/art/rnd/` exploration images, plus the generator script that made
them.

---

## 7. Recommendation

**Direction:** recommend **Direction A ("Soft Chibi")**, on the brief's own
stated criteria — it's the strongest on readability, silhouette,
directional clarity, and specifically on "does it feel like a
protagonist," which is the criterion the brief weighted most heavily.
Direction C is the strong, low-risk runner-up and the one to fall back to
if Direction A's warmth is judged tonally wrong for the story. Direction B
did not clear its own bar at this pixel budget with this production method
and is not recommended for the player; its trapezoid-torso silhouette idea
may be worth revisiting for a specific adult/antagonist character later,
separately.

**Technical constraints:** none need adjusting. All three directions fit
the approved 16×22 budget, the 4-direction/3-frame spritesheet shape, the
existing bottom-center anchor, and the existing `player`/`ambient-npcs`
layers without modification. **The 16×22 budget remains viable** — every
readability problem found in this pass and the pilot before it traces to
*execution* (contrast, silhouette design, directional differentiation
technique), not to insufficient pixel space. No art bible or manifest
change is proposed.

**The one thing that does need a decision, and it isn't a "try painting
different pixels again" kind of decision:** production method. This R&D
pass materially improved on the pilot using the same tool (better
silhouette design, deliberate contrast fixes, genuine per-direction
differentiation) — proving the *ceiling* on procedural canvas output is
higher than the pilot suggested, not that the ceiling is unlimited. Held
to the brief's own instruction not to lower the bar to fit the tooling:
these three directions are a legitimate visual-language exploration and a
real improvement, but they are still the output of programmatic shape
placement, not of pixel-art craft or a trained visual-design capability —
and I have no way, in this environment, to close that specific gap myself.
Two honest paths forward, and the choice between them is not mine to make:

- **CHARACTER STYLE APPROVED**, treating Direction A's language
  (proportions, silhouette approach, directional/animation technique,
  color-blocking philosophy) as the locked target, with production
  continuing via this same procedural method at roughly this quality
  level — appropriate if this bar is judged sufficient for a small,
  budget-conscious project (the game's own stated register, per
  `HANDOFF.md`: "shapes and light... at the fidelity the budget note
  allows").
- **CHARACTER STYLE APPROVED (direction), execution deferred** — lock
  Direction A's visual language as the brief/reference for a human pixel
  artist or an image-generation tool (neither available in this session)
  to actually execute the final production sheets against, rather than
  shipping this session's own generated pixels as final.

Both are legitimate; this document does not pick between them, because
that choice depends on a production-resourcing question outside this
checkpoint's scope. What it does assert plainly: **Direction A is the
right visual language to build on**, and **the 16×22 architecture needs no
change to support it**.

STOP. Awaiting a CHARACTER STYLE decision before any further character
production or the remaining 51 assets.
