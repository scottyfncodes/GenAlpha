import type { Scene } from '../../systems/scenes';

/**
 * ELLEN (skeleton beats 3 and 4).
 *
 * She is not a mentor and never becomes one. Module 06 keeps her outside the
 * template deliberately, so her thread sits on the Act 2 cursor with everything
 * else and grants nothing.
 *
 * Beat 4 is the load-bearing one, and it is built on Milo's Beat 3 structure on
 * purpose: a visible easy path, a harder clean one, and somebody watching. The
 * repetition is the argument — the AI shortcut and using Ellen are the same
 * temptation, and the game never says so out loud.
 *
 * Neither path is blocked, neither is scored, and the cost of the easy one does
 * not land until Act 3, when the protagonist has to ask her for something.
 */

const SCHEDULE: Scene = {
  id: 'act2_3_on_a_schedule',
  beat: 3,
  locationId: 'nova_house',
  hook: 'Ellen wants you in something. It’s two minutes. You’ve done it before.',
  language: 'A',
  requires: { mission: { id: 'act2', beat: 3 } },
  start: 'kitchen',
  nodes: {
    kitchen: {
      id: 'kitchen',
      lines: [
        { text: 'The ring light is already up when you get there, which means it was up before she asked you.' },
        { speaker: 'Ellen', text: 'It’s literally two minutes. We do the thing with the cereal. You did it at Christmas and it was so funny.' },
        { text: 'It was funny at Christmas. You remember it being funny. You remember laughing so hard you had to sit on the floor.' },
      ],
      next: 'fridge',
    },
    fridge: {
      id: 'fridge',
      lines: [
        { text: 'On the fridge there is a laminated month. Wednesday has a slot at 4:30 that says FRIEND CONTENT — CEREAL BIT (REDO).' },
        { text: 'Redo. So you did it at Christmas and it did not do the number it was supposed to do, and it has been on a fridge since January waiting for you to come round.' },
        { text: 'Ellen follows your eyes to the laminated month and does not react to it at all, because to her it is just where the month lives.', glitch: true },
      ],
      choices: [
        { text: 'Do the cereal bit.', goto: 'do_it' },
        { text: '“I can’t today. Sorry.”', goto: 'decline' },
      ],
    },
    do_it: {
      id: 'do_it',
      lines: [
        { text: 'You do it. It takes eleven minutes and four takes, and on the third one her mum says “bigger” from behind the light, and Ellen gets bigger, instantly, like a dial being turned.' },
        { text: 'Then it is done and the light goes off and she is herself again, and she flops onto the counter and says that was so funny, and means it, and you cannot tell any more which of the two of you is right about that.' },
        { text: 'She is your friend. She was your friend the whole time. That is not the part that has changed.' },
      ],
      next: 'after',
    },
    decline: {
      id: 'decline',
      lines: [
        { text: 'You say you can’t. She says fine, easily, and moves the slot to Sunday on the laminated month with a pen she keeps on the fridge for exactly that.' },
        { text: 'She is not hurt. That is the thing. There is no version of this where you disappoint her, because she does not experience it as a favour — it is just the shape of a Wednesday.' },
        { text: 'You go home wishing she had been a bit annoyed with you.' },
      ],
      next: 'after',
    },
    after: {
      id: 'after',
      lines: [
        { text: 'Walking back you do the arithmetic you have been avoiding. Nine years of a channel. Every birthday. Both of the times she broke a bone. The week her nan died, which did numbers.' },
        { text: 'Everything you have found out this month about tiered behavioural data on minors is downstream of the biggest single pipeline in Bellhaven, and it is on a fridge, and it has her face on it.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'nova', delta: 10 },
        { kind: 'flag', key: 'nova_schedule_seen' },
        { kind: 'beat', missionId: 'act2', beat: 4 },
      ],
      end: true,
    },
  },
};

const EASY_WAY: Scene = {
  id: 'act2_4_the_easy_way',
  beat: 4,
  locationId: 'fenwick_lot',
  hook: 'You need nine years of who-stood-with-whom. Somebody in town has exactly that.',
  language: 'B',
  requires: { mission: { id: 'act2', beat: 4 } },
  start: 'problem',
  nodes: {
    problem: {
      id: 'problem',
      lines: [
        { text: 'The dataset is tiered, and to prove what the tiers *are* you need to match them against something true — years of who was actually standing next to whom, from before anyone was being careful.' },
        { speaker: 'Aaron', text: 'Nine years. Tagged. Searchable.' },
        { text: 'Nobody says the name. Everybody is thinking the name.' },
        { speaker: 'Deja', text: 'Say it properly if you’re going to say it.' },
        { speaker: 'Aaron', text: 'The channel archive.' },
      ],
      next: 'weighing',
    },
    weighing: {
      id: 'weighing',
      lines: [
        { text: 'Ellen would give you the login in about four seconds. She would not ask why. She has offered it before, unprompted, the way other people offer you a lift.' },
        { text: 'The other way is a Tier 3 trace against a records host that has actual money spent on it, plus about a week of standing outside places with a notebook.' },
        { speaker: 'Milo', text: 'Both work.' },
        { text: 'That is the entire contribution Milo makes to this conversation, and he makes it while looking at you.' },
      ],
      choices: [
        { text: 'Ask Ellen for the login.', goto: 'easy' },
        { text: 'Do it the long way.', goto: 'long' },
      ],
    },
    easy: {
      id: 'easy',
      lines: [
        { text: 'She sends it before you have finished typing the question. There is a smiley face after it.' },
        { text: 'It is *so much better* than anything you could have got the other way. Nine years, tagged by face, cross-referenced by date, because a family that films everything also labels everything.' },
        { text: 'You have the tiers proven in an evening.' },
      ],
      next: 'found_out',
    },
    found_out: {
      id: 'found_out',
      lines: [
        { text: 'She works out what you used it for about a week later. Not because you told her.' },
        { speaker: 'Ellen', text: 'Oh — no, that’s fine! That’s literally what it’s for. That’s the only thing it’s good for.' },
        { text: 'She says it brightly and she means it and she is not upset, and you stand in her kitchen and understand, all at once, that you have just done the thing her mother does. You did it faster and with better reasons.' },
        { speaker: 'Milo', text: 'You’ll get there.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'nova', delta: -15 },
        { kind: 'flag', key: 'used_nova_access' },
      ],
      next: 'proven',
    },
    long: {
      id: 'long',
      lines: [
        { text: 'You do it the stupid way. It takes nine days, a burner’s worth of Heat and one entire Saturday standing outside a leisure centre pretending to wait for someone.' },
      ],
      minigame: {
        kind: 'hacking',
        missionId: 'records_host',
        tier: 3,
        skinId: 'villain',
        brief: 'A records host with real money spent on it. This is the expensive way to prove something you could have had on Tuesday.',
        onWin: 'long_done',
        onFail: 'long_done',
        onAbort: 'long_done',
      },
    },
    long_done: {
      id: 'long_done',
      lines: [
        { text: 'What you end up with is worse than the archive would have been. It is patchy in 2019 and useless for anyone who moved here after Year 7.' },
        { text: 'It is enough. It took nine days and it is enough.' },
        { text: 'You never mention to Ellen that there was a faster way, which is not the same as her not knowing, and about a month later she says thanks — for nothing in particular, just thanks — and changes the subject.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'nova', delta: 5 },
        { kind: 'heat', eventId: 'act2:the_long_way', delta: 4 },
      ],
      next: 'proven',
    },
    proven: {
      id: 'proven',
      lines: [
        { text: 'Either way, by the end of it, you can prove what the tiers are.' },
        { text: 'Tier 3 is a prediction about a child, sold by subscription, and the town signed for it in a meeting with an agenda and minutes and a vote.' },
      ],
      effects: [{ kind: 'beat', missionId: 'act2', beat: 5 }],
      end: true,
    },
  },
};

export const ACT2_NOVA_SCENES: Scene[] = [SCHEDULE, EASY_WAY];
