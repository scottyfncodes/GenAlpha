# Dialogue Audit — Acts 1–3

A content pass, not a story pass. Scope: every file under `src/content/`
(Act 1, Act 2, Act 3, the four mentor missions, the market, the safehouse,
the breather, the heist, the feed, the case file) plus the systems that
surface it (`systems/scenes.ts`, `systems/mentors.ts`,
`systems/consequences.ts`). 58 scenes, ~8,000 lines of authored TypeScript,
136,280 reachable states, 768 endings, 0 dead ends per
`content/reachability.test.ts`.

Every claim below is marked:

- **DISCOVERED** — confirmed by reading the actual scene data in this repo.
- **PROPOSED** — a recommendation. Not yet true of the codebase unless a
  later section says it was implemented.

---

## 1. Overall findings

**DISCOVERED.** The brief's own diagnosis undersells the character
dialogue and correctly identifies the narration. Read scene by scene, the
four mentors, Ellen, Mom, Ines and Ridge do **not** read as one writer doing
voices — Milo's clipped fragments, Aaron's uncapitalised typing, Bishop's
run-on warmth, Deja's flat refusals, Ines's transactional brevity and
Ridge's breezy self-interest are distinguishable with the speaker tag
covered. That is the game's strongest asset and this pass does not touch
it (see §7).

The place the brief's complaint actually lands is the **unattributed
narration** — the `text` lines with no `speaker`, which `render()`
(`systems/scenes.ts:495`) documents as always being the player's own
voice. That voice is stylistically constant across all three acts: short
declaratives, present-tense observation, a recurring "It is not X. It is
Y." parallelism, and a habit of closing a beat with a one-sentence verdict
("It is administrative." / "He wasn't lying." / "That is the entire
lesson."). It is very good prose. It is also the same register whether the
character is fourteen and irritated, fourteen and elated, or fourteen and
frightened, and the brief is right that a whole game of it starts to read
as one voice interpreting events rather than a kid having them.

The second real finding is structural, not stylistic: **the scene system
had no mechanism for a line of dialogue to react to anything except Heat
tier.** `SceneChoice` has carried `requiresFlag` / `hiddenIfFlag` /
`requiresItem` since Act 1; `SceneLine` had only `minTier` / `maxTier`.
Story flags are written constantly (43 distinct `kind: 'flag'` effects
across `src/content/`) but the overwhelming majority are write-once,
read-once — set by the scene that earns them and never mentioned again
anywhere else in the game. That is the literal mechanism behind "the world
doesn't feel like it remembers what I did," and it is the highest-leverage
fix available, because it is additive: new gated lines layer on top of
existing scenes without touching a word of the text that already works.

---

## 2. Character voice audit

Per character: vocabulary, rhythm, humour, avoidance, what they discuss
unprompted, what they never say, how they take pressure, and how they
differ from the protagonist's own narration. Line counts are dialogue-only
(`speaker:` lines), from `src/content/**`.

### Milo — 42 lines (`content/mentors/milo.ts`, `content/act2/nova.ts`)
Short declaratives, almost no subordinate clauses, no exclamation points at
all. Deflects with dry understatement ("That's the whole biography, don't
get excited") rather than jokes. Talks shop (tools, screws, boards) even
when the subject is heavy — the iron goes down on its stand before he says
anything true. Never explains why he's teaching the lesson he's teaching;
the lesson is the whole conversation and then it's over ("Don't make it a
whole thing"). Under pressure he gets *shorter*, not louder — "no", flat,
no pause before it. Distance from the protagonist's narration: total. He
is the one character who would find the narrator's own parallelism
insufferable, and the text knows it.

### Deja — 49 lines (`content/mentors/deja.ts`, `content/act2/*`)
Precise vocabulary about materials and labour (bracket, cable seat,
contract, review) because it's true of her actual life, not because it's
thematic. Sentences land flat and declarative, then occasionally break
into a longer aggrieved run when something touches her mother's job — the
one subject where she doesn't clip herself. Humour is dry and procedural
("The frame is *characterful*"). Never says she's frightened; says
logistics instead ("Yard. Nine. Bring nothing"). Under pressure she gets
*more* organised, not less — three steps ahead, stripping a junction she
didn't need to touch. Distinct from Milo (who withholds because he thinks
you should find things yourself) and from the narrator (who withholds
nothing — Deja's silences are load-bearing, the narrator's aren't).

### Aaron ("Files") — 35 lines (`content/mentors/files.ts`, elsewhere)
The one character with a typographic voice, not just a verbal one:
lowercase, no apostrophes, minimal punctuation, in dialogue boxes
(`'dont chase it. read it'`) — visibly a kid typing, not a kid talking.
Radically economical; "ok" is a complete reply. Communicates by showing,
not telling (turns the laptop around instead of narrating). Never asks a
direct emotional question and rarely answers one straight — "why are you
telling me this?" gets a shrug and "you asked me for stuff. now you have
some." Under pressure goes *flatter*, not colder exactly — "ridge told
three people by lunch. thats what ridge is for" reads as data, not anger,
which is somehow worse. This is the character furthest in form (not just
content) from the narrator's own polished sentences, and it should stay
that way.

### Bishop — 33 lines (`content/mentors/bishop.ts`, `content/act2/betrayal.ts`)
The warmest talker in the cast and the only one who runs on, mid-thought,
self-interrupting ("Right, so — you've been doing all this on your own,
which, respect, but also: why?"). Genuinely delighted by people, generous
with credit, allergic to formality ("Nah, you're fine" instead of an
actual vetting). Never questions the institution he's part of until the
betrayal forces it, and even then reaches the word himself rather than
having it supplied. Under the one real pressure he faces (Act 2 beat 7) he
gets *quieter*, stops mid-sentence, and leaves — a total register shift for
this specific character that reads as devastating precisely because
everything before it was so unguarded.

### Ellen — 21 lines (`content/act1.ts`, `content/act2/nova.ts`, `content/act3/prep.ts`)
Bright, quick, genuinely warm — and structurally unable to hear a boundary
as a boundary ("Off from what?" is not sarcasm, she means it). Talks in
production vocabulary (bit, redo, GRWM, the numbers) about her own life
without noticing that's strange. Humour is chatty and immediate. Never
says no to her mother and the text never makes her say it — her one
"condition" (Act 3's live-once-and-then-I'm-done) is the closest she gets
in the whole game, and it's still phrased as a favour to herself, not a
confrontation. Under pressure she gets *brighter*, not smaller ("Oh — no,
that's fine!") which is the single saddest voice-behaviour trait in the
cast, precisely because it never breaks into visible distress.

### Mom — 11 lines (`content/act1.ts`, `content/breather.ts`)
Economical, factual, always doing two things during a scene (coat, phone,
kettle). Loves in logistics ("There's a bagel. There's also a bagel-shaped
thing I ruined") rather than in statements about love. Repeats herself
under stress ("I know. I know I did") rather than escalating. Never
apologises at length. The breather scene's whole point is that she has
*stopped asking questions she knows she won't get answered* — a specific,
adult form of grief the narrator never gets to have about anyone.

### Ines — 10 lines (`content/market.ts`, `content/heist.ts`)
Brisk market-trader cadence, states prices and rules as facts, has a maths
textbook open the entire time and is *actually doing it*, not performing
studiousness. Deadpan, minimal warmth on the surface, but "You're Aaron's
friend, sit down" is doing quiet work. Never explains the economics beyond
what's needed to transact. Doesn't react to news the way anyone else does
— take the tip money without counting it, go back to the maths — because
for her this is Wednesday, not a plot point.

### Ridge — 11 lines (`content/mentors/files.ts`)
The closest thing to comic relief in the cast and it comes entirely from
obliviousness, not jokes — "That's not really a secret, that's a
complaint" and "It's not a bank, I can't just close the account" are both
completely sincere. Talks in trades and favours. Never registers that a
name is a thing that happens to somebody until it's spelled out to him,
and even then shrugs it off in-character ("Whatever. Everyone forgets by
Monday"). The one character whose function is comic without ever breaking
tone into "a joke."

### Minor/one-line voices — Mr. Arroyo, Councilwoman Reyes, Reeta, Beau
All correctly restrained to one or two lines and each does real work in
that space: Mr. Arroyo's "That's all I've got, and honestly that's all I
need" (institutional complacency, not malice); Reeta's "She says evidence
like a woman who has filed things" (competence as characterisation, no
dialogue needed beyond it); Beau's "Do I have to do it happy or normal"
(a whole childhood in nine words). **Do not expand these.** Their power is
that they don't get more room.

### Cross-cast finding
**DISCOVERED.** The eight named recurring voices above are already
differentiated on every axis the brief asks about — vocabulary, rhythm,
humour, avoidance, stress response. None of it uses slang; none of it uses
caricature. This is a case of the brief's stated *symptom* (uniform voice)
correctly describing the narration and incorrectly describing the cast.

---

## 3. Protagonist voice audit

**DISCOVERED.** The unattributed narration is deliberately the
protagonist's own voice (`systems/scenes.ts:495`, `render()`'s doc
comment: "narration ... is always the player's own [voice]"). Reading all
three acts back to back, four traits recur often enough to read as the
narrator's personality rather than the writer's:

1. **The closing aphorism.** A beat routinely ends on a single polished
   sentence that states what just happened means: *"It is administrative."*
   *"He wasn't lying."* *"That is not a consolation prize. It's a
   schedule."* These are good lines. There are a lot of them, and they are
   uniformly the same *shape* — short, declarative, slightly ironic,
   grammatically complete — regardless of whether a fourteen-year-old
   would actually land a clean verdict on the feeling they're having.
2. **The "It is not X. It is Y." construction.** Recurs across all three
   acts (Act 1's "Not three strange things. One thing, three times,"
   Act 2's "It is administrative," Act 3's "None of it is one whole
   thing... it is pieces of things"). Elegant once or twice; as a
   recurring tic across ~30 uses it starts to read as house style rather
   than a kid's thought.
3. **Near-total emotional fluency.** The narration almost always knows
   exactly what it is feeling and can name it precisely. A real fourteen-
   year-old more often *doesn't* have the word yet — Act 1 beat 5 actually
   dramatises this correctly ("You don't have the words for it yet. You
   have a shape where the words go") and it is one of the best lines in
   the game *because* it's the exception. It should be less of an
   exception.
4. **Almost no "dumb" register.** Petty irritation, bad puns, getting
   momentarily distracted by something irrelevant, misreading a room,
   flat-out incomplete thoughts — the brief's whole list — essentially
   never happens. The single closest instance in the game is Act 1's
   "Then a skate clip — some kid half your age landing something you
   still can't" (a genuinely petty, specific, funny detail) and it is
   *narration about the phone feed*, not narration about anything that is
   happening to the protagonist directly.

None of this is a flaw in any individual scene. It is a corpus-level
pattern that's invisible reading one scene at a time and obvious reading
all fifty-eight in a row, which is exactly the brief's stated concern.

**PROPOSED**, not implemented in this pass (see §8, "not done"): a
line-level pass across Act 1 and early Act 2 to (a) vary the closing-
aphorism rhythm — end more beats on gesture, silence or gameplay instead
of a verdict sentence, per the brief's own before/after example — and
(b) plant more incomplete, petty or flatly wrong observations in the
narrator's own voice, the way "half your age landing something you still
can't" already does once. This was **not attempted in this session**: the
existing prose is tightly authored (every file carries its own design
rationale in comments, several load-bearing per line — see §7), the
"right" trim is a matter of authorial taste rather than a mechanical fix,
and a wrong edit degrades a scene that currently works. Rewriting ~30
instances of a stylistic tic without a reviewable, revertable unit of
change per edit is exactly the kind of low-confidence, high-blast-radius
work this pass's brief says to defer. See §8 for how to sequence that work
safely (one act at a time, in its own reviewable change, against the
model scenes in §7 as the calibration reference).

---

## 4. Dialogue density / exposition findings

**DISCOVERED — the game already under-explains rather than over-explains
on the systems side.** Nothing in the scene data explains SHDW, the Heat
system, camera mechanics, or sabotage mechanics — those are taught by
`ui/minigames/MissionBriefing` and by play, never by a character. Style
Guide 07's rule ("noticed, not explained") is honoured consistently: the
Gen A mark is never named by any character in three acts
(`content/act3/finale.ts:19`, enforced by `content/act3/act3.test.ts`);
nobody thanks the protagonist, ever (enforced by the same test); the
verdict at the very end is never read aloud.

Where exposition *does* happen, it is almost always delivered as
character texture rather than as a lecture — Milo's grant-reading test,
Bishop's "read whatever you want, everyone reads everything," Aaron
turning the laptop around instead of explaining hacking. This is the
model the brief asks for, already in place.

The exposition that *is* over-supplied is the **narrator's own
after-the-fact reading of a scene** (§3, trait 1) — not facts the player
didn't have, but a closing interpretation of facts the player just watched
happen visually or through dialogue. Applying the brief's own density
checklist:

> Does the player need this line? Does it create curiosity? Is the
> information already visible? Could the scene breathe without it?

...the closing-aphorism lines are the ones that most often fail "is the
information already visible" — the *scene itself* (Beau stepping out of
frame unprompted; Ellen's laminated month; the tacky paint at Pole 5-C)
already tells the player what they need to know, and the aphorism after it
restates the theme in a cleaner sentence than the player would have
reached on their own. That restatement is the exact "trust the player"
gap in §2 of the brief.

**No scene in this pass was found to be padded with unnecessary
setup/explanation/wrap-up beyond that pattern.** Scenes are short (2–6
nodes typically), node text is 1–4 lines, and the hub-and-checklist
pattern (Act 1 beat 6, Act 3 beat 3) already lets the player leave early
rather than forcing every branch. This is a healthy corpus on density; the
finding is narrow and specific to the closing-aphorism habit above.

---

## 5. Reactive-dialogue opportunities

**DISCOVERED — existing reactive infrastructure.**
`SceneLine.minTier` / `maxTier` (Heat-tier gating) has existed since 0.4.0
and is already used in four places, one per mentor's Beat 2 ("Ask") scene:
Milo's shop shuts early and bolts the door at `flagged`+
(`content/mentors/milo.ts:77`); Deja won't let you past the gate
(`content/mentors/deja.ts:87`); Bishop double-checks the road before
saying your name (`content/mentors/bishop.ts:105`); Aaron moves the crate
out of the road's sightline (`content/mentors/files.ts:83`). This is
**exactly** the brief's "High Heat → NPC becomes more cautious" example,
already shipped, in every mentor's arc. It should be held up as the
pattern to extend, not treated as a gap.

`SceneChoice.requiresFlag` / `hiddenIfFlag` / `requiresItem` has existed
since Act 1 and is used for state-aware *choices* throughout (hub scenes
that remove an option once it's been taken; Milo/Aaron's branches that
read prior player action). What did **not** exist, until this pass, was
the same mechanism for a plain line of dialogue or narration — meaning
reactivity could change *what a player can pick*, but not *how an NPC
talks to them* about something that already happened. That is the gap
this pass closes structurally (§6).

**DISCOVERED — flags set once and never read again.** Of 43 distinct
story flags written by `kind: 'flag'` effects in `src/content/`, the
following are set by a scene and never referenced by any later scene,
line, or gate (checked against every `requiresFlag` / `hiddenIfFlag` /
`requires.flags` / `SceneLine.requiresFlag` in the corpus):
`cyberdeck_plan_started`, `files_located`, `casey_house_checked` (used only
by the case file), `camera_misplaced_me` (ditto), `bishop_first_op_complete`,
`nova_channel_seen` / `nova_schedule_seen` (case file only), and — the most
consequential miss — `told_bishop_directly` / `told_bishop_late` /
`never_told_bishop`, three flags that record precisely *how* the player
handled the game's most important choice, written once at Act 2 beat 7
and then never read by anything, including Bishop's own return two beats
later.

**PROPOSED opportunities, roughly in order of narrative weight** (♦ =
implemented this pass, see §6 and §8):

1. ♦ **Bishop's return should know how he found out.** The single
   highest-value miss in the corpus — three flags exist specifically to
   record this and nothing read them.
2. ♦ **Milo's AI-shortcut choice should echo into Act 2's parallel
   choice** (Ellen's archive), which the file's own header comment says is
   deliberately the same temptation — the callback existed nowhere in the
   actual dialogue.
3. ♦ **A hunted-tier catch should be a specific memory for Mom, not a
   generic one** — `HUNTED_CATCH_FLAG` existed in `systems/consequences.ts`
   and was never exported for content to react to at all.
4. ♦ **Deja should remember whether the player covered for her**
   competently, the same information Bishop-in-§1 has and currently
   doesn't use, applied to Deja's own Act 2 low point.
5. **Camera/junction-box sabotage the player has actually done** — Act 2
   beat 5 ("Small Wins") already narrates ambient consequences of
   sabotage in general ("A pole on 5th has been out for nine days ... one
   of them is because of you"), but this is unconditional narration, not
   keyed to *which* pole the player actually took down
   (`world/collectibles.ts` tracks `collectedNodes` per camera). Wiring a
   specific camera ID into that beat's text is a natural next step but
   was judged out of scope for this pass: it requires threading
   `collectedNodes` state into content, which today only the world/HUD
   layer reads, and that's systems work beyond "swap a line."
6. **Player-drone scouting** — `world/playerdrone.ts` writes no story
   flag at all today (confirmed: `grep flags\[` on the drone systems
   returns nothing). Before any dialogue can react to "the player flew a
   drone," the drone systems need to record that they were used. Flagged
   as PROPOSED, not implemented — it's a systems change, not a content
   change, and this pass's brief is explicit that systems work is out of
   scope.
7. **Unusual salvage recognised by an NPC** — `requiresItem` already
   exists for *choices*; extending the same field to `SceneLine` (same
   shape as this pass's `requiresFlag` addition) would let an NPC's line,
   not just an option, react to inventory. Small, mechanically identical
   to what shipped this pass, and deliberately left for a follow-up
   change so this one stays reviewable as "flags" rather than "flags and
   items."
8. **Explored-an-unusual-area callbacks** — no location-visited flags
   exist in the schema today (`world.safehouses` and `player.currentLocation`
   are the only location-shaped state). Would need a small, generic
   "visited location X" flag-writer in `GameContext`, which is systems
   work and out of scope here.

---

## 6. Scenes changed in this pass

All four changes are **additive only** — new `SceneLine` entries gated by
`requiresFlag`, appended to existing nodes. No existing line of dialogue
was edited, reordered, or removed anywhere in this pass. Each new line was
checked against the speaking character's own voice audit in §2 before
writing it, and against the specific "never says X directly" rule for that
character (Bishop never apologises and is never forgiven — his two new
lines don't apologise; Milo never lectures — his two new lines don't name
what they're referencing; Deja doesn't sentimentalise — hers stays flat).

- **`content/act2/betrayal.ts` — `act2_9_bishop_comes_back`.** Bishop's
  opening beat now carries two mutually-exclusive gated lines
  (`told_bishop_directly` / `told_bishop_late`) and the `nine_seconds`
  node carries one gated narration line (`never_told_bishop`) — the one
  case Bishop himself can't react to, since he was never told, so it
  stays in the player's own head rather than in his dialogue. This is
  §5's #1.
- **`content/act2/nova.ts` — `act2_4_the_easy_way`.** Milo's "Both work"
  line now carries two gated follow-ups (`milo_took_shortcut` /
  `milo_did_legwork`) that acknowledge the player's history with him
  without naming the parallel to Ellen's archive — preserving the file's
  own stated rule that the game never says the parallel out loud. §5's
  #2.
- **`content/breather.ts` — `breather_1_the_kitchen`.** Mom's opening beat
  gains one gated line (`HUNTED_CATCH_FLAG`, now exported from
  `systems/consequences.ts`) for a player who has actually been arrested
  before, distinct from a player who has only accumulated Heat passively.
  §5's #3.
- **`content/act2/betrayal.ts` — `act2_8a_deja`.** Deja's low-point scene
  gains one gated line (`deja_jobsite_covered`) acknowledging the
  specific competence the player showed months earlier in her own mentor
  mission. §5's #4.

### Systems change backing all four

`systems/scenes.ts`: `SceneLine` gained `requiresFlag?: string` and
`hiddenIfFlag?: string`, mirroring the fields `SceneChoice` has had since
Act 1. `visibleLines()` gained an optional third `flags` parameter
(defaults to `{}`, so every existing call site keeps compiling and every
existing test keeps passing unchanged) and filters on the new fields the
same way it already filters on `minTier`/`maxTier`. `validateScene()`'s
"a node can render empty" heuristic was extended to also flag a node
whose every line is flag-gated, the same defensive check it already runs
for tier-gating. `ui/SceneView.tsx` now passes `save.player.flags` through
to `visibleLines`. `systems/consequences.ts`'s `HUNTED_CATCH_FLAG` was
exported (was previously module-private) so content can read it.

Verified: `npm run typecheck` clean; `npm test` — 578/578 passing across
40 files, including the 136,280-state reachability walk
(`content/reachability.test.ts`) and every existing mentor/Act 2/Act 3
invariant test, unchanged.

---

## 7. Scenes that should NOT be touched

Per the brief's own list, confirmed by re-reading each in full — these are
the calibration reference for any future pass, not just a protected list:

- **Mom's breakfast** (`content/act1.ts`, `B1_OPEN.kitchen`) — the bagel
  line, the coat already on, the thumb that never stops moving and still
  knows where the good bagel is. Nothing to add; two lines of dialogue and
  two of narration carry more characterisation than most three-node
  scenes in the corpus.
- **Ellen's creator/performance behaviour** (`content/act1.ts`,
  `B5_NOVA`; `content/act2/nova.ts`, `SCHEDULE`) — the ring light already
  up before she asked, the laminated fridge grid, "do the thing"/"do I
  have to do it happy or normal." The whole point is that nobody in the
  scene remarks on how strange it is; adding a line that does would break
  it.
- **Beau's "happy or normal"** (`content/act1.ts:503`) — nine words,
  a whole childhood. Do not expand.
- **Milo's clipped repair-shop voice** — held up in §2 as the model for
  economy; already as tight as it should be.
- **Casey's disappearance** (`content/act1.ts`, `B2_SMALL_WRONGNESS`,
  `B2B_THE_HOUSE`) — "Casey didn't say goodbye. Casey said goodbye when
  they went to the bathroom," the spoon in the cereal bowl, the swing set
  still moving. Mystery through inconsistency, exactly as the brief
  describes it; do not resolve or foreshadow further.
- **The spoon/cereal-bowl beat** — see above; the single sentence
  "Nobody packs a house and leaves the spoon" is the whole scene's
  argument and needs nothing after it.
- **Surveillance language in ordinary contexts** — Mom reading "the
  cameras... they're for our benefit" "in a voice that isn't hers"
  (`content/act1.ts:445`), the terminal-check headline ticker
  (`content/act1.ts:69-74`), the feed entries (`content/feed.ts`) written
  entirely in council-notice register. Consistent throughout and correct
  as-is.
- **The Act 2/3 design-law scenes** — `content/act2/betrayal.ts`'s three
  stated rules (nobody raises their voice; Bishop never apologises and is
  never forgiven; his trust doesn't move in beat 7) and
  `content/act3/finale.ts`'s four (nothing louder than the betrayal;
  nobody thanks the protagonist; the verdict is never read aloud; no
  dialogue explains the Gen A mark) are load-bearing and enforced by
  `content/act2/act2.test.ts` and `content/act3/act3.test.ts`. Any future
  edit to these files must re-read those comments first — they are not
  incidental, they are the spec.

---

## 8. Prioritised implementation list

**Done this pass** (all additive, all covered by §6, all green under
`npm test`):
1. `SceneLine.requiresFlag` / `hiddenIfFlag` (systems capability).
2. Bishop's return reacts to how he found out about the betrayal.
3. Milo's Act 2 echo of the Act 1 AI-shortcut choice.
4. Mom's breather scene reacts to an actual `hunted`-tier arrest.
5. Deja's Act 2 low point reacts to her own mentor mission's outcome.

**Recommended next, highest confidence first, none attempted this
session:**
6. Extend the same `requiresFlag` mechanism to a small number of other
   write-once flags identified in §5 (`bishop_first_op_complete`,
   `files_traded_it`/`files_kept_it` echoed once more in Act 2/3) —
   mechanically identical to what shipped here, just more of it. Do a
   handful at a time, in their own reviewable diff, and re-run
   `npm test` after each — the reachability walk is the safety net for
   "did this quietly wall off a beat."
7. `SceneLine.requiresItem`, mirroring `SceneChoice.requiresItem`, for
   "an NPC recognises what you're carrying" (§5 #7). Same shape of
   change as this pass's flag work; kept separate so each capability
   lands as its own reviewable unit.
8. A narrow, act-by-act pass on the protagonist's closing-aphorism habit
   (§3), calibrated against §7's model scenes, done as Act 1 first (it's
   the shortest and the most-played act, so the payoff-to-risk ratio is
   best) and reviewed against `content/act1.test.ts`'s existing
   Heat-total and glitch-ratio invariants before touching Act 2 or 3.
9. Wire actual sabotage targets (`collectedNodes`) into Act 2 beat 5's
   ambient "a pole on 5th has been out for nine days" narration (§5 #5)
   — needs a small, scoped systems change to pass world state into
   content, not just a line edit.
10. Instrument `world/playerdrone.ts` to write a story flag on first
    scouting use, then add one or two small reactive lines off it (§5
    #6) — systems work first, content second; do not attempt the content
    half before the flag exists.

**Explicitly out of scope for a dialogue pass, noted for a future
systems/content pass:** location-visited flags for "explored an unusual
area" callbacks (§5 #8); any humour-pass rewrites beyond what's already
strong (§2's minor-voice list is the existing model and needs no
additions); any change to the three-act structure, the mystery, established
plot facts, the mentor system, or Bellhaven's tone.
