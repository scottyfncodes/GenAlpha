# Character animation / sheet architecture — design recommendation

**Status: design recommendation only. Not implemented.** This document
resolves the one open item from the Run 1 review checkpoint — how a
manifest slot's declared `frames` block (idle/walk cycles, 4-direction
movement) should actually be sliced, selected, and drawn once real
character art exists. It contains a recommendation and a minimum
implementation plan; **no code in this run changes as a result of it.**
`world/draw.ts`, `src/art/manifest.ts`'s slot data, and
`src/art/assetLoader.ts`'s drawing behavior are all exactly as they were at
the Run 1 review checkpoint. Implementation is separate, future work,
requiring its own authorization.

---

## 1. What the existing renderer already does (the evidence this recommendation is built on)

Two facts from the live renderer decide this, not preference:

**Fact 1 — the game already has a proven, working grid-sheet mechanism**,
and it's generic, not character-specific. `world/spritesheet.ts`'s
`createSheet(src, cols)` loads exactly one image and hands back a function
that turns a flat tile index into a source rect (`tileSourceRect`), then
blits that rect scaled to any destination size (`drawTile`/`drawTileAt`).
It's used identically for three unrelated Kenney sheets today (the main
RPG-urban sheet, the roguelike-city sheet, the roguelike-interior sheet) —
proof it's already a reusable pattern, not a one-off.

**Fact 2 — the one real character sprite in the game is already sliced out
of a grid this same way.** `spriteIndex.ts`'s `CHARACTERS` array reads a
4-column × 3-row block per character out of the main Kenney sheet:
`CHAR_COLS = {left, down, up, right}` (direction picked by **column**),
3 rows per character (walk-cycle frame picked by **row**). `draw.ts`'s
`drawPlayer`/`drawPedestrian` then do exactly two things with it: resolve a
direction (`facingDirection(facing)`, a pure function of the last nonzero
facing vector) and a frame (`walkFrame(now, moving)`, a pure function of
time and a moving flag), look up `CHARACTERS[skin][direction][frame]` —
one tile index — and call `drawSpriteTile`.

**Why the existing sheet picks direction-by-column, not direction-by-row:**
that sheet packs **six different characters** into one shared image, each
occupying its own 3-row band; column was the axis available to spend on
direction because rows were already spent stacking six characters on top of
each other. That's a multi-character sheet-**packing** artifact, not a
general convention — it says nothing about how a single, standalone,
one-PNG-per-character asset should lay itself out, because a standalone
sheet has no second character competing for an axis. This matters below.

---

## 2. Comparing the three approaches

### A. One file per frame

Each direction × frame combination (a 4-direction, 3-frame walk cycle: 12
combinations) is its own PNG (`character.player.walk.down.0.png`,
`.down.1.png`, …).

- **Loading:** 12 separate `<img>` loads per character, each with its own
  `ready`/`failed` state to track — the current `assetLoader.ts` registry
  is one entry per *slot*; this would need either 12 manifest slots per
  character (breaking Run 1's "one slot = one class of thing" rule, which
  exists specifically so the manifest stays a short, legible list) or a
  restructured `AssetSlot` that holds an array of per-frame paths — real
  schema growth for no corresponding gain.
  - After manifest restructuring, an `AssetSlot` interface with a "10 minutes to review 61 clean, single-purpose entries" property (see the Run 1 review) would instead read as "61 entries, several of them expanding into their own sub-lists of files" — worse to audit, not better.
- **Consistency:** nothing enforces that all 12 frames share the same
  canvas size, the same character proportions, or the same ground-contact
  point — each file is edited in isolation. A one-pixel drift in any single
  frame reads as a visible jitter in the walk cycle; a shared-sheet grid
  makes that class of mistake structurally harder (frame boundaries are the
  grid, not twelve independent judgment calls).
- **Loading behavior:** frames become `ready` at different times as each
  request resolves, so a character could visibly animate with some
  directions still on the placeholder and others already real, mid-load —
  a state the sheet-based approaches don't have at all (one request, one
  `ready` transition, all frames appear together).
- **Runtime cost:** 12× the decode/registry bookkeeping per character for
  zero rendering benefit — directly against "avoiding unnecessary runtime
  complexity."
- **Contributor experience:** a new naming/numbering scheme has to be
  invented and remembered (`<id>.<direction>.<frame>.png`) with no existing
  precedent in this codebase to anchor it to.

**Verdict: worse on every axis in the brief except "no slicing math," and
that math is one division per draw call — already proven trivial by Fact 1.**

### B. One spritesheet per character/skin, manifest-defined slicing — RECOMMENDED

Each character or skin is **one** PNG containing every direction and frame
in a fixed grid, sliced at draw time using the grid the slot's own manifest
entry declares.

- **Loading:** exactly the existing `assetLoader.ts` model — one
  `ensureAssetLoading(slot)`, one `ready()` check, one file. No registry
  change needed at all.
- **Consistency:** the grid *is* the alignment guarantee — every frame in
  a sheet shares the same canvas, so a ground-contact point that's right in
  frame 0 is right in every frame by construction. This is exactly what
  already makes the Kenney sheet's characters read cleanly today.
- **Contributor experience:** "one file, laid out N columns by M rows" is
  a template an artist (or an image-generation prompt) can be handed
  directly, and it's the convention this codebase's own character sprite
  already demonstrates working, end to end, in production.
- **Reuse for NPCs:** a new skin is just another slot pointing at another
  sheet — the *slicing* code is written once, in the loader, and every
  character-class slot gets it for free. This is the direct answer to
  "NPC reuse" in the brief: today's "6 Kenney skins cycled by id hash"
  becomes "N manifest slots cycled by id hash," same shape, more skins.
- **Player customization:** a swappable outfit/skin is a *whole additional
  slot* (`character.player.default`, `character.player.jacket`, …), not a
  new mechanism — picking which one to draw at runtime is a string choice,
  not new rendering code. See §7 for why this is deliberately the
  boundary, not full part-by-part compositing.
- **Asset replacement:** matches Run 1's existing promise exactly — drop
  one correctly-sized file in at the declared id, done.

**Verdict: this is Fact 1 and Fact 2, generalized one level — not a new
architecture, a wider application of the one this codebase already trusts.**

### C. Other approaches considered and rejected

- **C1 — one file per direction** (4 files, each a horizontal frame strip):
  a midpoint between A and B that inherits A's core problem (multiple
  files, multiple load states, per-character) while only partially
  recovering B's alignment guarantee (frames align within a direction, not
  across directions). Doesn't earn the added file count over B.
- **C2 — one shared sheet across *all* characters** (what the existing
  Kenney pack literally is): would minimize requests further, but Run 1's
  manifest deliberately keeps one slot per class specifically so a
  contributor can review or replace one character without touching a
  shared atlas everyone else's art also lives in. The Kenney sheet is a
  fixed, complete, third-party pack consumed as-is — a fundamentally
  different maintenance situation from hand-authored, incrementally-added
  custom art. Rejected: fits a finished asset pack, not an evolving one.
- **C3 — runtime part-compositing** (separately drawn head/body/limb
  layers, recolored or swapped independently, the way the *procedural*
  player fallback already layers shapes): the most flexible option for
  granular customization, and the most expensive — per-frame multi-draw
  compositing, cross-direction part alignment as a standing authoring
  burden, and a part-catalog/rigging concept nothing in this schema or
  renderer has today. Rejected for now as complexity the brief explicitly
  asks to avoid, with no current feature actually asking for
  limb-level customization (§7 revisits this).

**Recommendation: B.** It costs zero schema changes (see §3), reuses the
existing loader's exact shape (see §4), and is the same mechanism this
game's one real character sprite already proves works.

---

## 3. Proposed manifest schema

**No structural change.** `AssetFrames` already has everything this needs:

```ts
export interface AssetFrames {
  cols: number;                     // frames per direction (walk-cycle length)
  rows: number;                     // directions (or other states)
  directions?: readonly string[];   // row order, when rows are a fixed compass set
}
```

One clarification worth stating explicitly, since it inverts the *existing*
Kenney sheet's own axis choice (§1's "why," restated as a rule): **for a
standalone per-character sheet, rows = directions, columns = frames within
a direction.** This is already how every `frames` block in the Run 1
manifest is written (`character.player`: `{cols: 3, rows: 4, directions:
['left','down','up','right']}`) — the manifest anticipated this correctly;
this document just makes the reasoning explicit so a future contributor
doesn't "fix" it to match the Kenney sheet's own, differently-motivated,
column-for-direction layout.

**One optional addition worth considering, not required:** a cosmetic
timing hint for the *gallery preview only* —

```ts
export interface AssetFrames {
  cols: number;
  rows: number;
  directions?: readonly string[];
  /** Gallery-preview only — how fast to cycle frames when previewing this
   * slot's animation. Never read by any live-render path; draw.ts owns its
   * own timing (see §5) exactly as it does today. Omit to preview at a
   * sensible default. */
  previewMsPerFrame?: number;
}
```

This is explicitly optional and cosmetic — nothing about slicing or the
live game depends on it. Left out of the minimum plan (§8) unless the
gallery work is picked up too.

**Per-frame source size is derived, not declared.** The sheet's total
pixel size is never stored in the manifest — it's computed from the loaded
image's own `naturalWidth`/`naturalHeight` divided by `cols`/`rows` at draw
time (§4). This means the *source* art can be authored at any resolution
(exactly 16×22 per frame, or a crisper 32×44 downscaled at draw time — the
same headroom the existing Kenney tile draw already has, tile-native 16×16
scaled to `CHARACTER_DRAW_SIZE`'s 16×22) without touching the manifest at
all — only the file changes.

---

## 4. Proposed `assetLoader` behavior

Additive to the existing `drawAssetSlot`, not a replacement. A slot with no
`frames` (59 of today's 61) behaves **exactly as it does right now** — this
is the "small, isolated extension" the brief asks about, not a rewrite:

```ts
// Existing signature grows one optional parameter. Every current call site
// (the gallery, `check-assets.mjs`, anything else) compiles and behaves
// identically, because `frame` defaults to absent.
export function drawAssetSlot(
  ctx: CanvasRenderingContext2D,
  slot: AssetSlot,
  x: number,
  y: number,
  frame?: { col: number; row: number },
): void {
  ensureAssetLoading(slot);
  const entry = entryFor(slot);
  const { x: boxX, y: boxY } = topLeftFor(slot, x, y);

  if (entry.ready && entry.img) {
    if (slot.frames && frame) {
      const frameW = entry.img.naturalWidth / slot.frames.cols;
      const frameH = entry.img.naturalHeight / slot.frames.rows;
      ctx.drawImage(
        entry.img,
        frame.col * frameW, frame.row * frameH, frameW, frameH, // source rect: one cell of the grid
        px(boxX), px(boxY), slot.width, slot.height,             // dest rect: unchanged from today
      );
      return;
    }
    // Unchanged: whole image, scaled to the slot's declared box.
    ctx.drawImage(entry.img, px(boxX), px(boxY), slot.width, slot.height);
    return;
  }
  drawPlaceholder(ctx, slot, boxX, boxY, frame); // frame, if present, becomes an extra label line
}
```

This is the same `source-rect → scaled destination-rect` call
`world/spritesheet.ts`'s `drawTile` already makes — the only new idea is
computing the source rect from a caller-supplied `{col, row}` instead of a
fixed 16×16 tile lookup.

**Direction/frame *selection* is deliberately not in this function.**
`assetLoader.ts`'s job stays "load, slice, draw" — exactly its Run 1 scope.
A new, separate, pure-function module carries the selection logic instead,
mirroring `draw.ts`'s own `facingDirection`/`walkFrame` but generalized to
any slot's declared direction set rather than a hardcoded compass:

```ts
// src/art/animation.ts — NEW, isolated, imported by nothing in world/draw.ts.
// Pure functions only, same shape as draw.ts's own facingDirection/walkFrame
// (which stay exactly where they are — this doesn't replace them, it's the
// art-pipeline-side equivalent for when Run 2 wires real art in).

export function frameRowForDirection(frames: AssetFrames, facing: { x: number; y: number }): number {
  const directions = frames.directions ?? ['down']; // a slot with rows but no named directions is just "state 0..rows-1, caller's own meaning"
  const direction =
    Math.abs(facing.x) >= Math.abs(facing.y)
      ? (facing.x < 0 ? 'left' : 'right')
      : (facing.y < 0 ? 'up' : 'down');
  const row = directions.indexOf(direction);
  return row >= 0 ? row : 0;
}

export function frameColForTime(frames: AssetFrames, now: number, moving: boolean, msPerFrame = 150): number {
  if (!moving) return Math.floor(frames.cols / 2); // hold the middle/neutral frame, same idea as today's walkFrame(..., false)
  return Math.floor(now / msPerFrame) % frames.cols;
}
```

Whoever eventually wires a slot into `world/draw.ts` (Run 2, not this
document) would call `drawAssetSlot(ctx, slot, x, y, { row:
frameRowForDirection(slot.frames!, facing), col: frameColForTime(slot.frames!,
now, moving) })` — but that call site does not exist yet, and creating it is
explicitly out of scope here.

---

## 5. Example: player asset definition

**Manifest — unchanged from Run 1** (already correctly shaped):

```ts
{
  id: 'character.player',
  category: 'character',
  label: 'Player',
  description: 'The protagonist, walking. Master scale reference for every other asset in the game.',
  width: 16,
  height: 22,
  anchor: 'bottom-center',
  layer: 'player',
  frames: { cols: 3, rows: 4, directions: ['left', 'down', 'up', 'right'] },
  sourceRef: 'spriteIndex.ts CHARACTERS[0] (CHARACTER_DRAW_SIZE); draw.ts drawPlayer',
}
```

**The art file** the artist delivers: `public/art/character.player.png`, a
single image, **3 columns × 4 rows** = 12 cells, each cell one walk-cycle
frame in one direction, row order `left, down, up, right` top-to-bottom.
Native per-cell resolution is the artist's choice (16×22 exactly, or a
crisper multiple downscaled at draw time) — the loader derives frame size
from `naturalWidth/3` × `naturalHeight/4`, whatever those turn out to be.

**Drawing it** (future `world/draw.ts` call, illustrative only — not made
in this document):

```ts
drawAssetSlot(ctx, slotById('character.player')!, player.x, player.y, {
  row: frameRowForDirection(slot.frames!, facing),
  col: frameColForTime(slot.frames!, now, moving),
});
```

---

## 6. Example: NPC asset definition

NPCs split into two shapes, matching what's already in the Run 1 manifest:

**Animated (a townsperson):**

```ts
{
  id: 'character.npc.person',
  category: 'character',
  label: 'Ambient pedestrian',
  width: 16,
  height: 22,
  anchor: 'bottom-center',
  layer: 'ambient-npcs',
  frames: { cols: 3, rows: 4, directions: ['left', 'down', 'up', 'right'] },
  sourceRef: 'spriteIndex.ts CHARACTERS; draw.ts drawPedestrian (NpcKind "person")',
}
```

Same shape as the player, same slicing code path — no special-casing.

**Skin variety (today: 6 Kenney skins cycled by id hash) maps to
additional whole slots, not a third grid dimension:**
`character.npc.person.skin-2`, `character.npc.person.skin-3`, … — each a
complete, independent 3×4 sheet. `characterSkinFor(id)` (already exists,
`draw.ts`) picks *which slot id* to draw, unchanged in spirit. This was
weighed against adding a `skins` axis to `AssetFrames` (e.g. `{cols, rows,
skins}`) and rejected: it would make every slicing call three-dimensional
for a property only the character category needs, versus "one more slot"
costing nothing the manifest doesn't already pay for 61 times over.

**Static (a dog, a cat, a bird) — no change at all:**

```ts
{
  id: 'character.npc.dog',
  category: 'character',
  label: 'Ambient dog',
  width: 12,
  height: 11,
  anchor: 'bottom-center',
  layer: 'ambient-npcs',
  // no `frames` — single static image, exactly like 58 of Run 1's 61 slots
  sourceRef: 'draw.ts drawDog (NpcKind "dog")',
}
```

---

## 7. How static/non-animated characters work

**No new code path.** Omitting `frames` is the *existing* Run 1 behavior —
`drawAssetSlot` already draws the whole loaded image scaled to the slot's
box when there's nothing else to do, which is exactly correct for a static
character. The proposed `frame` parameter in §4 is optional and only
consulted when both `slot.frames` and the caller's `frame` argument are
present; a static slot never triggers the slicing branch. This is why the
extension in §4 is additive rather than a rewrite: the 59 non-animated
slots in today's manifest are the proof the "no `frames`" path already
works, unchanged, under this proposal.

**On player customization specifically** (the brief calls this out): this
design supports customization at the granularity of **swapping which whole
sheet is active** (a different slot id — a different outfit, a different
palette), not part-by-part recoloring or limb compositing (Option C3,
§2). That's a deliberate scope line: nothing in the current schema, save
system, or UI has an "equipment"/"outfit" concept to hang granular
compositing off of, and adding one now would be designing a customization
*feature*, not an asset-loading *mechanism* — outside a checkpoint whose
brief is explicitly "do not implement... yet." If granular part-based
customization becomes an actual product requirement later, it's a bigger,
separate design question (its own manifest shape, its own rigging/alignment
rules) that should be scoped on its own merits then, not smuggled in here.

---

## 8. What files would change (future implementation — not made here)

| File | Change | Nature |
|---|---|---|
| `src/art/manifest.ts` | None required. `AssetFrames` already supports this; only its doc comment might gain the rows/cols convention note from §3. | none / doc-only |
| `src/art/assetLoader.ts` | `drawAssetSlot` gains one optional `frame` parameter and a slicing branch (§4); `drawPlaceholder` gains an optional frame-label line. | additive |
| `src/art/animation.ts` | **New file.** Two small pure functions (§4). Imported by nothing yet. | new, isolated |
| `src/art/manifest.test.ts` | A few new assertions: frame-geometry math on fixture data, `frameRowForDirection`/`frameColForTime` pure-function tests. | additive |
| `src/dev/AssetGallery.tsx` | Optional polish: cycle frames automatically for slots that declare `frames`, or show the full grid at once. Not required for the mechanism to work. | additive, optional |
| `world/draw.ts` | **None.** Wiring an actual call site (`drawPlayer` calling `drawAssetSlot` instead of `drawSpriteTile`) is Run 2 work — swapping the renderer's live art source — and is out of scope for both this document and the next authorized run of the *pipeline* work. | untouched |
| `world/spritesheet.ts` / `world/spriteIndex.ts` | **None.** The existing Kenney-sheet character system keeps working as the procedural/interim renderer exactly as it does today. | untouched |

**Existing renderer behavior requires no change to support this
architecture existing** — only a small, isolated extension inside
`src/art/`, in the same spirit as Run 1 itself. The live game's rendering
is unaffected whether or not this design is ever implemented.

---

## 9. Recommendation summary

Build **Option B** when this work is authorized: one manifest-declared,
grid-sliced sheet per character/skin slot, sliced by a small additive
extension to `assetLoader.ts`, with direction/frame *selection* logic kept
in a new, separate, pure-function module (`src/art/animation.ts`) rather
than inside the loader. Zero manifest schema changes required. Zero changes
to `world/draw.ts` or any currently-shipping renderer code. Fully backward
compatible with every slot that has no `frames` — which, today, is all of
them.

**This document makes no code changes.** Awaiting approval before any of
§4/§8 is implemented.
