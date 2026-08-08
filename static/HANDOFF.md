# Where this is and what's left

The game is playable start to finish. Act 1 through Act 3, both mechanics, the
economy, and an ending.

**256 tests, 0 failures. 55 scenes, all reachable, 0 dead ends across ~90,000
explored states.** Logic layer typechecks clean under `strict`.

---

## What shipped, by phase

| | |
|---|---|
| 1 | Schema, Heat, overworld, title transition |
| 2 | Trace (hacking) and Casing & the Window (sabotage), one config-driven component each |
| 3 | Act 1 — seven beats, playable slice |
| 4 | Four mentor missions on one four-beat template |
| 5 | Economy — black market, events, SHDW, seed-phrase heist, Robin Hood split |
| 6 | Act 2 and the betrayal (`docs/09-content-skeleton-act2.md`) |
| 7 | Act 3 and the ending (`docs/10-content-skeleton-act3.md`) |

Both act skeletons were written as documents and argued with **before** they
became scene data, per the build prompt's guardrail. If a beat is wrong, change
the skeleton first and re-derive the scenes — the docs are the source, not the
TypeScript.

## The tripwire didn't fire

The Phase 5 handoff said: *if `systems/heist.ts` needs to change to support Act
3's wallets, that's the signal the finale is being improvised.*

It didn't. Three named targets, three balances, a coordinated drain — all of it
sat on the existing system unchanged. `drain()` is still called once per wallet
exactly as designed; composing three into one decision turned out to be a UI
concern and stayed one (`Redistribution` takes `walletIds` and sums the same
previews the single-wallet case uses).

That is the strongest evidence available that Phase 5 was built right.

## Things Act 3 changed, and why

- **`SceneChoice.requiresAllFlags`.** `requiresFlag` names one flag, which is
  enough for a branch and not enough for a gate. Act 3's recon hub only opens
  its exit once all three villains are researched — the villains are an
  arrangement, and taking two of them out is not a thing the story permits.
  Scene-level `requires.flags` already had this AND; choices shouldn't be weaker
  than the scenes they sit in.
- **`redistribute` takes `walletIds`.** See above.
- **A new location, `ballpark`.** It is the hijack venue and the final image:
  same bleachers, same screen, months apart, nobody watching either time. That
  rhyme *is* the ending, so the two scenes share a location rather than being
  two places that sound alike.
- **The reachability walk got faster three times over.** The graph went from
  4,800 states to 90,000 across Acts 2 and 3, and the walk went from under a
  second to fifty. Three narrowings, all on the same principle — *only count
  what can actually gate something*:
  - only try choice indices and minigame outcomes a scene actually has, and skip
    `abort` where it routes exactly where `fail` does
  - the state signature counts only flags that appear in some gate (derived from
    content, so it can't go stale) and only mission *beat cursors*, not
    attempts, cooldowns or hardening, none of which `offered` reads
  - the flag portion is a fixed-order bitstring rather than a sort per state

  It is ~20s of the 24s suite. That is the price of proving the whole composed
  game has no dead ends, and it is worth paying, but it is the reason the suite
  is no longer instant.

## What the tests are actually protecting

Beyond the usual, a few pin things that are easy to "improve" by accident:

- **Bishop's trust does not move in the betrayal scene**, on either path. He is
  not thinking about the protagonist and the game shouldn't pretend he is.
- **Beat 6 of Act 2 does not set `compromised`.** The player holds the file
  without the meaning; that gap is the entire design of beat 7.
- **No dialogue in Act 3 explains the Gen A mark.** Three acts of setup are
  spent if one character points at it.
- **No character thanks the protagonist in Act 3.** Narration may observe that
  nobody does — the first version of that test failed on exactly that sentence,
  which was the right kind of pedantry to catch once and aim properly.
- **Sorrell is never converted.** There is no scene where he is confronted and
  cracks. The machine does not require anyone to be evil, and the temptation to
  give him a moment of realisation will come up every time this act is touched.

## The art-and-balance pass (last)

Three of the outstanding items are now done, and one produced a finding.

**The Gen A mark exists.** `src/ui/GenAMark.tsx` — one component, three states,
drawn as SVG rather than lettered so the circle can actually be a stroke that
completes. `clean` is Language A and has no circle at all; `claiming` is
hand-cut with the arc unfinished and a gap at the top left where a right-handed
person with a marker runs out; `closed` is the full circle-A, heavier, nearly
registered. There is a misregistration plate in the spot colour on the two
hand-made states and none on the official one, because Language A is flat and
too polished and giving it grain would say the wrong thing about it.

`markStateFor(chapter)` derives the state, so content never passes a literal —
the progression stays a design checklist item across three acts rather than
something a scene can get wrong. It appears in two places: the title screen,
where it turns over with the wordmark during the existing Language A → B
transition, and one node at Founders' Day (`showMark`), cut in hard on steps
rather than eased. Nothing anywhere explains it, and the test that fails if a
line of dialogue does is still passing.

**`--font-b-body` exists, and the escape hatches are gone.** Language B needed
two faces and pretending otherwise was a bug carried for three phases: the
display stack landed on body copy, so every Language B component overrode back
to the *official* rounded face to escape it, which meant the resistance's prose
was rendering in the enemy's typeface, held up by per-component overrides
instead of the token layer. `.lang-b` now sets a photocopied mono for prose and
headings/buttons opt back into the stencil. The overrides are deleted from
`market.css`, `crew.css`, `redistribution.css` and `scene-view.css` — the last
of those is the interesting one, because those rules forced the official face on
scene dialogue in *both* languages, so removing them is what finally lets a
resistance scene sound like one.

**Balance is simulated, and Act 1 turned up a doc conflict.**
`src/content/balance.test.ts` plays the whole game — routing minigames through
`resolveRun`, so the real Heat table, day clock and decay all apply — as a
careful player and as one who fails everything. Measured:

| | Act 1 close | whole game |
|---|---|---|
| careful | **12** (`clear`) | **59** (`flagged`), day 9 |
| failing everything | 12 (`clear`) | 78 (`hunted`) |

Act 1 lands on module 08's stated 10–15 exactly, and the whole careful run lands
inside the Story Bible's 55–70 for the Act 2 close. Those are now assertions.

**The conflict:** module 08 says Act 1 should end "around 10–15 … (low
`watched` range)", and module 02's tier table puts `watched` at 25–49. Ten to
fifteen is upper `clear`. Both cannot be followed. The number is what shipped,
because module 02 owns tier boundaries, and because the number is the thing that
was chosen deliberately — inflating Act 1 to 25+ to make the label true would
put the world into ambient-caution mode before the player has met anybody, which
is the tone the number exists to protect. **Worth a one-word fix in module 08.**

The failing run also produced the nicest end-to-end result in the suite: it
reaches `hunted` partway through, the forced breather beat actually fires in
play, the run continues, and the meter climbs back afterwards — a breather, not
an absolution. That is module 02's whole design for the top tier, checked in
play rather than by setting a tier by hand.

## The last two specified-but-unimplemented things

A pattern worth naming, because it kept paying: three times now the most
valuable work available was a field that had been in the schema since 0.1.0
with nothing reading or writing it. `skills.resistanceIntel.compromised` was
one, `world.safehouses` was the second, `settings.audioMuted` was the third.
Both remaining ones are closed.

**The safehouse exists.** It is the boarded unit on Marlow Street — the one the
Robin Hood ambience has been mentioning since Act 2's midpoint, with the shutter
open and somebody painting inside and nobody knowing who paid the arrears. It's
optional, off the spine, and available once the crew goes independent; nothing
in Acts 2 or 3 requires it, because those were written and tested before it
existed and retrofitting a dependency into a finished act is how a finale
acquires a hole.

It closes the economy loop that has been open since Phase 5. The two safehouse
goods in module 03's catalog are buyable for the first time, and they install
where they belong rather than sitting in inventory — you cannot carry a power
rig around, and an item that sits in a bag doing nothing is the kind of thing a
player rightly stops trusting the market about. `unavailableReason` computes
"Nowhere to put it yet" → buyable → "Already in" with no content edit.

**Two things there are inferred, not spec'd, and marked as such in
SCHEMA-NOTES.** No module says what *burns* a safehouse; the reading taken is a
job that fails while the town is already watching (`flagged`+), with the Lock
halving it as module 03 describes. And the Power Rig's "base for higher-tier
missions" is read as somewhere you can stay and work — it deepens the Heat decay
of a night there rather than gating a tier, because tiers are story-gated
everywhere else and a purchasable second gate would make skill progression
buyable, which the whole design refuses.

A burned safehouse comes back on its own after four days. Losing it for good
would be a hard fail state wearing a different hat.

**Sound exists.** `src/systems/audio.ts` — six cues, every one synthesised from
oscillators at call time, so the game still ships as a static site with zero
asset weight and zero network fetch. Every entry point is a no-op when audio is
unavailable or muted; a cue that throws must never take a mission down with it.

The palette is data and the design note is asserted as a number: module 04 asks
for a trap to land as "a 'close call' jolt, not a harsh failure buzzer", so the
trap cue bends *down*, isn't a square wave, isn't the loudest thing in the
table, and is over in 160ms. There is a test that fails if any failure cue ever
rises.

**Decided, not deferred: the breather scene stays at home.** Module 02 suggests
a safehouse for that beat and there is now a safehouse, so this was a real
choice rather than a leftover. It stays because the scene is about a parent who
has stopped asking where you were, and that is a kitchen. Module 02's
"safehouse" was an example of a quiet place, not a requirement.

## The town is drawn

`src/world/draw.ts`. The overworld was coloured rectangles on a flat plate;
it is now the limited-palette suburban dusk the style guide asks for, at the
fidelity the budget note allows — shapes and light rather than drawn tiles,
with the hand-drawn allowance still reserved for portraits, unlock scenes, the
broadcast and the final image.

Three things it does on purpose, and all three are theme rather than decoration:

- **It is always dusk.** Not night, which would be sinister, and not day, which
  would be cheerful. Dusk is the hour a kid is still out and should probably be
  heading back, which is the whole of Act 1 in one lighting choice.
- **Windows are lit and the streets are empty.** Every house has somebody in it
  and the protagonist is outside all of them. Isolation is the starting wound
  (pillar 4) and this is the cheapest way to say so without a line of dialogue.
  The lit/unlit pattern is seeded per building so the town doesn't blink.
- **Language B locations warm the ground around them.** Module 07's pocket
  environments, done as a glow under the buildings rather than as a re-theme:
  the town is cool and the places the crew have made are the only warm light at
  street level.

At `flagged` and above, Language A buildings get a one-line scanline tear —
Style Guide 07's "Language A elements can start subtly glitching at the edges".
Language B never glitches. It was never claiming to be smooth.

The sprite is four flat shapes with a hairline that shifts on facing, so it
reads as turning without four sheets of frames.

## Sound is wired everywhere it belongs

All six cues now fire: the trace's pulse, reveal and close-call trap, the
sabotage window's Alertness rise, the clean getaway on both mechanics, and the
rupture on the glitch — which fires from inside `Glitch` itself, so the sound
and the visual cannot drift apart.

Clean gets a cue and messy doesn't, on both mechanics. It isn't a reward sound;
it is the sound of nothing having gone wrong, which is the only kind of
congratulation this game does.

There is a test that reads the source and fails if a cue is ever added to the
palette and left uncalled — a synthesiser with dead entries is the audio version
of an item sitting in a bag doing nothing.

## What is genuinely not done

**1. Nothing has ever been rendered.** This is the big one. No `@types/react`
in the sandbox, so no `.tsx` file is typechecked, and no screen in this game has
been drawn. `npm install && npm run typecheck && npm run dev` is the first thing
to do, and expect to find real problems — particularly in `Market.tsx`,
`Redistribution.tsx` and `Crew.tsx`, which were written blind.

**2. The hand-drawn allowance is unspent.** The mark and the town are done. What
the style guide still reserves budget for: dialogue portraits, the four mentor
unlock scenes, the Act 3 broadcast frame, and the final image. Those are the
five places worth paying an illustrator for, and nothing else needs it.

**3. Real typefaces.** Both font stacks are system fallbacks so the game runs
with zero network fetch. `--font-b` wants a real stencil and `--font-b-body` a
real photocopied mono; drop files in `/public/fonts` and extend the stacks.

**4. Balance has been simulated, not felt.** The curve is now measured and
asserted (above), which catches drift but says nothing about whether any of it
is *fun*. Pacing, how long a Trace grid takes to read, whether a Window beat's
twelve seconds is tense or panicky — none of that is knowable from here.

The one number the simulation confirms is wrong: the first heist pays 8,600
against a catalog that now totals 680. The safehouse absorbs 230 of it, which
helps and does not solve it. The remaining fix is Act 2 missions that consume
gear rather than more catalog, and there is a test recording the ratio so the
gap stays visible while it closes.

**5. None of it has been seen or heard.** This is the whole of what's left. The
town, the mark, the typography and all six cues are written from reasoning, not
from looking or listening. Everything downstream of `npm install` — does the
dusk read as melancholy or as murky, is the trap cue a jolt or a thud, does the
market wrap on a phone — is a judgement nobody has made yet.

## If someone picks this up cold

Read `README.md`, then `SCHEMA-NOTES.md`, then the two skeleton docs. The
codebase's one real convention is that **content is data and systems never name
a piece of content**; the second is that **every scene closes its door on entry**
(a mission cursor or a chapter), because node effects fire on entry and the
completion flag lands at the end, and the gap between them is a reload exploit.
`validateScene` enforces the second one and has caught it twice.
