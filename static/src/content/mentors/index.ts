import type { MentorMission } from '../../systems/mentors';
import { scenesOf } from '../../systems/mentors';
import { DEJA } from './deja';
import { FILES } from './files';
import { MILO } from './milo';
import { BISHOP } from './bishop';

/**
 * The four mentors, as four data objects filling one template (module 06).
 * Nothing in src/systems knows any of their names.
 *
 * Order here is the suggested content pacing from the module — Deja or Aaron
 * first, both low-stakes and high-charm, then Milo, then Bishop — and it is
 * only a suggestion. Nothing gates on it except Bishop's `mentorSkills: 2`,
 * because the open-investigation structure is supposed to let the player pick.
 * What this order does control is which thread the overworld's hint line names
 * first when several are open at once.
 */
export const MENTORS: MentorMission[] = [DEJA, FILES, MILO, BISHOP];

export const MENTOR_SCENES = scenesOf(MENTORS);

export { DEJA, FILES, MILO, BISHOP };
