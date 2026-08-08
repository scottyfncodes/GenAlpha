import type { Scene } from '../systems/scenes';
import { ACT1_SCENES } from './act1';
import { MENTOR_SCENES } from './mentors';
import { MARKET_SCENES } from './market';
import { HEIST_SCENES } from './heist';
import { BREATHER_SCENES } from './breather';
import { SAFEHOUSE_SCENES } from './safehouse';
import { ACT2_SCENES } from './act2';
import { ACT3_SCENES } from './act3';

/**
 * Every authored scene in the game, in the order the overworld should prefer
 * them when more than one is open. Act 1 is linear and comes first; the mentor
 * missions run four at a time in whatever order the player picks.
 *
 * Adding Act 2 means adding to this array. The overworld takes a scene list
 * and has never heard of an act.
 */
export const ALL_SCENES: Scene[] = [
  ...ACT1_SCENES,
  ...MENTOR_SCENES,
  ...MARKET_SCENES,
  ...HEIST_SCENES,
  ...ACT2_SCENES,
  ...ACT3_SCENES,
  ...SAFEHOUSE_SCENES,
  ...BREATHER_SCENES,
];
