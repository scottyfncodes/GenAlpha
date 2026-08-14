import type { SabotageConfig } from '../systems/sabotage';
import { MENTOR_DONE } from '../systems/mentors';
import { clueEffect, discoverEffects, type HeistTarget } from '../systems/heist';
import type { Scene } from '../systems/scenes';
import { ALERTNESS_BUDGET } from './tiers';
import { INTEL_TIP } from './economy';

/**
 * THE FIRST HEIST — and a deliberate limit on what this is.
 *
 * Module 03 leaves the identity of the villain wallets as an open question for
 * a content pass, because the named ones belong to Act 3's antagonists and the
 * synchronized wallet-drain is the climax of the whole game. So this is not
 * that. This is SafeTrace's Bellhaven *operating* account — the contract float, a
 * regional line item, run by nobody the story will ever put on screen. Small
 * enough to take without spending the ending.
 *
 * What it does do is exercise every piece of the system end to end: recon that
 * reuses investigation, an execution phase that reuses Hacking or Sabotage
 * depending on the approach, a failure that hardens the target instead of
 * walling the player out, and a split with no correct answer.
 *
 * When the Act 3 content pass happens, the climactic wallets are new entries
 * in `HEIST_TARGETS` and new scenes. Nothing in `systems/heist.ts` should need
 * to change, and if it does, that's the signal the finale is being improvised.
 */

export const HELIO_OPS: HeistTarget = {
  walletId: 'helio_bellhaven_ops',
  holder: 'SafeTrace Civic Safety',
  label: 'Bellhaven operating float',
  /**
   * Narratively scaled, per module 03 — it doesn't need to be realistic, it
   * needs to feel meaningful. A signal jammer is two hundred dollars in this
   * game's money, so this is roughly forty-three jammers, or one town's worth
   * of somebody else's decision about that town.
   */
  balance: 8600,
  securityTier: 'low',
  clues: [
    {
      id: 'delivery',
      label: 'How the key moves',
      finding:
        'The maintenance contractor brings a small grey case to the annex on Thursdays, and takes it away again on Thursdays. It never stays overnight. Somebody decided that was safer.',
    },
    {
      id: 'assistant',
      label: 'Who answers the emails',
      finding:
        'Every message to the Bellhaven contract address is answered in under four minutes, at any hour, by a contract manager who is plainly doing three jobs and reads none of them properly.',
    },
    {
      id: 'backup',
      label: 'Where the careless copy lives',
      finding:
        'Somebody photographed the recovery sheet once, for convenience, and the photograph is still in a shared folder called ONBOARDING.',
    },
  ],
  methods: [
    {
      id: 'phishing_rig',
      label: 'The four-minute reply',
      kind: 'hacking',
      missionId: 'helio_wallet_phish',
      requiresClue: 'assistant',
      blurb:
        'Send the contract manager something that looks exactly like the ninety other things she’ll answer tonight, and be waiting on the other side of it.',
    },
    {
      id: 'physical_intercept',
      label: 'Thursday, the grey case',
      kind: 'sabotage',
      missionId: 'helio_wallet_intercept',
      requiresClue: 'delivery',
      blurb:
        'The case is only ever out of a locked room for the eleven minutes it spends crossing a car park.',
    },
  ],
};

export const HEIST_TARGETS: Record<string, HeistTarget> = {
  [HELIO_OPS.walletId]: HELIO_OPS,
};

/**
 * Tier 4, per module 05's table: five casing details plus a hidden sixth that
 * only shows if the player prepped, four window beats, tight budget. The prep
 * hook is the cross-module synergy the module asks for — except here it can
 * also be bought, because an intel tip is homework somebody else did.
 */
export const HELIO_INTERCEPT: SabotageConfig = {
  missionId: 'helio_wallet_intercept',
  skinId: 'heist',
  title: 'Thursday, 4:40pm',
  brief:
    'The grey case crosses the annex car park twice a week in the hands of a man who has done it two hundred times. You need ninety seconds with it and you need him not to know he gave you them.',
  alertnessBudget: ALERTNESS_BUDGET[4],
  baseAlertnessBudget: ALERTNESS_BUDGET[4],
  casingDetails: [
    {
      id: 'van',
      label: 'The contractor’s van',
      finding: 'He reverses in, every time, so the side door faces the building. Habit, not policy.',
    },
    {
      id: 'lanyard',
      label: 'What he carries',
      finding: 'Case in the left hand, phone in the right, lanyard in his teeth for the door. Both hands are always full at the door.',
    },
    {
      id: 'kerb',
      label: 'The route across',
      finding: 'He cuts the corner over the kerb by the bike rack. Everyone does. It’s the only place he isn’t looking forward.',
    },
    {
      id: 'reception',
      label: 'Reception’s line of sight',
      finding: 'The window looks straight down the ramp, and the blind is down from four until the sun comes off it at five.',
    },
    {
      id: 'radio',
      label: 'The site radio',
      finding: 'Channel 2 is the gate. When it goes, everyone within thirty feet turns to look at the gate.',
    },
    {
      id: 'sheet',
      label: 'The recovery sheet itself',
      hiddenUnlessPrepped: true,
      finding:
        'You already know what’s written on it, which means you don’t need the case for ninety seconds. You need it for eleven.',
    },
  ],
  windowBeats: [
    {
      id: 'arrival',
      prompt: 'The van comes up the ramp at twenty to five. He’s early, which means he’ll wait in the cab.',
      seconds: 14,
      options: [
        { id: 'blind', text: 'Move while reception’s blind is still down', risk: 1, requiresCasingDetail: 'reception', outcome: 'The window is a flat grey rectangle with nobody behind it. You cross underneath it at a walk.' },
        { id: 'gate', text: 'Wait for channel 2 and cross on the turn', risk: 1, requiresCasingDetail: 'radio', outcome: 'The radio goes. Four people look at the gate. You are not at the gate.' },
        { id: 'stroll', text: 'Cross now, openly', risk: 4, outcome: 'Nobody stops you. Somebody does look up, and you don’t find out whether that mattered.' },
      ],
    },
    {
      id: 'contact',
      prompt: 'He’s out, case in the left hand, phone in the right, forty feet of tarmac to the door.',
      seconds: 12,
      options: [
        { id: 'kerb', text: 'Be at the bike rack when he cuts the corner', risk: 1, requiresCasingDetail: 'kerb', outcome: 'He clips the kerb the way he always does, and for half a second the case swings out where you are.' },
        { id: 'door', text: 'Take him at the door, both hands full', risk: 2, requiresCasingDetail: 'lanyard', outcome: 'Lanyard in his teeth, phone under his chin. He would need a third hand to notice you.' },
        { id: 'jam', text: 'Burn the signal jammer', risk: 0, requiresTool: 'signal_jammer', outcome: 'Every radio on the site goes to static at once. In the confusion he sets the case down to check his phone.' },
        { id: 'bump', text: 'Just walk into him', risk: 5, outcome: 'It works. He apologises to you, which is somehow the worst part.' },
      ],
    },
    {
      id: 'read',
      prompt: 'Ninety seconds with the case, and a car park full of people who all have somewhere to be.',
      seconds: 12,
      options: [
        { id: 'known', text: 'You already know what’s on the sheet — just confirm it', risk: 0, requiresCasingDetail: 'sheet', outcome: 'Eleven seconds. You check three words and close it. It never looked open.' },
        { id: 'vanside', text: 'Do it on the blind side of the van', risk: 1, requiresCasingDetail: 'van', outcome: 'He reversed in, like always. The side door faces a wall, and so do you.' },
        { id: 'here', text: 'Do it right here, fast', risk: 4, outcome: 'You get all of it. Your hands don’t stop shaking until you’re on the bus.' },
      ],
    },
    {
      id: 'away',
      prompt: 'The case has to be back where it was, and you have to not be here.',
      seconds: 12,
      options: [
        { id: 'return', text: 'Put it back on the turn of the radio', risk: 1, requiresCasingDetail: 'radio', outcome: 'Channel 2 again. He turns. The case is exactly where he left it, because it never wasn’t.' },
        { id: 'ramp', text: 'Out down the ramp under the blind', risk: 1, requiresCasingDetail: 'reception', outcome: 'Grey window, grey afternoon, one more kid walking home from somewhere.' },
        { id: 'run', text: 'Leave it and go', risk: 4, outcome: 'It’s two feet from where it should be. He will notice on Thursday. He will not know why.' },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ scenes */

const RECON: Scene = {
  id: 'heist_1_the_number',
  beat: 1,
  locationId: 'town_square',
  hook: 'The grant figure is on the banner. Aaron has been looking at it for a week.',
  language: 'B',
  /*
   * After the crew, not during it. Both execution paths need a mechanic the
   * mentors teach, and more importantly this is the first thing in the game
   * the player does because they decided to, rather than because somebody
   * asked them — which only means anything once all four of them have.
   */
  requires: {
    flags: ['safety_grant_known', 'resistance_hint_found'],
    mentorSkills: 4,
    mission: { id: 'helio_heist', beat: 1 },
  },
  start: 'banner',
  nodes: {
    banner: {
      id: 'banner',
      lines: [
        { text: 'The safety grant banner has been up since March. Everyone in the photograph is still smiling.' },
        { speaker: 'Aaron', text: '2.4.' },
        { text: 'Aaron puts a phone on the bench between you. A council PDF, a contract schedule, and a third document that is neither.' },
        { speaker: 'Aaron', text: 'Town pays 2.4. SafeTrace spends 1.1 here. The rest goes somewhere and comes back as nothing.' },
      ],
      next: 'account',
    },
    account: {
      id: 'account',
      lines: [
        { text: 'It is not hidden. That is the part you keep coming back to. It is filed, published, and available to anyone who reads all four pages, which is nobody.' },
        { speaker: 'Aaron', text: 'It’s an account. It’s got a name and a number and it sits there.' },
        { text: 'You think about Casey’s house with the swing set still up, and about a mailbox somebody cleared.', glitch: true },
      ],
      choices: [
        { text: '“How much is in it?”', goto: 'how_much_asked' },
        { text: '“Could we take it?”', goto: 'how_much_named' },
      ],
    },
    how_much_asked: {
      id: 'how_much_asked',
      lines: [{ speaker: 'Aaron', text: 'Eight and a half thousand. It’s their float. It’s not their money-money.' }],
      next: 'how_much',
    },
    how_much_named: {
      id: 'how_much_named',
      lines: [
        { text: 'You say it before Aaron does. He looks at you for a second — recalibrating, not surprised.' },
        { speaker: 'Aaron', text: 'Yeah. Eight and a half thousand. It’s their float, not their money-money.' },
      ],
      next: 'how_much',
    },
    how_much: {
      id: 'how_much',
      lines: [
        { speaker: 'Aaron', text: 'Money-money’s further up. This is the bit that pays for the vans.' },
        { text: 'Aaron does not say we should take it. Aaron says the number, and then waits, which is how Aaron says everything.' },
        { text: 'Nobody has asked you to do this. There is nobody left to ask you.' },
      ],
      effects: [
        ...discoverEffects(HELIO_OPS),
        { kind: 'trust', npcId: 'files', delta: 5 },
        { kind: 'beat', missionId: 'helio_heist', beat: 2 },
      ],
      end: true,
    },
  },
};

/**
 * Recon proper. A hub the player leaves when they choose to, not when the
 * content decides they've done enough — module 03 calls this an investigation
 * puzzle, and the whole reward space is the player deciding they know enough.
 *
 * Every branch writes a clue AND a flag: the clue is what the heist system
 * reads to open an approach, the flag is what hides the option that's already
 * been taken. Two records of one thing, deliberately — `visibleChoices` sees
 * flags and inventory and has no business reaching into the economy subtree.
 */
const CASING: Scene = {
  id: 'heist_2_habits',
  beat: 2,
  locationId: 'annex_fence',
  hook: 'The annex, on an ordinary afternoon, with a notebook.',
  language: 'B',
  requires: { mission: { id: 'helio_heist', beat: 2 } },
  start: 'hub',
  nodes: {
    hub: {
      id: 'hub',
      lines: [
        { text: 'Watching a building is mostly boring, which is why almost nobody does it, which is why it works.' },
        { text: 'You have a bus timetable, a maths book you are not doing, and the whole of a Tuesday.' },
        { minTier: 'flagged', text: 'You also have the feeling, for the first time, of being watched back. You move twice and it does not go away.' },
      ],
      choices: [
        { text: 'Watch what comes in and out.', goto: 'delivery', hiddenIfFlag: 'heist_clue_delivery' },
        /*
         * Hidden once tried, not once succeeded — a burned attempt tells the
         * portal somebody asked, and it isn't going to be as quiet the second
         * time. Which is also what stops this hub from being an infinite retry
         * on a node that changes nothing: the whole-game reachability walk
         * found exactly that and it is worth not un-fixing.
         */
        { text: 'Go at their contract address instead — see who answers.', goto: 'assistant_trace', hiddenIfFlag: 'heist_portal_tried' },
        {
          text: 'Ask Ines whether anyone’s selling on SafeTrace.',
          goto: 'tip',
          requiresItem: INTEL_TIP,
          hiddenIfFlag: 'heist_clue_backup',
        },
        { text: 'You know enough.', goto: 'enough' },
      ],
    },
    delivery: {
      id: 'delivery',
      lines: [
        { text: 'Thursday. A white van, a man in his fifties, and a small grey case that goes in at 4:40 and comes out again at 5:15.' },
        { text: 'It does not stay overnight. Somebody, somewhere, wrote that down as a security measure and was pleased with themselves.' },
        { speaker: '', text: 'It is also, therefore, outside for eleven minutes, twice a week, in a car park.' },
      ],
      effects: [
        clueEffect(HELIO_OPS, 'delivery'),
        { kind: 'flag', key: 'heist_clue_delivery' },
      ],
      next: 'hub',
    },
    assistant_trace: {
      id: 'assistant_trace',
      lines: [
        { text: 'SafeTrace’s Bellhaven contract address is on page four of a public PDF, which is the safest place in the world to put something.' },
      ],
      minigame: {
        kind: 'hacking',
        missionId: 'helio_contract_portal',
        tier: 2,
        skinId: 'villain',
        brief:
          'Not the wallet. Just the contract mailbox, and only far enough to see who is actually reading it.',
        onWin: 'assistant_found',
        onFail: 'assistant_missed',
        onAbort: 'assistant_missed',
      },
    },
    assistant_found: {
      id: 'assistant_found',
      lines: [
        { text: 'Every message is answered in under four minutes. At eleven at night. On a Sunday.' },
        { text: 'One person, three job titles, and a signature block that has had the same typo in it since 2023.' },
        { text: 'She is not careless. She is the last careful person in a system that has run out of people, which the system reads as the same thing.' },
      ],
      effects: [
        clueEffect(HELIO_OPS, 'assistant'),
        { kind: 'flag', key: 'heist_clue_assistant' },
        { kind: 'flag', key: 'heist_portal_tried' },
      ],
      next: 'hub',
    },
    assistant_missed: {
      id: 'assistant_missed',
      lines: [
        { text: 'The portal closes on you politely, in a friendly rounded typeface, and suggests you contact your administrator.' },
        { text: 'You learn nothing about who reads the mail. You learn that somebody is now aware that somebody asked.' },
        { text: 'The grey case still crosses the car park on Thursdays. That way in doesn’t care whether anyone read your email.' },
      ],
      effects: [{ kind: 'flag', key: 'heist_portal_tried' }],
      next: 'hub',
    },
    tip: {
      id: 'tip',
      lines: [
        { speaker: 'Ines', text: 'SafeTrace. Yeah. Hang on.' },
        { text: 'She does not look anything up. She just knows, the way she knows the price of a burner on a Wednesday.' },
        { speaker: 'Ines', text: 'Somebody photographed the recovery sheet. For convenience. It’s in a folder called ONBOARDING with four hundred other things.' },
        { text: 'She takes the tip money without counting it and goes back to her maths.' },
      ],
      effects: [
        clueEffect(HELIO_OPS, 'backup'),
        { kind: 'flag', key: 'heist_clue_backup' },
        /* Homework somebody else did — the hidden sixth casing detail (module 05). */
        { kind: 'prep', missionId: HELIO_INTERCEPT.missionId },
      ],
      next: 'hub',
    },
    enough: {
      id: 'enough',
      lines: [
        { text: 'You close the notebook. Down the fence line the floodlight comes on for nobody, the way it does at this time every day.' },
        { text: 'Whatever happens next, you decided it. That is new, and it does not feel the way you expected it to feel.' },
      ],
      effects: [{ kind: 'beat', missionId: 'helio_heist', beat: 3 }],
      end: true,
    },
  },
};

/** Shared by the first attempt and the second pass, which differ only in tone. */
function windowNodes(prefix: string) {
  return {
    [`${prefix}_phish`]: {
      id: `${prefix}_phish`,
      lines: [
        { text: 'You write it four times. The fourth one is boring, which is how you know it’s right.' },
      ],
      minigame: {
        kind: 'hacking' as const,
        missionId: HELIO_OPS.methods[0].missionId,
        tier: 4 as const,
        skinId: 'heist' as const,
        brief: 'She will answer in four minutes. You need to already be through when she does.',
        onWin: 'drain',
        onFail: `${prefix}_burned`,
        onAbort: `${prefix}_backed_out`,
      },
    },
    [`${prefix}_intercept`]: {
      id: `${prefix}_intercept`,
      lines: [
        { text: 'Thursday takes four days to arrive. You are at the bike rack for three of them, doing nothing, getting very good at it.' },
      ],
      minigame: {
        kind: 'sabotage' as const,
        missionId: HELIO_INTERCEPT.missionId,
        brief: 'Eleven minutes, twice a week, in a car park. This is the one you get.',
        onWin: 'drain',
        onFail: `${prefix}_burned`,
        onAbort: `${prefix}_backed_out`,
      },
    },
  };
}

const WINDOW: Scene = {
  id: 'heist_3_the_window',
  beat: 3,
  locationId: 'annex_fence',
  hook: 'You know how it moves and who answers. That’s a plan, apparently.',
  language: 'B',
  requires: { mission: { id: 'helio_heist', beat: 3 } },
  start: 'choose',
  nodes: {
    choose: {
      id: 'choose',
      lines: [
        { text: 'There are two ways in and you found both of them yourself, which is not a thing you would have believed about yourself in March.' },
        { text: 'Deja would say pick the one you can walk away from. Milo would say pick the one you understand.' },
      ],
      choices: [
        { text: 'The four-minute reply.', goto: 'w_phish', requiresFlag: 'heist_clue_assistant' },
        { text: 'Thursday, the grey case.', goto: 'w_intercept', requiresFlag: 'heist_clue_delivery' },
        { text: 'Not yet.', goto: 'not_yet' },
      ],
    },
    ...windowNodes('w'),
    not_yet: {
      id: 'not_yet',
      lines: [
        { text: 'You go home. The plan keeps. It will still be Thursday next week, and the week after that.' },
        { text: 'Nobody is disappointed in you. There is nobody to be.' },
      ],
      effects: [{ kind: 'beat', missionId: 'helio_heist', beat: 5 }],
      end: true,
    },
    w_burned: {
      id: 'w_burned',
      lines: [
        { text: 'It goes wrong in the ordinary way things go wrong: slightly, and then all at once, and then you are walking very normally towards a bus.' },
        { text: 'Nobody follows you. That is worse. It means it went to a form somewhere instead of to a person.' },
        { speaker: 'Aaron', text: 'They’ll move it. Not far. They’ll just make it annoying.' },
      ],
      effects: [{ kind: 'beat', missionId: 'helio_heist', beat: 5 }],
      end: true,
    },
    w_backed_out: {
      id: 'w_backed_out',
      lines: [
        { text: 'You stop. Standing there, with it right in front of you, you stop, and you go home.' },
        { text: 'Deja taught you that one and never said it out loud: the whole point of casing something is being allowed to decide not to.' },
      ],
      effects: [{ kind: 'beat', missionId: 'helio_heist', beat: 5 }],
      end: true,
    },
    drain: {
      id: 'drain',
      lines: [
        { text: 'Twelve words in the right order, and a screen that asks you, politely, whether you are sure.' },
        { text: 'Eight thousand six hundred dollars of a town’s safety budget, sitting in a box, waiting to be told where to go.' },
      ],
      redistribute: { walletIds: [HELIO_OPS.walletId] },
      next: 'after',
    },
    after: {
      id: 'after',
      lines: [
        { text: 'It takes about nine seconds. There is no alarm and no music and nobody says well done.' },
        { text: 'Somewhere a line item stops balancing, and on Monday a person whose name you will never learn is going to have a very bad meeting about it.' },
        { speaker: 'Aaron', text: 'Okay.' },
        { text: 'That’s all. Okay.' },
      ],
      effects: [{ kind: 'beat', missionId: 'helio_heist', beat: MENTOR_DONE, done: true }],
      end: true,
    },
  },
};

/**
 * The second pass. Every route out of the first attempt lands here — burned,
 * backed out, or simply not tonight — because a heist that can be permanently
 * lost is a hard fail state wearing a different hat, and module 02 doesn't
 * allow one of those anywhere in this game.
 *
 * The target is harder now (the run carries `hardened` from `resolveRun`, and
 * the wallet's security tier went up), and this attempt terminates either way.
 */
const SECOND_PASS: Scene = {
  id: 'heist_4_second_pass',
  beat: 5,
  locationId: 'annex_fence',
  hook: 'It’s still there. It’s just harder now.',
  language: 'B',
  requires: { mission: { id: 'helio_heist', beat: 5 } },
  start: 'again',
  nodes: {
    again: {
      id: 'again',
      lines: [
        { text: 'There are two vans on Thursdays now, and the case comes out with somebody walking beside it.' },
        { text: 'They did not catch you. They just got slightly more expensive to steal from, which is the only language the building speaks.' },
        { speaker: 'Deja', text: 'That’s what happens. You didn’t break it. You just made it show you what it is.' },
      ],
      choices: [
        { text: 'The four-minute reply.', goto: 's_phish', requiresFlag: 'heist_clue_assistant' },
        { text: 'Thursday, the grey case.', goto: 's_intercept', requiresFlag: 'heist_clue_delivery' },
        { text: 'Leave it. There are bigger accounts than this one.', goto: 'leave' },
      ],
    },
    ...windowNodes('s'),
    s_burned: {
      id: 's_burned',
      lines: [
        { text: 'The second time it goes wrong you are much calmer about it, which is its own small horrifying achievement.' },
        { text: 'The float stays where it is. You know exactly how it moves, exactly who reads the mail, and exactly what you are not yet good enough to do.' },
        { speaker: 'Deja', text: 'Right. So we get better.' },
      ],
      effects: [{ kind: 'beat', missionId: 'helio_heist', beat: MENTOR_DONE, done: true }],
      end: true,
    },
    s_backed_out: {
      id: 's_backed_out',
      lines: [
        { text: 'You walk away from it a second time, and this time it is not nerves. It is a decision, and it is yours, and it is allowed to be.' },
      ],
      effects: [{ kind: 'beat', missionId: 'helio_heist', beat: MENTOR_DONE, done: true }],
      end: true,
    },
    leave: {
      id: 'leave',
      lines: [
        { text: 'Eight and a half thousand dollars is a lot of money and it is also the smallest number in this story.' },
        { text: 'You close the notebook on it. Not out of fear. Out of aim.' },
      ],
      effects: [{ kind: 'beat', missionId: 'helio_heist', beat: MENTOR_DONE, done: true }],
      end: true,
    },
    drain: {
      id: 'drain',
      lines: [
        { text: 'Second time. Twelve words, and a screen asking whether you are sure, and this time you are.' },
      ],
      redistribute: { walletIds: [HELIO_OPS.walletId] },
      next: 'after',
    },
    after: {
      id: 'after',
      lines: [
        { text: 'It empties. Nobody says well done this time either.' },
        { text: 'You are getting used to that, and you are fairly sure you shouldn’t.' },
      ],
      effects: [{ kind: 'beat', missionId: 'helio_heist', beat: MENTOR_DONE, done: true }],
      end: true,
    },
  },
};

export const HEIST_SCENES: Scene[] = [RECON, CASING, WINDOW, SECOND_PASS];
