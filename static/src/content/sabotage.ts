import type { SabotageConfig } from '../systems/sabotage';
import { budgetNudge } from '../systems/missions';
import type { ThresholdTier } from '../state/schema';
import { HELIO_INTERCEPT } from './heist';
import { UPLINK_CABINET } from './act3/targets';
import { ALERTNESS_BUDGET } from './tiers';

/**
 * Sabotage missions are authored as data, per module 05. This file is content,
 * not logic — adding an Act 2 mission means adding an object here.
 *
 * Tier table (casing details / window beats / alertness budget):
 *   1 Intro      3 / 2 / generous   — Deja's mentor mission
 *   2 Standard   4 / 3 / moderate   — regular Act 2
 *   3 Hardened   5 / 3 / tight      — late Act 2, infrastructure
 *   4 Heist      5+1 hidden / 4 / tight — physical intercept, Act 3
 */
export { ALERTNESS_BUDGET } from './tiers';

/** Tier 1 — Deja's mentor mission, reskinned as "helping", not "sabotaging". */
export const DEJA_JOBSITE: SabotageConfig = {
  missionId: 'deja_jobsite_cover',
  skinId: 'infrastructure',
  title: 'Cover for Deja',
  brief:
    'Her mother’s crew is behind on the pole retrofit. Deja can’t be seen doing this part — she’s watched more than the other kids, and it’s her mom’s job on the line, not her allowance.',
  alertnessBudget: ALERTNESS_BUDGET[1],
  baseAlertnessBudget: ALERTNESS_BUDGET[1],
  casingDetails: [
    {
      id: 'supervisor',
      label: 'The supervisor',
      finding: 'He checks his phone every time the radio squawks. Whole body turns away from the lot.',
    },
    {
      id: 'ladder',
      label: 'The equipment',
      finding: 'The ladder’s already braced. Somebody set it up and got called away mid-job.',
    },
    {
      id: 'schedule',
      label: 'The clipboard by the truck',
      finding: 'Shift change at seven. For four minutes nobody is technically responsible for this lot.',
    },
  ],
  windowBeats: [
    {
      id: 'approach',
      prompt: 'The lot’s open ground. The supervisor is twenty feet off, facing the truck.',
      seconds: 14,
      options: [
        {
          id: 'radio',
          text: 'Wait for the radio, cross while he’s turned',
          risk: 1,
          requiresCasingDetail: 'supervisor',
          outcome: 'The radio squawks. He turns. You’re across the lot before it stops.',
        },
        {
          id: 'shiftchange',
          text: 'Go at seven, in the gap',
          risk: 1,
          requiresCasingDetail: 'schedule',
          outcome: 'Two crews swap. For four minutes you’re just another kid on a job site.',
        },
        {
          id: 'walk',
          text: 'Just walk over like you belong there',
          risk: 4,
          outcome: 'Someone looks up. Looks away. Probably nothing.',
        },
      ],
    },
    {
      id: 'thework',
      prompt: 'The bracket needs a quarter turn and the cable needs seating. Deja showed you once.',
      seconds: 14,
      options: [
        {
          id: 'braced',
          text: 'Use the ladder that’s already set',
          risk: 1,
          requiresCasingDetail: 'ladder',
          outcome: 'Two steps up, quarter turn, done. It takes less time than deciding to do it.',
        },
        {
          id: 'reach',
          text: 'Stretch for it from the box',
          risk: 4,
          outcome: 'You get it. Your arm shakes for a minute afterwards and you hope nobody saw.',
        },
      ],
    },
  ],
};

/** Tier 2 sample — proves the same component carries a harder, colder mission. */
export const DATA_ANNEX_DOOR: SabotageConfig = {
  missionId: 'annex_side_door',
  skinId: 'datacenter',
  title: 'The Annex Side Door',
  brief:
    'The building that holds the camera footage. Deja’s mother’s crew services it, which is exactly the problem.',
  alertnessBudget: ALERTNESS_BUDGET[2],
  baseAlertnessBudget: ALERTNESS_BUDGET[2],
  casingDetails: [
    { id: 'patrol', label: 'Patrol pattern', finding: 'A loop every eleven minutes. He never varies it, which is its own kind of careless.' },
    { id: 'lock', label: 'The side door lock', finding: 'Badge reader, but the frame’s warped. It doesn’t always latch.' },
    { id: 'camera', label: 'Camera angle', finding: 'It covers the door and nothing to the left of it.' },
    { id: 'staff', label: 'Staff schedule', finding: 'One night tech. Orders food at nine every night without fail.' },
    {
      id: 'maintlog',
      label: 'Maintenance log (needs a trace first)',
      finding: 'A service window logged for Thursday — the door alarm is already flagged as faulty.',
      hiddenUnlessPrepped: true,
    },
  ],
  windowBeats: [
    {
      id: 'gap',
      prompt: 'Eleven minutes of loop. You’re standing in about ninety seconds of it.',
      seconds: 12,
      options: [
        { id: 'loop', text: 'Move on the turn of the patrol', risk: 1, requiresCasingDetail: 'patrol', outcome: 'You move when he moves. The distance stays exactly the same the whole way.' },
        { id: 'blind', text: 'Take the left approach, out of frame', risk: 1, requiresCasingDetail: 'camera', outcome: 'You walk the one line the lens doesn’t own.' },
        { id: 'jam', text: 'Burn the signal jammer', risk: 0, requiresTool: 'signal_jammer', outcome: 'Everything with an antenna goes quiet for ninety seconds. You use eighty of them.' },
        { id: 'sprint', text: 'Just go, now', risk: 4, outcome: 'You make it. Your heart doesn’t catch up for a while.' },
      ],
    },
    {
      id: 'door',
      prompt: 'Badge reader. Small red light. It isn’t going to turn green for you.',
      seconds: 12,
      options: [
        { id: 'frame', text: 'Lift and pull — the frame’s warped', risk: 1, requiresCasingDetail: 'lock', outcome: 'It gives with a sound like a knuckle cracking. You’re in.' },
        { id: 'thursday', text: 'Use the logged service window', risk: 0, requiresCasingDetail: 'maintlog', outcome: 'The alarm is already flagged faulty. Nobody will read the entry twice.' },
        { id: 'force', text: 'Force it', risk: 5, outcome: 'It opens. It also doesn’t close right afterwards, and you know it.' },
      ],
    },
    {
      id: 'out',
      prompt: 'You have what you came for. The night tech’s food is due any minute.',
      seconds: 12,
      options: [
        { id: 'nine', text: 'Leave while he’s at the front for the delivery', risk: 1, requiresCasingDetail: 'staff', outcome: 'He signs for it with his back to the corridor. You’re a street away before he sits down.' },
        { id: 'wait', text: 'Wait for the patrol to pass again', risk: 2, requiresCasingDetail: 'patrol', outcome: 'Eleven minutes is a long time to stand still. You stand still.' },
        { id: 'now', text: 'Out the way you came, immediately', risk: 4, outcome: 'The door doesn’t latch behind you. Someone will notice that tomorrow.' },
      ],
    },
  ],
};

/**
 * Player-Freedom Audit item #5's own template — the repeatable overworld
 * targets (`world/sabotagenodes.ts`), not a scripted one-off. Same grey
 * street cabinet at every position it's actually placed, on purpose: the
 * point isn't a new location to discover, it's a verb the player can go
 * use again whenever the story isn't handing them a reason to.
 */
export const SURVEILLANCE_RELAY: SabotageConfig = {
  missionId: 'surveillance_relay',
  skinId: 'infrastructure',
  title: 'Surveillance Relay',
  brief: 'A grey cabinet on the corner, humming, with more cable coming out of it than a traffic light needs.',
  alertnessBudget: ALERTNESS_BUDGET[2],
  baseAlertnessBudget: ALERTNESS_BUDGET[2],
  casingDetails: [
    {
      id: 'vent',
      label: 'The vent grille',
      finding: 'Four screws, all of them stripped soft from somebody doing this before you.',
    },
    {
      id: 'sightline',
      label: 'Who can actually see it',
      finding: 'A shopfront window, angled away. Nobody in this town looks at a utility cabinet on purpose.',
    },
    {
      id: 'hum',
      label: 'The hum itself',
      finding: 'It changes pitch on a cycle — busy, then idle, then busy again. Idle is quieter to work through.',
    },
  ],
  windowBeats: [
    {
      id: 'open',
      prompt: 'The panel wants either the right screwdriver or a reason not to need one.',
      seconds: 12,
      options: [
        { id: 'screws', text: 'Back the stripped screws out slow', risk: 1, requiresCasingDetail: 'vent', outcome: 'They turn easier than they look. Somebody really has done this before.' },
        { id: 'pry', text: 'Just pry the grille', risk: 4, outcome: 'It comes off. It also bends, which anyone walking past tomorrow will clock.' },
      ],
    },
    {
      id: 'cut',
      prompt: 'Inside: a fan, a board, and a bundle of cable with one obvious feed.',
      seconds: 12,
      options: [
        { id: 'idle', text: 'Wait for the hum to drop, then pull it', risk: 1, requiresCasingDetail: 'hum', outcome: 'You pull it on the quiet half of the cycle. Nothing so much as flickers.' },
        { id: 'window', text: 'Work with your back to the shopfront’s blind side', risk: 1, requiresCasingDetail: 'sightline', outcome: 'You’re a shape nobody was looking for in a place nobody looks.' },
        { id: 'blind', text: 'Just pull the whole bundle', risk: 4, outcome: 'It comes free in your hand. The fan spins down behind you like it’s sighing.' },
      ],
    },
  ],
};

export const SABOTAGE_MISSIONS: Record<string, SabotageConfig> = {
  [DEJA_JOBSITE.missionId]: DEJA_JOBSITE,
  [DATA_ANNEX_DOOR.missionId]: DATA_ANNEX_DOOR,
  [HELIO_INTERCEPT.missionId]: HELIO_INTERCEPT,
  [UPLINK_CABINET.missionId]: UPLINK_CABINET,
  [SURVEILLANCE_RELAY.missionId]: SURVEILLANCE_RELAY,
};

export interface BuildSabotageArgs {
  missionId: string;
  heatTier: ThresholdTier;
  hardened?: number;
  /** True if the player ran a hacking trace on this target first (Tier 4 hook). */
  prepped?: boolean;
}

export function buildSabotageConfig(args: BuildSabotageArgs): SabotageConfig {
  const base = SABOTAGE_MISSIONS[args.missionId];
  return {
    ...base,
    prepped: args.prepped,
    baseAlertnessBudget: base.alertnessBudget,
    alertnessBudget: Math.max(
      3,
      base.alertnessBudget + budgetNudge(args.heatTier) - (args.hardened ?? 0),
    ),
  };
}
