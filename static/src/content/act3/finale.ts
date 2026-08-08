import { MENTOR_DONE } from '../../systems/mentors';
import type { Scene } from '../../systems/scenes';
import { MERROW, REYES, SORRELL } from './targets';

/**
 * THE FINALE (skeleton beats 5–10).
 *
 * The rules this file is written under, and the order they matter in:
 *
 * 1. NOTHING HERE IS LOUDER THAN THE BETRAYAL. A company having a bad quarter
 *    is a smaller event than a twelve-year-old finding out about people he
 *    loves, and the game should know that. The hijack is written quieter than
 *    Act 2 beat 7 on purpose.
 * 2. NOBODY THANKS THE PROTAGONIST. Not once, in the whole act. The reward was
 *    paid out in Act 2, in a car park, when three people turned round to ask
 *    them to settle an argument about a bike.
 * 3. THE VERDICT IS NEVER READ ALOUD. It plays to an empty room in the last
 *    scene and nobody looks at it.
 * 4. NO DIALOGUE EXPLAINS THE GEN A MARK. It closes on the big screen, one
 *    frame, and not one character remarks on it — Style Guide 07, and it has
 *    been three acts in the making.
 */

/** Beat 5 — the emotional centre of the act, and it has no mechanics in it. */
const REHEARSAL: Scene = {
  id: 'act3_5_the_rehearsal',
  beat: 5,
  locationId: 'fenwick_lot',
  hook: 'Ninety seconds, five people, one phone.',
  language: 'B',
  requires: { mission: { id: 'act3', beat: 5 } },
  start: 'wall',
  nodes: {
    wall: {
      id: 'wall',
      lines: [
        { text: 'Files has worked out that ninety seconds is about a hundred and eighty words each if all five of you talk, so nobody is allowed to talk for that long.' },
        { text: 'You do it sitting on the wall behind the Fenwick shops with a phone propped on a brick, which is not how anybody would have planned it, and is the only place all five of you have ever been at once.' },
      ],
      next: 'milo',
    },
    milo: {
      id: 'milo',
      lines: [
        { speaker: 'Milo', text: 'They knew where I was every day for two years and they sold it. That’s it. That’s the whole thing I’ve got.' },
        { text: 'He refuses to make it bigger. Deja tells him to say more. He says no.' },
        { text: 'He is right. It is the best one.' },
      ],
      next: 'deja',
    },
    deja: {
      id: 'deja',
      lines: [
        { text: 'Deja is too angry to be short and does it in one take anyway, because she has been rehearsing it her whole life without knowing it.' },
        { speaker: 'Deja', text: 'My mum put those poles up. Nineteen years she’s kept this town’s lights on and they used her hands to do it and never told her what she was building.' },
        { text: 'Nobody says anything for a bit after that one.' },
      ],
      next: 'bishop',
    },
    bishop: {
      id: 'bishop',
      lines: [
        { text: 'Bishop’s is the shortest and is not about them at all.' },
        { speaker: 'Bishop', text: 'I told people this was safe. I believed it and I told people. I was wrong and I’d rather say that here than not say it.' },
        { text: 'He does not look at anyone while he says it and nobody makes him.' },
      ],
      next: 'files',
    },
    files: {
      id: 'files',
      lines: [
        { text: 'Then Files takes the phone off the brick, holds it, and says a sentence out loud.' },
        { speaker: 'Files', text: 'I’m eleven. You’ve got four thousand pages about me and none of it is me.' },
        { text: 'Deja looks up. Then she puts her head back down.' },
        { text: 'Nobody says anything about it. That is the correct response and everyone somehow arrives at it at the same time.' },
      ],
      next: 'you',
    },
    you: {
      id: 'you',
      lines: [
        { text: 'Yours is last, and it is the only one with a name in it.' },
        { text: 'You say that a kid called Casey went to your school and then did not, and that there is a form with a tick-box on it that says the matter is closed, and that you are going to keep saying his name until somebody who signed it has to hear it.' },
        { text: 'Files stops the recording. Ninety-one seconds.' },
      ],
      effects: [
        { kind: 'flag', key: 'voices_recorded' },
        { kind: 'beat', missionId: 'act3', beat: 6 },
      ],
      end: true,
    },
  },
};

/** Beat 6 — Founders' Day. */
const FOUNDERS_DAY: Scene = {
  id: 'act3_6_founders_day',
  beat: 6,
  locationId: 'ballpark',
  hook: 'Saturday. Nine thousand people came to watch a baseball game.',
  language: 'B',
  requires: { mission: { id: 'act3', beat: 6 }, flags: ['uplink_ready', 'voices_recorded'] },
  start: 'bleachers',
  nodes: {
    bleachers: {
      id: 'bleachers',
      lines: [
        { text: 'It is a nice afternoon. There is a queue for the concession stand and a man two rows down explaining the infield fly rule to a child who does not care.' },
        { text: 'Nova is under the stand with a phone and a battery pack and no ring light, waiting to go live to four hundred thousand people without asking anyone first.' },
        { text: 'Deja is by the third-base stand. Bishop has the wallets. Milo has, for reasons nobody has questioned, brought sandwiches.' },
        { speaker: 'Files', text: 'Bottom of the fifth.' },
      ],
      next: 'window',
    },
    window: {
      id: 'window',
      lines: [
        { text: 'The grounds crew come out to drag the infield and nine thousand people watch a man on a tractor make a straight line.' },
      ],
      minigame: {
        kind: 'hacking',
        missionId: 'act3_broadcast_chain',
        tier: 4,
        skinId: 'heist',
        brief:
          'The broadcast chain, and three accounts in three cities, in the same minute. You are inside. Don’t linger.',
        onWin: 'screen',
        onFail: 'ugly',
        onAbort: 'ugly',
      },
    },
    ugly: {
      id: 'ugly',
      lines: [
        { text: 'It does not go the way it went in the practice runs. Something drops, and Files says a word you have never heard them say, and for nine entire seconds nothing is on the screen at all.' },
        { text: 'Then it comes back, and it is not clean, and it is up.' },
      ],
      effects: [{ kind: 'heat', eventId: 'act3:messy_broadcast', delta: 8, log: true }],
      next: 'screen',
    },
    screen: {
      id: 'screen',
      lines: [
        { text: 'The big screen stops showing a hot dog race.' },
        { text: 'It shows a tier sheet. Then a per-child annual figure. Then a comment in a margin that says nice.' },
        { text: 'Then five kids on a wall behind some shops, sitting on a phone propped on a brick, saying ninety-one seconds of true things about themselves.' },
      ],
      next: 'crowd',
    },
    crowd: {
      id: 'crowd',
      lines: [
        { text: 'The strange thing — the thing nobody predicted, in nine weeks of planning — is how quiet nine thousand people go.' },
        { text: 'Not booing. Not cheering. Reading. A whole stand of people with their heads tilted up, reading a spreadsheet about their own children on a Saturday afternoon.' },
        { text: 'Somewhere behind you a woman says, to nobody, “that’s my daughter’s school.”' },
      ],
      next: 'mark',
    },
    mark: {
      id: 'mark',
      lines: [
        { text: 'And at the end of it, for one frame, before the feed is cut and the screen goes to a blue apology card, there is a mark.' },
        { text: 'It has been on walls in this town since March. It has been getting rounder all year.' },
        { text: 'Nobody in the stand knows what it is. Nobody explains it. In about four days, kids in nine other towns will start drawing it.' },
      ],
      /*
       * The Gen A mark's third state (Style Guide 07) — the only place in three
       * acts the circle closes. `showMark` is a node flag rather than an
       * authored asset so no scene can show the wrong state; `GenAMark` derives
       * it from the chapter. No line of dialogue mentions it, here or anywhere,
       * and `act3.test.ts` fails if one ever does.
       */
      showMark: true,
      next: 'money',
    },
    money: {
      id: 'money',
      lines: [
        { text: 'In the same minute — because there is no point doing one without the other, because money that has time to move is money that moves — three accounts in three cities stop containing anything.' },
        { text: 'Bishop turns the phone round so you can see it. He does not say anything. He has been waiting eleven weeks to not say anything about this.' },
      ],
      redistribute: { walletIds: [SORRELL.walletId, REYES.walletId, MERROW.walletId] },
      next: 'after',
    },
    after: {
      id: 'after',
      lines: [
        { text: 'It takes about forty seconds. There is a stewards’ radio going somewhere and a queue that has not moved and, on the field, a game that nobody has restarted.' },
        { text: 'You are sitting in a bleacher with a paper tray of chips going cold, and you are twelve, and you have just done it.' },
        { text: 'Nobody thanks you. Nobody knows it was you. That turns out to be completely fine, which is not what you would have guessed in March.' },
      ],
      effects: [
        { kind: 'chapter', chapterId: 'act3_06' },
        { kind: 'beat', missionId: 'act3', beat: 7 },
      ],
      end: true,
    },
  },
};

/** Beat 7 — the aftermath, which is slow and mostly paperwork. */
const SLOW: Scene = {
  id: 'act3_7_what_happens_next',
  beat: 7,
  locationId: 'town_square',
  hook: 'It turns out that the aftermath of something is mostly waiting.',
  language: 'A',
  requires: { mission: { id: 'act3', beat: 7 } },
  start: 'week',
  nodes: {
    week: {
      id: 'week',
      lines: [
        { text: 'Monday: a stock halt, and a phrase on a news ticker that says Helio is “reviewing its municipal partnerships.”' },
        { text: 'Wednesday: Reyes announces she will not seek re-election, for family reasons, in a statement that is much better lawyered than Sorrell’s.' },
        { text: 'Thursday: a subpoena that Files finds before the newspapers do and does not post anywhere, because Files has never posted anything.' },
      ],
      next: 'sorrell',
    },
    sorrell: {
      id: 'sorrell',
      lines: [
        { text: 'Sorrell writes fourteen hundred words. It is sincere. You can tell, reading it, that he sat up writing it and meant all of it.' },
        { text: 'He talks about Isaac. He talks about nine days. He says that if he could go back he would build it again and build it better.' },
        { text: 'He does not, at any point in fourteen hundred words, come near the idea that the thing was wrong. He is not being clever. He genuinely cannot see it, and there is no version of this where anybody makes him.' },
      ],
      next: 'assembly',
    },
    assembly: {
      id: 'assembly',
      lines: [
        { text: 'At school there is an assembly about resilience which does not mention any of it, and afterwards the cameras in the corridor come down over half-term, quietly, by a contractor, on a Tuesday.' },
        { text: 'Deja’s mum’s crew do not get the job. Deja has some things to say about that.' },
      ],
      effects: [
        { kind: 'townTrust', delta: 12 },
        { kind: 'beat', missionId: 'act3', beat: 8 },
      ],
      end: true,
    },
  },
};

/** Beat 8 — hers, and the player gets nothing to decide. */
const NOVA_AFTER: Scene = {
  id: 'act3_8_nova_after',
  beat: 8,
  locationId: 'nova_house',
  hook: 'Nova is deleting nine years.',
  language: 'A',
  requires: { mission: { id: 'act3', beat: 8 } },
  start: 'afternoon',
  nodes: {
    afternoon: {
      id: 'afternoon',
      lines: [
        { text: 'It takes an afternoon. She does it herself, on the sofa, with the laptop on a cushion and the television on in the background showing something she is not watching.' },
        { text: 'She does not film it. She does not announce it. She does not do a final video, and the fact that this is a remarkable act of restraint is the saddest available fact about the last nine years.' },
        { speaker: 'Nova', text: 'There’s a bit where it asks if you’re sure and then a bit where it asks if you’re *really* sure.' },
        { text: 'Her mum is going to find out on Thursday. That is going to be its own whole thing, and it is not yours, and she has not asked you to be in the room for it.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'nova', delta: 15 },
        { kind: 'beat', missionId: 'act3', beat: 9 },
      ],
      end: true,
    },
  },
};

/**
 * Beats 9 and 10 — the quiet, and the last image.
 *
 * One scene, because they are one movement. The rhyme is the whole ending:
 * the same bleachers and the same screen as beat 6, months later, with the
 * verdict on it and nobody looking. Do not add a line that says what it means.
 */
const THE_QUIET: Scene = {
  id: 'act3_9_the_quiet',
  beat: 9,
  locationId: 'ballpark',
  hook: 'It’s June, and there’s a game on.',
  language: 'A',
  requires: { mission: { id: 'act3', beat: 9 } },
  start: 'quiet',
  nodes: {
    quiet: {
      id: 'quiet',
      lines: [
        { text: 'The thing nobody warns you about is how quiet a phone gets.' },
        { text: 'No streaks. No prompts about somewhere you were on Tuesday. No cheerful blue notification about a person you have not spoken to since Year 6.' },
        { text: 'The pole on 5th is still out. Nobody has come to fix it. It is starting to look like nobody is going to.' },
      ],
      next: 'outside',
    },
    outside: {
      id: 'outside',
      lines: [
        { text: 'Kids are outside a lot this summer. Not because of anything anyone said. There is just less to look at indoors, and the bit of the world that was pointing at them stopped.' },
        { text: 'Files is learning to skate, extremely badly, in a car park behind some shops, and has broken a wrist doing it, and is delighted.' },
      ],
      next: 'field',
    },
    field: {
      id: 'field',
      lines: [
        { text: 'Vetter Field, first Saturday in June. Somebody’s little brother is up to bat and has been up to bat for a while.' },
        { text: 'On the big screen, small and off to one side and turned down, a court feed is running. It has been running all week. There is a verdict due today or tomorrow or next week.' },
        { text: 'Deja is arguing with Milo about the infield fly rule. Bishop is asleep. Nova is here and is not filming, which is now just a thing that is true and not a thing anybody notices.' },
      ],
      next: 'last',
    },
    last: {
      id: 'last',
      lines: [
        { text: 'The kid at bat connects with one, finally, and it goes about nine feet, and everyone on both benches loses their minds.' },
        { text: 'Nobody in the stand is watching the screen.' },
        { text: 'Neither are you.' },
      ],
      effects: [
        { kind: 'chapter', chapterId: 'ending' },
        { kind: 'beat', missionId: 'act3', beat: MENTOR_DONE, done: true },
      ],
      end: true,
    },
  },
};

export const ACT3_FINALE_SCENES: Scene[] = [REHEARSAL, FOUNDERS_DAY, SLOW, NOVA_AFTER, THE_QUIET];
