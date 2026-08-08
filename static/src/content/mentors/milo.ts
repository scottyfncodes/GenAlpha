import type { MentorMission } from '../../systems/mentors';
import { MENTOR_DONE } from '../../systems/mentors';
import type { Scene } from '../../systems/scenes';

/**
 * MILO — AI tool access, which is a permission and a philosophy, never a
 * power-up. The one mentor with a soft branch, because the thing being tested
 * is the choice itself: the skill unlocks either way and only `trustedMode`
 * turns on the hard path.
 *
 * The shortcut has to be genuinely tempting and its cost has to be shown, not
 * argued. So it saves a real evening, charges the +2 the Heat table specifies
 * for a compromised shortcut, and hands back a clean answer with the one odd
 * detail smoothed out of it. Milo never explains that. Nobody lectures.
 */

const CONTACT: Scene = {
  id: 'mentor_milo_1_contact',
  beat: 1,
  locationId: 'town_square',
  hook: 'Somebody’s been waiting for you by the bandstand.',
  language: 'A',
  requires: { flags: ['resistance_hint_found'], mission: { id: 'milo', beat: 1 } },
  start: 'bandstand',
  nodes: {
    bandstand: {
      id: 'bandstand',
      lines: [
        { text: 'The banner is still up. Somebody has drawn a moustache on the councilwoman and somebody else has already cleaned half of it off.' },
        { text: 'A boy your age is sitting on the bandstand steps with a phone in bits on a tea towel beside him, putting it back together with a jeweller’s screwdriver.' },
        { speaker: 'Milo', text: 'You’re the one asking about the grant.' },
        { text: 'Not a question. He doesn’t look up from the screws.' },
      ],
      choices: [
        { text: '“Who’s asking?”', goto: 'who' },
        { text: '“Yes.”', goto: 'warning' },
      ],
    },
    who: {
      id: 'who',
      lines: [
        { speaker: 'Milo', text: 'Milo. I fix things at my uncle’s shop. That’s the whole biography, don’t get excited.' },
      ],
      next: 'warning',
    },
    warning: {
      id: 'warning',
      lines: [
        { text: 'He seats the last screw, checks it, and only then looks up.' },
        { speaker: 'Milo', text: 'I’m not offering you anything. I want to be really clear that this isn’t an offer.' },
        { speaker: 'Milo', text: 'You’re going to want to use the easy tools. Everyone does, around now. Don’t, until you know what they cost.' },
        { text: 'He wraps the tea towel around the screwdriver and stands up.' },
        { speaker: 'Milo', text: 'That’s it. That’s the whole conversation. Shop’s on Weller Street if you want the longer version, which you won’t.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'milo', delta: 2, metAt: 'mentor_milo_1_contact' },
        { kind: 'beat', missionId: 'milo', beat: 2 },
      ],
      end: true,
    },
  },
};

const ASK: Scene = {
  id: 'mentor_milo_2_ask',
  beat: 2,
  locationId: 'repair_shop',
  hook: 'Weller Street. The longer version.',
  language: 'B',
  requires: { mission: { id: 'milo', beat: 2 } },
  start: 'counter',
  nodes: {
    counter: {
      id: 'counter',
      lines: [
        { text: 'Second Life Repair is one room. Phones in a shoebox, a soldering iron, forty small screws in a jar lid, and a handwritten sign: WE FIX IT OR IT’S FREE.' },
        { minTier: 'flagged', text: 'The shop is shut at four now and the sign says FAMILY THING. He lets you in anyway and puts the bolt across after you, which he never used to do.' },
        { speaker: 'Milo', text: 'You came. Great.' },
      ],
      choices: [
        { text: '“What did it cost you?”', goto: 'cost' },
        { text: '“Just tell me what the rule is.”', goto: 'rule' },
      ],
    },
    cost: {
      id: 'cost',
      lines: [
        { text: 'The iron goes down on its stand. He looks at the door for a second, at nothing.' },
        { speaker: 'Milo', text: 'Not me. Somebody else. I used the fast way to find something out and I was right, and I was right about the wrong person.' },
        { text: 'He picks the iron back up.' },
        { speaker: 'Milo', text: 'That’s the end of that story. It doesn’t have a better ending, it just stops.' },
      ],
      next: 'rule',
    },
    rule: {
      id: 'rule',
      lines: [
        { speaker: 'Milo', text: 'There isn’t a rule. That’s the annoying part.' },
        { speaker: 'Milo', text: 'The tools work. They’re fast, they’re free, and they’re made by exactly the same people who put the cameras up. Nobody builds you something that good for nothing.' },
        { speaker: 'Milo', text: 'So use them or don’t. Just never let one tell you what you found. Find it, then let it check you.' },
        { text: 'He turns the board over and finds his place again. That’s apparently the end of it.' },
        { speaker: 'Milo', text: 'You’re going to go and read that grant file. It’s three hundred pages. Have fun.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'milo', delta: 3 },
        { kind: 'beat', missionId: 'milo', beat: 3 },
      ],
      end: true,
    },
  },
};

const TEST: Scene = {
  id: 'mentor_milo_3_test',
  beat: 3,
  locationId: 'town_library',
  hook: 'Three hundred pages, and it closes at eight.',
  language: 'A',
  requires: { mission: { id: 'milo', beat: 3 } },
  start: 'terminal',
  nodes: {
    terminal: {
      id: 'terminal',
      lines: [
        { text: 'BELLHAVEN PUBLIC RECORDS. The cartoon building waves. Somewhere behind it sits the safety grant, filed in full, as the law requires, in the least readable format anyone has ever devised.' },
        { text: 'Three hundred and eleven pages. It is ten past five.' },
        { text: 'A panel slides up from the bottom of the screen in a friendly rounded font, the way a person leans into a doorway.', glitch: true },
        { text: 'ASK BELLHAVEN · Long document? I can summarise this for you. Free, instant, no sign-in needed.' },
      ],
      choices: [
        {
          text: 'Let it read the file for you.',
          cost: '+2 Heat · it reads you back',
          effects: [
            { kind: 'heat', eventId: 'milo_test_shortcut', delta: 2, log: true },
            { kind: 'flag', key: 'milo_took_shortcut', value: true },
          ],
          goto: 'shortcut',
        },
        {
          text: 'Read it yourself. There goes the evening.',
          effects: [{ kind: 'flag', key: 'milo_did_legwork', value: true }],
          goto: 'legwork',
        },
      ],
    },
    shortcut: {
      id: 'shortcut',
      lines: [
        { text: 'It takes four seconds. Four. You had braced for an evening and instead you have a paragraph.' },
        { text: 'SUMMARY: A standard public-safety disbursement. Three vendors, all locally registered. Coverage expansion across forty-one sites. Community consultation completed. No unusual provisions.' },
        { text: 'It is clear, it is well written, and it is not wrong about a single thing it says.' },
        { text: 'It is also the exact paragraph the councilwoman said on the bandstand, in a nicer font, and you don’t notice that until you’re halfway home.' },
      ],
      next: 'out',
    },
    legwork: {
      id: 'legwork',
      lines: [
        { text: 'You close the panel. It slides away without offence, because it will be back.' },
        { text: 'Pages one to ninety are a definition of the word site. Pages ninety to two hundred are procurement. You eat a granola bar at six and the librarian stops asking if you need help.' },
        { text: 'Page two hundred and eleven is an appendix nobody was ever meant to read, and it is a list.' },
        { text: 'Forty-one sites, the councilwoman said. The list runs to fifty-two.' },
        { text: 'Eleven of them have no street on them. They have one shared address, out at the industrial end, at a building with no name.', glitch: true },
      ],
      next: 'out',
    },
    out: {
      id: 'out',
      lines: [
        { text: 'The library lights do the thing where they go half off at ten to eight.' },
        { text: 'Somewhere on Weller Street a boy is putting a phone back together and has, you are fairly sure, already guessed which of those two evenings you had.' },
      ],
      effects: [{ kind: 'beat', missionId: 'milo', beat: 4 }],
      end: true,
    },
  },
};

const UNLOCK_CLEAN: Scene = {
  id: 'mentor_milo_4_unlock',
  beat: 4,
  locationId: 'repair_shop',
  hook: 'Tell Milo what page two hundred and eleven says.',
  language: 'B',
  requires: { mission: { id: 'milo', beat: 4 }, flags: ['milo_did_legwork'] },
  start: 'counter',
  nodes: {
    counter: {
      id: 'counter',
      lines: [
        { text: 'You tell him about the fifty-two. He listens to all of it without saying anything, which from Milo is close to applause.' },
        { speaker: 'Milo', text: 'Eleven sites at one address.' },
        { text: 'He puts down the screwdriver.' },
        { speaker: 'Milo', text: 'You know the tool would’ve given you “no unusual provisions”. That’s not a lie. Everything in that appendix is provided for. It’s all provisions.' },
      ],
      next: 'grant',
    },
    grant: {
      id: 'grant',
      lines: [
        { speaker: 'Milo', text: 'Right. Come here.' },
        { text: 'He turns his own laptop round. There’s a tool open on it, obviously an easy one, the kind he has spent two conversations telling you not to lean on.' },
        { speaker: 'Milo', text: 'I use them. Obviously I use them. I’m not a monk.' },
        { speaker: 'Milo', text: 'I use them after. You find the thing, you write down what you think it means, and then you let the machine argue with you. That order. Never the other order.' },
        { text: 'He shows you three of them, what each is bad at, and which one lies most confidently. It takes twenty minutes and is the least sentimental thing that has ever happened to you.' },
      ],
      next: 'close',
    },
    close: {
      id: 'close',
      lines: [
        { speaker: 'Milo', text: 'That’s it. Don’t make it a whole thing.' },
        { text: 'At the door, without turning round:' },
        { speaker: 'Milo', text: 'Two hundred and eleven pages on a Tuesday. Yeah. Alright.' },
      ],
      effects: [
        { kind: 'skill', skill: 'aiToolAccess', unlocked: true, trustedMode: true },
        { kind: 'trust', npcId: 'milo', delta: 25 },
        { kind: 'beat', missionId: 'milo', beat: MENTOR_DONE, done: true },
      ],
      end: true,
    },
  },
};

const UNLOCK_EASY: Scene = {
  id: 'mentor_milo_4_easy',
  beat: 4,
  locationId: 'repair_shop',
  hook: 'Tell Milo what the summary said.',
  language: 'B',
  requires: { mission: { id: 'milo', beat: 4 }, flags: ['milo_took_shortcut'] },
  start: 'counter',
  nodes: {
    counter: {
      id: 'counter',
      lines: [
        { text: 'You give him the paragraph. Standard disbursement, three vendors, no unusual provisions.' },
        { text: 'He nods along. He doesn’t catch you out and he doesn’t look disappointed, which is somehow worse than either.' },
        { speaker: 'Milo', text: 'Forty-one sites.' },
        { text: 'You say yes, forty-one.' },
        { speaker: 'Milo', text: 'Right.' },
        { text: 'That’s all. He goes back to the board.' },
      ],
      choices: [
        { text: '“What? Say it.”', goto: 'nothing' },
        { text: 'Wait him out.', goto: 'nothing' },
      ],
    },
    nothing: {
      id: 'nothing',
      lines: [
        { speaker: 'Milo', text: 'I’m not doing a speech. You already know, that’s why you’re standing there.' },
        { text: 'He finds the next screw.' },
        { speaker: 'Milo', text: 'It was right about everything it said. That’s the trick. It just picks which true things you get.' },
      ],
      next: 'grant',
    },
    grant: {
      id: 'grant',
      lines: [
        { speaker: 'Milo', text: 'Anyway. Come here, I’ll show you the tools properly, because you’re going to use them either way and I’d rather you knew where they lie.' },
        { text: 'He shows you three of them, what each is bad at, and which one lies most confidently.' },
        { text: 'He doesn’t make you promise anything, and he doesn’t bring the appendix up again, which you only realise later he could have.' },
      ],
      next: 'close',
    },
    close: {
      id: 'close',
      lines: [
        { text: 'At the door he says it without any weight on it at all, the way you’d mention rain.' },
        { speaker: 'Milo', text: 'You’ll get there.' },
        { text: 'It isn’t a consolation prize. It’s a schedule.' },
      ],
      effects: [
        { kind: 'skill', skill: 'aiToolAccess', unlocked: true, trustedMode: false },
        { kind: 'trust', npcId: 'milo', delta: 18 },
        { kind: 'beat', missionId: 'milo', beat: MENTOR_DONE, done: true },
      ],
      end: true,
    },
  },
};

export const MILO: MentorMission = {
  id: 'milo',
  name: 'Milo',
  skill: 'aiToolAccess',
  teaches: 'Disciplined tool use',
  scenes: [CONTACT, ASK, TEST, UNLOCK_CLEAN, UNLOCK_EASY],
};
