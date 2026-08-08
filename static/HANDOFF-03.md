# Where this is and what to build next

## What changed in 0.3.0

Every open issue from the Phase 1–3 reviews is closed. Grouped by what was
actually wrong:

**Bugs that would have corrupted play**

- Trace reseeded the grid when a target hardened, so banked intel from a failed
  run pointed at unrelated nodes on the retry. The seed is now the mission id
  alone; hardening only tightens the budget. Pinned by a test.
- Pressing Space during a scene re-triggered the location underneath and closed
  the scene, losing its completion flag. The overworld's input is suppressed
  while a scene is open, and Space/Enter now advance dialogue instead.
- The Heat difficulty nudge was labelled by comparing a budget against the magic
  number 14, so it was only ever visible on Tier 1 — silent on Tiers 2–4, which
  is the exact thing the Heat module forbids. `RiskMeter` now takes the
  un-nudged `ceiling` and renders a physically shorter track.
- The sabotage clock called `setState` inside a `setLeft` updater (impure, and
  double-invoked under StrictMode), and `hesitate()` picked from the beat's full
  option list — it could force a tool you don't carry. Both fixed; the timeout
  path is guarded against firing twice for one beat.
- Re-touching a known dead end charged a pulse and a counter tick. Read ground
  is free now, and known dead ends aren't clickable.

**Half-landed work from 0.2.0**

- Heat decay never read `world.day`. `lastDecayAt` is now `lastDecayDay`, decay
  is idempotent per day, and decay-on-mount is gone.
- `reducedFlicker` and `textSpeed` were read by code and settable by nobody.
  There's a Settings panel.
- `save-schema.json` had drifted three versions behind `schema.ts`. Synced.
- Dead exports removed (`MESSY_SURCHARGE`, `heatDifficultyNudge`,
  `useGlitchBurst`); the duplicate nudge function is gone.

**Content-layer gaps**

- The library trace charged +2 Heat with no preview. It routes through
  `MissionBriefing` now, and the cost is held until the player accepts — so it
  lands on commit, not on arrival, and not on outcome.
- The glitch ran as an infinite animation for as long as a line sat on screen.
  It's a finite burst.
- `SceneChoice.requiresFlag` was declared and never implemented (choices would
  have shown regardless). Implemented, plus `hiddenIfFlag`.
- `SceneNode.end` was never read. Implemented.
- No way to leave a scene. There's a "Step away" exit.
- The pending-scene hint lowercased authored sentences ("pole 5-c. go look at it
  properly"). It shows the hook as written plus the location name.

**Carried over from Phase 1**

Held keys no longer stick when the tab loses focus; arrows don't scroll the page
under the canvas; the d-pad is labelled instead of `aria-hidden` with focusable
buttons inside; the player spawns at their saved location; `deleteSave` uses a
real `RESET` action instead of casting `null` through `SaveState`; Debug and
Workbench are gated on `import.meta.env.DEV`; `src/vite-env.d.ts` exists.

## Build Phase 4 next: mentor missions

Phase 5 (economy) is blocked on two schema decisions; Phases 6–7 are blocked on
content that hasn't been written. Phase 4 is unblocked and it's what makes the
two mechanics matter, so it's next.

**Do this first, before writing any mentor content.** Build the four-beat
template as a runner over data, the same way `scenes.ts` runs over `act1.ts`:

- `src/systems/mentors.ts` — the template. Beat 1 Contact writes
  `relationships.<mentor>.metAt`; Beat 2 The Ask; Beat 3 The Trust Mission;
  Beat 4 The Unlock writes the trust delta *and* flips `skills.<x>.unlocked`.
  Current beat lives in `missions.<mentorId>.beat`, which is what that field was
  added for. Reuse `Scene` for the dialogue beats — do not build a second
  dialogue system.
- `src/content/mentors.ts` — Deja, Files, Milo, Bishop as four data objects
  filling that template. Bespoke code per mentor is the failure mode here.

Then wire the four, in this order, because each one exercises a different reuse
path:

1. **Deja** — Beat 3 is `DEJA_JOBSITE`, which already exists and already passes
   its tests. Proves the template can hand off to Sabotage. Beat 4 sets
   `skills.sabotage.unlocked` and `tier: 1`.
2. **Files** — Beat 3 is deliberately *not* a hacking test. It's a
   dialogue/choice sequence about whether the player protects information they
   were handed. This is the one that proves the template works with no minigame
   at all. Beat 4 unlocks hacking.
3. **Milo** — the only soft branch. A scenario with a visible AI shortcut and a
   harder clean path; `skills.aiToolAccess.unlocked` flips either way,
   `trustedMode` only on the harder path. Milo's line when they take the
   shortcut acknowledges it plainly and does not lecture.
4. **Bishop** — last, per the sequencing rule, so his betrayal has more to lose
   against. Beat 3 writes `player.flags.bishop_first_op_complete`. Beat 4 grants
   `skills.resistanceIntel.unlocked` and plants the funding question he
   deflects, as a throwaway line.

**Things that will bite you**

- Bishop's warmth is a structural clue, not a plot hole. He's the only mentor
  who doesn't make the player work for it, and after three hard-won trust
  missions that ease should read as relief. Don't smooth the other three toward
  him to make the pacing even.
- Every Beat 2 needs a specific in-character reason for gatekeeping. "Prove
  yourself, stranger" is the thing this whole structure exists to avoid.
- Heat's `threshold_tier` at `flagged`+ should reschedule or relocate a Beat 1/2
  scene — a dialogue variant, never a block.
- Extend `validateScene` coverage to mentor content the moment it exists. The
  terminal-node-advances-chapter rule is what stops a reload re-charging Heat,
  and mentor scenes will be the first content where it's tempting to write a
  scene that doesn't move the chapter. If you need that, add a separate
  "scene complete" gate first — don't just drop the invariant.
- Deja's mission currently can't be failed below `hunted` (max blind Alertness 8
  against a budget of 10). That's probably correct for a tutorial. Make it a
  decision rather than leaving it as an accident of the risk numbers.

## Before Phase 5, settle two schema questions

Both are in `SCHEMA-NOTES.md` with proposals. Neither should be invented in
code:

- **Villain wallets need to exist before they're drained** (recon discovers
  them; a failed heist hardens them). Gap 3.
- **Market events need a duration and a scope.** Gap 4 — smaller now that
  `world.day` exists to measure against.

## Phases 6 and 7 need a content pass, not a coding session

The betrayal is the emotional hinge of the game and the ending is supposed to be
quiet rather than a lecture. Neither is scene-by-scene yet. Build the scaffolding
if it helps, leave marked placeholders, and write those beats deliberately —
not as a byproduct of coding momentum.
