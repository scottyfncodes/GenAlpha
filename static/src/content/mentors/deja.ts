import type { MentorMission } from '../../systems/mentors';
import { MENTOR_DONE } from '../../systems/mentors';
import type { Scene } from '../../systems/scenes';

/**
 * DEJA — Sabotage. Beat 3 hands off to DEJA_JOBSITE, the Tier 1 sabotage
 * mission that already existed, reskinned as helping rather than sabotaging.
 *
 * Her gatekeeping is protective, not distrustful, and the reason is specific:
 * her mother's crew is on contract, and a contract is a thing a town can look
 * at again whenever it wants a reason. She isn't idealistic. She's angry about
 * something exact.
 */

const CONTACT: Scene = {
  id: 'mentor_deja_1_contact',
  beat: 1,
  locationId: 'school',
  hook: 'Deja’s in the corridor with forty feet of extension lead.',
  language: 'A',
  requires: { flags: ['resistance_hint_found'], mission: { id: 'deja', beat: 1 } },
  start: 'hall',
  nodes: {
    hall: {
      id: 'hall',
      lines: [
        { text: 'Deja Okonkwo has a laminated pass clipped to her bag that says CONTRACTOR under a photo of her from two years ago.' },
        { text: 'Nobody else in the eighth grade has one. Nobody else in the eighth grade has ever needed one.' },
        { text: 'She’s re-coiling an extension lead somebody left knotted by the gym doors, over and under, over and under, because it was bothering her.' },
      ],
      choices: [
        { text: '“Do you know anything about the poles on Fifth?”', goto: 'poles' },
        { text: '“Somebody painted over something at 5-C.”', goto: 'paint' },
      ],
    },
    poles: {
      id: 'poles',
      lines: [
        { speaker: 'Deja', text: 'They’re poles.' },
        { text: 'She doesn’t stop coiling.' },
        { speaker: 'Deja', text: 'What about them.' },
      ],
      next: 'off',
    },
    paint: {
      id: 'paint',
      lines: [
        { text: 'The lead stops moving.' },
        { speaker: 'Deja', text: 'Council grey. Half a tin, straight over the top, no primer. It’ll lift by August.' },
        { text: 'Then she hears herself say it, and her face closes like a hand.' },
        { speaker: 'Deja', text: 'I don’t know. I don’t look at poles.' },
      ],
      effects: [{ kind: 'flag', key: 'deja_knows_you_saw', value: true }],
      next: 'off',
    },
    off: {
      id: 'off',
      lines: [
        { speaker: 'Deja', text: 'Whatever it is you’re doing. Don’t do it anywhere near my mom’s crew.' },
        { text: 'Flat, not unkind — the way you’d tell somebody there’s a step there.' },
        { text: 'She goes down the corridor with the lead over her shoulder, and takes the long way round, past the office, without looking at the office.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'deja', delta: 2, metAt: 'mentor_deja_1_contact' },
        { kind: 'beat', missionId: 'deja', beat: 2 },
      ],
      end: true,
    },
  },
};

const ASK: Scene = {
  id: 'mentor_deja_2_ask',
  beat: 2,
  locationId: 'deja_jobsite',
  hook: 'The yard on Ellinger. She’ll be there till six.',
  language: 'B',
  requires: { mission: { id: 'deja', beat: 2 } },
  start: 'gate',
  nodes: {
    gate: {
      id: 'gate',
      lines: [
        { text: 'Wet rope, diesel, cut grass. Cable spools stacked like coins. A work light on over the shed for nobody.' },
        {
          minTier: 'flagged',
          text: 'She doesn’t let you in the gate. She comes out to the road and keeps walking, so you walk, and the conversation happens at four miles an hour.',
        },
        { text: 'Deja is sitting on an upturned crate eating chips out of the bag, with a handheld radio going quietly beside her that she is absolutely not supposed to have.' },
      ],
      choices: [
        {
          text: '“You knew exactly what that paint was.”',
          requiresFlag: 'deja_knows_you_saw',
          goto: 'knew',
        },
        { text: '“I need to know how the poles are wired.”', goto: 'no' },
      ],
    },
    knew: {
      id: 'knew',
      lines: [
        { speaker: 'Deja', text: 'Everybody knows what paint is.' },
        { text: 'She eats another chip. She’s deciding something and letting you watch her decide it, which is not the same as deciding it in front of you.' },
        { speaker: 'Deja', text: 'Ask me the actual question.' },
      ],
      next: 'no',
    },
    no: {
      id: 'no',
      lines: [
        { speaker: 'Deja', text: 'No.' },
        { text: 'No pause before it. She had it ready.' },
        { speaker: 'Deja', text: 'My mom’s crew is contract. You know what contract means? It means the town can look at it again any time it wants a reason.' },
        { speaker: 'Deja', text: 'You get written up, your mom gets a phone call. I get written up, my mom gets a review.' },
        { text: 'She says review the way other people say fire.' },
      ],
      next: 'thursday',
    },
    thursday: {
      id: 'thursday',
      lines: [
        { text: 'The radio says something in numbers. She listens to all of it without appearing to.' },
        { speaker: 'Deja', text: 'The pole retrofit’s behind. Bracket and a cable seat, ten seconds of work, and it has to be done before the inspection or the whole crew eats it.' },
        { speaker: 'Deja', text: 'I can’t be the one up that ladder. I’m the one they watch.' },
        { text: 'She folds the bag over twice and doesn’t look at you.' },
        { speaker: 'Deja', text: 'Thursday. Seven. Don’t tell anyone you’re coming, including me.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'deja', delta: 3 },
        { kind: 'beat', missionId: 'deja', beat: 3 },
      ],
      end: true,
    },
  },
};

const COVER: Scene = {
  id: 'mentor_deja_3_cover',
  beat: 3,
  locationId: 'deja_jobsite',
  hook: 'Thursday. Seven.',
  language: 'B',
  requires: { mission: { id: 'deja', beat: 3 } },
  start: 'arrive',
  nodes: {
    arrive: {
      id: 'arrive',
      lines: [
        { text: 'Thursday comes the way Thursdays do, without asking whether you’re ready.' },
        { text: 'Deja is on the far side of the lot with a clipboard, being extremely visibly somewhere else.' },
        { text: 'She doesn’t wave. She does, at one point, look at the ladder for slightly too long.' },
      ],
      choices: [{ text: 'Case it first. Watch a while.', goto: 'run' }],
    },
    run: {
      id: 'run',
      lines: [],
      /**
       * A real run: the shared Heat table owns the cost, the briefing shows its
       * range, and the result writes a mission record. Not a practice node —
       * this is the moment the mechanic stops being a demo.
       */
      minigame: {
        kind: 'sabotage',
        missionId: 'deja_jobsite_cover',
        brief:
          'Bracket, quarter turn, seat the cable. Ten seconds of work and about forty minutes of deciding when to do it. Look at whatever you want first — that part costs nothing.',
        onWin: 'landed',
        onFail: 'spotted',
        onAbort: 'walked',
      },
    },
    walked: {
      id: 'walked',
      lines: [
        { text: 'You stand at the edge of the lot for a long time and then you don’t do it.' },
        { text: 'There isn’t a moment where you decide. The window is open and then it’s a bit less open and then it’s Friday.' },
        { text: 'Deja doesn’t say anything about it. That’s the worst part; you’d worked out three answers on the walk home and she doesn’t ask the question.' },
        { speaker: 'Deja', text: 'The crew got written up. Not for that. For being behind, which they were, because of that.' },
        { text: 'She says it like weather. Then, after a moment, without any particular warmth:' },
        { speaker: 'Deja', text: 'Yard. Nine. I still want to talk to you.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'deja', delta: 8 },
        { kind: 'flag', key: 'deja_job_missed', value: true },
        { kind: 'beat', missionId: 'deja', beat: 4 },
      ],
      end: true,
    },
    landed: {
      id: 'landed',
      lines: [
        { text: 'You’re back on the road before the light goes properly orange.' },
        { text: 'Deja passes you at the bus stop twenty minutes later without slowing down.' },
        { speaker: 'Deja', text: 'Yard. Nine. Bring nothing.' },
        { text: 'It is the single warmest thing anyone has said to you since Casey’s chair went empty.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'deja', delta: 28 },
        { kind: 'flag', key: 'deja_jobsite_covered', value: true },
        { kind: 'beat', missionId: 'deja', beat: 4 },
      ],
      end: true,
    },
    spotted: {
      id: 'spotted',
      lines: [
        { text: 'A torch beam, a shout, your own name in a stranger’s mouth — except it isn’t your name, it’s just “hey”.' },
        { text: 'The supervisor wants to know who you’re here with. That’s the whole question. That’s all he asks, four different ways.' },
        { text: 'You say you were cutting through. You say it badly. You say it four times and you never say Okonkwo.' },
        { text: 'He lets you go because you are twelve and it is a Thursday and he has a shift to close.' },
        { text: 'Deja watches the entire thing from beside the truck with a clipboard she is not reading.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'deja', delta: 18 },
        { kind: 'flag', key: 'deja_took_the_fall', value: true },
        { kind: 'beat', missionId: 'deja', beat: 4 },
      ],
      end: true,
    },
  },
};

const UNLOCK: Scene = {
  id: 'mentor_deja_4_unlock',
  beat: 4,
  locationId: 'deja_jobsite',
  hook: 'Yard. Nine. Bring nothing.',
  language: 'B',
  requires: { mission: { id: 'deja', beat: 4 } },
  start: 'crate',
  nodes: {
    crate: {
      id: 'crate',
      lines: [
        { text: 'At nine the yard is a different place. The work light makes one warm room out of the middle of it and the rest of the town stops existing.' },
        { text: 'Deja has two cans of something orange and hands you one without asking if you want it.' },
      ],
      choices: [
        {
          text: '“He asked me who I was with. Four times.”',
          requiresFlag: 'deja_took_the_fall',
          goto: 'fall',
        },
        {
          text: '“I couldn’t make myself do it. I’m sorry.”',
          requiresFlag: 'deja_job_missed',
          goto: 'missed',
        },
        { text: '“Why’d you let me do it?”', hiddenIfFlag: 'deja_job_missed', goto: 'why' },
        { text: 'Say nothing. Drink the orange thing.', goto: 'why' },
      ],
    },
    missed: {
      id: 'missed',
      lines: [
        { speaker: 'Deja', text: 'Yeah, I know.' },
        { text: 'She doesn’t make it easier and she doesn’t make it worse. She just lets it sit there being true.' },
        { speaker: 'Deja', text: 'I’ve stood at the bottom of that ladder loads of times and not gone up it. That’s not the bit I’d hold against you.' },
        { text: 'You ask what the bit is.' },
        { speaker: 'Deja', text: 'Whether you come back after. You came back after.' },
      ],
      next: 'why',
    },
    fall: {
      id: 'fall',
      lines: [
        { speaker: 'Deja', text: 'I know. I counted.' },
        { text: 'She turns the can around in her hands.' },
        { speaker: 'Deja', text: 'You want to know the thing I actually thought, standing there? I thought: she’s going to say it. Everybody says it.' },
        { speaker: 'Deja', text: 'You didn’t say it.' },
      ],
      next: 'why',
    },
    why: {
      id: 'why',
      lines: [
        { speaker: 'Deja', text: 'People think I’m in this because I’m angry about cameras.' },
        { speaker: 'Deja', text: 'I’m angry that my mom put up half of them. On a ladder. In February. For eighteen an hour and no sick days.' },
        { text: 'She isn’t performing it. She’s just saying a true thing out loud in the one place she can.' },
        { speaker: 'Deja', text: 'The system doesn’t run on billionaires. It runs on my mom being tired.' },
      ],
      next: 'teach',
    },
    teach: {
      id: 'teach',
      lines: [
        { speaker: 'Deja', text: 'Okay. Come here. Look at the yard and tell me what you see.' },
        { text: 'You say: cable, ladders, a fence.' },
        { speaker: 'Deja', text: 'Wrong. You see who has to walk where. Everything is built by somebody who had to get to it and get away from it after.' },
        { speaker: 'Deja', text: 'Find the walk and you’ve found the way in. That’s it. That’s the whole thing. People pay for courses.' },
        { text: 'She says it like a joke. It is not entirely a joke.' },
      ],
      next: 'close',
    },
    close: {
      id: 'close',
      lines: [
        { text: 'You stay until the light goes off on a timer and neither of you moves for a second in the dark.' },
        { speaker: 'Deja', text: 'Right. Go home. And text me, because now if you get picked up it’s my problem too.' },
        { text: 'Which is, you understand walking home, the actual thing she came to say.' },
      ],
      effects: [
        { kind: 'skill', skill: 'sabotage', unlocked: true, tier: 1 },
        { kind: 'trust', npcId: 'deja', delta: 12 },
        { kind: 'beat', missionId: 'deja', beat: MENTOR_DONE, done: true },
      ],
      end: true,
    },
  },
};

export const DEJA: MentorMission = {
  id: 'deja',
  name: 'Deja',
  skill: 'sabotage',
  teaches: 'Sabotage',
  scenes: [CONTACT, ASK, COVER, UNLOCK],
};
