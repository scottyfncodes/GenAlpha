import { MENTOR_DONE } from '../systems/mentors';
import type { Scene } from '../systems/scenes';

/**
 * How the market opens.
 *
 * One scene, and the only place in the entire game that creates money out of
 * nothing. There is deliberately no wage, no salvage rate and no ambient
 * income anywhere in the systems layer — a kid with a tin under the bed is a
 * true thing about this protagonist, and a payout per completed mission would
 * quietly turn a story about noticing into a story about earning.
 *
 * So the float is forty-one dollars, once, and everything after it has to come
 * out of the villains. That is the Robin Hood arc stated as an economy rather
 * than as a speech.
 */

export const MARKET_ACCESS_FLAG = 'market_access';
/** The tin. Small enough that the first purchase is a real decision. */
export const STARTING_TIN = 41;

const OPENING: Scene = {
  id: 'market_1_wednesday_table',
  beat: 1,
  locationId: 'fenwick_lot',
  hook: 'There are more people behind the Fenwick shops on a Wednesday than there should be.',
  language: 'B',
  /*
   * Gated on a mission cursor rather than a chapter, and this matters more
   * here than anywhere else in the game: node effects fire on entry, the
   * completion flag lands only at the end, and this node hands over money.
   * Without a door that closes on entry, a reload mid-scene is an infinite
   * tin. The cursor is the same mechanism the mentor missions use.
   */
  requires: { flags: ['resistance_hint_found'], mission: { id: 'market', beat: 1 } },
  start: 'lot',
  nodes: {
    lot: {
      id: 'lot',
      lines: [
        { text: 'A folding table between the bins, a bike light clipped to it for a lamp, and eleven people standing around like they all just happen to be here.' },
        { text: 'Nothing is priced. Nothing is displayed. There is a shoebox.' },
        { speaker: 'Ines', text: 'You’re Files’ friend. Sit down or move along, you’re blocking the bit where people pretend to be leaving.' },
        { text: 'She is fifteen, has a maths textbook open in front of her that she is genuinely doing, and does not look up.' },
      ],
      choices: [
        { text: '“What is this?”', goto: 'what' },
        { text: 'Sit down.', goto: 'what' },
      ],
    },
    what: {
      id: 'what',
      lines: [
        { speaker: 'Ines', text: 'Wednesdays. Things people need and can’t be seen buying. Phones with nobody’s name on them, mostly.' },
        { speaker: 'Ines', text: 'Prices move. Somebody does something loud downtown, everything goes up for a week, because everyone’s nervous and nervous is expensive.' },
        { text: 'She turns the textbook over.' },
        { speaker: 'Ines', text: 'That’s not a complaint. That’s the whole thing. If you can’t read the week you shouldn’t be buying in it.' },
      ],
      next: 'money',
    },
    money: {
      id: 'money',
      lines: [
        { speaker: 'Ines', text: 'Have you got money?' },
        { text: 'You have forty-one dollars in a tin under a loose board, saved over two years, mostly from a birthday and a lawn.' },
        { text: 'You had been saving it for nothing in particular. That was fine, before. It isn’t a plan you can still afford.' },
        { speaker: 'Ines', text: 'Then you’ve got forty-one dollars’ worth of week. Come back when the prices are wrong in your favour.' },
      ],
      effects: [
        { kind: 'cash', delta: STARTING_TIN, reason: 'The tin under the board' },
        { kind: 'flag', key: MARKET_ACCESS_FLAG },
        { kind: 'beat', missionId: 'market', beat: MENTOR_DONE, done: true },
      ],
      end: true,
    },
  },
};

export const MARKET_SCENES: Scene[] = [OPENING];
