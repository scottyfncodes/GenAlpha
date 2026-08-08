import type { Scene } from '../../systems/scenes';

/**
 * ACT 2 — the spine (skeleton beats 1, 2 and 5).
 *
 * Sequenced on a mission cursor (`act2`) rather than a chapter string, the same
 * way the mentor missions and the heist are, so that mentor content and the
 * market stay open alongside it. Module 06's sequencing rule — player-directed
 * except where the story genuinely can't bear it — doesn't stop applying just
 * because the act changed.
 */

/** Beat 1 — the warmest scene in the game. Beat 8 takes it away. */
const CAR_PARK: Scene = {
  id: 'act2_1_car_park',
  beat: 1,
  locationId: 'fenwick_lot',
  hook: 'All three of them are here, at the same time, for no reason.',
  language: 'B',
  requires: { mentorSkills: 4, mission: { id: 'act2', beat: 1 } },
  start: 'lot',
  nodes: {
    lot: {
      id: 'lot',
      lines: [
        { text: 'Deja and Milo are arguing about whether a bike is worth fixing. It is not an important argument. They are both completely sincere.' },
        { speaker: 'Deja', text: 'The frame’s fine. The frame is the whole bike.' },
        { speaker: 'Milo', text: 'The frame is bent.' },
        { speaker: 'Deja', text: 'The frame is *characterful*.' },
        { text: 'Aaron is sitting on the wall with a phone, not in the conversation, entirely in the conversation.' },
      ],
      next: 'noticing',
    },
    noticing: {
      id: 'noticing',
      lines: [
        { text: 'Then Deja says “ask them,” and Milo says “fine, ask them,” and all three of them turn round.' },
        { text: 'It takes you a second to work out that they mean you. That they have been waiting for you to get here to settle it. That this is a thing that happens now.' },
        { text: 'In March you ate lunch on the low wall by the science block because it was easier than deciding where to sit.' },
      ],
      choices: [
        { text: '“The frame’s fine.”', goto: 'settled' },
        { text: '“The frame’s bent.”', goto: 'settled' },
        { text: 'Say nothing, and enjoy it a second longer.', goto: 'settled' },
      ],
    },
    settled: {
      id: 'settled',
      lines: [
        { text: 'Whichever way you go, one of them says “thank you” like they’ve won a court case, and Ines tells all four of you to move because she is trying to pack a table away.' },
        { text: 'Nobody says anything about how any of this happened. It is just Tuesday, and there are four of you.' },
      ],
      effects: [
        { kind: 'chapter', chapterId: 'act2_01' },
        { kind: 'beat', missionId: 'act2', beat: 2 },
      ],
      end: true,
    },
  },
};

/**
 * Beat 2 — what the cameras are actually for, and what happened to Casey.
 *
 * The failure branch does not wall this off. Aaron finishes it overnight, which
 * costs a day and a little more Heat and is characterful rather than punishing:
 * you still get the answer, you just didn't get it. Module 02's "never punish
 * failure twice", and the reason this scene has no retry loop.
 */
const WHAT_FOR: Scene = {
  id: 'act2_2_what_the_cameras_are_for',
  beat: 2,
  locationId: 'town_library',
  hook: 'The grant paid for the cameras. Something has to be paying for the grant.',
  language: 'A',
  requires: { mission: { id: 'act2', beat: 2 } },
  start: 'terminal',
  nodes: {
    terminal: {
      id: 'terminal',
      lines: [
        { text: 'The library terminal still has the same laminated sign about time limits. You are much better at this than you were in February.' },
        { text: 'Helio files quarterly. The filings are public. Everything about this is public, which is the part that keeps not making sense.' },
      ],
      minigame: {
        kind: 'hacking',
        missionId: 'helio_quarterly',
        tier: 2,
        skinId: 'villain',
        brief: 'The quarterly is four hundred pages. You want the twelve that say what the product is.',
        onWin: 'product',
        onFail: 'overnight',
        onAbort: 'overnight',
      },
    },
    overnight: {
      id: 'overnight',
      lines: [
        { text: 'You get nowhere for two hours and then the terminal times out on you, and the laminated sign turns out to mean it.' },
        { text: 'You tell Aaron. Aaron says nothing, which means yes.' },
        { text: 'In the morning there is a message with no words in it, just twelve pages, and you sit on the bus and read them and miss your stop.' },
      ],
      effects: [{ kind: 'heat', eventId: 'act2:quarterly_slow', delta: 3 }],
      next: 'product',
    },
    product: {
      id: 'product',
      lines: [
        { text: 'The cameras are not the product. The cameras are the sensor.' },
        { text: 'The product is a tiered behavioural dataset on everyone in Bellhaven under eighteen. Routes. Timings. Who stands with whom outside D block. Attention held, in seconds, per surface.' },
        { text: 'Tier 1 is who you are. Tier 3 is what you will probably do next. Tier 3 is the expensive one.', glitch: true },
      ],
      next: 'casey',
    },
    casey: {
      id: 'casey',
      lines: [
        { text: 'And in an annex, under vendor relations, there is a name you know.' },
        { text: 'Casey’s dad worked for a firm that installs the poles. He raised something internally in January. There is a reference number for the thing he raised, and you cannot read the thing itself, and you can read everything that happened after it.' },
        { text: 'A relocation allowance. A settlement figure. A non-disparagement clause. A tick-box, ticked, next to the words MATTER CLOSED.' },
      ],
      next: 'paperwork',
    },
    paperwork: {
      id: 'paperwork',
      lines: [
        { text: 'You had been carrying, for four months, a shape of an answer with something terrible in the middle of it.' },
        { text: 'It is a form. Somebody filled in a form, and somebody else countersigned the form, and a family went to live somewhere else, and the whole of it fits in a field two hundred characters long.' },
        { text: 'Nobody did anything to Casey. It is so much worse than that. It is *administrative*.' },
      ],
      effects: [
        { kind: 'heat', eventId: 'act2:the_product', delta: 5, log: true },
        { kind: 'flag', key: 'casey_answer_found' },
        { kind: 'beat', missionId: 'act2', beat: 3 },
      ],
      end: true,
    },
  },
};

/**
 * Beat 5 — the midpoint. Deliberately made of systems that already exist: the
 * market moves, the ambient tiers escalate, town trust shows up in the
 * locations. The scene's job is to name the feeling, not to add a mechanic.
 */
const SMALL_WINS: Scene = {
  id: 'act2_5_small_wins',
  beat: 5,
  locationId: 'town_square',
  hook: 'Something has changed in how people talk about it.',
  language: 'B',
  requires: { mission: { id: 'act2', beat: 5 } },
  start: 'square',
  nodes: {
    square: {
      id: 'square',
      lines: [
        { text: 'A pole on 5th has been out for nine days. A cabinet behind the leisure centre has been out for six. Neither of them is coming back this month, and one of them is because of you.' },
        { text: 'Two Year Tens are talking about it by the bins. Not about you — about *someone*. Someone is doing it. Someone is apparently seventeen and apparently has a van.' },
        { speaker: 'Deja', text: 'A van. I’ve got a bus pass.' },
      ],
      next: 'flock',
    },
    flock: {
      id: 'flock',
      lines: [
        { text: 'The prices behind Fenwick have gone up twice this fortnight, both times the day after a good night. Ines does not comment on this and does not need to.' },
        { text: 'And on the corner of Marlow Street the shutter is up on the unit that has been boarded since winter. Somebody is painting the inside of it. Nobody knows who paid the arrears.' },
        { text: 'You know. You are not going to say. That turns out to be the good part.' },
      ],
      next: 'weather',
    },
    weather: {
      id: 'weather',
      lines: [
        { text: 'It is also true that a car sat outside your house on Sunday for four hours, and that Deja’s mum got asked a question at work that she did not like.' },
        { text: 'It is going well. That is what going well costs. Both of those are just facts now and you hold them at the same time, which is new.' },
      ],
      effects: [
        { kind: 'heat', eventId: 'act2:the_good_month', delta: 8, log: true },
        { kind: 'chapter', chapterId: 'act2_05' },
        { kind: 'beat', missionId: 'act2', beat: 6 },
      ],
      end: true,
    },
  },
};

export const ACT2_SPINE_SCENES: Scene[] = [CAR_PARK, WHAT_FOR, SMALL_WINS];
