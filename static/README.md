# STATIC — complete, Acts 1–3

A browser narrative RPG. Schema, Heat and overworld (Phase 1), both core
mechanics as single config-driven components (Phase 2), Act 1 playable start to
finish (Phase 3), the four mentor missions that unlock both skills (Phase 4),
the economy — black market, SHDW, and a seed-phrase heist with the Robin Hood
split on the end of it (Phase 5) — Act 2 and the betrayal (Phase 6), and Act 3
through to the ending (Phase 7).

Playable start to finish: a Tuesday in March, to a baseball game in June with a
verdict on a screen nobody is watching.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 256 tests, all logic, ~24s, no DOM needed
npm run typecheck
npm run build      # -> dist/, static, deploys to Vercel/Netlify as-is
```

No fonts or assets are fetched at runtime; the type stacks fall back to system
faces so the game runs offline. Drop real faces into `public/fonts` and extend
`--font-a` / `--font-b` in `src/styles/tokens.css` at the art pass.

## Playing it

**Act 1** is seven beats across eight scenes, start to finish, ending at Pole
5-C with Heat at 12.

**The market** opens once Act 1 closes, behind the Fenwick shops on a
Wednesday. Prices move with Heat and with world events, and the events are
mostly set off by the player's own jobs — a clean sabotage downtown puts gear
up for three days. There is exactly one source of money in the game that isn't
theft: a $41 tin, once, in the scene that opens the table.

**The mentors** open once Act 1 closes. Deja, Aaron and Milo can be done in any
order; Bishop won't appear until two of the others are finished, because his
arc costs more when there's a crew to lose. Each runs the same four beats —
Contact, The Ask, The Trust Mission, The Unlock — and each ends with a skill.

**Act 2** opens once all four mentors are done, on its own mission cursor so
the market, the heist and any unfinished mentor content stay open alongside it.
Ten beats: the crew existing, what the cameras are actually for (and what
happened to Casey), Ellen's thread, the midpoint, and the betrayal. See
`docs/09-content-skeleton-act2.md` — the skeleton was written and argued with
before any of it became scene data.

**Act 3** opens when the crew goes independent: the ask, three names, the recon
that will not let you leave having researched two of them, the uplink, the
rehearsal, and Founders' Day. See `docs/10-content-skeleton-act3.md`.

**The heist** opens after all four. Recon is investigation, execution reuses
Hacking or Sabotage depending on the approach the player found a way into, and
the drain ends on a split slider with no correct answer. It is deliberately not
the Act 3 heist — see the note at the top of `src/content/heist.ts`.
Deja's trust mission hands off to Sabotage, Aaron's has no minigame in it at
all, and Milo's is a single choice.

## Act 1, in detail

New game → you spawn at home on `act1_glitch_01`. Walk with WASD/arrows (or the
on-screen d-pad on touch), and press Space or E at a location to enter its scene.
There are no quest markers by design; the line at the bottom of the screen names
what you keep coming back to and where it is. Seven beats, eight scenes, ending
at Pole 5-C with Heat at 12.

## The town

Bellhaven is 1600x1100 and reads as an exact 3x3 — two arterial pairs
(`draw.ts`'s `ROAD_SEGMENTS`) cut it into nine cells, one district each:

```
  1 The Heights     2 Main Street      3 Civic Zone
    Residential       Downtown           Government

  4 Old Market      5 Liberty Park     6 The Works
    The Strip         The Commons        Industrial

  7 Southside       8 The Blocks       9 The Plaza
    Transit           Housing            Commercial
```

Three things run *across* that grid rather than sitting inside one cell,
and they are what the layout is actually for:

**The surveillance gradient.** Camera count, plate scanners and security
gates all climb toward the Civic Zone and fall away toward Liberty Park.
A new save can walk The Heights and the park without passing a lens;
by the end of the rollout (`world/escalation.ts`) there is nowhere left
that's true of, and the last district to get covered is the commons.
Camera radii are a solved set, not a taste — see the note on
`coverageRadius` in `world/collectibles.ts` and the invariants in
`systems/coverage.test.ts`.

**The route layer.** Every district has road access on at least two sides,
and every built-up one also has an `alley`-tier shortcut nothing is aimed
down — planted at both mouths so `systems/pursuit.ts`'s `underTreeCover()`
is real there. Liberty Park has four marked pedestrian entrances, one per
side, which is what makes the middle cell a crossroads rather than an
obstacle. Every security gate on the map has a way past it within a few
metres; a route the player cannot take is set dressing, not a route.

**What the player leaves behind.** Cameras carry a visible coverage wedge,
so a dismantle removes a shape from the ground rather than a number from a
bar. Five housings are already dark at the start of a new game (`draw.ts`'s
`DEAD_CAMERAS`) and twenty Gen A marks are already up (`GEN_A_MARKS`) —
neither is a mechanic, and that's the point: taking a camera down is a
thing people here already do, before the player does anything.

Placement is checked, not eyeballed. `node scripts/check-connectivity.mjs`
flood-fills the map and fails on an unreachable cell, an overlapping rect
or a sealed-off location; `world/nodeplacement.test.ts`,
`world/junctionboxes.test.ts` and `world/npcs.test.ts` hold every point
object and every npc wander line to the same rule the player is held to.
Re-run all of them before moving anything.

## Architecture

**One writer.** `GameContext` is the only thing that mutates the save.
Every system dispatches an action; there is one place state changes and one
place it persists.

**`save-schema.json` is canonical** and `src/state/schema.ts` mirrors it. They
move together. `SCHEMA-NOTES.md` tracks what's resolved and what's still an open
design question — three gaps remain, all Phase 5.

**Content is data.** Scenes (`src/content/act1.ts`, `src/content/mentors/`),
sabotage missions (`src/content/sabotage.ts`), skins, and hacking tiers are
objects, never code. `src/systems/scenes.ts` is a runner that knows how to walk
nodes; it has never heard of Casey. `src/systems/mentors.ts` is the four-beat
template; it has never heard of Deja. Adding Act 2 means adding content, not
touching a component.

**One dialogue system.** Mentor missions are scenes, run by the same runner,
sequenced by a per-mission cursor (`missions.<mentorId>.beat`) instead of by
the global chapter — because four of them are open at once and there is only
one chapter. Building a second dialogue engine for them was the obvious wrong
turn here.

**One writer, one meaning.** `GameContext` owns when state changes and what
persists. `src/systems/effects.ts` owns what an authored effect *means*, and is
pure — which is why the tests can play a whole mentor mission instead of
inspecting content shape.

**Two mechanics, many configs.** `trace.ts` and `sabotage.ts` are pure — no
React, no styling, no Heat writes. They take a config and return state. There is
no per-mission code path anywhere and there should never be one.

**Heat runs on `world.day`, never wall-clock time.** Closing the tab for a week
costs nothing, because the fiction didn't move. Decay is idempotent per day. A
"day" is a mission cycle, per module 02 — `resolveRun` advances it when a run
finishes, which is the only thing that does so in a production build.

## Rules the code enforces so you don't have to remember them

These are the design guardrails that turned out to be the easiest ones to
violate by accident, so they're structural now:

- **Nothing charges Heat without showing it first.** `MissionBriefing` gates
  every minigame, story scenes included, and reads the cost off the node's own
  effects rather than being told separately.
- **A difficulty nudge is visible or it isn't a nudge.** `RiskMeter` takes a
  `ceiling`; when Heat or hardening shrinks a budget, the track renders
  physically shorter against hatched ground, at every tier. A quietly smaller
  denominator was the old bug.
- **Nothing hard-fails.** A burned trace, a maxed Alertness meter and a `hunted`
  Heat tier all resolve into fiction and a retry.
- **The glitch self-terminates.** `Glitch` treats `active` as an edge, not a
  state, so no caller can leave a chromatic-aberration filter running under a
  line of dialogue. It's an exception, not a texture.
- **Every window beat has a move you can always make.** `unreachableBeats()` is
  asserted in tests, because a beat where every option is gated behind casing
  you skipped is invisible when reading content and fatal when playing it.
- **Every terminal scene node closes the door behind it.** Scene effects fire
  on node entry, so this is what stops a reload re-charging a scene's Heat. Act
  content advances the chapter; mentor content advances its mission's beat.
  `validateScene()` accepts either and rejects neither.
- **One owner per Heat cost.** A `practice` minigame node carries its own heat
  effect and writes no mission record; a real run is charged by the shared
  table. A node doing both, or neither, fails validation.
- **An elective cost is on the button.** A choice with a heat effect must carry
  a `cost` label — the briefing screen can't gate a line of dialogue, but the
  honesty rule still applies.
- **A mentor mission can always be finished.** `validateMentor()` walks the
  beat cursor from 1, so a fat-fingered beat number can't strand a scene or
  dead-end a skill. Since skills are the whole progression system, a mentor
  dead end is a soft game-over.

## Tests

`npm test`. 256 of them, all pure logic, about 24 seconds — roughly 20 of which
is the whole-game reachability walk exploring 90,000 states. Everything else
runs in about four:

- `heat.test.ts` — tier boundaries, clamping, history cap, day-based decay
  idempotency
- `trace.test.ts` — 500 seeds all solvable; hardening tightens without reseeding
- `sabotage.test.ts` — every authored beat reachable; the clock never forces an
  option the player couldn't take; soft fail
- `missions.test.ts` — Heat table inside spec ranges, cooldown/hardening/prep,
  and the mission cycle: gain then decay then a cooldown that can't clear itself
- `act1.test.ts` — every scene validates, the chapter chain reaches
  `act1_complete` with no orphans, Heat totals 10–15, the skeleton's named flags
  are written, glitch stays under 5% of lines
- `mentors.test.ts` — the template's invariants, each broken one at a time:
  unreachable beats, stranded scenes, missions with no way to finish, skills
  granted early
- `content/mentors.test.ts` — plays all four missions through, including Aaron's
  failing branch and Milo's shortcut, and asserts on the save that comes out
- `schema.test.ts` — a 0.1.0 save migrates forward losing nothing, and comes
  out with whole subtrees rather than the keys that happened to be asserted
- `market.test.ts` — the price band holds however many multipliers stack, events
  expire and prices come back, listings vanish in scope, a purchase never half
  completes, SHDW round-trips without inventing money
- `heist.test.ts` — clue gating, both extremes of the split, and the four things
  a drain writes together (cash, log, Heat history, town trust)
- `content/economy.test.ts` — the market scene closes its door on entry so a
  reload can't re-run the tin; the heist is completable having bought nothing
- `gates.test.ts` — the Act 2 scaffolding: the `compromised` flag withdraws
  pre-betrayal content and releases post-betrayal content; the `hunted` breather
  appears only at its tier and takes enough Heat off to leave it
- `content/act2/act2.test.ts` — the act plays through on every route including
  one where every minigame in it fails; the betrayal flips on both the told and
  the withheld path; Bishop's trust does not move in the scene itself; beat 9
  waits for all four floor scenes in any order; Ellen's cost changes the final
  ask rather than gating it
- `content/act3/act3.test.ts` — the ending is reached even having failed every
  minigame in the act; all three wallets are discovered together and drained
  from one decision; the recon exit will not appear for two strands out of
  three; and the writing rules the finale has to keep — no dialogue explains the
  Gen A mark, no character thanks the protagonist, the verdict is never read
  aloud, Sorrell is never converted
- `safehouse.test.ts` — the two catalog goods that had nowhere to go: unbuyable
  without a safehouse, installed rather than pocketed, the Lock halves the burn
  chance across 400 seeds, and a burned place always comes back
- `audio.test.ts` — the cue palette as data: nothing long, nothing loud, and no
  failure cue ever rises in pitch
- `content/balance.test.ts` — plays the whole game through `resolveRun`, as a
  careful player and as one who fails everything, and checks the Heat curve
  against the numbers the design docs state: Act 1 closes at 12, a careful whole
  run at 59, and a failing one reaches `hunted` and actually triggers the forced
  breather beat
- `content/reachability.test.ts` — the whole-game walk: every scene played under
  every choice and every outcome, ~4,800 states, asserting no scene is
  unreachable, no scene can spin without progressing, and no state leaves the
  player with nothing to do and a skill unearned

## File map

```
save-schema.json    canonical state shape
src/
  state/       schema · defaults · persistence (+migrations) · GameContext
  systems/     heat · trace · sabotage · missions · scenes · mentors · effects
               · market · heist · safehouse · audio · rng
  content/     act1 · mentors/ · act2/ · act3/ · hacking · sabotage · economy
               · market · heist · safehouse · breather · tiers · skins · all
               ^ all authored data; `all.ts` is the scene list the overworld reads
  world/       locations (9 districts, 35 places) · obstacles · Overworld
               · draw · collectibles · junctionboxes · streethacks
               · patrols · copwalk · drones · npcs · coverage · escalation
  ui/          SceneView · Market · Redistribution · Crew · GenAMark · Hud
               · SettingsPanel · RiskMeter · Glitch · TitleScreen
               minigames/ TraceMinigame · SabotageMission · MissionBriefing
               Workbench (dev only)
  styles/      tokens.css (both visual languages) · global.css
```

## Dev scaffolding

`Debug` and `Workbench` are gated on `import.meta.env.DEV` and drop out of a
production build. The Workbench launches both mechanics standalone at every tier
and skin against live save state — that's where to verify Heat writes, tier
nudges, hardening and cooldowns without playing through content.

**The map inspector** is the same idea for the overworld: `npm run dev`, then
open `/mapshot.html`. It calls the real `drawTown` with the real tables at any
position, zoom, escalation stage and Heat tier, with buttons for each of the
nine districts, a whole-town view, a "cameras down" toggle for what the map
looks like after the player has been through it, and patrols on demand. Click
the canvas to recentre. It is its own Vite entry rather than a panel inside the
game, which is what keeps it out of players' hands for real: the production
build only takes `index.html` as an input, so `mapshot.html` is served by the
dev server and never lands in `dist/` at all.

Every control writes itself into the query string, so a view is a URL — which
is what lets `scripts/mapshot.mjs` screenshot all ten views without knowing
anything about the page:

```bash
npm run dev                                   # one terminal
npm i --no-save playwright                    # not a dependency, see the script
npx tsx scripts/mapshot.mjs --out mapshots    # another terminal
```

`node scripts/check-connectivity.mjs` is the other half of that loop and the
one that isn't optional: it flood-fills the map and fails on an unreachable
cell, an overlapping rect or a sealed-off location. Run it after touching any
coordinate in `world/`.

## Next

Phase 5 (economy), which is still blocked on two schema decisions. See
`HANDOFF.md`; the Phase 3 handoff is kept as `HANDOFF-03.md`.
