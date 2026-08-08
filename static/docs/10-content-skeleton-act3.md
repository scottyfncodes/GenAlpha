# STATIC — Content Skeleton (Act 3 + The Ending)

Module 10 of 10 · v0.1
Depends on: Story Bible, Economy (seed phrase heist), Hacking + Sabotage (Tier 4),
Visual Style Guide (the Gen A mark's third state), Act 2 skeleton
Purpose: the finale, written before it is coded. Shorter than the Act 2
skeleton, because Act 2 made most of the decisions this one has to live with.

---

## FOUR DECISIONS

### 1. The villains are an arrangement, not a person — so you cannot take one out

Three names, and all three have to go at once: the founder who believes it, the
councilwoman who signed it, and the fund that priced it. Beat 3 will not let the
player proceed having researched only two.

That is a gameplay rule doing thematic work. The Story Bible says villains are
structural, not singular, and the cheapest way to betray that is a finale where
you beat the boss. Here the "boss fight" is a *coordination problem*: three
targets, one window, no time to hide the money once the world is watching.

### 2. Sorrell is sincere, and the game never catches him out

Helio's founder built the first version to find his own brother. He is not
lying in his statement, he has not been corrupted, and there is no scene where
he is confronted and cracks. He simply built a thing that turned children into
a subscription, and cannot see it, and the exposure does not change his mind —
it changes his access.

The temptation to write him a moment of realisation should be resisted every
time it comes up. The point is that the machine does not require anyone to be
evil. (Story Bible: "the true-believer founder may even be sympathetic in his
own mind, which is the point.")

### 3. Aaron speaks

The rehearsal beat is where the crew record their own voices, and it is the
emotional centre of the act — not the hijack. Aaron has communicated in notes,
code and screen-shares since Act 2 of their own life, and here, once, aloud, on
a recording that four hundred thousand people will hear, they say a sentence.

Nobody remarks on it. Deja glances up and puts her head back down. That is the
whole payoff and it is four lines long.

### 4. The ending is relief, not triumph, and the last image is a rhyme

The hijack happens at the Founders' Day game, on the ballpark's big screen. The
final image is the same ballpark, months later, with the verdict playing
unwatched on the same screen.

Same bleachers, same screen, different thing on it, nobody looking. Notifications
stop. Kids go outside. **No character states the moral, and no line of dialogue
explains the Gen A mark**, which reaches its fully-closed circle-A on that screen
and is never mentioned by anybody.

---

## ACT 3 — THE REVEAL (beat list)

Opens from Act 2 beat 10, on its own cursor (`act3`), same convention as Act 2.

### 1. The Ask

Ellen. Two variants, decided back in Act 2 beat 4 — a conversation, or a favour
being called in.

She says yes either way. **The terms are hers**: once, live, unscheduled,
unedited, and she is not asking her family. She has one condition and she does
not present it as a condition, because she has never been in a position to make
one before.

**System touch:** `nova.trust` up. `nova_agreed`. `chapter → act3_01`.

### 2. Three Names

Bishop's asset list, read properly for the first time. What comes out is not a
conspiracy — it is a cap table, a council vote and a services contract.

- **Danny Sorrell**, who founded Helio and believes in it
- **Councilwoman Reyes**, who has been on screen since Act 1 beat 6, and who
  took money that is not called a bribe anywhere in the paperwork
- **Merrow Capital**, which is not a person and has never met a child

**System touch:** discovers three villain wallets (`discoverEffects`). Beat 3.

### 3. Who They Actually Are

An investigation hub, the same shape as the heist's casing phase. Three strands,
any order, and the exit appears only when all three are done — decision 1, as a
gate.

- **Sorrell** (Tier 4 trace, `villain` skin): the brother. The first build. A
  2016 blog post that is genuinely moving and is the same product.
- **Reyes**: not a bribe. A consultancy retainer to her brother-in-law's firm,
  disclosed, legal, and decisive.
- **Merrow**: a tier sheet. Bellhaven is a line on it, priced per child per
  year, with a volume discount.

Failure on the trace still yields the strand — costlier and noisier. Nothing in
this act walls the player out; module 02 doesn't allow it.

**System touch:** +Heat. Three clue flags. Beat 4.

### 4. The Uplink

Deja's beat, and the last Tier 4 sabotage in the game: the ballpark's broadcast
feed leaves through an uplink cabinet behind the third-base stand.

Skinned corporate-clean over exactly the same beats as a junction box in Act 2 —
module 05's visual payoff, and Deja should say the quiet part: it is the same
cabinet, it is always the same cabinet, they just spend more on the paint.

**System touch:** Tier 4 sabotage. `uplink_ready`. Beat 5.

### 5. The Rehearsal

No mechanics. Five kids and a phone, recording ninety seconds.

Milo refuses to be dramatic and is right. Deja is too angry to be brief and does
it in one take anyway. Bishop's is the shortest and is about being wrong. The
protagonist's is last and is the only one that mentions Casey by name.

And Aaron speaks. See decision 3.

**System touch:** none. `voices_recorded`. Beat 6.

### 6. Founders' Day

Execution. A Tier 4 trace on the broadcast chain (`heist` skin), and in the same
minute the three wallets empty.

The screen goes to the kids' voices in front of nine thousand people who came to
watch a baseball game. **The Gen A mark closes on the big screen** — clean,
deliberate, one frame, unexplained.

Then the split, for all three wallets at once: the largest number in the game,
and the same slider with no correct answer on it.

**System touch:** Tier 4 hacking. Coordinated drain (three `drain` calls, one
choice). Beat 7.

### 7. What Happens Next Is Slow

Not a victory lap. A stock halt, a resignation that is called a transition, a
subpoena, and a school assembly at which nobody mentions any of it.

Sorrell's statement is sincere, well-written and useless. Reyes' is not sincere
and is much better lawyered.

**System touch:** `world.townTrust`. Beat 8.

### 8. Ellen, After

She deletes the channel. Nine years, in an afternoon, and she does not make
content out of deleting it, which is the entire point.

**The player is given nothing to decide here.** It is hers. Four lines.

**System touch:** `nova.trust`. Beat 9.

### 9. The Quiet

Notifications stop. The pole on 5th is still out. Kids are outside because there
is nothing else to do, which is not a triumph, and is what everyone was owed.

### 10. Final Image

The ballpark, months later. A background screen with the verdict on it, playing
to nobody. Somebody is up to bat.

The protagonist is in the bleachers with four other people, and is not watching
the screen either.

**System touch:** `chapter → ending`. Act 3 cursor done.

---

## WRITING NOTES

- **Nothing in the finale is louder than Act 2's betrayal.** The hijack should
  be quieter than the car park scene where Bishop reads a schema, because a kid
  finding out about people he loves is a bigger event than a company having a
  bad quarter, and the game should know that.
- **No mastermind monologue, and nobody explains the plan to the audience.**
  The player did the recon; they know.
- **Nobody thanks the protagonist.** Not once, in the whole act. Pillar 5: the
  ending is relief, not triumph. They became someone other kids trust, which is
  the reward, and it was paid out in Act 2.
- **The verdict is never read aloud.** It is on a screen nobody is watching, in
  the last scene, out of focus.
