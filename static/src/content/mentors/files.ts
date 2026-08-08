import type { MentorMission } from '../../systems/mentors';
import { MENTOR_DONE } from '../../systems/mentors';
import type { Scene } from '../../systems/scenes';

/**
 * FILES — Hacking. Beat 3 is deliberately not a hacking test. Files hands over
 * something real and simply watches; passing is not sharing it. This is the
 * mentor that proves the template works with no minigame in it at all.
 *
 * Failing has to cost something without locking hacking away for the rest of
 * the game, so the failure branch runs two extra beats: Files goes cold, and
 * the way back is going and taking it back, at a price. A dead end here would
 * be a soft game-over, since skills are the entire progression system.
 */

const CONTACT: Scene = {
  id: 'mentor_files_1_contact',
  beat: 1,
  locationId: 'school',
  hook: 'Everyone knows someone who can find things. Nobody knows their name.',
  language: 'A',
  requires: { flags: ['resistance_hint_found'], mission: { id: 'files', beat: 1 } },
  start: 'rumour',
  nodes: {
    rumour: {
      id: 'rumour',
      lines: [
        { text: 'The rumour has no edges. Somebody who can find anything. Somebody who got a kid’s deleted account back. Somebody who knew about the sports day cancellation two days early.' },
        { text: 'Everyone has heard of them. Nobody has a name, a grade, or a description, which is either nothing or the most interesting fact in Bellhaven Middle.' },
      ],
      choices: [
        { text: 'Ask around properly.', goto: 'ask' },
        { text: 'Stop asking. Start looking.', goto: 'look' },
      ],
    },
    ask: {
      id: 'ask',
      lines: [
        { text: 'Four people, four answers. An eighth grader who moved. A teacher’s kid. Somebody’s cousin at the high school. A boy called Ridge, who says it’s him, and it is very obviously not him.' },
        { text: 'The stories don’t agree about anything except one detail nobody thinks is a detail: it’s never at school. Whatever it is, it happens somewhere else.' },
      ],
      next: 'look',
    },
    look: {
      id: 'look',
      lines: [
        { text: 'So: somewhere with a signal, no adults, and nothing pointed at it.' },
        { text: 'That is a shorter list than it should be in a town with total coverage, and you have been staring at a coverage map on a truck-mounted screen for a week.' },
        { text: 'Behind the Fenwick Street shops: three bins, four loading bays, and a blind spot the size of a tennis court that exists because the bakery’s camera has been aimed at its own back door since it was installed.' },
      ],
      next: 'seen',
    },
    seen: {
      id: 'seen',
      lines: [
        { text: 'There’s a kid sitting on a milk crate with a laptop older than they are, in the exact centre of the blind spot, eating a sandwich with one hand.' },
        { text: 'They are about eleven. They see you at the mouth of the alley and do not startle, do not close the laptop, do not stop eating.' },
        { text: 'They just look at you for four full seconds, which is a very long time, and then go back to the screen.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'files', delta: 2, metAt: 'mentor_files_1_contact' },
        { kind: 'flag', key: 'files_located', value: true },
        { kind: 'beat', missionId: 'files', beat: 2 },
      ],
      end: true,
    },
  },
};

const ASK: Scene = {
  id: 'mentor_files_2_ask',
  beat: 2,
  locationId: 'fenwick_lot',
  hook: 'Go back to the lot. Try again.',
  language: 'B',
  requires: { mission: { id: 'files', beat: 2 } },
  start: 'lot',
  nodes: {
    lot: {
      id: 'lot',
      lines: [
        { text: 'Same crate, same laptop, different sandwich.' },
        { minTier: 'flagged', text: 'They’ve moved the crate. It’s behind the bins now, out of the line from the road, and they don’t explain that and you don’t ask.' },
        { text: 'You say a lot of words. You hear yourself saying them. Camera, record, Casey, the annex, help, all of it, faster and faster into a silence that does not move at all.' },
        { text: 'When you stop, they turn the laptop around. A text file, one line, already typed.' },
        { speaker: 'Files', text: 'people who want to help usually want something to be about them' },
      ],
      choices: [
        { text: '“That’s not fair.”', goto: 'fair' },
        { text: '“Okay. That’s probably true.”', goto: 'true' },
        { text: 'Sit down on the ground and wait.', goto: 'wait' },
      ],
    },
    fair: {
      id: 'fair',
      lines: [
        { text: 'They type. They turn it round.' },
        { speaker: 'Files', text: 'no' },
        { text: 'Then, after a moment, they type again.' },
        { speaker: 'Files', text: 'but its usually right' },
      ],
      next: 'notice',
    },
    true: {
      id: 'true',
      lines: [
        { text: 'Something happens at the corner of their mouth that is not a smile but is related to one.' },
      ],
      next: 'notice',
    },
    wait: {
      id: 'wait',
      lines: [
        { text: 'The ground is cold and gritty and you sit on it for eleven minutes without saying anything.' },
        { text: 'At minute eleven they move the sandwich bag six inches towards you, which you understand to be a whole paragraph.' },
      ],
      next: 'notice',
    },
    notice: {
      id: 'notice',
      lines: [
        { text: 'They turn the screen round one more time. It’s a scan. INCIDENT NOTICE, a date, a time, 4:52 PM, a grainy photograph of somebody in your jacket.' },
        { text: 'You have not told them about the notice. You have not told anyone about the notice.' },
        { speaker: 'Files', text: 'i wasnt looking for you. you were just in something i was already looking at' },
        { text: 'They close the lid halfway, which is as close as this is going to get to an appointment being made.' },
        { speaker: 'Files', text: 'come back friday' },
      ],
      effects: [
        { kind: 'trust', npcId: 'files', delta: 2 },
        { kind: 'beat', missionId: 'files', beat: 3 },
      ],
      end: true,
    },
  },
};

const TRUST: Scene = {
  id: 'mentor_files_3_trust',
  beat: 3,
  locationId: 'fenwick_lot',
  hook: 'Friday. The lot.',
  language: 'B',
  requires: { mission: { id: 'files', beat: 3 } },
  start: 'friday',
  nodes: {
    friday: {
      id: 'friday',
      lines: [
        { text: 'On Friday, Files does not make you talk. They just start showing you things, one window at a time, with no commentary at all.' },
        { text: 'A duty roster. A staff photo, badly lit, of a man about nineteen in a grey polo shirt. A login page you don’t recognise.' },
        { speaker: 'Files', text: 'emmanuel. my brother. nights at the annex, cleaning' },
        { speaker: 'Files', text: 'thats how i get in. its his card and his password and he doesnt know' },
      ],
      choices: [
        { text: '“Why are you telling me this?”', goto: 'why' },
        { text: '“Don’t tell me things like that.”', goto: 'dont' },
      ],
    },
    why: {
      id: 'why',
      lines: [
        { text: 'They shrug. It is the single least informative gesture you have ever received and it is clearly on purpose.' },
        { speaker: 'Files', text: 'you asked me for stuff. now you have some' },
      ],
      next: 'week',
    },
    dont: {
      id: 'dont',
      lines: [
        { speaker: 'Files', text: 'too late' },
        { text: 'They go back to the screen, entirely unbothered, as if they have just put something down on a table between you and would like to see how long you leave it there.' },
      ],
      next: 'week',
    },
    week: {
      id: 'week',
      lines: [
        { text: 'The thing about being handed something is that it doesn’t weigh anything until somebody asks you for it.' },
        { text: 'On Tuesday, Ridge finds you by the bike racks. Ridge trades. That is the entire personality: Ridge knows a person who knows a person, and Ridge always wants a fee.' },
        { speaker: 'Ridge', text: 'My sister does filing in the office. Two hours a week, unpaid, character-building.' },
        { speaker: 'Ridge', text: 'A notice with the wrong kid’s photo on it could go in the wrong drawer. Permanently. Off your record before high school even hears about it.' },
        { text: 'You want that. You want it more than you expected to want it, and your face apparently says so, because Ridge relaxes.' },
        { speaker: 'Ridge', text: 'So. Give me something nobody else has got.' },
      ],
      choices: [
        { text: 'Tell him about the brother at the annex.', goto: 'traded' },
        { text: '“The camera put me somewhere I wasn’t. Take that. It’s mine to give.”', goto: 'kept_mine' },
        { text: '“I haven’t got anything.”', goto: 'kept_nothing' },
      ],
    },
    traded: {
      id: 'traded',
      lines: [
        { text: 'It takes nine seconds. It is the easiest thing you do all week.' },
        { text: 'Ridge’s face changes in a way you will think about later — he goes carefully blank, the way people do when they’ve just been handed something worth more than they offered.' },
        { speaker: 'Ridge', text: 'Huh. Okay. Yeah, the notice is gone, don’t worry about it.' },
        { text: 'He’s already walking. He wasn’t walking a second ago.' },
      ],
      effects: [
        { kind: 'flag', key: 'files_traded_it', value: true },
        { kind: 'beat', missionId: 'files', beat: 4 },
      ],
      end: true,
    },
    kept_mine: {
      id: 'kept_mine',
      lines: [
        { text: 'You tell him about the photograph. The time on it. Your mother reading the sentence about community safety in a voice that wasn’t hers.' },
        { text: 'It’s true, it’s worth something, and it costs nobody but you.' },
        { speaker: 'Ridge', text: 'That’s not really a secret, that’s a complaint.' },
        { speaker: 'Ridge', text: '...Fine. Half a favour. The notice stays where it is but I’ll tell you if anyone asks about it.' },
        { text: 'He goes off unsatisfied, which turns out to feel completely different from losing.' },
      ],
      effects: [
        { kind: 'flag', key: 'files_kept_it', value: true },
        { kind: 'beat', missionId: 'files', beat: 4 },
      ],
      end: true,
    },
    kept_nothing: {
      id: 'kept_nothing',
      lines: [
        { text: 'Ridge waits. Ridge is good at waiting; it’s most of the job.' },
        { text: 'You stand there and let the notice stay on your record, and the silence gets embarrassing, and then it gets over with.' },
        { speaker: 'Ridge', text: 'You’re a terrible negotiator.' },
        { text: 'You walk home a mile lighter than you went out, for reasons you couldn’t explain to anyone.' },
      ],
      effects: [
        { kind: 'flag', key: 'files_kept_it', value: true },
        { kind: 'beat', missionId: 'files', beat: 4 },
      ],
      end: true,
    },
  },
};

const UNLOCK: Scene = {
  id: 'mentor_files_4_unlock',
  beat: 4,
  locationId: 'fenwick_lot',
  hook: 'The lot. Files hasn’t moved.',
  language: 'B',
  requires: { mission: { id: 'files', beat: 4 }, flags: ['files_kept_it'] },
  start: 'crate',
  nodes: {
    crate: {
      id: 'crate',
      lines: [
        { text: 'Files doesn’t ask what happened with Ridge. Files already knows what happened with Ridge; that was the point of Ridge.' },
        { text: 'They shuffle sideways on the crate. There is now, technically, room for two people on a crate built for one.' },
        { text: 'Then they turn the laptop so you can both see it, which they have never once done.' },
      ],
      next: 'show',
    },
    show: {
      id: 'show',
      lines: [
        { text: 'No explaining. No “so what you do is”. They just work, slowly, at about a third of their normal speed, so you can follow.' },
        { text: 'A record. A second record that contradicts it. The gap between them, which is where the true thing lives.' },
        { text: 'They pulse one node, wait, pulse another, and let a whole branch die rather than spend a move confirming what they already suspect.' },
        { speaker: 'Files', text: 'dont chase it. read it' },
        { text: 'That is the entire lesson. It takes ninety minutes and four words.' },
      ],
      next: 'close',
    },
    close: {
      id: 'close',
      lines: [
        { text: 'At the end they take the sandwich bag out again, look at it, and hand you the whole thing.' },
        { speaker: 'Files', text: 'sorry. i had to see' },
        { text: 'You say you know.' },
        { speaker: 'Files', text: 'yeah' },
      ],
      effects: [
        { kind: 'skill', skill: 'hacking', unlocked: true, tier: 1 },
        { kind: 'trust', npcId: 'files', delta: 30 },
        { kind: 'beat', missionId: 'files', beat: MENTOR_DONE, done: true },
      ],
      end: true,
    },
  },
};

const COLD: Scene = {
  id: 'mentor_files_4_cold',
  beat: 4,
  locationId: 'fenwick_lot',
  hook: 'The lot. You should probably go back.',
  language: 'B',
  requires: { mission: { id: 'files', beat: 4 }, flags: ['files_traded_it'] },
  start: 'crate',
  nodes: {
    crate: {
      id: 'crate',
      lines: [
        { text: 'Files is packing up when you get there, which they were not doing thirty seconds ago, because they saw you at the mouth of the alley.' },
        { text: 'You start to say something about Ridge.' },
        { speaker: 'Files', text: 'ridge told three people by lunch. thats what ridge is for' },
        { text: 'Not angry. Worse. The flat voice of somebody confirming a result they already ran the test for.' },
      ],
      choices: [
        { text: '“I’ll fix it.”', goto: 'fix' },
        { text: '“I’m sorry.”', goto: 'sorry' },
      ],
    },
    sorry: {
      id: 'sorry',
      lines: [
        { speaker: 'Files', text: 'ok' },
        { text: 'They close the laptop the rest of the way. It’s a very small sound.' },
      ],
      next: 'go',
    },
    fix: {
      id: 'fix',
      lines: [
        { text: 'They stop with the strap half over their shoulder.' },
        { speaker: 'Files', text: 'you cant unsay it' },
        { speaker: 'Files', text: 'you can go take back what you got for it though' },
        { text: 'Which is not forgiveness. It’s a set of instructions, offered by someone who could have offered nothing.' },
      ],
      next: 'go',
    },
    go: {
      id: 'go',
      lines: [
        { text: 'Emmanuel is nineteen and cleans an unmarked building at night and does not know his card has been out walking around town without him.' },
        { text: 'That is the part you keep coming back to on the way home: that the person you sold isn’t even in the story. He’s just somebody’s brother, going to work.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'files', delta: 2 },
        { kind: 'beat', missionId: 'files', beat: 5 },
      ],
      end: true,
    },
  },
};

const AMENDS: Scene = {
  id: 'mentor_files_5_amends',
  beat: 5,
  locationId: 'school',
  hook: 'Find Ridge. Take it back.',
  language: 'A',
  requires: { mission: { id: 'files', beat: 5 } },
  start: 'racks',
  nodes: {
    racks: {
      id: 'racks',
      lines: [
        { text: 'Ridge is at the bike racks because Ridge is always at the bike racks. It’s where the traffic is.' },
        { text: 'He is delighted to see you, which is how you know the annex thing has been good for business.' },
        { speaker: 'Ridge', text: 'My guy. My source.' },
      ],
      choices: [
        { text: '“It was wrong. Take my notice back and un-tell it.”', goto: 'deal' },
        { text: '“Who did you tell?”', goto: 'who' },
      ],
    },
    who: {
      id: 'who',
      lines: [
        { speaker: 'Ridge', text: 'Three people. Four. It’s not a bank, I can’t just close the account.' },
        { text: 'He says it lightly. He is not being cruel; it genuinely has not occurred to him that a name is a thing that happens to somebody.' },
      ],
      next: 'deal',
    },
    deal: {
      id: 'deal',
      lines: [
        { text: 'So you make the only trade that’s left. Put the notice back on my record. Tell everyone you made the annex thing up. Tell them you got it off a forum.' },
        { speaker: 'Ridge', text: 'That makes me look like an idiot.' },
        { text: 'You say: yes.' },
        { text: 'There is a long pause in which Ridge does arithmetic about his own reputation, and then, unexpectedly, shrugs.' },
        { speaker: 'Ridge', text: 'Whatever. Everyone forgets by Monday.' },
        { text: 'Everyone does not forget by Monday. But it’s smaller by Monday, and smaller is what you can buy.' },
      ],
      effects: [
        { kind: 'flag', key: 'files_amends_made', value: true },
        { kind: 'trust', npcId: 'files', delta: 4 },
        { kind: 'beat', missionId: 'files', beat: 6 },
      ],
      end: true,
    },
  },
};

const LATE_UNLOCK: Scene = {
  id: 'mentor_files_6_late',
  beat: 6,
  locationId: 'fenwick_lot',
  hook: 'The lot. One more time.',
  language: 'B',
  requires: { mission: { id: 'files', beat: 6 } },
  start: 'crate',
  nodes: {
    crate: {
      id: 'crate',
      lines: [
        { text: 'Files is on the crate. Files heard about Monday, because Files hears about everything; that’s the whole skill.' },
        { text: 'They don’t say thank you and they don’t say it’s fine, because it isn’t either of those.' },
        { text: 'They turn the laptop maybe forty degrees. Not all the way. You have to lean.' },
      ],
      next: 'show',
    },
    show: {
      id: 'show',
      lines: [
        { text: 'They work fast, and they don’t slow down for you, and you get most of it anyway because you’ve been paying attention for a month.' },
        { speaker: 'Files', text: 'dont chase it. read it' },
        { text: 'Then they close the lid and pick up their bag and stand there for a second, deciding.' },
        { speaker: 'Files', text: 'im not going to tell you anything about emmanuel again' },
        { text: 'You say that’s fair.' },
        { speaker: 'Files', text: 'yeah' },
        { text: 'It’s less than the other version would have been. It is not nothing. You take it, and you earn the rest slowly, which is the only way anyone ever earns anything from Files.' },
      ],
      effects: [
        { kind: 'skill', skill: 'hacking', unlocked: true, tier: 1 },
        { kind: 'trust', npcId: 'files', delta: 16 },
        { kind: 'beat', missionId: 'files', beat: MENTOR_DONE, done: true },
      ],
      end: true,
    },
  },
};

export const FILES: MentorMission = {
  id: 'files',
  name: 'Files',
  skill: 'hacking',
  teaches: 'Hacking',
  scenes: [CONTACT, ASK, TRUST, UNLOCK, COLD, AMENDS, LATE_UNLOCK],
};
