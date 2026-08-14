import { MENTOR_DONE } from '../systems/mentors';
import type { Scene } from '../systems/scenes';

/**
 * THE UNIT — how the crew gets somewhere of their own.
 *
 * Optional, off the spine, and available once they've gone independent. It
 * doesn't gate anything and nothing in Acts 2 or 3 requires it, because those
 * were written and tested before it existed and retrofitting a dependency into
 * a finished act is how a finale acquires a hole.
 *
 * What it does is close the loop the economy has been missing since Phase 5:
 * the first heist pays out far more than the catalog can absorb, and the two
 * safehouse goods in module 03's catalog have been listing unbuyable this whole
 * time because there was nowhere to put them. Now there is.
 *
 * The place itself has been in the fiction for an act already — it is the
 * boarded unit on Marlow Street that the Robin Hood ambience mentions once the
 * town's trust is up, with the shutter open and somebody painting the inside
 * and nobody knowing who paid the arrears. If the player never redistributed a
 * penny, that ambient line never fired and this scene is the first they hear of
 * it, which reads differently and is allowed to.
 */

export const SAFEHOUSE_ID = 'marlow_unit';
export const SAFEHOUSE_FLAG = 'safehouse_established';

const THE_UNIT: Scene = {
  id: 'safehouse_1_the_unit',
  beat: 1,
  locationId: 'town_square',
  hook: 'Deja wants to show you something on Marlow Street.',
  language: 'B',
  requires: { flags: ['crew_independent'], mission: { id: 'safehouse', beat: 1 } },
  start: 'corner',
  nodes: {
    corner: {
      id: 'corner',
      lines: [
        { text: 'The unit on the corner has been boarded since winter. The shutter is up now and there is a bucket inside it and a radio playing to nobody.' },
        { speaker: 'Deja', text: 'Arrears got paid in April. Nobody knows by who.' },
        { text: 'She says it flatly, without looking at you, which is Deja for a great deal.' },
      ],
      choices: [
        { text: 'Say nothing.', goto: 'keys_quiet' },
        { text: '“Huh.”', goto: 'keys_huh' },
      ],
    },
    keys_quiet: {
      id: 'keys_quiet',
      lines: [{ text: 'You don’t say anything. Deja doesn’t need you to.' }],
      next: 'keys',
    },
    keys_huh: {
      id: 'keys_huh',
      lines: [
        { text: '“Huh” is doing a lot of work and she knows it.' },
        { speaker: 'Deja', text: 'Yeah. Huh.' },
      ],
      next: 'keys',
    },
    keys: {
      id: 'keys',
      lines: [
        { speaker: 'Deja', text: 'Landlord’s my mum’s cousin. He wants a tenant and he doesn’t want questions and those two things are the same want.' },
        { text: 'There is a back room with no window and one plug socket. It smells of paint and, underneath that, of a shop that sold bread for forty years.' },
        { speaker: 'Milo', text: 'It’s got a door that locks.' },
        { speaker: 'Deja', text: 'It’s got a door that locks.' },
      ],
      next: 'ours',
    },
    ours: {
      id: 'ours',
      lines: [
        { text: 'Everything you have done this year you have done in car parks, on walls, behind bins and in the ten minutes before somebody’s mum wanted the kitchen table back.' },
        { text: 'Aaron puts a bag down on the floor in the back room and does not pick it up again. That is, as far as anybody can tell, the moment it becomes yours.' },
        { speaker: 'Bishop', text: 'We should get a better lock.' },
        { text: 'Nobody disagrees. Ines does a very good line in locks.' },
      ],
      effects: [
        { kind: 'safehouse', id: SAFEHOUSE_ID },
        { kind: 'flag', key: SAFEHOUSE_FLAG },
        { kind: 'beat', missionId: 'safehouse', beat: MENTOR_DONE, done: true },
      ],
      end: true,
    },
  },
};

export const SAFEHOUSE_SCENES: Scene[] = [THE_UNIT];
