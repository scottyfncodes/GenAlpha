# GenAlpha Character Production Brief

**Status: DESIGN LANGUAGE approved. EXECUTION METHOD open.** This is the
brief an artist or an image-generation workflow should be handed to
produce GenAlpha's actual player and NPC character sprites, without having
to rediscover any of the decisions made across the Run 2A pilot and the
character art R&D pass. It is a specification, not a tutorial — every rule
below exists because something already tried either worked or failed, and
each is traced to that evidence.

**Read this before reading anything else in this document:**

> **DESIGN LANGUAGE** — the silhouette, proportions, construction rules,
> color-blocking principles, and directional/animation requirements below
> — **is approved.** It is Direction A ("Soft Chibi") from
> `docs/art/genalpha-character-art-rnd-review.md`, and this brief exists to
> make that direction executable by someone who wasn't in the room for the
> R&D pass.
>
> **EXECUTION METHOD — the procedural `<canvas>` code that produced
> Direction A's example images — is explicitly NOT approved as final.** It
> proved the language works; it did not prove it can paint it well. The
> example images referenced throughout this brief
> (`docs/art/rnd/direction-a-soft-chibi-*.png`) are **reference material for
> the language, not source files to trace.** Nothing in `public/art/`
> changes because of this document, and no new procedural character art is
> being produced to "solve" the execution question — that question is
> explicitly deferred to a separate decision about production method (a
> human pixel artist, an image-generation workflow, or something else),
> not answered by trying the same tool harder.

---

## 1. What is fixed, and why

These come from the approved architecture (Run 1's art bible, the
animation-infrastructure checkpoint) and are **not open for
reinterpretation** by whoever executes this brief:

| Constraint | Value | Source |
|---|---|---|
| Canvas size, per frame | **16w × 22h** world-space pixels | `manifest.ts`'s `character.player`/`character.npc.person`, unchanged since Run 1 |
| Directions | 4 — **left, down, up, right**, in that row order | `spriteIndex.ts`'s `Direction` type; `manifest.ts`'s `frames.directions` |
| Frames per direction | 3 — a walk cycle; frame 1 (the middle one) doubles as idle | `animation.ts`'s `frameColForTime`: `Math.floor(cols/2)` when not moving |
| Sheet layout | 3 columns × 4 rows = **48×88px total**, one sheet per character/skin | `animation.ts`'s `resolveFrameSourceRect`; §12 below |
| Anchor | **bottom-center** — the stored `(x, y)` is the character's feet, at ground contact; the sprite's lowest pixel sits exactly on that point | art bible §4, unchanged |
| Layer | `player` (the protagonist) / `ambient-npcs` (everyone else) in `drawTown`'s fixed 20-step paint order | art bible §5, unchanged |
| File path | `public/art/<slot-id>.png` — e.g. `character.player.png`, `character.npc.person.png` | `assetLoader.ts`'s `assetPath` |

No part of this brief asks for a change to any of the above. If executing
the design language genuinely turns out to require one, **stop and flag it
for approval rather than deviating silently** — the same rule the Run 1 art
bible itself sets for any proposed convention change.

---

## 2. Approved silhouette and proportions

Direction A's proportions, as a construction guide (all coordinates are
pixel positions within one 16×22 frame, `x: 0–15` left to right, `y: 0–21`
top to bottom, origin top-left of the frame):

```
y  0 ┌────────────────┐
     │                │  ← HEAD ZONE, y 0–10
     │   large, round  │    roughly 45–50% of total height —
  10 │                 │    proportionally the single largest shape
     ├────────────────┤
     │                 │  ← TORSO ZONE, y 7–16
  16 │  soft capsule   │    overlaps the head zone slightly (the neck
     ├────────────────┤    is implied, never drawn as a separate shape)
     │   leg zone      │  ← LEG ZONE, y 16–21
 21  └────────────────┘  ← ground line — the anchor point
        x: 0        15
        center: x = 8
```

- **Head:half-body ratio is the single most important proportion rule.**
  The head is not "a bit big" — it is close to half the figure's total
  height. This is what reads as "kid," not "small adult," at 16 world
  pixels, and it's the proportion choice every direction in the R&D pass
  that under-sized the head lost readability from.
- **The body is a soft, rounded shape** (rounded corners, not sharp
  rectangle corners) — a capsule or a rounded-rect, never a hard-edged box.
  This is the proportion family's whole identity; a rectangular torso on
  top of this head size is Direction C, not Direction A.
- **Limbs are short and stubby**, not long — arms roughly a third of the
  torso's height, legs roughly a quarter of total height. Proportionally
  short limbs read as "young" the same way the oversized head does, and
  keep the silhouette compact and legible at 16px wide.

---

## 3. Front / back / left / right — design requirements

This is the pilot's single most-cited failure (`genalpha-art-pilot-review.md`
§6: *"left/right facing is barely distinguishable... a player watching
their own character turn around would likely not notice"*) and the bar
every direction must clear:

- **Each of the four directions must be identifiable from silhouette
  alone**, with color and detail removed. If flattening a frame to a
  solid-black silhouette makes two directions indistinguishable, the pose
  hasn't done its job.
- **Down (facing the camera):** the only direction that shows a face.
  Hair reads as a fringe/swoop over the forehead. This is the "default,"
  friendliest-reading pose — most of a player's own view of their
  character, since the camera looks down at a player who's usually walking
  toward or across the screen.
- **Up (back of head):** no face. Hair should read as a solid mass
  covering the entire back of the head — Direction A's example achieves
  this with one unbroken dark shape, which is why it's the single clearest
  directional read across all three R&D directions. **Don't** just remove
  the eyes and call it "up" — the hair silhouette itself has to change.
- **Left / right:** the weakest pair in the existing example art and the
  one place execution needs to do more than the R&D pass did. Both need:
  - a hair silhouette that's visibly asymmetric compared to down/up (a
    swoop or part clearly on one side)
  - a visible profile cue (the R&D version leans on a single eye-dot
    offset to one side — a real profile line, even a one-pixel nose bump,
    will read more clearly than a repositioned dot)
  - left and right must be true mirror images of each other, not
    independently drawn poses that happen to differ

---

## 4. Head and hair construction

- Head shape: a circle or a heavily rounded square — soft on every edge,
  no flat sides except where hair overlaps it.
- Hair is not an accessory drawn on top of an otherwise-complete head — it
  is **the primary directional signal**, more than the face is (the face
  only appears facing down). Design the four hair silhouettes as a set,
  not the down-facing one first with the others as afterthought edits.
- Hair color should contrast clearly against both the skin tone and
  whatever the most common background tone near a character's head height
  is (mid-value dusk sky/upper-building tones) — a hair color close in
  value to the sky or to skin will disappear at gameplay scale.
- **Face treatment is minimal by necessity at this scale** (§8) — the hair
  silhouette is doing more storytelling work than the face ever will, and
  should be treated as the primary character-identity shape.

---

## 5. Torso construction

- One connected, rounded shape — capsule or heavily rounded rectangle.
  No separate "neck" segment; the head sits directly against the top of
  the torso shape, slightly overlapping.
- **Two-tone minimum**: a main jacket/clothing color plus one shade step
  (a darker or richer version of the same hue) for the lower portion or as
  a simple seam/hem line. This is cheap visual richness that costs nothing
  in silhouette complexity — Direction A's example uses a main warm tone
  with a shadow band at the hem.
- The torso should be visibly wider than the leg zone beneath it — this is
  what keeps "soft and rounded" from reading as "shapeless blob." A torso
  that's the same width as the legs loses the capsule read.

---

## 6. Arm and leg construction

- **Arms:** short, rounded stubs at the torso's sides — not flat 1px bars.
  Even 2px of width with rounded ends reads as a limb rather than a tab;
  the pilot's flat 1px arms were read as part of the body block, not as
  arms, and that's a direct instruction to avoid repeating.
- **Legs:** two short, rounded shapes below the torso, clearly separated
  from each other by a visible gap (even 1px of background/shadow between
  them) so they read as two legs, not one wide base.
- **Minimum limb contrast — this is a hard requirement, not a suggestion:**
  limb color must be clearly distinguishable from **both** `PALETTE.outline`
  (`#20262f`, the game's near-black linework color) **and** from the ground
  tones a character actually stands on (`PALETTE.ground` family,
  `#3d4759`–`#434e61`). The pilot's legs used the outline color itself for
  limbs and became nearly invisible against dark ground — confirmed
  directly in `genalpha-art-pilot-character-detail.png`. A pants/limb color
  in a genuinely different hue or a clearly lighter/darker value step than
  both of those references is required. (Direction C's R&D pass used
  `#8f9bb0`, a mid-tone blue-gray, specifically to fix this — that exact
  color isn't mandated for Direction A, but the *contrast principle* it
  proves is.)
- **Walking must visibly move the limbs, not just the character's overall
  position.** A stride that only shifts the whole silhouette by a pixel
  reads as a flicker, not a walk (the pilot's own failure, §6 of its
  review). Legs should visibly change position/length relative to each
  other frame to frame; if drawing arms, they should swing — the arm on
  the same side as the forward leg moves opposite that leg, not with it
  (real gait cross-coordination, which Direction C's R&D pass implemented
  and reads correctly even at native size).

---

## 7. Clothing / color-blocking principles

- **Palette discipline: pull from `world/draw.ts`'s existing `PALETTE`
  object wherever a color choice is open**, the same rule the R&D pass held
  itself to (see its own generator script's inline notes on which existing
  hex value each direction's color was repurposed from). This is what
  keeps a hand-produced or AI-produced character from visually clashing
  with the rest of a game that's otherwise built from one disciplined,
  limited palette. New colors are allowed only where the existing palette
  genuinely has no suitable value (Direction A's R&D pass added exactly one
  new shade — a shadow step for the jacket hem — for exactly this reason).
- **Two to three color blocks maximum per character**, beyond skin and
  hair: a main clothing color, its shadow-step variant, and optionally one
  small accent (a bag, a patch, a trim line). More than that reads as busy
  and fights the silhouette at 16px wide.
- **No color should be shared between "limb" and "outline/shadow"** — see
  §6's contrast requirement. This is the single most important
  color-blocking rule in this brief, because it's the one the pilot broke.

---

## 8. Facial-feature treatment at this scale

16×22 does not support a real face. Treat facial detail as **a small, fixed
vocabulary, not freehand illustration**:

- **Down-facing only:** two single-pixel (or 1×1 to 2×1) dot eyes, evenly
  spaced, and optionally a short curved or straight mouth mark. That's the
  entire vocabulary — no eyebrows, no nose on the front view, no
  shading inside the face.
- **Left/right:** at most one eye dot (the near one) and optionally one
  profile pixel (a nose bump or jaw line) — never both eyes on a profile
  view, which reads as wall-eyed rather than in-profile.
- **Up:** no facial detail at all. This is not a limitation to work around
  — it's correct, and matches how every other directional sprite
  convention (including the game's existing Kenney-sourced character)
  already handles a back-facing view.
- **Do not** attempt eyebrows, blush, or expression lines at this
  resolution — they either vanish or read as noise. Personality here comes
  from silhouette and color (§2, §7), not from a detailed face.

---

## 9. Idle pose

Idle **is frame 1** of the walk cycle (the middle column) — this is fixed
by `animation.ts`'s existing `frameColForTime` and is not something a new
idle-specific asset needs to be authored for. Design frame 1 of each
direction's 3-frame cycle to be a genuinely good **standing** pose (weight
centered, both legs together or nearly so, arms relaxed at the sides) —
not just a mathematical midpoint between the two stride extremes. It's the
pose a player sees more than any other (every stationary moment in the
game), so it deserves to be designed deliberately rather than derived.

Direction A's R&D pass adds a small **1px vertical "bounce"** on this
frame relative to the two stride frames — a springy settle rather than a
flat rest. This detail is part of the approved language; keep it, and feel
free to make it read better than the R&D version does (the effect is
subtle at native size and would benefit from a slightly more pronounced
treatment, evaluated in motion rather than as a static frame).

---

## 10. Walk-cycle requirements

- **3 frames, symmetric around frame 1**: frame 0 and frame 2 are the two
  stride extremes (weight/legs offset in opposite directions), frame 1 is
  the idle/together pose (§9). This is the existing convention
  (`world/draw.ts`'s `walkFrame`, generalized by `animation.ts`'s
  `frameColForTime`) — not open for a different frame count without a
  flagged architecture change (§1).
- **The stride must be visible as a change in leg position/length, not
  just a horizontal shift of the whole sprite** (§6). For the down/up
  rows, legs splay apart and back together; for left/right, the whole gait
  reads as advancing along the facing axis (front leg forward, back leg
  trailing, swapping each stride frame).
- **Default frame rate is 150ms/frame** while moving
  (`animation.ts`'s `DEFAULT_MS_PER_FRAME`) — relevant context for judging
  "does this read as a walk," not something the art itself needs to encode
  (timing is entirely code-side).
- Evaluate the 3-frame cycle **as a cycle**, flipping through all three
  frames in sequence, not just by inspecting each frame individually — a
  set of three individually-fine poses can still fail to read as
  continuous motion.

---

## 11. Player vs. NPC differentiation, and how much NPCs should vary

- **Construction, proportions, and silhouette language are identical
  between the player and every NPC.** The player is not a structurally
  different character from NPCs — same head:body ratio, same limb
  treatment, same hair-silhouette-carries-direction rule, same 3×4 sheet
  shape. This matches the approved architecture exactly: `character.player`
  and `character.npc.person` share one `frames` shape in the manifest by
  design (animation-infrastructure checkpoint), and the Run 1 art bible's
  approved decision on character-size parity (16×22 for both) already
  settled this.
- **Variation between skins is color only, by default** — jacket/clothing
  color and optionally hair color, drawn from the existing palette (§7).
  This mirrors the game's own existing convention (`draw.ts`'s 6 Kenney
  skins, cycled per-NPC by an id hash) and the R&D pass's own proof that a
  skin swap is "the same construction, one different variant color," not a
  new silhouette.
- **A cop (`character.cop`) is the one place a genuine, deliberate
  silhouette difference is appropriate** — a cap brim or a uniform-shaped
  color block distinct from an ordinary NPC's jacket — but even this
  should be a variation on the same head/body/limb construction, not a
  different proportion system.
- **Recommended NPC variety for the first production pass: 5–6 distinct
  color skins**, matching the existing convention's own scale (6 Kenney
  skins today). Candidate colors, pulled from the existing `PALETTE` the
  same way Direction A's own example jacket color was: warm tones already
  used elsewhere for non-character purposes (`PALETTE.sun`
  `#d99a6c` — Direction A's own player jacket, so an NPC skin should pick a
  **different** one), `PALETTE.hedge` `#48684f`, `PALETTE.awningRed`
  `#c8402a` (muted down if needed), `PALETTE.parkedCarGlass` `#7d8ea0`,
  `PALETTE.substationHazard` `#e0c020` (muted), `PALETTE.dogBody`
  `#8a6a4a`. This is a starting list to choose from, not a mandate to use
  exactly these six.
- Do not vary proportions, head shape, or the hair-carries-direction rule
  per NPC skin — that would fragment "one visual language" into several,
  which is exactly what this whole exercise exists to avoid.

---

## 12. Spritesheet layout

```
        col 0        col 1        col 2
      (stride A)    (idle)      (stride B)
row 0   [16×22]      [16×22]      [16×22]     ← left
row 1   [16×22]      [16×22]      [16×22]     ← down
row 2   [16×22]      [16×22]      [16×22]     ← up
row 3   [16×22]      [16×22]      [16×22]     ← right

Total sheet: 48px wide × 88px tall
```

- Row order is fixed: **left, down, up, right** — matches
  `manifest.ts`'s `frames.directions` exactly. Do not reorder.
- Column order: any consistent left-to-right stride progression, with
  column 1 (the middle) always the idle/neutral pose (§9).
- **Native resolution is the artist's choice** — the sheet does not have
  to be authored at literal 48×88px source pixels. `assetLoader.ts`
  derives each frame's source rectangle from the *loaded image's own
  decoded size* divided by the declared grid (`resolveFrameSourceRect` —
  `naturalWidth / cols`, `naturalHeight / rows`), so a sheet authored at
  2× or 4× native resolution (96×176 or 192×352) and downscaled at draw
  time works identically, as long as **the total sheet size is an exact
  integer multiple of the 3×4 grid** — an unevenly-cropped sheet will slice
  incorrectly.
- One sheet per character/skin (`character.player.png`,
  `character.npc.person.png`, and one additional file per NPC skin variant
  per §11) — never a single sheet shared across multiple characters. This
  is deliberate (Run 1's manifest keeps one slot = one file specifically so
  a contributor can review or replace one character without touching a
  shared atlas everyone else's art also lives in) and is not open for
  reconsideration without flagging it.

---

## 13. Anchor placement

- The stored world position is the character's **feet, bottom-center** of
  the 16×22 frame — `x = 8` (mid-width), `y = 22` (the very bottom edge).
- **No transparent padding below the lowest foot pixel.** The sprite's
  actual lowest opaque pixel must sit exactly on the frame's bottom edge —
  padding here would visually float the character above the ground it's
  meant to stand on (art bible §4's "no transparent padding below the
  anchor" rule, restated here because it's the rule this whole brief is
  built on top of).
- Horizontal centering matters less strictly (a small silhouette lean
  left/right during a stride is fine and expected, §10) but the resting
  (idle) frame should be centered on `x = 8`.

---

## 14. Silhouette and readability requirements — the pass/fail bar

A finished character passes if, and only if:

1. **Flattened to solid black, all four directions are distinguishable
   from each other at native 16×22 size.**
2. **The three walk-cycle frames, viewed in sequence, read as continuous
   motion, not a flicker or a fixed pose with noise.**
3. **No color used for a limb, an outline, or a shadow is close enough in
   hue/value to be confused with another at native size against the game's
   actual ground tones** (§6).
4. **The head:body proportion and the rounded/soft shape language are
   consistent across every direction and every frame** — nothing here
   should look like it belongs to a different character direction.
5. **A viewer with no context can identify "this is a kid," "this is the
   protagonist" (for the player specifically), and roughly which way it's
   facing, within about a second of looking at it at gameplay scale
   (§16).**

Every one of these is a real bar Direction A's R&D execution came close to
but didn't fully clear (particularly #1 for left/right, per §3) — a
production pass should treat all five as launch-blocking, not aspirational.

---

## 15. Native-size evaluation criteria

Evaluate every finished frame at **actual 16×22 pixels, unscaled**, the
size the source file is authored at:

- Is the silhouette legible with no color at all (a solid-fill test)?
- Do the four directions read as different poses, not recolors of one
  pose?
- Are limb, outline, and shadow all visually distinct (§6, §14.3)?
- Is there any stray or orphaned pixel that reads as noise rather than
  intentional detail?

## 16. Gameplay-scale evaluation criteria

Evaluate at **2× scale** (`Overworld.tsx`'s real `SCALE` constant) — the
literal physical pixel size a player actually sees on their own screen,
**in context next to other approved assets**, not alone against a blank or
checkerboard background:

- Place the character next to the Run 2A pilot's approved
  `prop.tree.tall.png` and `vehicle.car.png` (both already in
  `public/art/`) on the real `PALETTE.ground` fill — the same composition
  `docs/art/rnd/direction-a-soft-chibi-gameplay-scale.png` already
  demonstrates as a reference. Does the character hold its own as the
  focal point a player is meant to track, rather than disappearing into
  the scene?
- Walking in place (cycling the 3 frames) at the real ~150ms/frame rate —
  does the stride read as a stride, not a flicker (§10, §14.2)?
- Does it still read as "protagonist" (for the player) or "a person, not a
  building or a prop" (for an NPC) at a quick glance, the way a player
  actually looks at their own character while playing rather than
  studying it?

Both native-size and gameplay-scale checks are required — passing one
without the other is not sufficient (a design can look right zoomed in and
muddy in motion, or vice versa).

---

## 17. Examples from Direction A

Reference material — **language reference, not source files to trace**
(see the framing at the top of this document):

- `docs/art/rnd/direction-a-soft-chibi-player.png` — the 3×4 sheet this
  brief's proportions and construction rules are drawn from directly.
  Good: head:body ratio, the solid-disc back-of-head for "up," the
  rounded capsule torso, the two-tone jacket. Needs improvement in
  production: left/right differentiation (§3), limb visibility/contrast
  (§6 — even Direction A's limbs are on the faint side), and general
  linework/shading polish that procedural rectangles-and-arcs can't
  provide.
- `docs/art/rnd/direction-a-soft-chibi-npc.png` — the same construction
  with one different jacket color (teal instead of the player's warm
  tan), demonstrating the player/NPC differentiation rule in §11 directly.
- `docs/art/rnd/direction-a-soft-chibi-gameplay-scale.png` — the
  reference composition for the gameplay-scale evaluation in §16: the
  character at real 2× scale next to the approved tree and car.
- For contrast (what NOT to do), `docs/art/genalpha-art-pilot-character-detail.png`
  (the original pilot's player sheet at 8×) is the single clearest
  illustration of the limb-contrast and direction-differentiation failures
  this brief's §3, §6, and §14 exist to prevent.

---

## 18. Explicit DON'Ts

Every one of these is traced to a specific, documented failure — not a
generic style preference:

- **DON'T** make left and right facing differ only by a 1–3px detail shift
  (a cap-brim nudge, one eye dot moving one pixel). This is the pilot's
  own failure, restated because it's the single most likely mistake to
  repeat. The silhouette itself must change (§3).
- **DON'T** color a limb the same as the outline/linework color, or a
  color close enough in value to disappear against the game's dusk ground
  tones. This is the pilot's other headline failure (§6).
- **DON'T** draw arms as flat 1–2px bars with no rounding — they read as
  body tabs, not limbs (§6).
- **DON'T** attempt an angular, sharp-edged silhouette at this pixel
  budget — Direction B's R&D attempt (trapezoid torso, spiked hair,
  angular head) did not survive 16×22; the detail needed to sell "angular"
  is smaller than the available pixel budget can carry, and what's left
  reads as a plain rounded shape with a stray accent. If a
  sharper/tougher-reading character is wanted for a *specific* NPC later
  (an adult, an antagonist), that's a separate, later design question, not
  a variation to fold into the player's own approved language.
- **DON'T** give a character a face-forward eye/mouth treatment on
  anything but the down-facing row (§8) — it reads as wall-eyed or breaks
  the "face only shows toward camera" rule that makes "up" read correctly.
- **DON'T** vary NPC proportions or silhouette per skin — variation is
  color only (§11). A differently-proportioned NPC reads as a different
  character design, not a costume change.
- **DON'T** use the Gen A mark's own colors (`#e6402a` red / `#2b4ed8`
  blue) as a character clothing accent without separate narrative sign-off
  — Direction B's R&D pass deliberately avoided this for exactly this
  reason (its own review, §4); the same caution applies to any future
  execution pass.
- **DON'T** treat "better than the pilot" as the bar. It's necessary, not
  sufficient — see §14's actual pass/fail criteria.

---

## 19. Production method — explicitly not decided here

Restating the framing at the top of this document, because it's the one
thing this brief is not for: **this document specifies what to build, not
how to build it.** The character art R&D pass
(`docs/art/genalpha-character-art-rnd-review.md`) established that:

- procedural `<canvas>` construction can validate a design language and
  produce technically correct, manifest-compatible assets
- it can reach a noticeably better result with deliberate design intent
  than a first, rushed pass
- it has **not** demonstrated it can reach the quality bar in §14–§16 on
  its own

That's considered sufficient evidence — this brief does not exist to be
executed by "trying the procedural approach one more time." When a
production method (a human pixel artist, a capable image-generation
workflow, or something else) is chosen separately, this document is the
target it should be measured against — both directly (does the output
follow §2–§13's construction rules) and by the pass/fail bar in §14–§16.

No character production, mass or otherwise, follows from this document
existing. `public/art/character.player.png` and
`public/art/character.npc.person.png` remain the Run 2A pilot's original,
not-production-quality files until a production method is chosen and run.
