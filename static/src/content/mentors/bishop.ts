import type { MentorMission } from '../../systems/mentors';
import { MENTOR_DONE } from '../../systems/mentors';
import type { Scene } from '../../systems/scenes';

/**
 * BISHOP — resistance intel, and the hinge of the whole story.
 *
 * Gated on two other mentors (module 06's one sequencing rule) so the player
 * has a crew before the betrayal has something to cost them. Everything about
 * this mission is written to feel like the biggest win of the game so far, and
 * to be the cheapest thing the player ever got.
 *
 * Bishop's warmth is a structural clue, not a plot hole. Deja made you cover
 * for her. Files handed you a live wire and watched. Milo told you not to come
 * back. Bishop is delighted with you on sight and never asks for anything —
 * and per the module's guardrail, exactly one detail gets planted here: he
 * deflects a question about money, played as a throwaway line, unremarked by
 * anyone. It should read as nothing on the first pass.
 */

const CONTACT: Scene = {
  id: 'mentor_bishop_1_contact',
  beat: 1,
  locationId: 'camera_pole_5th',
  hook: 'Somebody’s standing at Pole 5-C. Waiting, not passing.',
  language: 'B',
  requires: {
    flags: ['resistance_hint_found'],
    mission: { id: 'bishop', beat: 1 },
    // Module 06: Bishop comes after at least two others, so the player has a
    // functioning crew and real trust in "this is working" before it's undercut.
    mentorSkills: 2,
  },
  start: 'pole',
  nodes: {
    pole: {
      id: 'pole',
      lines: [
        { text: 'There’s a kid leaning against the pole with his hands in his pockets, and he’s been there a while, because he’s standing in the one spot the second housing can’t see.' },
        { text: 'You know the spot. It took you three visits to find the spot.' },
        { speaker: 'Bishop', text: 'Bishop. And you’re the one who’s been pulling on Fifth Street.' },
        { text: 'He says it like a compliment somebody paid him.' },
      ],
      choices: [
        { text: '“How do you know that?”', goto: 'how' },
        { text: 'Say nothing and wait.', goto: 'how' },
      ],
    },
    how: {
      id: 'how',
      lines: [
        { speaker: 'Bishop', text: 'Because people talk about you. Not badly. That’s rarer than you’d think.' },
        { text: 'He’s twelve, maybe, with a hand-cut patch sewn onto his bag: two letters, and around the A, a circle, fully closed.' },
        { text: 'You have been looking at a half-drawn version of that circle under council grey for a month.' },
        { speaker: 'Bishop', text: 'Yeah. You know what it is. Course you do.' },
      ],
      next: 'not_alone',
    },
    not_alone: {
      id: 'not_alone',
      lines: [
        { speaker: 'Bishop', text: 'Right, so — you’ve been doing all this on your own, which, respect, but also: why?' },
        { text: 'You don’t have an answer. There has never been an option that wasn’t on your own.' },
        { speaker: 'Bishop', text: 'There are grown-ups doing this. Properly. Lawyers, servers, people who’ve been at it since before we were born.' },
        { speaker: 'Bishop', text: 'Come to the fence on Saturday. Nine. Bring whoever you trust.' },
        { text: 'And then he just goes, whistling, down the middle of the road, in full view of everything.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'bishop', delta: 5, metAt: 'mentor_bishop_1_contact' },
        { kind: 'beat', missionId: 'bishop', beat: 2 },
      ],
      end: true,
    },
  },
};

const ASK: Scene = {
  id: 'mentor_bishop_2_ask',
  beat: 2,
  locationId: 'annex_fence',
  hook: 'Saturday. The fence. Nine.',
  language: 'B',
  requires: { mission: { id: 'bishop', beat: 2 } },
  start: 'fence',
  nodes: {
    fence: {
      id: 'fence',
      lines: [
        { text: 'The annex at night is a shape with no windows and a car park with more lights than cars.' },
        { text: 'There’s a gap in the fence that somebody keeps re-opening, and a van parked up the access road with two adults in it drinking from a flask.' },
        {
          minTier: 'flagged',
          text: 'Bishop checks the road twice before he says your name, and moves you both further along the fence line. He apologises for it, warmly, which somehow makes it worse.',
        },
        { speaker: 'Bishop', text: 'Okay so officially I have to ask you some questions. Vouching, opsec, all that.' },
      ],
      choices: [
        { text: '“Go on then.”', goto: 'waived' },
        { text: '“You don’t know anything about me.”', goto: 'waived' },
      ],
    },
    waived: {
      id: 'waived',
      lines: [
        { speaker: 'Bishop', text: 'Nah, you’re fine.' },
        { text: 'That’s it. That’s the whole vetting.' },
        { speaker: 'Bishop', text: 'I can tell. I’ve been doing this two years, you get a feel for it.' },
        { text: 'It lands like a window opening. After a month of being weighed by everyone you’ve met, somebody has looked at you for four seconds and decided you’re in.' },
        { text: 'You would have to be a much more suspicious person than a lonely twelve-year-old to hear anything wrong in that.' },
      ],
      next: 'in',
    },
    in: {
      id: 'in',
      lines: [
        { speaker: 'Bishop', text: 'Right. Tonight’s small. Watch and pass things. Next one you’ll do properly.' },
        { text: 'He holds the gap in the fence open for you with his shoulder, like a door.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'bishop', delta: 5 },
        { kind: 'beat', missionId: 'bishop', beat: 3 },
      ],
      end: true,
    },
  },
};

const OP: Scene = {
  id: 'mentor_bishop_3_op',
  beat: 3,
  locationId: 'annex_fence',
  hook: 'Inside the fence. Watch and pass things.',
  language: 'B',
  requires: { mission: { id: 'bishop', beat: 3 } },
  start: 'crew',
  nodes: {
    crew: {
      id: 'crew',
      lines: [
        { text: 'There are nine of them. Nine. Adults, with jobs and cars and a woman called Reeta who is a paralegal and has brought a flask of soup for everybody.' },
        { text: 'They have a plan on an actual piece of paper. They have someone whose only job tonight is to watch the road. They have spare batteries.' },
        { text: 'You have spent a month being the only person in Bellhaven who thought something was wrong, and there are nine of them and they brought soup.' },
      ],
      next: 'work',
    },
    work: {
      id: 'work',
      lines: [
        { text: 'The op itself is unglamorous to the point of comedy. A camera at the service entrance gets a housing swapped for an identical housing with a different card in it.' },
        { text: 'You hold a torch. You pass up a nut driver. Twice you say “car” and everybody stops moving until it goes past, and both times you were right to say it.' },
        { text: 'It takes eleven minutes. It is the most competent thing you have ever been near.' },
      ],
      choices: [
        { text: '“What’s the card actually for?”', goto: 'card' },
        { text: 'Just do the job.', goto: 'after' },
      ],
    },
    card: {
      id: 'card',
      lines: [
        { speaker: 'Reeta', text: 'It records what the camera sends and where it sends it. Not the footage. The addresses.' },
        { speaker: 'Reeta', text: 'A camera that only talks to the council is a camera. One that talks to four other places is evidence.' },
        { text: 'She says evidence like a woman who has filed things.' },
      ],
      next: 'after',
    },
    after: {
      id: 'after',
      lines: [
        { text: 'Afterwards they stand around the van with the soup and somebody’s dog and they ask you questions and listen to the answers.' },
        { text: 'Bishop watches you being listened to, and is visibly, uncomplicatedly happy about it.' },
        { speaker: 'Bishop', text: 'Told you. You’re not on your own, you were just early.' },
        { text: 'On the walk home you feel something come loose in your chest that has been tight since a chair was empty in the third row, and you have to stop for a second at the corner.' },
      ],
      effects: [
        { kind: 'heat', eventId: 'bishop_first_op', delta: 6, log: true },
        { kind: 'flag', key: 'bishop_first_op_complete', value: true },
        { kind: 'trust', npcId: 'bishop', delta: 20 },
        { kind: 'beat', missionId: 'bishop', beat: 4 },
      ],
      end: true,
    },
  },
};

const UNLOCK: Scene = {
  id: 'mentor_bishop_4_unlock',
  beat: 4,
  locationId: 'annex_fence',
  hook: 'Bishop said come back. Bring nothing, obviously.',
  language: 'B',
  requires: { mission: { id: 'bishop', beat: 4 } },
  start: 'van',
  nodes: {
    van: {
      id: 'van',
      lines: [
        { text: 'The van is back at the top of the access road with the side door open and a laptop balanced on a cool box.' },
        { speaker: 'Bishop', text: 'So this is the actual thing. This is what I wanted to show you.' },
        { text: 'A shared drive. Photographs of contracts. A spreadsheet of camera addresses going back four years. A folder called BELLHAVEN and eleven others called other towns.' },
        { text: 'Other towns. It had genuinely not occurred to you that there were other towns.' },
      ],
      next: 'access',
    },
    access: {
      id: 'access',
      lines: [
        { speaker: 'Bishop', text: 'Read whatever you want. That’s not a test, that’s just how it works, everyone reads everything.' },
        { text: 'He shows you how to request a thing, how to flag a thing, who to ask about the annex, which is a woman in another county who has been mapping it for six years.' },
        { text: 'Six years. Somebody has been doing this since you were six.' },
      ],
      choices: [
        { text: '“Who pays for all this?”', goto: 'money' },
        { text: '“Why does anyone bother, if it’s been six years?”', goto: 'bother' },
      ],
    },
    money: {
      id: 'money',
      lines: [
        {
          speaker: 'Bishop',
          text: 'Donations, mostly. People who remember what it was like before. Reeta’s good with all that, I don’t really do the money side.',
        },
        { text: 'He’s already scrolling to the next folder.' },
        { speaker: 'Bishop', text: 'Here — this is the good one. Look at the dates on these.' },
      ],
      next: 'close',
    },
    bother: {
      id: 'bother',
      lines: [
        { speaker: 'Bishop', text: 'Because it’s six years of receipts. You can’t argue with a receipt.' },
        {
          text: 'He says it with total conviction, and it is the answer of somebody who has been told a thing by people he loves and has never once had to check it.',
        },
      ],
      next: 'close',
    },
    close: {
      id: 'close',
      lines: [
        { text: 'You stay until the flask is empty. Bishop walks you to the end of the access road even though it’s the wrong way for him.' },
        { speaker: 'Bishop', text: 'Bring the others next time. The quiet one and the one with the ladders.' },
        { text: 'He grins. It is completely, entirely genuine, which is the thing you will have the most trouble with later.' },
        { speaker: 'Bishop', text: 'We’ve got you now.' },
      ],
      effects: [
        { kind: 'skill', skill: 'resistanceIntel', unlocked: true },
        { kind: 'trust', npcId: 'bishop', delta: 25 },
        { kind: 'beat', missionId: 'bishop', beat: MENTOR_DONE, done: true },
      ],
      end: true,
    },
  },
};

export const BISHOP: MentorMission = {
  id: 'bishop',
  name: 'Bishop',
  skill: 'resistanceIntel',
  teaches: 'Resistance intel',
  scenes: [CONTACT, ASK, OP, UNLOCK],
};
