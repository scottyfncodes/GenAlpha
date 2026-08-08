# Where this is and what to build next

## What Phase 4 added

The four-beat mentor template, as a runner over data, and all four mentors
filling it. `Deja`, `Files`, `Milo` and `Bishop` are data objects in
`src/content/mentors/`; `src/systems/mentors.ts` has never heard of any of them.

**The problem worth knowing about.** Act content closes the door behind a scene
by advancing the chapter — that's what stops a reload walking back into a scene
and re-charging its Heat. Mentor missions can't do that. Four of them are open
at once, in whatever order the player picks, and there's only one chapter.

So each mentor mission carries its own cursor at `missions.<mentorId>.beat`,
advanced by a `beat` effect on every terminal node and read back by
`Scene.requires.mission`. `validateScene`'s terminal-node rule now accepts
either a chapter advance or a beat advance, which keeps the invariant intact
rather than dropping it for the new content. A finished mission parks on
`MENTOR_DONE` (0) — a sentinel rather than "one past the last beat", because
the last beat isn't the same number for every mentor and a completed mission
landing on a number some branch also uses would silently re-offer that branch.

**Other runner extensions**, all driven by content that needed them:

- `skill` and `beat` effects. `skill` is the only way content grants a
  capability, and a test asserts nothing outside a mentor Beat 4 emits one.
- A `sabotage` variant of the scene minigame handoff, so Deja's Beat 3 can hand
  off to `DEJA_JOBSITE` — which already existed and needed no changes.
- `minigame.practice`. A practice node's scene owns the Heat and writes no
  mission record (Act 1's library dig); a real run resolves through the shared
  Heat table with hardening and cooldown (Deja's). This was implicit before and
  is now explicit, checked both directions: a practice node must carry a heat
  effect, a real one must not, or the player pays twice.
- `SceneLine.minTier` / `maxTier`. Heat-reactive dialogue, which is how module
  06's cross-module hook lands — at `flagged`+ Deja won't let you in the gate
  and Bishop moves you down the fence line — without a second copy of the scene
  and without ever blocking. A node whose every line is tier-gated is a
  validation error, since it would render empty at the wrong tier.
- `SceneChoice.cost`. A choice is the one place content can charge Heat with no
  briefing in the way, so a choice with a heat effect and no `cost` label fails
  validation. Milo's AI shortcut is the only one so far.
- `Scene.requires.mentorSkills`, which is module 06's one sequencing rule
  (Bishop after two others) counted off `skills` rather than off a hardcoded
  list of who the mentors are.

**`applyEffects` moved out of the reducer** into `src/systems/effects.ts`.
`GameContext` is still the only writer — it owns *when* effects run and what
persists — but what an effect *means* is now pure, which is what lets the tests
drive a whole mentor mission end to end instead of asserting on content shape.
That's where most of the confidence in this phase comes from.

## Decisions made, so they don't get re-litigated as accidents

- **Deja's mission is unfailable below `hunted`, on purpose.** The handoff
  flagged this as an accident of the risk numbers. It's now a decision and a
  test: the first sabotage run the player ever sees teaches the mechanic rather
  than testing it. `hunted` and a hardened retry can still take it away, which
  is why the spotted branch is authored rather than dead — and that branch is
  worth playing, because taking the fall without naming her is its own trust
  beat.
- **Failing Files' test can't lock hacking away.** A dead end there would be a
  soft game-over, since skills are the whole progression system. The failure
  branch runs two extra beats — Files goes cold, and the way back is going and
  taking it back at a real price — and lands on the same unlock with less trust
  and a colder scene. Pinned by a test that plays the failing path.
- **Bishop's Beat 3 is dialogue, not a minigame.** Mentor order isn't fixed, so
  he can arrive before hacking exists. That turned out to suit him: his op is
  the one where the player doesn't have to do anything.
- **Content is a directory, not `src/content/mentors.ts`.** Four mentors is
  ~1,200 lines. `src/content/mentors/index.ts` exports `MENTORS` and
  `MENTOR_SCENES`; the import path is unchanged.
- **Backing out of a mission gets its own ending.** `minigame.onAbort`, which
  falls back to `onFail`. Pulling out of Deja's window used to route to the
  node about a torch beam and a supervisor asking who you're here with, which
  is a different story from walking away. She still teaches you, for less, and
  the scene says why.
- **`save-schema.json` capped `beat` at 4.** Files' branch beats and the done
  sentinel break that, so the constraint and the TS mirror both moved, and the
  schema version went to 0.4.0. No migration: a 0.3.0 save has no mentor beats
  in it, because Phase 4 didn't exist when it was written.

## The clock was stopped, and now it isn't

Worth reading before anything else, because it changes runtime behaviour for
content that was already shipped.

`world.day` was only ever advanced by two debug buttons, and both are gated on
`import.meta.env.DEV`. In a production build nothing moved it. So passive Heat
decay never ran, `lastDecayDay` never moved, and every mission cooldown was
permanent — dead code in the shipped game, all of it, since 0.2.0.

Module 02 defines an in-game "day" as a mission cycle, not a calendar day:
decay is "per return to the overworld/hub after a mission, or per explicit lie
low". So `resolveRun` (extracted out of the reducer, in `systems/missions.ts`)
now advances the day when a run finishes. A clean hack is +3 then -2, netting
+1; a failed run is still cooling on the day it failed, because the cooldown is
measured from the new day rather than the old one. Four tests pin that ordering.

**This was a judgment call and it's reversible.** The alternative reading is
that a "day" is a calendar day, which the mentor content's own fiction implies —
it says Thursday, Friday, Saturday, "on Tuesday", "by Monday". If the clock
tracked that, the arc would span roughly three weeks, decay would come to about
-40, and the game's entire authored Heat total (~25 across Act 1 and all four
mentors) would sit at zero permanently. That's why I read "day" the way module
02 defines it rather than the way the prose implies. If you'd rather it tracked
the fiction, the decay rate has to come down with it — they can't both be right.

**Still missing, and I did not build it:** "lie low" is a designed player action
in module 02 and has no player-facing surface at all, only a debug button. The
spec says the `hunted`-tier version should be a scripted breather scene, which
is content that doesn't exist yet, so this belongs to the Act 2 pass rather than
to a button I invent somewhere.

## Phase 5 next: economy

Still blocked on the two schema decisions in `SCHEMA-NOTES.md` (gaps 3 and 4),
and they should be settled in design rather than invented in code. Neither got
easier or harder in Phase 4.

Two things Phase 4 leaves ready for it:

- Sabotage window options already take `requiresTool`, and `RESOLVE_MISSION`
  already decrements a spent single-use item. `DATA_ANNEX_DOOR` has a
  `signal_jammer` beat authored against a tool nobody can buy yet. The moment
  the market exists that path lights up with no mechanic work.
- `MissionBriefing` is where the money cost of a mission should go when there
  is one. It already owns the "tell them before they commit" contract for Heat;
  don't build a second surface for cash.

## Things Phase 4 did not do

- **No player-facing crew screen.** Skills unlock, and the debug drawer shows
  the cursor and trust per mentor, but there's no UI telling the player what
  they now have. That's deliberate — there is nothing in the game yet that uses
  a skill outside its own mission, so a screen would list four capabilities
  with nowhere to spend them. Build it with Act 2 content, when it can point at
  something.
- **Mentor scenes gate on `resistance_hint_found`, not on a chapter.** That
  flag lands at the close of Act 1 and survives whatever Act 2 does to the
  chapter. When Act 2 content arrives, decide deliberately whether mentor
  missions stay available through it (they probably should) rather than letting
  a chapter rename silently close them.
- **Nova got nothing.** She's parallel story content and outside the template
  by design, and her Act 2 material is part of the content pass below, not
  something to bolt onto a mentor mission because the structure was handy.

## Phases 6 and 7 still need a content pass, not a coding session

Unchanged from the last handoff, and now more pointed: `bishop_first_op_complete`
is written, the funding question he deflects is planted in
`mentor_bishop_4_unlock`, and the trust curve that makes his warmth a tell is
pinned by a test. All the hooks the betrayal needs are in. The betrayal itself
is the emotional hinge of the game and should be written deliberately, not
generated as a byproduct of coding momentum.

If you extend the mentor content later, the one thing not to "fix": Bishop hands
over more trust in Contact and The Ask, before the player has done anything for
him, than any other mentor does. Evening the four out for pacing would read as
tidier and would quietly delete the setup.
