# Where this is and what to build next

## First: the review fixes are in

The six fixes from the last review are applied and verified before any Phase 5
work sits on top of them. Nothing in this handoff is built on the broken
versions.

- Sabotage's `Window` is keyed on the beat, so a timeout resolves one beat
  rather than two.
- `validateMentor` runs a fixpoint over reachable beats *and* available flags,
  so a mistyped flag on a Beat 4 scene is caught instead of parking the cursor
  forever.
- `migrate` merges against a fresh save, so a partial subtree comes out whole.
  `prefersReducedMotion` moved to `state/env.ts` to break the cycle that
  blocked it.
- The dev Workbench is a `lazy()` behind a `DEV` const, genuinely out of the
  production bundle.
- `scenesAt()` returns every scene a location offers; the overworld lists them
  and the player picks. Files is reachable before Deja, as module 06 intends.
- `content/reachability.test.ts` walks the composed game.

**Note the PDF of that patch has its indentation flattened**, so `patch -p1`
won't apply it. The fixes here were re-applied by hand and match the described
behaviour; the two new mentor tests and the migration test from that patch are
present verbatim in intent.

## What Phase 5 added

The economy, per module 03. Three surfaces the player can see and two systems
under them.

**`systems/market.ts`** — pricing, event lifecycle, buy/sell, SHDW. Every price
in the game comes out of `priceOf()`; nothing else computes one. Every reason a
listing can't be bought comes out of `unavailableReason()` and is printed next
to the button, so there is no dead control anywhere on the market screen.

**`systems/heist.ts`** — villain wallets, clue-gated approaches, the drain, and
the Robin Hood split. `drain()` writes all four downstream effects together
(cash, the drained log, a Heat history entry, a town-trust delta) because the
schema's own cross-module rule says a drain does all four, and splitting them
across call sites is how one gets forgotten.

**Content**: `content/economy.ts` (catalog + event table), `content/market.ts`
(the scene that opens the table), `content/heist.ts` (the target, its Tier 4
sabotage config, and four scenes).

**New effect kinds**: `cash`, `item`, `townTrust`, `wallet`, `prep`, plus
`mitigatedBy` on `heat` and `requiresItem` on a choice. Content remains the only
thing that touches the save.

## Decisions made, so they don't get re-litigated as accidents

- **There is exactly one source of money that isn't theft: a $41 tin, once.**
  No wage, no per-mission payout, no salvage rate anywhere in the systems layer.
  A kid with a tin under a loose board is a true thing about this protagonist,
  and a payout per completed mission would quietly turn a story about noticing
  into a story about earning. Everything after the tin comes out of the
  villains, which is the Robin Hood arc stated as an economy rather than as a
  speech. It also makes the first purchase a real decision: $41 buys a clean
  SIM and change, an intel tip on a good day, or a burner only if you wait for
  a surplus.

- **The heist is deliberately not the Act 3 heist.** Module 03 defers the named
  wallets to a content pass because they belong to Act 3's antagonists and the
  synchronized drain is the climax. So this one is Helio's Bellhaven operating
  float — a regional line item, nobody the story will put on screen, $8,600.
  Big enough to matter, small enough not to spend the ending. When the Act 3
  pass happens, the climactic wallets are new entries in `HEIST_TARGETS` and new
  scenes; **if `systems/heist.ts` needs to change to support them, that's the
  signal the finale is being improvised.**

- **The drain's Heat is split across two owners, on purpose.** Module 02 puts a
  wallet drain at +10 to +20, the highest single action in the game. The
  execution run charges the normal Hacking (+3–8) or Sabotage (+5–12) cost
  through the shared table and is previewed by `MissionBriefing`; `DRAIN_HEAT`
  (+8) is the rest and is previewed by the redistribution screen. A clean hack
  totals 11, a messy physical job 20. Both ends land where module 02 says, and
  neither number is hidden. Adding a third `MissionKind` for heists would have
  meant two resolutions against one mission id.

- **The split has no correct answer and the UI enforces that.** No recommended
  preset, no highlighted option, both consequences stated in the same voice at
  the same size. Tests assert both extremes work, because "most play lands in
  between" doesn't license either end being a bug.

- **A failed heist hardens the target; it never ends it.** Every route out of
  the first attempt — burned, backed out, or not tonight — lands on the second
  pass, which terminates either way. A heist that can be permanently lost is a
  hard fail state wearing a different hat.

- **The market is a place, not a menu.** It opens off the Fenwick location card,
  only once the player has been shown it, and it's the one Language B control
  on an otherwise Language A street.

## The reachability walk earned its keep immediately

It caught a bug I'd written: the heist's recon hub could spin forever when the
portal trace failed, because the failed branch changed no state and left the
option identical. The symptom surfaced three assertions away as a mission parked
on the wrong beat.

Fixed in content (the option hides once *tried*, not once *succeeded* — the
portal knows somebody asked), and the walk now names that class of failure
directly: `has no scene that can spin without progressing`.

Current numbers: **4,758 states · 33 scenes · 192 endings · 0 dead ends**, in
about two seconds. It reads `ALL_SCENES`, so Act 2 needs no changes to it.

## Things Phase 5 did not do

- **No safehouse.** Two catalog items are for one and there isn't one. They ship
  listed and unbuyable with the reason showing rather than being cut or sold to
  a player for whom they'd do nothing. See SCHEMA-NOTES gap 7 — it's a content
  placement, not a schema change.

- **No third heist approach.** Module 03 says 2–3 and this ships 2 (the phishing
  rig and the physical intercept). The "planted device" is authored content, not
  new mechanics, and belongs with a target that needs it.

- **Nothing to spend a heist payout on yet.** After the drain the player can
  hold $8,600 and buy a jammer, a forged ID and a burner. That's the whole
  catalog. This is the right shape of problem — the gear should have somewhere
  to be spent, and that somewhere is Act 2 missions, not more catalog.

- **`world.townTrust` moves and is only ambient.** Three locations carry a
  `trustAmbient` band that reads differently above 62. Per module 03's guardrail
  it is never announced and never a cutscene — a shutter is up, a letter arrived
  that nobody can trace. Add bands, don't add notifications.

- **`systems/market.ts` imports from `content/economy.ts`.** That's the systems
  layer reading content, which nothing else here does. It's deliberate: the
  catalog is data the system needs, and threading it through every call site
  would be noise. If a second thing wants to do this, that's the moment to
  reconsider, not before.

## Scaffolding built for Phase 6, with no Phase 6 content in it

The build prompt says to flag the betrayal back to design rather than write it
solo, so that is what has happened. What was built instead is the three things
Act 2 needs that are plumbing rather than story — all three were flagged as
missing in earlier handoffs, and none of them required inventing a beat.

**1. The `compromised` gate.** The schema has called
`skills.resistanceIntel.compromised` "the single flag that flips Act 2→3" since
0.1.0, and until now nothing could write it and nothing read it. Now:

- content can set it (`{ kind: 'skill', skill: 'resistanceIntel', compromised: true }`)
- a scene can declare which side of the betrayal it is written for
  (`requires.compromised`), and is withdrawn or released accordingly
- omitting it means the scene reads correctly either way, which most won't

The failure this prevents is specific and would otherwise be very easy to ship:
a scene written for a player who still trusts the adult resistance, still being
offered ten minutes after they found out. Tested both directions.

**2. `hunted` finally does what module 02 says it does.** The top tier was
raising prices and nothing else. Module 02 spends a paragraph on it triggering a
forced "lie low" story beat rather than blocking play, so `hunted` now opens a
scene at home — as an ordinary open thread, the way everything in this game
arrives. `SceneRequires.minTier` is the mechanism.

A test pins the guardrail that matters: the beat has to take enough Heat off to
leave the tier it fires in, because module 02 allows no hard fail state and a
top tier that can't resolve downward is one.

**3. Lying low is a player action again.** It was specced in module 02 and
existed only behind a debug button that drops out of a production build — so the
shipped game had a resource the player could raise and never lower. It is now a
control on the home location card with the cost on it, unavailable at `hunted`
until the breather has played, with the reason showing rather than the button
being dead.

**4. The crew screen**, which Phase 4 deferred until skills had somewhere to
point. The heist gave them one. It is a list of people, not a stat sheet —
Story Bible pillar 4 — and it is also where the betrayal lands: Bishop's entry
reads off `compromised` and changes when it flips. Built and reachable; nothing
writes the flag yet, on purpose.

### One note on the breather scene, since it is content

`src/content/breather.ts` is the only story I wrote this pass, and it is
deliberately small and Act 1-toned: a kitchen, a cup of tea, a parent who has
stopped asking where you were. It can fire at any point in the story, so it
can't lean on anything Act 2 hasn't established. Module 02 suggests a safehouse
for this beat; there isn't one yet. **When Act 2 places one, this scene is the
obvious thing to relocate and deepen — it is not precious.**

## Act 2 is implemented (Phase 6)

Fourteen scenes across three files under `src/content/act2/`, built from
`docs/09-content-skeleton-act2.md` — which was written first, and is still the
document to argue with if a beat is wrong.

**Sequencing.** Act 2 runs on its own mission cursor (`act2`), not on a chapter
string, so mentor content, the market and the heist all stay open alongside it.
A test enforces that no Act 2 scene gates on a chapter.

**The four floor scenes** (beat 8, one per crew member, any order) each carry
their own cursor rather than sharing beat 8. `requires.mission` names a single
cursor and four order-free siblings can't share one — and it also closes each
scene's door on entry rather than on completion, which is the same reload hole
the market's tin scene had. `validateScene` caught this; it was right to.

**What Act 2 changed elsewhere, deliberately:**

- The Phase 4 invariant "only ever grants a skill from a mentor unlock scene"
  was narrowed to *unlocks* specifically. It used to assert on every `skill`
  effect anywhere, which was the same thing right up until the betrayal —
  setting `compromised` is not a grant, it takes a skill's meaning away. A
  second test now pins that the only skill effect outside a mentor scene is
  that one.
- The reachability walk's guard went from 20,000 to 250,000 states, and two
  optimisations kept it usable: it now only tries choice indices and minigame
  outcomes a scene actually has, and the state signature counts only flags that
  can *gate* something (derived from the content, so it can't go stale). A flag
  nothing reads cannot change reachability, and Act 2 writes a lot of them for
  later callbacks. Without both, the suite went from 2.5s to 50s. It is now
  ~9s at 47,958 states, 46 scenes, 0 dead ends.

**The three skeleton decisions, as built:**

1. **The player finds the evidence; Bishop reads it.** Beat 6 returns a schema
   the protagonist explicitly cannot interpret — a test pins that beat 6 does
   *not* set `compromised`, because that gap is the entire design of beat 7.
2. **Mentor missions stay open.** Enforced by the cursor test above.
3. **Nova's arc reuses Milo's structure.** Both routes reach the midpoint; the
   cost is social and lands in beat 10 as a different scene, never as a locked
   door. Tested.

**One thing to hold onto in review:** Bishop's trust does not move in beat 7 on
either path. He is not thinking about the protagonist and the game shouldn't
pretend he is; it moves in beat 9, later and larger than any other mentor's.
There is a test named after this, because it is the easiest thing in the act to
"improve" by accident.

## The skeleton this was built from

`docs/09-content-skeleton-act2.md`, in module 08's format: ten beats, the
betrayal, and the three design decisions everything else follows from. It was
written as a document rather than as scene data on purpose — the build prompt's
guardrail is that the betrayal shouldn't be generated as a byproduct of coding
momentum, and a beat list can be argued with in a way that 3,000 lines of TS
objects cannot.

The three decisions, in short:

1. **The player finds the evidence; Bishop understands it.** Splitting it keeps
   the Story Bible's beat (he finds it first, in the sense that matters) without
   handing the player a cutscene at the emotional climax of the act. The seed is
   already shipped: the funding question he deflects in `mentor_bishop_4_unlock`
   is what the investigation pulls on.
2. **Mentor missions stay open through Act 2 and Act 2 doesn't touch them.**
   What Act 2 adds is `requires.compromised` on its own scenes.
3. **Nova's arc reuses Milo's test structure** — a visible easy path that works
   and costs her. Same shape, deliberately, because the two temptations are the
   same temptation.

It is implemented (above), but the document remains the place to change the
story. If a beat is wrong, fix it there first and re-derive the scenes.

## Phase 6 and 7 still need a content pass, not a coding session

Act 2 is now skeletoned (above). Act 3 is not, and is unchanged: the economy is the mechanical
half of Act 3's climax (a synchronized wallet drain timed to the broadcast), and
it works. The emotional half — the betrayal, and what the kids do once no adults
are coming — is still the hinge of the whole game and should be written
deliberately.

What Act 2/3 content can now assume exists and doesn't need building:

- Villain wallets as first-class state, discovered by recon, hardened by failure
- A market whose prices respond to the player's own jobs
- `intel_tip` as a working narrative shortcut that buys a real clue
- `signal_jammer` and `forged_id` with live mechanical hooks
- The Robin Hood split, with town trust that visibly moves

One thing not to "fix" if you extend the economy: **the tin is $41 and it is the
only one.** Adding a second income source is the single easiest way to turn this
into a game about money instead of a game about a kid who noticed something.

## Verification, and its limits

Same sandbox constraint as the last review: `npm install` can't run (no
registry). The suite was run under Node 22's native type stripping with a vitest
shim and a resolver for the project's extensionless imports.

- **Tests: 201 passed, 0 failed**, about nine seconds — most of it the
  whole-game walk.
- **Typecheck: clean** on the whole `.ts` logic layer under `strict`,
  `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.

**Please re-run these yourself:**

- The `.tsx` files are not typechecked — no `@types/react` available, and
  stubbing it produces phantom errors. `Market.tsx`, `Redistribution.tsx`,
  `SceneView.tsx`, `Overworld.tsx` and `MissionBriefing.tsx` all changed. Run
  `npm run typecheck` first thing.
- **`Market.tsx`, `Redistribution.tsx` and `Crew.tsx` have never been rendered.** The layout,
  the slider, and the way the ticker wraps on a narrow screen are all unverified.
  The logic behind them is tested; the pixels are not.
- `tsc` here is 6.0.3; the project declares `typescript ^5.6.3`.

## Unrelated, still not changed

`.lang-b` applies `--font-b` (a stencil/display stack) to whole surfaces, and
body copy only escapes because individual rules override back to `--font-a`.
The market screen made this worse by adding three more such overrides — it's the
most prose-heavy Language B surface in the game. It wants a `--font-b-body`
token at the art pass. Still an art decision, still left alone.
