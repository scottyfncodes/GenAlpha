import { MENTOR_DONE } from '../../systems/mentors';
import type { Scene } from '../../systems/scenes';

/**
 * THE BETRAYAL (skeleton beats 6–10). The hinge of the whole story.
 *
 * Three rules this file is written under, all from the skeleton's design notes,
 * all easy to break by accident:
 *
 * 1. NOBODY RAISES THEIR VOICE. The betrayal is administrative. It was done by
 *    people filling in a form who believed the trade was worth it, which is
 *    thematic pillar 3 — institutions reproduce the harms they claim to fight.
 *    A shouted scene lets the audience file it as villainy and lets the adults
 *    off, because villains are a category you can be outside of.
 *
 * 2. BISHOP NEVER APOLOGISES AND IS NEVER FORGIVEN, because he didn't do it.
 *    The failure mode is the scene where the kid absolves the kid. The game
 *    just moves on with him in it.
 *
 * 3. HIS TRUST DOES NOT MOVE IN BEAT 7, on either path. He is not thinking
 *    about the protagonist and the game shouldn't pretend he is. It moves in
 *    beat 9, later and larger than any other mentor's — which is the structural
 *    answer to his Act 2 warmth having been cheap.
 */

const FLOOR_OPEN = 'act2_floor_open';

/** Gate shared by all four: the act is open, the betrayal has landed, and this
 *  particular scene hasn't been walked yet. */
const floorGate = (cursor: string) => ({
  flags: [FLOOR_OPEN],
  compromised: true,
  mission: { id: cursor, beat: 1 },
});

/** Beat 6 — Milo asks where the good guys' money comes from. */
const FUNDING: Scene = {
  id: 'act2_6_the_funding_question',
  beat: 6,
  locationId: 'repair_shop',
  hook: 'Milo has a question and has clearly been sitting on it for a while.',
  language: 'B',
  requires: { mission: { id: 'act2', beat: 6 }, compromised: false },
  start: 'shop',
  nodes: {
    shop: {
      id: 'shop',
      lines: [
        { text: 'Milo is reballing something under a lamp and does not look up.' },
        { speaker: 'Milo', text: 'Where does Bishop’s lot get their money?' },
        { text: 'He asks it the way he asks everything — flatly, with no case attached, as if it is a thing that has an answer and he simply doesn’t have it.' },
        { speaker: 'Milo', text: 'It’s not a dig. Servers cost. Legal costs. Somebody’s paying for the room they meet in.' },
      ],
      choices: [
        { text: '“They’re on our side, Milo.”', goto: 'reply_defended' },
        { text: '“I don’t know.”', goto: 'reply_honest' },
      ],
    },
    reply_defended: {
      id: 'reply_defended',
      lines: [
        { speaker: 'Milo', text: 'Right. I’m not saying they’re not.' },
        { text: 'He puts the iron down anyway — the answer wasn’t the problem, how fast it came out was.' },
      ],
      next: 'reply',
    },
    reply_honest: {
      id: 'reply_honest',
      lines: [
        { speaker: 'Milo', text: 'Good. That’s the correct amount to know.' },
        { text: 'He puts the iron down.' },
      ],
      next: 'reply',
    },
    reply: {
      id: 'reply',
      lines: [
        { speaker: 'Milo', text: 'I’m saying you’ve spent four months learning that the way to understand anything is follow the money, and there’s exactly one organisation in this town you haven’t done it to.' },
        { text: 'You remember, suddenly and completely, Bishop in a car park in the summer, asked a question about funding, and answering a slightly different one.' },
      ],
      next: 'trace',
    },
    trace: {
      id: 'trace',
      lines: [
        { text: 'Their infrastructure is not hard. That is the first thing you notice and you do not let yourself think about why.' },
      ],
      minigame: {
        kind: 'hacking',
        missionId: 'resistance_ledger',
        tier: 3,
        skinId: 'resistance',
        brief:
          'Their own tooling. Built by people you have met, held together with the same string as everything else they own.',
        onWin: 'schema',
        onFail: 'schema_noisy',
        onAbort: 'schema_noisy',
      },
    },
    schema_noisy: {
      id: 'schema_noisy',
      lines: [
        { text: 'You trip something on the way in. Somewhere, a person you have had a cup of tea with gets an alert with your fingerprints on it, and does not yet know it is you.' },
        { text: 'You get it anyway. It was never well defended. That keeps being the thing.' },
      ],
      effects: [{ kind: 'heat', eventId: 'act2:ledger_noisy', delta: 5, log: true }],
      next: 'schema',
    },
    schema: {
      id: 'schema',
      lines: [
        { text: 'What comes back is a schema. Not a document, not a confession — a table definition. Field names and types and a column called tier.' },
        { text: 'It is boring. It is genuinely boring. You read it twice waiting for it to be something and it declines to be.' },
        { text: 'The only thing you notice is that you have seen this shape before, recently, and cannot immediately place where.', glitch: true },
      ],
      next: 'who',
    },
    who: {
      id: 'who',
      lines: [
        { speaker: 'Milo', text: 'Well?' },
        { speaker: 'You', text: '“I don’t know what I’m looking at.”' },
        { text: 'And that is true, and it stays true, because there is exactly one person who has been inside that room enough times to read it — and he is going to need to be sitting down.' },
      ],
      effects: [
        { kind: 'heat', eventId: 'act2:the_ledger', delta: 6, log: true },
        { kind: 'flag', key: 'resistance_funding_traced' },
        { kind: 'beat', missionId: 'act2', beat: 7 },
      ],
      end: true,
    },
  },
};

/** Beat 7 — the hinge. */
const TELLING: Scene = {
  id: 'act2_7_telling_bishop',
  beat: 7,
  locationId: 'annex_fence',
  hook: 'You have a file only one person can read.',
  language: 'B',
  requires: { mission: { id: 'act2', beat: 7 }, compromised: false },
  start: 'fence',
  nodes: {
    fence: {
      id: 'fence',
      lines: [
        { text: 'Bishop is already at the fence when you get there, because he is always already somewhere, holding a gap open like a door.' },
        { text: 'He is in a good mood. He has been in a good mood since June. He starts telling you about a thing they are planning for the autumn and you let him get most of the way through it.' },
      ],
      choices: [
        { text: 'Show him.', goto: 'show' },
        { text: 'Don’t. Not yet.', goto: 'sit_on_it' },
      ],
    },

    show: {
      id: 'show',
      lines: [
        { text: 'He takes the phone off you mid-sentence, still smiling, the way you take a thing off someone when you already know what it is.' },
        { text: 'Then he stops talking.' },
        { speaker: 'Bishop', text: 'Where’s this from.' },
        { text: 'You tell him. He nods. He reads it again.' },
      ],
      next: 'again',
    },
    again: {
      id: 'again',
      lines: [
        { speaker: 'Bishop', text: 'Check it again.' },
        { text: 'You check it again. It says the same thing. He knows it says the same thing; he watched you check it.' },
        { speaker: 'Bishop', text: 'Check it again.' },
        { text: 'The second time is the bad one, because the second time he is not asking about the data.' },
      ],
      next: 'reading',
    },
    reading: {
      id: 'reading',
      lines: [
        { text: 'And then he reads it out. Not to you — just out loud, working, the way he does.' },
        { speaker: 'Bishop', text: 'That’s an intake schema. That’s — no, that’s the intake form. I’ve filled that in. I filled that in twice, in March, in the back room, and they gave me a badge for it.' },
        { text: 'Tier 1 is who you are. Tier 3 is what you’ll probably do next. The column names match the ones you pulled out of a SafeTrace quarterly, because there is no other sensible way to name a column like that, because everybody who builds one builds the same one.' },
        { speaker: 'Bishop', text: 'They said it was theirs. They said it was ours.' },
      ],
      next: 'nobody',
    },
    nobody: {
      id: 'nobody',
      lines: [
        { text: 'Nobody says the word. You do not say it. He does not say it. He gets there entirely on his own, standing up, in a car park, in about ninety seconds, which is how long it takes to lose the thing you have organised your whole life around.' },
        { speaker: 'Bishop', text: 'They were funding it by — ' },
        { text: 'He stops. He does not finish the sentence. He says he is going to go home, and then he does, immediately, while you are still standing there, before you can decide what your face should be doing.' },
      ],
      effects: [
        { kind: 'flag', key: 'told_bishop_directly' },
        { kind: 'flag', key: FLOOR_OPEN },
        { kind: 'skill', skill: 'resistanceIntel', compromised: true },
        { kind: 'chapter', chapterId: 'act2_07' },
        { kind: 'beat', missionId: 'act2', beat: 8 },
      ],
      end: true,
    },

    sit_on_it: {
      id: 'sit_on_it',
      lines: [
        { text: 'You let him finish telling you about the autumn thing. You say it sounds good. It does sound good.' },
        { text: 'You go home with it in your pocket and you do not sleep much, and on the second night you understand that you are not protecting him. You are protecting the four days in which he is still someone who has this.' },
      ],
      next: 'four_days',
    },
    four_days: {
      id: 'four_days',
      lines: [
        { text: 'It comes out on the Thursday, from their side, badly. Somebody senior gets asked a direct question in a room with eleven people in it and gives an answer with the words *strategic* and *sustainable* in it.' },
        { text: 'Bishop is in the room. Bishop is twelve, and is in the room, and has to work out what he has just heard while adults he loves watch him work it out.' },
      ],
      next: 'after_room',
    },
    after_room: {
      id: 'after_room',
      lines: [
        { text: 'He finds you at the fence afterwards. He is not angry. That is the whole problem.' },
        { speaker: 'Bishop', text: 'You didn’t know either. Right? Nobody knew.' },
        { text: 'He is asking you to say yes. He is not asking you to lie — it hasn’t occurred to him that there is a lie available.' },
      ],
      choices: [
        { text: '“I knew. I’ve known since Monday.”', goto: 'confess' },
        { text: 'Say nothing.', goto: 'silence' },
      ],
    },
    confess: {
      id: 'confess',
      lines: [
        { text: 'He takes it better than you deserve and much worse than he lets on.' },
        { speaker: 'Bishop', text: 'Monday.' },
        { text: 'Then, after a while, evenly: that he would have wanted four more days too, and that he is not sure whether that makes it better.' },
        { text: 'He goes home. He does not finish the conversation. Nobody in this car park is going to finish a conversation for a while.' },
      ],
      effects: [{ kind: 'flag', key: 'told_bishop_late' }],
      next: 'sealed',
    },
    silence: {
      id: 'silence',
      lines: [
        { text: 'You say nothing, and he takes the nothing as a yes, and thanks you for being there.' },
        { text: 'It sits in you like a swallowed stone. It is going to sit there for the rest of this.' },
      ],
      effects: [{ kind: 'flag', key: 'never_told_bishop' }],
      next: 'sealed',
    },
    sealed: {
      id: 'sealed',
      lines: [
        { text: 'Either way, by Friday, everyone knows. The adults are not coming. The adults were the thing.' },
      ],
      effects: [
        { kind: 'flag', key: FLOOR_OPEN },
        { kind: 'skill', skill: 'resistanceIntel', compromised: true },
        { kind: 'chapter', chapterId: 'act2_07' },
        { kind: 'beat', missionId: 'act2', beat: 8 },
      ],
      end: true,
    },
  },
};

/* ---------------------------------------------------------- beat 8: the floor
 *
 * Four short scenes, four locations, any order. No mechanics anywhere in them.
 * Beat 9 waits on all four flags rather than on a count, so the player can walk
 * them in whatever order the town puts them in.
 *
 * Each one carries its OWN mission cursor rather than sitting on `act2`'s beat
 * 8, because `requires.mission` names a single cursor and four order-free
 * siblings cannot share one. That also closes each scene's door on entry
 * rather than on completion, which is the same reload hole the market's tin
 * scene had: node effects fire when the node is entered, the completion flag
 * lands only at the end, and these scenes each hand out trust.
 */

const LOW_DEJA: Scene = {
  id: 'act2_8a_deja',
  beat: 8,
  locationId: 'deja_jobsite',
  hook: 'Deja is at the yard. Of course she is.',
  language: 'B',
  requires: floorGate('act2_floor_deja'),
  start: 'yard',
  nodes: {
    yard: {
      id: 'yard',
      lines: [
        { text: 'She is furious and it is going into her hands. She has stripped and rebuilt a junction she did not need to touch.' },
        { speaker: 'Deja', text: 'So we do it ourselves. That’s not a speech, that’s just the list. There isn’t another list.' },
        { text: 'She has been three steps ahead of everyone since Thursday, because stopping is not a thing her family has ever been able to afford, and grief has to go somewhere.' },
        { speaker: 'Deja', text: 'My mum’s crew have been keeping that town running for nineteen years and nobody’s ever come to save us either. You get used to it. You shouldn’t. You do.' },
        { speaker: 'Deja', text: 'You know how to keep your head down when it actually matters. I haven’t forgotten that.', requiresFlag: 'deja_jobsite_covered' },
      ],
      effects: [
        { kind: 'flag', key: 'low_point_deja' },
        { kind: 'trust', npcId: 'deja', delta: 5 },
        { kind: 'beat', missionId: 'act2_floor_deja', beat: MENTOR_DONE, done: true },
      ],
      end: true,
    },
  },
};

const LOW_FILES: Scene = {
  id: 'act2_8b_files',
  beat: 8,
  locationId: 'fenwick_lot',
  hook: 'Aaron is deleting things.',
  language: 'B',
  requires: floorGate('act2_floor_files'),
  start: 'wall',
  nodes: {
    wall: {
      id: 'wall',
      lines: [
        { text: 'Everything you built on their infrastructure. The shared drops. The relay. The thing Aaron spent a fortnight on in July and was quietly, visibly proud of.' },
        { text: 'Gone, methodically, one at a time, without anybody asking and without any announcement that it was happening.' },
        { text: 'You sit on the wall next to them for about twenty minutes and neither of you says anything, and that is the conversation.' },
        { speaker: 'Aaron', text: 'Wasn’t ours.' },
      ],
      effects: [
        { kind: 'flag', key: 'low_point_files' },
        { kind: 'trust', npcId: 'files', delta: 5 },
        { kind: 'beat', missionId: 'act2_floor_files', beat: MENTOR_DONE, done: true },
      ],
      end: true,
    },
  },
};

const LOW_MILO: Scene = {
  id: 'act2_8c_milo',
  beat: 8,
  locationId: 'repair_shop',
  hook: 'Milo asked the question. Milo was right.',
  language: 'B',
  requires: floorGate('act2_floor_milo'),
  start: 'lamp',
  nodes: {
    lamp: {
      id: 'lamp',
      lines: [
        { text: 'He is under the lamp with something apart. He does not say it.' },
        { text: 'He wants to. You can see the whole shape of it sitting behind his teeth — four months of being the one who wouldn’t take the easy answer, and here is the receipt.' },
        { text: 'He has decided it wouldn’t help. That is somehow much worse than if he had just said it.' },
        { speaker: 'Milo', text: 'How’s Bishop.' },
        { text: 'And that is what he does with being right.' },
      ],
      effects: [
        { kind: 'flag', key: 'low_point_milo' },
        { kind: 'trust', npcId: 'milo', delta: 5 },
        { kind: 'beat', missionId: 'act2_floor_milo', beat: MENTOR_DONE, done: true },
      ],
      end: true,
    },
  },
};

const LOW_HOME: Scene = {
  id: 'act2_8d_home',
  beat: 8,
  locationId: 'home',
  hook: 'And then there’s your house, at eleven at night.',
  language: 'A',
  requires: floorGate('act2_floor_home'),
  start: 'room',
  nodes: {
    room: {
      id: 'room',
      lines: [
        { text: 'You go through it again. Not the schema — the summer. Bishop finding you, rather than making you find him. Bishop warm on the first day, when the other three made you earn every inch of it.' },
        { text: 'It had felt like relief. It had felt like the moment it stopped being hard.' },
        { text: 'He wasn’t lying. That is the thing you keep arriving at and having to arrive at again. He was passing on exactly what he had been given, at exactly the value he had been told it was worth.' },
      ],
      next: 'absent',
    },
    absent: {
      id: 'absent',
      lines: [
        { text: 'Nobody has seen him for six days.' },
        { text: 'You are twelve years old, in your room, with a dataset that proves what a town did to its own children, and there is no adult in this story who is coming, and that is not a feeling — it is just the situation, and it is Tuesday, and it is yours.' },
      ],
      effects: [
        { kind: 'flag', key: 'low_point_home' },
        { kind: 'beat', missionId: 'act2_floor_home', beat: MENTOR_DONE, done: true },
      ],
      end: true,
    },
  },
};

/** Beat 9 — he comes back. Waits on all four floor scenes, in any order. */
const COMES_BACK: Scene = {
  id: 'act2_9_bishop_comes_back',
  beat: 8,
  locationId: 'fenwick_lot',
  hook: 'Somebody says Bishop’s behind the shops.',
  language: 'B',
  requires: {
    mission: { id: 'act2', beat: 8 },
    compromised: true,
    flags: ['low_point_deja', 'low_point_files', 'low_point_milo', 'low_point_home'],
  },
  start: 'back',
  nodes: {
    back: {
      id: 'back',
      lines: [
        { text: 'He looks about two years older, which at twelve is a thing that can happen in nine days.' },
        { text: 'He does not apologise. Nobody asks him to. There is a version of this where somebody tells him it wasn’t his fault and everybody feels better, and the four of you, without discussing it, decline to have that version.' },
        /*
         * The one thing Bishop can react to that nobody else in the crew can:
         * whether the protagonist was the one who told him, and when. Gated on
         * the flags `act2_7_telling_bishop` itself already writes, so this is a
         * one-line callback rather than a new branch — `never_told_bishop`
         * stays out of his dialogue entirely, because he was never told, and
         * lands instead as narration in `nine_seconds` below.
         */
        { speaker: 'Bishop', text: 'You were the one who showed me. First. Before it was a thing everyone else had to find out.', requiresFlag: 'told_bishop_directly' },
        { speaker: 'Bishop', text: 'Still would’ve rather heard it from you before I heard it in a room with eleven other people. Not going to say that twice.', requiresFlag: 'told_bishop_late' },
        { speaker: 'Bishop', text: 'I’ve got something.' },
      ],
      next: 'list',
    },
    list: {
      id: 'list',
      lines: [
        { text: 'It is the asset list. All of it. Contacts, holdings, the two people inside SafeTrace, the legal fund, the account structure, every door the adults have spent eleven years building.' },
        { text: 'He took it on the way out. He has been sitting on the single most valuable object in this story for six days in a bedroom.' },
        { speaker: 'Deja', text: 'Bishop. What are we supposed to — ' },
        { speaker: 'Bishop', text: 'Use it.' },
      ],
      next: 'nine_seconds',
    },
    nine_seconds: {
      id: 'nine_seconds',
      lines: [
        { text: 'It takes him about nine seconds to give away the thing that made him worth talking to, and he does it without being asked, and without making anybody earn it.' },
        { text: 'Which is, you realise, exactly what he did in the summer — and this time he is not passing on somebody else’s. He knows precisely what it costs, because he has just watched what happens to people who hold things back and call it strategy.' },
        { text: 'He still doesn’t know you knew before Thursday. Watching him hand over the biggest thing he has without being asked, you have another chance to say it, and you don’t take it.', requiresFlag: 'never_told_bishop' },
        { speaker: 'Bishop', text: 'It’s not a gift. I just don’t want to be the one who has it.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'bishop', delta: 25 },
        { kind: 'flag', key: 'crew_independent' },
        { kind: 'beat', missionId: 'act2', beat: 10 },
      ],
      end: true,
    },
  },
};

/** Beat 10 — the plan, and the one person they still have to ask. */
const DECISION: Scene = {
  id: 'act2_10_the_decision',
  beat: 10,
  locationId: 'fenwick_lot',
  hook: 'Five people and a folding table.',
  language: 'B',
  requires: { mission: { id: 'act2', beat: 10 }, compromised: true },
  start: 'table',
  nodes: {
    table: {
      id: 'table',
      lines: [
        { text: 'Ines lets you have the table after she has packed up, which is the closest thing to a headquarters any of you are going to get.' },
        { text: 'The plan takes about an hour and is mostly Deja and Aaron disagreeing about timing.' },
        { text: 'Not a fight. Not a leak to a journalist who will run it past a legal team for four months. All of it, at once, in the middle of something the whole town is already watching — and the money moved in the same minute, so there is no window in which to hide it.' },
      ],
      next: 'gap',
    },
    gap: {
      id: 'gap',
      lines: [
        { text: 'You have the data. You have the wallets. You have, thanks to a twelve-year-old with a bedroom and a grudge, every door the adults spent eleven years building.' },
        { text: 'What you do not have is anybody who will watch it.' },
        { text: 'It sits there for a while. Everyone gets there at the same time and nobody wants to be the one who says it, and then Aaron says it, because Aaron says the number.' },
        { speaker: 'Aaron', text: 'Ellen’s got four hundred thousand people.' },
      ],
      choices: [
        {
          text: 'Go and ask her.',
          goto: 'ask_clean',
          hiddenIfFlag: 'used_nova_access',
        },
        {
          text: 'Go and ask her.',
          goto: 'ask_owed',
          requiresFlag: 'used_nova_access',
        },
      ],
    },
    ask_clean: {
      id: 'ask_clean',
      lines: [
        { text: 'You walk over on the Sunday. You have not used anything of hers, not once, not when it would have saved you nine days.' },
        { text: 'So it is just a conversation between two people, one of whom is going to be asked for something enormous, and it can be a conversation because you have not spent the year quietly establishing that her things are available.' },
        { text: 'You have not asked her yet. You are going to. That is Act 3’s problem and it is a fair one.' },
      ],
      next: 'close',
    },
    ask_owed: {
      id: 'ask_owed',
      lines: [
        { text: 'You walk over on the Sunday, and about halfway there you understand what you are actually about to do.' },
        { text: 'You have used her archive already. She said it was fine. She said it was what it’s for.' },
        { text: 'So this is not a conversation. This is the second time, and she is going to say yes the way she says yes, brightly, immediately, without it occurring to her that no is a thing that was ever on the table — and you will have to decide whether to accept a yes like that.' },
      ],
      next: 'close',
    },
    close: {
      id: 'close',
      lines: [
        { text: 'Behind you at the folding table, four people are arguing about timings under a bike light.' },
        { text: 'No adults. It took losing the ones who were supposed to be there to notice that the thing you built while you were waiting for them was the actual answer.' },
        { text: 'It starts here. Not in March, when you noticed. Here.' },
      ],
      effects: [
        { kind: 'chapter', chapterId: 'act3_01' },
        { kind: 'beat', missionId: 'act2', beat: MENTOR_DONE, done: true },
      ],
      end: true,
    },
  },
};

export const ACT2_BETRAYAL_SCENES: Scene[] = [
  FUNDING,
  TELLING,
  LOW_DEJA,
  LOW_FILES,
  LOW_MILO,
  LOW_HOME,
  COMES_BACK,
  DECISION,
];
