import { MENTOR_DONE } from '../systems/mentors';
import type { Scene } from '../systems/scenes';

/**
 * LYING LOW — module 02's two missing halves.
 *
 * The Heat System specs two things this game did not have. The first is "lie
 * low" as a *player action*: a real choice that costs a day and buys back
 * about twelve Heat, available from the one place the protagonist can stop.
 * Until now it existed only behind a debug button that drops out of a
 * production build, which meant the shipped game had a resource the player
 * could raise and never lower.
 *
 * The second is what `hunted` is actually for. Module 02 is explicit that the
 * top tier "triggers forced 'lie low' story beats rather than just blocking
 * play", and that this should be "a scripted breather scene (safehouse, quiet
 * character moment) rather than a punishment screen" — and equally explicit
 * that Heat can never hard-fail the game. So `hunted` opens a scene at home,
 * as an ordinary open thread, the same way everything else in this game
 * arrives. Playing it is what unblocks lying low normally afterwards.
 *
 * A NOTE FOR THE ACT 2 PASS: this is written to Act 1's register on purpose,
 * because it can fire at any point in the story and has to read correctly at
 * all of them. Module 02 suggests a safehouse; there isn't one yet. When Act 2
 * places one, this scene is the obvious thing to relocate and deepen — it is
 * not precious, and it is deliberately not carrying any Act 2 emotional
 * weight it hasn't earned.
 */

export const LIE_LOW_FLAG = 'lie_low_learned';

const BREATHER: Scene = {
  id: 'breather_1_the_kitchen',
  beat: 1,
  locationId: 'home',
  hook: 'The kitchen light is on and somebody is waiting up.',
  language: 'A',
  /*
   * The only scene in the game gated on Heat rather than on story. It is
   * offered while `hunted` and closes on its own cursor, so it happens once
   * and doesn't re-fire every time the meter goes back up.
   */
  requires: { minTier: 'hunted', mission: { id: 'breather', beat: 1 } },
  start: 'kitchen',
  nodes: {
    kitchen: {
      id: 'kitchen',
      lines: [
        { text: 'It is eleven and the kitchen light is on, which it is not, and Mom is sitting at the table with a cup of tea she has not been drinking.' },
        { text: 'There is a car across the street that has been there since Sunday. Neither of you mentions the car.' },
        { speaker: 'Mom', text: 'Sit down a minute.' },
      ],
      choices: [
        { text: 'Sit down.', goto: 'tea_sit' },
        { text: '“I’m really tired.”', goto: 'tea_tired' },
      ],
    },
    tea_sit: {
      id: 'tea_sit',
      lines: [{ text: 'You sit. She doesn’t say anything for a second, like she’d braced for the other answer.' }],
      next: 'tea',
    },
    tea_tired: {
      id: 'tea_tired',
      lines: [
        { speaker: 'Mom', text: 'I know. Two minutes.' },
        { text: 'You sit down anyway. Two minutes was never actually the offer.' },
      ],
      next: 'tea',
    },
    tea: {
      id: 'tea',
      lines: [
        { text: 'She does not ask where you were. That is the thing you notice, and it takes you a second to work out why it lands so badly: she has stopped asking because she has worked out she does not get answers.' },
        { speaker: 'Mom', text: 'You don’t have to tell me. I’m asking you to be at this table on Thursday, that’s all. And Friday.' },
        { speaker: 'Mom', text: 'You can do whatever it is the rest of the time.' },
        { text: 'It is not a deal anybody would make with a twelve-year-old, and she makes it anyway, because it is the only one she has got that you might keep.' },
      ],
      next: 'quiet',
    },
    quiet: {
      id: 'quiet',
      lines: [
        { text: 'So you stay in for a few days. You do homework you had stopped doing. You are at the table on Thursday.' },
        { text: 'Nothing happens, for a while, which is the entire point of it.' },
        { text: 'The car goes on Wednesday. You do not see it go — you just come down one morning and the space is a space.' },
      ],
      effects: [
        /*
         * The decay is authored here rather than left to the button, because
         * this beat *is* the lie-low: several days at a kitchen table, not a
         * menu option. Logged, because a mentor referencing the week you went
         * quiet is only creditable if the game can check that it happened.
         */
        { kind: 'heat', eventId: 'breather:the_kitchen', delta: -22, log: true },
        { kind: 'flag', key: LIE_LOW_FLAG },
        { kind: 'trust', npcId: 'mom', delta: 10, metAt: 'breather_1_the_kitchen' },
        { kind: 'beat', missionId: 'breather', beat: MENTOR_DONE, done: true },
      ],
      end: true,
    },
  },
};

export const BREATHER_SCENES: Scene[] = [BREATHER];
