# STATIC — Content Skeleton (Act 2 + The Betrayal)

Module 9 of 9 · v0.1
Depends on: Story Bible, Heat System, Economy, Mentor Missions, Content Skeleton
(Act 1), and the `compromised` gate shipped in 0.5.0
Purpose: the scene-by-scene Act 2 the build prompt says must not be improvised
as a byproduct of coding momentum. Read this before implementing it, and argue
with it — that is what it is for.

---

## THREE DECISIONS THIS SKELETON MAKES

Everything below follows from these. If one is wrong, say so here rather than
in the beats, because the beats are downstream of them.

### 1. The player finds the evidence. Bishop understands it.

The Story Bible says Bishop discovers the betrayal and it breaks him before it
galvanizes him. Taken literally, that hands the player a cutscene at the
emotional climax of the act, which is the worst possible moment to take the
controls away.

So it is split. **The player does the work** — beat 6 is a real investigation
against the adult resistance's own infrastructure, and what comes back is a
data schema. **Bishop is the one who can read it**, because he is the only one
who has been inside, and he is the only one for whom it is a discovery about
people he loves rather than a file about strangers.

This keeps the bible's beat intact — he finds it first, in the only sense that
matters — and makes the scene *the player watching what the truth does to
somebody*, which is crueller and better than being told.

It also means the seed is already in the shipped game: Bishop deflects a
question about where the funding comes from in `mentor_bishop_4_unlock`. That
throwaway line is what beat 6 pulls on. Nothing needs retrofitting.

### 2. Mentor missions stay open through Act 2. Act 2 does not touch them.

They gate on `resistance_hint_found`, which survives any chapter rename, and
that stays true. A player who did the heist before meeting Milo should not find
Milo closed. The open-investigation structure is the game's whole shape and
Act 2 is not the place to start narrowing it.

What Act 2 *does* add is `requires.compromised` on its own scenes, so that no
scene written for a player who still trusts the adult resistance survives the
moment they stop. The mechanism shipped in 0.5.0 and is tested; this is the
content that uses it.

### 3. Ellen's arc runs on the same shape as Milo's test, on purpose.

Her family's channel is the town's largest data pipeline, which means at some
point it is *the easiest way to find something out*. So the game offers the
player the chance to use her exactly the way her family uses her — and it
works, and it costs her.

That is the same structure as Milo's AI-shortcut test, deliberately: a visible
easy path, a harder clean one, and somebody watching. It is proven in this
codebase, it needs no new mechanics, and reusing it makes a thematic point the
game never has to state — the two temptations are the same temptation.

Her payoff is not a skill and never becomes one. It is that in Act 3 she is
asked, rather than used, and whether that ask is a conversation or a favour
being called in was decided back here.

---

## ACT 2 — EARNING IT (beat list)

Act 2 opens where the shipped game currently ends: crew assembled, both
mechanics unlocked, market running, first heist available. These beats are what
happens *after* that and around it. Mentor missions and the heist remain open
throughout and are not gated by any of this.

Chapter ids: `act2_01` … `act2_10`.

### 1. Open — Four People in a Car Park

Fenwick lot, evening. The first scene with more than one of them in it. Deja
and Milo are disagreeing about something trivially small and completely
sincere; Aaron is on a phone; Ines is packing up the table behind them.

The protagonist notices, without anyone saying it, that all three of them keep
looking at them when they want a tie broken. Isolation was the starting wound
(pillar 4); this is the first evidence it has closed, and nobody remarks on it.

Warmest scene since Act 1 beat 5. It has to be, because beat 8 takes it away.

**System touch:** none. `chapter → act2_01`. Opens the Act 2 board.

### 2. What the Cameras Are Actually For

An investigation (Hacking, Tier 2, `villain` skin) into what the safety grant
buys. The answer is not surveillance footage. It is behavioural data on minors,
aggregated, tiered, and sold — attention patterns, routes, who stands with whom
at lunch. The cameras are a sensor array and the town paid for it.

**Casey resolves here.** Not violently — clerically. Casey's father worked for a
Helio subcontractor, raised something internally, and the family was relocated
and paid. There is a settlement number and a non-disparagement clause and a
form with a tick-box on it. The horror is that it is *paperwork*, and that
somebody's whole disappearance fits in a field.

**System touch:** +5 Heat. `casey_answer_found`. This is the beat that makes the
Act 1 inciting incident mean something; it should land in the middle of the act,
not the end, because the point is that it isn't the climax — it's a line item.

### 3. Ellen, on a Schedule

Ellen asks the protagonist to be in something. Not a big thing — a two-minute
video, they've done it before, it used to be fun.

Except now the protagonist can see the schedule on the fridge, and the second
take, and the way Ellen's face changes between "hang on, one more" and the shot.
Being her friend and being content are the same activity in that house, and
they always were, and the protagonist just didn't have the language for it in
Act 1.

Choice: do it, or find a reason not to. **Neither is punished.** Doing it is
kind and costs her nothing; declining is honest and costs her nothing. What
matters is that the player has now seen it clearly, because beat 4 is about to
offer them the chance to do the same thing themselves.

**System touch:** `nova.trust +10` either way. `nova_schedule_seen`.

### 4. The Easy Way

An investigation the crew needs: who else in town is inside the tiered data,
and at what level. The clean route is a Tier 3 trace plus legwork, expensive in
Heat and in days.

The easy route is Ellen. Her family's channel has years of archived footage of
half the kids in Bellhaven, tagged, searchable, and she would give the
protagonist the login in a second without asking why.

Taking it **works**. It is faster, cheaper, and better. It also uses her
audience the way her family uses her audience, and she finds out, and she is not
even angry — she says it's fine, it's what it's for, which is the worst
available response.

Milo notices. He does not lecture. His line is the same shape as his Beat 4
line and should be recognisably so: *"You'll get there."*

**System touch:** branch on `used_nova_access`. Easy path: −15 `nova.trust`, no
Heat, no day cost. Clean path: +8 Heat, +1 day, `nova.trust +5`. Neither locks
anything. The cost lands in Act 3 beat 10 and in Act 3's ask.

### 5. Midpoint — Small Wins

A run of jobs that *work*. Sabotage on a pole, a router cabinet, an intercept —
whatever the player picks, in whatever order. The market moves in response
(crackdowns, a surplus), the ambient dialogue tiers up, kids at school talk
about "someone."

This is where the heist sits if the player hasn't done it yet, and where the
Robin Hood redistribution's town-trust ambience starts showing up in the
locations: a shutter up, a letter nobody can trace.

Confidence, and Heat, both climb. The act should reach `flagged` here and stay
there.

**System touch:** Heat into 50–70. `world.townTrust` moves. No new mechanics —
this beat is made of systems that already exist, which is the point of having
built them.

### 6. The Funding Question

**Milo raises it**, which matters: the crew's conscience is the one who asks
where the good guys' money comes from, and he asks it flatly and without
suspicion, the way he asks everything.

An investigation (Hacking, Tier 3, `resistance` skin — the first time the
player's tools are pointed at their own side, and the skin should make that
land). What comes back is a schema.

The player does not need to understand it. It should read as boring. Fields,
types, a tiering column. The one thing the protagonist notices is that they have
seen this shape of thing before, two beats ago, and cannot immediately think
where.

**System touch:** +6 Heat. `resistance_funding_traced`. **Does not set
`compromised`** — the player has the file, not the meaning. That gap is the
whole design of beat 7.

### 7. THE BETRAYAL — Telling Bishop

The player has a file only Bishop can read.

**Primary path — show him.** The annex fence, where he first held the gap open
like a door. He reads it. He asks the protagonist to check it again. He asks a
second time, and the second time is the bad one, because he is not asking about
the data.

He does not shout. He works out loud, carefully, that the tiering column matches
the intake schema he has personally filled in, twice, at meetings he was proud
to be invited to. He is the one who says it. Nobody says it to him.

Then he says he's going to go home, and does, in the middle of the car park,
without finishing the sentence.

**Alternate path — sit on it.** The player can decline to show him. He finds out
four days later from the network itself, badly, in front of people. The scene
plays out at the fence again and he is not angry at the protagonist, which is
worse; he assumes they didn't know either, and the protagonist has to decide
whether to correct him.

**System touch:** `skills.resistanceIntel.compromised = true` (both paths).
`bishop.trust` **does not move in this scene, on either path** — he is not
thinking about the protagonist and the game should not pretend he is. Every
`requires.compromised: false` scene withdraws here; the mechanism is built.

### 8. The Low Point — Nobody Is Coming

Four short scenes, at four locations, in any order. No mechanics at all.

- **Deja**, at the yard, furious and practical, already three steps into what
  they do next, because stopping is not something her family gets to do.
- **Aaron**, at Fenwick, silently deleting things. Everything they built on
  resistance infrastructure, gone, methodically, without being asked.
- **Milo**, at the shop, not saying I told you so — which is worse, because he
  clearly wants to and has decided it wouldn't help.
- **The protagonist**, at home, alone, with the kitchen light on.

Bishop is not at any of them. His absence is the fourth scene's subject.

**System touch:** none. If Heat is at `hunted`, the shipped breather beat fires
naturally here, which is a coincidence worth keeping.

### 9. Bishop Comes Back

He returns after some days. Not restored — changed, and quieter, and about two
years older.

He brings the adult resistance's asset list, which he took on his way out. It is
the single most valuable thing anyone in this story has been handed, and he
gives it away in about nine seconds without being asked, because he has spent
the whole book learning what it costs to be the person who holds things back.

His unlock is recontextualised rather than revoked: `resistanceIntel` was
granted to him by adults and is now *theirs*, freely given. The crew screen's
soured Bishop entry should read differently again after this beat.

**System touch:** `bishop.trust +25` (his largest single move, later than any
other mentor's, which is the structural answer to his Act 2 warmth being
cheap). `crew_independent`. This is where the actual resistance starts, per the
Story Bible — not at the beginning.

### 10. The Decision

Five kids and a plan. Exposure, not violence: a synchronized broadcast timed to
something the whole town is already watching, paired with a drain that lands the
moment the truth breaks, so there is no time to move the money.

They have the data, the access and the wallets. They do not have anyone who will
listen — which is when somebody says the only name that solves it, and the
protagonist has to go and ask Ellen.

**Whether that is a conversation or a favour being called in was decided in beat
4**, and the scene should be visibly different in the two cases without ever
mentioning why.

**System touch:** `chapter → act3_01`. Act 2 close condition: Heat 55–70,
`compromised` true, `crew_independent` true, Ellen's trust wherever the player
left it.

---

## WRITING NOTES

- **Beat 1 is the warmest scene in the game and beat 8 is the coldest, and they
  are four locations apart.** Write them in that order and let the second one
  take things away from the first specifically — the same car park, the same
  people, nobody looking at each other.

- **Nothing in beat 7 raises its voice.** The betrayal is administrative. It was
  done by people who filled in a form believing they were the good guys, which
  is the thematic pillar (institutions reproduce the harms they claim to fight),
  and a shouted scene would let the audience file it as villainy instead.

- **Bishop is never made to apologise**, and the protagonist is never given a
  line that forgives him, because he did not do it. The failure mode here is
  writing the scene where the kid absolves the kid; the game should simply move
  on with him in it.

- **Casey does not come back.** Beat 2 answers what happened and that is all it
  does. A reunion would trade the point (people disappear into paperwork and the
  paperwork holds) for a beat that feels better and means less.

- **No adult in Act 2 is a villain, including the ones who did this.** The
  resistance adults believed the trade was worth it and were wrong. That
  distinction is the entire act.

- **Milo asks the funding question and Milo is right**, but he takes no
  satisfaction in it and the writing must not either. He is the conscience, not
  the smart one.

---

## WHAT ACT 3 INHERITS FROM THIS (not yet skeletoned)

Flagged so the Act 3 pass has a starting position rather than a blank page:

- The broadcast needs an audience: Ellen's channel, asked for, on her terms —
  one unscheduled thing she chose, and then she stops. The difference between
  being broadcast and speaking is the whole of her recovery and should be shown
  in about four lines, not explained in forty.
- The drain is mechanically built (Phase 5) and needs named Act 3 wallets in
  `HEIST_TARGETS` plus scenes. `systems/heist.ts` should not need to change; if
  it does, that is the signal the finale is being improvised.
- The Gen A mark reaches its fully-closed circle-A here, on the hijacked
  broadcast, and no dialogue explains it (Style Guide 07).
- The final image is the baseball game with the verdict playing unwatched. The
  ending is relief, not triumph. Show the quiet; do not state the moral.
