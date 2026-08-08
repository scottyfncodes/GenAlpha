# Schema notes

`save-schema.json` in this repo is the canonical shape and is kept in lockstep
with `src/state/schema.ts`. If you change one, change the other in the same
commit — a drifting mirror is worse than no mirror.

**Status at 0.5.0:** every gap is closed. Gaps 3, 4 and 6 were the ones marked
"blocks Phase 5", and Phase 5 is the moment they stop being hypothetical, so
they were implemented along the lines this file had already proposed — not
invented fresh at the keyboard. The proposals are reproduced below with what
actually shipped, including the one place the implementation went past what was
proposed and why.

---

## Changed in 0.4.0

`missions.<id>.beat` was documented as an integer from 1 to 4. Phase 4 broke
that in two directions and both are deliberate:

- **Branch beats above 4.** Aaron's recovery path runs 4 -> 5 -> 6, because
  failing his trust test has to cost something without locking hacking away for
  the rest of the game. The template is four beats; a mentor is allowed more.
- **A done sentinel at 0.** A finished mission has to park somewhere no scene
  gates on. "One past the last beat" won't do it, because the last beat isn't
  the same number for every mentor — a completed Deja parking on 5 would sit
  exactly where Aaron's recovery scene lives. `MENTOR_DONE = 0` is checked by
  `validateMentor`, which rejects any scene gating on it.

No migration. A 0.3.0 save has no mentor beats in it at all, because Phase 4
didn't exist when it was written. The version moved because the constraint did,
and the JSON and `schema.ts` moved together as usual.

---

## Resolved

### 1. No in-game clock → `world.day` (0.2.0), wired through in 0.3.0

Heat decayed "per in-game day" while `heat.lastDecayAt` held a real-world ISO
timestamp — two different clocks. 0.2.0 added `world.day` but left decay running
off app mount, which meant reopening the tab cost Heat and a player doing Act 1
across three sittings finished under the act's 10–15 close condition.

0.3.0 finishes the job: `heat.lastDecayAt` is now `heat.lastDecayDay`, decay is
`decayTo(heat, day)`, and it is idempotent for a given day — which is what makes
it safe to run on load, on day advance, and after "lie low" without ever
double-charging. There is no decay-on-mount anywhere. Opening the tab is free.

### 2. No mission state → `missions` (0.2.0), `prepped` added in 0.3.0

Retry cooldowns, target hardening, banked partial trace progress and the mentor
template's current beat all live in `missions[missionId]`. `player.flags` keeps
genuine one-off branching, which is what it's good at.

0.3.0 moves the sabotage prep flag off `player.flags['prepped:<id>']` and onto
`missions.<id>.prepped`, because a `key:value` flag namespace was exactly the
ad-hoc proliferation this subtree was added to prevent.

**Load-bearing detail:** `hardened` tightens the budget and *does not* reseed the
grid. Banked intel is a list of node indices, so a regenerated map would hand
the player confidently-wrong reveals on retry. A hardened target is the same
building with tighter security. `src/systems/trace.test.ts` pins this.

### 5. No player-facing glitch control → `settings.reducedFlicker`

Added to the schema in 0.2.0 with no way to change it, which missed the point:
the whole reason for the setting is the kid on a shared laptop who can't change
an OS accessibility setting. 0.3.0 ships `SettingsPanel` (Settings in the HUD),
which also exposes `textSpeed` and `audioMuted` — both of which were likewise
read by code and settable by nobody.

Migration defaults an old save's `reducedFlicker` to the OS preference rather
than to `false`, so a returning player who set reduced-motion at the OS level
doesn't get flicker switched on for them.

---

## Changed in 0.5.0

### 3. Villain wallets only exist after they're drained — CLOSED

Shipped as proposed: `economy.villainWallets: [{ walletId, balance,
securityTier, discovered }]`, with `villainWalletsDrained` kept as the
historical log it always was.

**One field past the proposal:** `clues: string[]` on each wallet. The recon
phase's output isn't only *that* a wallet exists — it's the two or three
specific things you learned about how it's guarded, and which approach each of
those opens. That is per-target structured state with a fixed shape, which is
exactly what `player.flags` is bad at and what this subtree was added for.
(The heist content *also* writes a plain flag per clue, which looks like
duplication and isn't: `visibleChoices` gates dialogue options and has no
business reaching into the economy subtree to do it. The clue is the mechanical
record; the flag is a dialogue gate.)

A drained wallet has its balance zeroed rather than its record deleted. The
player found it, and that stays true.

### 4. Market events can't expire — CLOSED

Shipped as proposed: `activeEvents: [{ eventId, startedOnDay, expiresOnDay,
scope }]`, measured against `world.day`, with the multiplier table staying in
`src/content/economy.ts`.

`scope` sits on the *instance* rather than being looked up from the table,
because one definition can fire against different categories depending on what
triggered it, and because the ticker line has to stay readable from a save file
on its own.

**Migration drops old entries rather than converting them.** A 0.4.0
`activeEvents` entry is a bare string with no start day and no scope; there is
no honest way to give it one, and inventing a start day would produce events
that either expire instantly or run forever. Dropping them costs the player
nothing — the next day advance re-rolls the ambient ones.

### 6. `clean_sim` acts "for that session" — CLOSED

`economy.activeConsumables: [{ itemId, expiresOnDay }]`. No session concept was
added. The item is spent from inventory the moment it's used and the record
expires against `world.day`, so the timing of using it is a real decision
rather than a formality.

---

## Closed in 0.6.0

### 7. There is no safehouse, and two catalog items are for one — CLOSED

Module 03's goods catalog includes Reinforced Lock and Off-grid Power Rig, and
`world.safehouses` has been in the schema since 0.1.0 with nothing ever writing
to it. No location in the game is a safehouse yet.

Both items shipped **listed and unbuyable**, with "Nowhere to put it yet."
showing next to the button, rather than being quietly cut or sold to a player
for whom they'd do nothing. That was the holding position and it is over: the
crew now takes the boarded unit on Marlow Street after they go independent, and
the same listing goes from "Nowhere to put it yet" to buyable to "Already in"
without anybody editing content, because the reason is computed rather than
being a static string on the catalog entry.

One field added: `burnedOnDay`. A burned safehouse recovers on its own after
four days rather than being lost, because losing a base permanently would be a
hard fail state wearing a different hat and module 02 doesn't allow one.

**Inferred rather than spec'd, and flagged as such:** no module says what
*burns* a safehouse. The reading taken is the one the rest of the game implies
— a job that fails while the town is already watching you (`flagged`+), with the
Reinforced Lock halving the chance, exactly as module 03 describes it. Also
inferred: the Off-grid Power Rig's "base for higher-tier missions" is read as
somewhere you can stay and work, so it deepens the Heat decay of a night there
rather than gating a tier. Tiers are story-gated everywhere else in this
codebase and adding a purchasable second gate would make skill progression
buyable, which the whole design refuses.

---

## Checked and fine, don't 'fix' these

- `skills.sabotage.tier` maxes at 3 while sabotage missions go to Tier 4 — skill
  tier 3 *grants access to* mission tier 4.
- Ellen has no entry in `skills` — she's parallel story content, deliberately
  outside the mentor template.
- `relationships` as `additionalProperties` — lets Acts 2/3 add named NPCs with
  no schema change.
- `missions` as `additionalProperties` — same reason. Note it now holds two
  unrelated kinds of record under one map: minigame runs keyed by mission id
  (`deja_jobsite_cover`), and mentor missions keyed by mentor id (`deja`). They
  don't collide and they share `status` honestly. If a third kind shows up,
  that's the moment to reconsider, not before.
- `relationships.<mentor>` and `missions.<mentor>` using the same key — a
  mentor's trust and their mission cursor are separate things that happen to be
  keyed the same way. That's per the schema's own note: you can know someone
  without having earned their skill.
