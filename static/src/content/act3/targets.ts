import type { SabotageConfig } from '../../systems/sabotage';
import type { HeistTarget } from '../../systems/heist';
import { ALERTNESS_BUDGET } from '../tiers';

/**
 * ACT 3'S TARGETS — the open question module 03 deferred.
 *
 * "Exact number and identity of villain wallets tied to named Act 3
 * antagonists — belongs in Story Bible/mission content, not this doc." Here
 * they are, and `systems/heist.ts` did not need a single change to hold them,
 * which was the tripwire set in the Phase 5 handoff. It didn't fire.
 *
 * Three, and all three go at once, because the villains are an arrangement
 * rather than a person (Story Bible: structural, not singular). Beat 3 will not
 * let the player proceed having researched two of them. That gate is the theme
 * expressed as a rule rather than as a speech.
 *
 * Balances are narratively scaled and the jump from the Phase 5 heist is the
 * point — Files said it in the summer, about eight and a half thousand dollars:
 * "It's their float. Money-money's further up."
 */

export const SORRELL: HeistTarget = {
  walletId: 'sorrell_personal',
  holder: 'Danny Sorrell',
  label: 'Founder’s holdings',
  balance: 1_900_000,
  securityTier: 'high',
  clues: [
    {
      id: 'the_brother',
      label: 'Why he built it',
      finding:
        'A blog post from 2016 about a fourteen-year-old who walked out of a house in Ohio and was found nine days later, and about how nobody could tell anyone where he had been. It is well written. It is genuinely moving. It is the same product.',
    },
  ],
  methods: [
    {
      id: 'founder_keys',
      label: 'The founder’s own backup',
      kind: 'hacking',
      missionId: 'act3_broadcast_chain',
      requiresClue: 'the_brother',
      blurb: 'A man who has never believed he was doing anything wrong has never had a reason to be careful.',
    },
  ],
};

export const REYES: HeistTarget = {
  walletId: 'reyes_committee',
  holder: 'Councilwoman Reyes',
  label: 'Civic engagement fund',
  balance: 240_000,
  securityTier: 'medium',
  clues: [
    {
      id: 'the_retainer',
      label: 'What it isn’t called',
      finding:
        'Not a bribe. A consultancy retainer, to her brother-in-law’s firm, declared on the correct form in the correct month. Every part of it is legal and all of it is the reason the vote went 7–2.',
    },
  ],
  methods: [
    {
      id: 'committee_filing',
      label: 'The disclosed account',
      kind: 'hacking',
      missionId: 'act3_broadcast_chain',
      requiresClue: 'the_retainer',
      blurb: 'It is disclosed. That is what makes it findable.',
    },
  ],
};

export const MERROW: HeistTarget = {
  walletId: 'merrow_ops',
  holder: 'Merrow Capital',
  label: 'Operating account',
  balance: 4_100_000,
  securityTier: 'high',
  clues: [
    {
      id: 'the_tier_sheet',
      label: 'What a child costs',
      finding:
        'A tier sheet. Bellhaven is a row on it. There is a per-child annual figure and a volume discount, and the discount applies above eight thousand children, and Bellhaven qualifies.',
    },
  ],
  methods: [
    {
      id: 'fund_ops',
      label: 'The operating account',
      kind: 'hacking',
      missionId: 'act3_broadcast_chain',
      requiresClue: 'the_tier_sheet',
      blurb: 'Nobody at Merrow has ever met a child. That is not an accusation, it is an org chart.',
    },
  ],
};

/** All three, in the order the broadcast names them. */
export const ACT3_TARGETS: HeistTarget[] = [SORRELL, REYES, MERROW];

/**
 * The last Tier 4 sabotage in the game (module 05's top row: five casing
 * details plus a hidden sixth, four window beats, tight budget).
 *
 * Skinned corporate-clean over exactly the same beats as a junction box —
 * module 05's "visual contrast payoff, same as Hacking's villain-skin". Deja
 * gets to say the quiet part in the scene: it is the same cabinet, it is always
 * the same cabinet, they just spend more on the paint.
 */
export const UPLINK_CABINET: SabotageConfig = {
  missionId: 'act3_uplink',
  skinId: 'villain',
  title: 'Behind the third-base stand',
  brief:
    'Everything Vetter Field puts on that screen leaves through one cabinet with a very good lock on it. You need ninety seconds inside it and you need it to still look untouched on Saturday.',
  alertnessBudget: ALERTNESS_BUDGET[4],
  baseAlertnessBudget: ALERTNESS_BUDGET[4],
  casingDetails: [
    { id: 'lock', label: 'The lock', finding: 'Electronic, logged, and opened forty times a week by people carrying things in both hands. There is a wedge behind the hinge that somebody put there in about 2019.' },
    { id: 'shift', label: 'Who’s on', finding: 'One steward on the concourse until the sixth, then two. The changeover takes four minutes and happens in the same place every time.' },
    { id: 'feed', label: 'Where the feed goes', finding: 'Cabinet, uplink, truck. The truck is rented and the driver does the crossword until the ninth.' },
    { id: 'grounds', label: 'The grounds crew', finding: 'They drag the infield between the fifth and sixth. Everybody in the stadium watches them do it, including the stewards, including the cameras.' },
    { id: 'gantry', label: 'The new camera', finding: 'The one on the scoreboard gantry points at the bleachers, not the field. It cannot see the third-base stand at all, which is the single most useful thing anyone has ever learned about it.' },
    {
      id: 'schematic',
      label: 'The cabinet’s own diagram',
      hiddenUnlessPrepped: true,
      finding: 'Deja’s mum’s crew installed it. The diagram is in a folder in a van, and it is wrong in one specific place, which is the place you need.',
    },
  ],
  windowBeats: [
    {
      id: 'approach',
      prompt: 'Bottom of the fifth. The concourse smells like onions and nobody is anywhere.',
      seconds: 14,
      options: [
        { id: 'drag', text: 'Go while they’re dragging the infield', risk: 1, requiresCasingDetail: 'grounds', outcome: 'Nine thousand people and two stewards all watching a man on a tractor make a straight line.' },
        { id: 'change', text: 'Go on the steward changeover', risk: 1, requiresCasingDetail: 'shift', outcome: 'Four minutes of one steward explaining something to another steward.' },
        { id: 'walk', text: 'Just walk down there', risk: 4, outcome: 'You get there. Somebody in a hi-vis says “alright” to you and you say “alright” back and neither of you stops.' },
      ],
    },
    {
      id: 'open',
      prompt: 'A very good lock on a cabinet in a stadium where nobody has ever tried anything.',
      seconds: 12,
      options: [
        { id: 'wedge', text: 'The wedge behind the hinge', risk: 1, requiresCasingDetail: 'lock', outcome: 'Somebody in 2019 got fed up carrying a key. It has been open ever since and the log has never once said so.' },
        { id: 'jam', text: 'Burn the signal jammer', risk: 0, requiresTool: 'signal_jammer', outcome: 'The lock logs to a controller that is currently not hearing from anybody.' },
        { id: 'force', text: 'Force it', risk: 5, outcome: 'It opens. It also does not shut properly again, and you spend the rest of the game thinking about that.' },
      ],
    },
    {
      id: 'inside',
      prompt: 'Ninety seconds inside a cabinet, and Files on the phone in your pocket.',
      seconds: 12,
      options: [
        { id: 'diagram', text: 'Go straight to the port the diagram gets wrong', risk: 0, requiresCasingDetail: 'schematic', outcome: 'Third from the left, not fourth. Twenty-two seconds and you are done.' },
        { id: 'trace', text: 'Follow the feed by hand', risk: 1, requiresCasingDetail: 'feed', outcome: 'Cabinet, uplink, truck. You find it because you know what you are looking at now, which you did not in March.' },
        { id: 'guess', text: 'Take the likeliest one', risk: 4, outcome: 'You get it on the second guess. The first guess is going to bother you until Saturday.' },
      ],
    },
    {
      id: 'out',
      prompt: 'Shut it, and be somewhere else, and look like a kid at a baseball game.',
      seconds: 12,
      options: [
        { id: 'gantry', text: 'Out along the blind side of the gantry camera', risk: 1, requiresCasingDetail: 'gantry', outcome: 'It is still pointing at the bleachers. It has been pointing at the bleachers all season.' },
        { id: 'sixth', text: 'Wait for the top of the sixth and leave with the queue', risk: 1, requiresCasingDetail: 'shift', outcome: 'You come up the steps in the middle of about forty people who want a hot dog.' },
        { id: 'now', text: 'Go now, quickly', risk: 4, outcome: 'Quick reads as wrong from a long way off. You are fairly sure somebody clocked it and fairly sure they did not care.' },
      ],
    },
  ],
};
