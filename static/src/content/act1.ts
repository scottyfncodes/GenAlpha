import type { Scene } from '../systems/scenes';

/**
 * ACT 1 — THE GLITCH. The seven beats from the content skeleton, as playable
 * scenes. System touches are exactly the ones the skeleton specifies; Heat
 * lands at 12 across the act, inside the 10–15 close condition.
 *
 * Writing notes honoured here: beats 1, 2 and 5 are the warmest material in the
 * game, because everything after this runs on the loss of that warmth. The
 * world is played straight — nobody winks, nobody explains the theme.
 */

/**
 * Set the moment the player picks "Climb out the window instead" over
 * breakfast in the opening beat, ahead of `kitchen` — Overworld.tsx reads
 * this once confinement lifts to decide whether the player steps out onto
 * the street through the front door or through the window they actually
 * left by. Never cleared: it's a fact about this one morning, not a
 * toggle, and the confinement logic that reads it only ever runs once.
 */
export const WINDOW_ESCAPE_FLAG = 'snuck_out_window';

const B1_OPEN: Scene = {
  id: 'act1_01_ordinary_tuesday',
  beat: 1,
  locationId: 'home',
  hook: 'Get up. It’s Tuesday.',
  language: 'A',
  requires: { chapter: 'act1_glitch_01' },
  start: 'cold_open',
  nodes: {
    /*
     * A two-line cold open ahead of the terminal beat — just enough who/
     * where/when that a brand-new player has ground to stand on (a town, an
     * age, a Tuesday) before the headline/price/thread ambience below asks
     * them to notice things without being told what they mean. Kept to a
     * couplet on purpose: the terminal_check node still does the actual
     * world-building per Style Guide 07 (noticed, not explained) — this just
     * stops the player's very first frame from being an alarm clock with zero
     * context under it.
     */
    cold_open: {
      id: 'cold_open',
      lines: [
        { text: 'Bellhaven. A town small enough that the corner store still remembers your order, and wired tight enough that somebody official probably knows it too.' },
        { text: 'You’re fourteen. This is your house, on an ordinary Tuesday, at the hour nothing has happened yet.' },
      ],
      next: 'terminal_check',
    },
    /*
     * The opening beat, ahead of the kitchen. Per the build note: the player
     * should get the world before they get the plot — a headline, a price, a
     * thread nobody's answering seriously yet — so the SafeTrace rollout and the
     * SHDW economy both exist as ambient fact before either one matters to
     * the story. None of it is explained, per Style Guide 07: the reader
     * notices a headline the way the protagonist does, which is to say barely.
     *
     * Trimmed to four lines (was six, across two nodes): the alarm-clock beat
     * folded into the opening line, and the closing "none of it means
     * anything yet" reflection cut rather than trimmed — the jump straight to
     * the kitchen's own opening line is the faster, truer version of the same
     * beat, since that is exactly how someone actually leaves a feed.
     */
    terminal_check: {
      id: 'terminal_check',
      lines: [
        { text: 'The alarm goes off twice before you believe it. The family computer lives in the hallway, which is Mom’s rule for a reason nobody has to say out loud.' },
        {
          text: 'BELLHAVEN LOCAL — COUNCIL APPROVES FULL ROLLOUT OF FLACK SAFETY CAMERAS, PHASE TWO ON TRACK FOR SUMMER',
          readout: true,
        },
        { text: 'SHDW/USD 3.18, up 4% overnight. Nobody you know owns any.', readout: true },
        { text: 'ghost_on_5th: “anyone else notice they swapped the ones on Fifth” — 40 replies, most of them “lol no”', readout: true },
        { text: 'You check the box score first. Then a skate clip — some kid half your age landing something you still can’t. Then you close it, because none of that skates itself.' },
      ],
      next: 'leave_choice',
    },
    /*
     * The one real fork in Beat 1 — not which line you say back to Mom
     * (kitchen's own choices, unchanged below), but whether you have the
     * conversation at all. The window path skips `kitchen` entirely rather
     * than trimming it, and still gets its own beat of warmth (her voice
     * through the screen) rather than reading as the option that skips the
     * good part.
     */
    leave_choice: {
      id: 'leave_choice',
      lines: [
        {
          text: 'Down the hall, the toaster’s going and Mom’s already talking to her phone like it can hear her. The window’s still got the give in the latch you never told anyone about.',
        },
      ],
      choices: [
        { text: 'Go down for breakfast', goto: 'kitchen' },
        {
          text: 'Climb out the window instead',
          goto: 'window_sneak',
          effects: [{ kind: 'flag', key: WINDOW_ESCAPE_FLAG, value: true }],
        },
      ],
    },
    window_sneak: {
      id: 'window_sneak',
      lines: [
        { text: 'The latch gives on the second try, same as it always does. You’re over the porch roof and down before the toast even pops.' },
        {
          text: 'From the street you can still hear her through the screen, halfway into a sentence aimed at somebody who isn’t you. Straight home after. You never actually said okay to that part.',
        },
      ],
      next: 'street',
    },
    kitchen: {
      id: 'kitchen',
      lines: [
        { text: 'The kitchen smells like burnt toast and the inside of a lunchbox.' },
        { speaker: 'Mom', text: 'There’s a bagel. There’s also a bagel-shaped thing I ruined. Take the good one.' },
        { text: 'She’s already got her coat on. She’s always already got her coat on.' },
        { text: 'Her thumb hasn’t stopped moving on her phone since you walked in. She hasn’t looked up once, and she still knows exactly where the good bagel is.' },
        { speaker: 'Mom', text: 'Straight home after, okay? I’ll be late again.' },
      ],
      choices: [
        { text: '“Okay.”', goto: 'street' },
        { text: '“You said that yesterday.”', goto: 'street_soft' },
      ],
    },
    street_soft: {
      id: 'street_soft',
      lines: [
        { text: 'She stops in the doorway. For a second she looks like she might sit back down.' },
        { speaker: 'Mom', text: 'I know. I know I did.' },
        { text: 'Then the coat, the keys, the door. The house gets quiet in the particular way it does.' },
      ],
      next: 'street',
    },
    street: {
      id: 'street',
      lines: [
        { text: 'Bellhaven in the morning: sprinklers, garage doors, somebody’s dog losing its mind about nothing. You take the long way, because Ellen’s house is on the way.' },
        { text: 'The pole on the corner has a second box under the first one. You’ve walked past it a hundred times and never once looked up.' },
      ],
      effects: [{ kind: 'chapter', chapterId: 'act1_glitch_01a' }],
      end: true,
    },
  },
};

/*
 * Split out of B1_OPEN so Ellen only shows up once the player actually
 * walks to her house, instead of the corner-and-Ellen beat firing as one
 * uninterrupted cutscene the moment the player leaves theirs. `street`
 * above hands off to the `act1_glitch_01a` chapter and releases the
 * player into free-roam; `locationId: 'nova_house'` means this scene
 * simply doesn't offer itself until they're standing in front of it.
 */
const B1_NOVA: Scene = {
  id: 'act1_01a_ellens_corner',
  beat: 1,
  locationId: 'nova_house',
  hook: 'Ellen’s out front, filming.',
  language: 'A',
  requires: { chapter: 'act1_glitch_01a' },
  start: 'nova',
  nodes: {
    nova: {
      id: 'nova',
      lines: [
        { text: 'She’s got her phone clipped to a little tripod on the wall, pointed at herself, walking backwards.' },
        { speaker: 'Ellen', text: '{name}! Hold on — thirty seconds, I have to get the light.' },
        { text: 'She does something to her face that turns it into a slightly different face. Then she stops, and it’s her again.' },
        { speaker: 'Ellen', text: 'Okay. Done. Hi. What’d you do last night?' },
      ],
      choices: [
        { text: '“Nothing. Watched the ceiling.”', goto: 'nova_2' },
        { text: '“Who was that for?”', goto: 'nova_who' },
      ],
    },
    nova_who: {
      id: 'nova_who',
      lines: [
        { speaker: 'Ellen', text: 'The channel. Mondays are slow, so Tuesday has to carry.' },
        { text: 'She says it the way you’d say Tuesday is bin day.' },
        { speaker: 'Ellen', text: 'Anyway. You. Ceiling. Go.' },
      ],
      next: 'nova_2',
    },
    nova_2: {
      id: 'nova_2',
      lines: [
        { text: 'She walks the rest of the way with you, phone in her pocket, which she doesn’t do for everyone.' },
        { speaker: 'Ellen', text: 'You’re so weird and quiet. It’s restful. Don’t change.' },
      ],
      effects: [{ kind: 'chapter', chapterId: 'act1_glitch_01b' }],
      end: true,
    },
  },
};

const B1B_THE_IDEA: Scene = {
  id: 'act1_01b_the_idea',
  beat: 1,
  locationId: 'home',
  hook: 'Back home. There’s a whole evening left.',
  language: 'A',
  requires: { chapter: 'act1_glitch_01b' },
  start: 'drawer',
  nodes: {
    /*
     * Beat 1 is the warmest material in the game and this rides on that
     * warmth rather than complicating it — no wrongness yet, just a kid
     * alone with a junk drawer. The system payload (a flag, nothing costed)
     * matters more than the words: this is the moment the salvage/market
     * loop stops being background fact on a headline ticker and becomes
     * something the player has a reason to go do.
     */
    drawer: {
      id: 'drawer',
      lines: [
        { text: 'The junk drawer in the kitchen has three dead remotes, a charger for a phone nobody in this house has owned in years, and a battery that might still be good.' },
        { text: 'You’ve walked past this drawer a thousand times. Tonight, for no reason you could explain, you actually open it.' },
      ],
      choices: [{ text: 'See what’s actually in here.', goto: 'parts' }],
    },
    parts: {
      id: 'parts',
      lines: [
        { text: 'None of it is one whole thing. All of it is pieces of things — a coil of copper, a board with half its chips still good, a battery holding eighty percent of a charge forever.' },
        { text: 'You don’t know yet what you’d build with any of it. You know it would be yours. Not the library’s, not signed out on a fifteen-minute timer with a librarian watching the clock.' },
      ],
      next: 'plan',
    },
    plan: {
      id: 'plan',
      lines: [
        { text: 'A cyberdeck. You read the word somewhere and it stuck the way words do right before they matter.' },
        { text: 'This drawer isn’t enough on its own. But the same kind of junk is sitting all over Bellhaven, if you actually look — a loose board under the right bush, wire nobody’s bothered to coil up.' },
        { text: 'And every one of those cameras on every corner is built out of precisely the parts you’d need. If you were willing to take one apart instead of just staring at it.' },
        { text: 'Whatever you end up with too much of, somebody apparently wants — there’s a whole quiet economy running underneath this town for exactly that. SHDW is what it runs on. You didn’t know that this morning either.', glitch: true },
        { text: 'Your phone already has an app for all of it, buried in with the ones that came pre-installed. You just never had a reason to open it before tonight.' },
        { text: 'You already know what you’re not going to do with any of it: disappear into it the way the feed wants you to. It’s a drawer full of parts. You decide what it becomes.' },
      ],
      effects: [
        { kind: 'flag', key: 'cyberdeck_plan_started', value: true },
        { kind: 'chapter', chapterId: 'act1_glitch_02' },
      ],
      end: true,
    },
  },
};

const B2_SMALL_WRONGNESS: Scene = {
  id: 'act1_02_small_wrongness',
  beat: 2,
  locationId: 'school',
  hook: 'Homeroom. Third row.',
  language: 'A',
  requires: { chapter: 'act1_glitch_02' },
  start: 'homeroom',
  nodes: {
    homeroom: {
      id: 'homeroom',
      lines: [
        { text: 'Third row, second seat, by the window. Empty.' },
        { text: 'Casey has sat there since September. Casey once ate an entire pencil eraser on a dare and then apologised to the pencil.' },
        { speaker: 'Mr. Arroyo', text: 'Eyes up. Casey’s family moved. It happens.' },
      ],
      choices: [
        { text: '“Moved where?”', goto: 'where' },
        { text: 'Say nothing. Look at the seat.', goto: 'quiet' },
      ],
    },
    where: {
      id: 'where',
      lines: [
        { speaker: 'Mr. Arroyo', text: 'Out of district. That’s all I’ve got, and honestly that’s all I need.' },
        { text: 'He’s not lying. That’s the thing. He believes the sentence he was handed.' },
      ],
      next: 'quiet',
    },
    quiet: {
      id: 'quiet',
      lines: [
        { text: 'Nobody else looks at the chair. Not once, all morning.' },
        { text: 'Casey didn’t say goodbye. Casey said goodbye when they went to the bathroom.' },
      ],
      effects: [
        { kind: 'flag', key: 'casey_missing_noticed', value: true },
        { kind: 'chapter', chapterId: 'act1_glitch_02b' },
      ],
      end: true,
    },
  },
};

const B2B_THE_HOUSE: Scene = {
  id: 'act1_02b_the_house',
  beat: 2,
  locationId: 'casey_house',
  hook: 'Walk past Casey’s.',
  language: 'A',
  requires: { chapter: 'act1_glitch_02b' },
  start: 'yard',
  nodes: {
    yard: {
      id: 'yard',
      lines: [
        { text: 'FOR SALE. The sign is clean. No dust on the top edge, no rust on the post.' },
        { text: 'It wasn’t here Friday. You’d have seen it. You walk this way every day.' },
      ],
      choices: [
        { text: 'Look in the window.', goto: 'window' },
        { text: 'Check the mailbox.', goto: 'mail' },
      ],
    },
    window: {
      id: 'window',
      lines: [
        { text: 'Couch. Table. A cereal bowl on the arm of the couch with the spoon still in it.' },
        { text: 'Nobody packs a house and leaves the spoon.' },
      ],
      next: 'mail',
    },
    mail: {
      id: 'mail',
      lines: [
        { text: 'The mailbox is full — a catalogue, two bills, a birthday card with a balloon stamp — and the swing set out back is still moving a little, from wind or from earlier.' },
      ],
      effects: [
        { kind: 'heat', eventId: 'act1_casey_house', delta: 2, log: true },
        { kind: 'flag', key: 'casey_house_checked', value: true },
        { kind: 'chapter', chapterId: 'act1_glitch_03' },
      ],
      end: true,
    },
  },
};

const B3_FIRST_DIG: Scene = {
  id: 'act1_03_first_dig',
  beat: 3,
  locationId: 'town_library',
  hook: 'The terminal at the back.',
  language: 'A',
  requires: { chapter: 'act1_glitch_03' },
  start: 'terminal',
  nodes: {
    terminal: {
      id: 'terminal',
      lines: [
        { text: 'The library has two computers. One has a sign on it. The other has a sticky spacebar, nobody waiting, and BELLHAVEN PUBLIC RECORDS on the screen — everything rounded, everything blue, a little cartoon building waving at you.' },
        { text: 'Property transfers are public. You didn’t know that this morning. You know it now.' },
      ],
      choices: [{ text: 'Cross-reference the filing.', goto: 'trace' }],
    },
    trace: {
      id: 'trace',
      lines: [],
      /**
       * Proto-run of the Trace mechanic, before Aaron formally teaches it.
       * Practice mode: no mission record and no Heat-table charge — the scene
       * owns the +2, per the skeleton's system touch for this beat. The cost
       * lives here rather than on `found` so the briefing can preview it and
       * so it lands on commit, not on outcome: digging costs the same whether
       * you're good at it or not.
       */
      effects: [{ kind: 'heat', eventId: 'act1_first_dig', delta: 2, log: true }],
      minigame: {
        kind: 'hacking',
        practice: true,
        missionId: 'act1_records_dig',
        tier: 1,
        skinId: 'records',
        brief:
          'Property transfers are public record. The search form has eleven fields and none of them are the one you want, so you will have to come at it sideways.',
        onWin: 'found',
        onFail: 'fumbled',
      },
    },
    fumbled: {
      id: 'fumbled',
      lines: [
        { text: 'The search times out and dumps you back to the cartoon building, which waves again.' },
        { text: 'You do it slower. Then slower than that. It takes an hour and a librarian asks twice if you need help.' },
        { text: 'Eventually the record comes up anyway. You just did it the stupid way.' },
      ],
      next: 'found',
    },
    found: {
      id: 'found',
      lines: [
        { text: 'There it is. Sale recorded. Forwarding address on file.' },
        { text: 'The sale is dated eleven days ago. The sign went up Saturday.' },
        { text: 'The forwarding address is a PO box in a town you’ve never heard of, and the box number is 1.', glitch: true },
        { text: 'Every field is filled in. Nothing is missing. It is the tidiest thing you have ever read, and it is wrong.' },
      ],
      effects: [
        { kind: 'flag', key: 'record_doesnt_match', value: true },
        { kind: 'chapter', chapterId: 'act1_glitch_04' },
      ],
      end: true,
    },
  },
};

const B4_THE_CAMERA: Scene = {
  id: 'act1_04_the_camera',
  beat: 4,
  locationId: 'home',
  hook: 'Mom’s home early. That’s not normal.',
  language: 'A',
  requires: { chapter: 'act1_glitch_04' },
  start: 'table',
  nodes: {
    table: {
      id: 'table',
      lines: [
        { text: 'Mom is at the table with her coat still on and a printout in front of her, which is two unusual things at once.' },
        { speaker: 'Mom', text: 'The school sent this. It’s nothing. I just want you to explain it so I can tell them it’s nothing.' },
        { text: 'INCIDENT NOTICE. A time. A date. Tuesday, 4:52 PM. Location: the lot behind the Fenwick Street shops.' },
        { text: 'There’s a photo. It’s grainy and it’s from above and it’s you.', glitch: true },
      ],
      choices: [
        { text: '“I was here. I was doing homework.”', goto: 'here' },
        { text: '“That’s not me.”', goto: 'notme' },
      ],
    },
    here: {
      id: 'here',
      lines: [
        { speaker: 'Mom', text: 'I know you were. I was on the phone with you at five.' },
        { text: 'She says it certainly. Then she looks at the photo again, and something in her face goes a half-step less certain, and that is worse than anything on the page.' },
      ],
      next: 'system',
    },
    notme: {
      id: 'notme',
      lines: [
        { speaker: 'Mom', text: 'Honey. It’s got your jacket. It’s got your walk.' },
        { text: 'She isn’t accusing you. She’s asking you to make the paper make sense, because paper from the school makes sense, that’s what it’s for.' },
      ],
      next: 'system',
    },
    system: {
      id: 'system',
      lines: [
        { speaker: 'Mom', text: 'It says here it’s from the community safety system. The cameras. They’re for our benefit.' },
        { text: 'She reads that sentence off the page in a voice that isn’t hers, because it isn’t her sentence.' },
        { text: 'A machine you have never spoken to has said where you were, and everyone believes it, including, for a second, your mother.' },
      ],
      effects: [
        { kind: 'heat', eventId: 'act1_camera_incident', delta: 3, log: true },
        { kind: 'flag', key: 'camera_misplaced_me', value: true },
        { kind: 'chapter', chapterId: 'act1_glitch_05' },
      ],
      end: true,
    },
  },
};

const B5_NOVA: Scene = {
  id: 'act1_05_nova_cracked_open',
  beat: 5,
  locationId: 'nova_house',
  hook: 'Ellen’s. You need to tell somebody.',
  language: 'A',
  requires: { chapter: 'act1_glitch_05' },
  start: 'door',
  nodes: {
    door: {
      id: 'door',
      lines: [
        { text: 'You came to tell her about the photo. You have the whole thing arranged in your head on the walk over.' },
        { speaker: 'Ellen', text: 'Come in, come in, don’t stand in the shot —' },
        { text: 'The living room has a ring light in it. Not a lamp. A ring light, on a stand, plugged in, warm.' },
      ],
      next: 'fridge',
    },
    fridge: {
      id: 'fridge',
      lines: [
        { text: 'On the fridge, where other houses put drawings, there’s a printed grid. Monday through Sunday. Two rows per day.' },
        { text: 'TUES: ELLEN GRWM + REACTION. THURS: ELLEN & BEAU SURPRISE.' },
        { text: 'Thursday is three days away and the surprise is already written down.' },
      ],
      choices: [
        { text: '“What’s the Thursday one?”', goto: 'thursday' },
        { text: 'Look away from the fridge.', goto: 'beau' },
      ],
    },
    thursday: {
      id: 'thursday',
      lines: [
        { speaker: 'Ellen', text: 'Beau gets a puppy. He doesn’t know yet. That’s the whole video, him not knowing and then knowing.' },
        { speaker: 'Ellen', text: 'We’ve had the puppy since Sunday. It’s at my aunt’s.' },
      ],
      next: 'beau',
    },
    beau: {
      id: 'beau',
      lines: [
        { text: 'Beau is seven. He comes through with a bowl of cereal and stops dead in the doorway, and looks at the light, and steps two feet left.' },
        { text: 'Nobody told him to. He just knows where the shot is.' },
        { speaker: 'Ellen', text: 'Beau, do the thing.' },
        { speaker: 'Beau', text: 'Do I have to do it happy or normal.' },
      ],
      choices: [
        { text: '“Ellen. Do you ever get a day off?”', goto: 'off' },
        { text: 'Say nothing.', goto: 'nothing' },
      ],
    },
    off: {
      id: 'off',
      lines: [
        { speaker: 'Ellen', text: 'Off from what?' },
        { text: 'She actually doesn’t understand the question. She turns it over, finds nothing in it, and hands it back.' },
        { speaker: 'Ellen', text: 'It’s just how we do things. It’s not a job, it’s the house.' },
      ],
      next: 'close',
    },
    nothing: {
      id: 'nothing',
      lines: [
        { text: 'You don’t have the words for it yet. You have a shape where the words go.' },
        { text: 'Ellen catches you looking at the fridge and moves, easily, so she’s between you and it.' },
      ],
      next: 'close',
    },
    close: {
      id: 'close',
      lines: [
        { speaker: 'Ellen', text: 'Okay, you came over with a face. What’s the face.' },
        { text: 'So you tell her. The chair, the spoon in the bowl, the photo of you somewhere you weren’t.' },
        { text: 'She doesn’t say you’re imagining it. She’s the only person all week who doesn’t say that.' },
        { speaker: 'Ellen', text: 'Okay. So what do we do.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'nova', delta: 10 },
        { kind: 'flag', key: 'nova_channel_seen', value: true },
        { kind: 'chapter', chapterId: 'act1_glitch_06' },
      ],
      end: true,
    },
  },
};

const B6_PULLING_THREAD: Scene = {
  id: 'act1_06_pulling_the_thread',
  beat: 6,
  locationId: 'town_square',
  hook: 'There’s a crowd by the bandstand.',
  language: 'A',
  requires: { chapter: 'act1_glitch_06' },
  start: 'square',
  nodes: {
    square: {
      id: 'square',
      lines: [
        { text: 'Folding chairs, a banner, a screen on a truck, somebody handing out branded pens. A WATCHFUL TOWN IS A SAFE TOWN — the letters rounded and friendly, the same blue as the records site.' },
        { speaker: 'Councilwoman Reyes', text: '—and thanks to the safety grant, coverage is now effectively total. Not most of Bellhaven. All of it.' },
        { text: 'People clap. It’s a nice afternoon. The pens are quite good pens.' },
      ],
      next: 'hub',
    },
    /**
     * Both of these used to be a single either/or choice into the same next
     * node — which meant one of two genuinely different pieces of the mystery
     * was permanently lost to whichever you didn't pick. A hub looped back
     * into by each turns it into a checklist instead: pick one, it's gone
     * from the list and the other is still there, and "move on" only appears
     * once both are. The choice is which to pull on first, not which one you
     * get to keep. One line rather than none — a bare choice list with no
     * text above it reads as broken, not as a menu.
     */
    hub: {
      id: 'hub',
      lines: [{ text: 'Still a few minutes before anyone would miss you.' }],
      choices: [
        { text: 'Look at the map behind her.', goto: 'map', hiddenIfFlag: 'act1_b6_map_seen' },
        { text: 'Watch who’s standing at the back.', goto: 'back', hiddenIfFlag: 'act1_b6_back_seen' },
        {
          text: 'You’ve seen enough.',
          goto: 'thread',
          requiresAllFlags: ['act1_b6_map_seen', 'act1_b6_back_seen'],
        },
      ],
    },
    map: {
      id: 'map',
      lines: [
        { text: 'The screen shows the town in soft grey with little blue dots on it. Every corner. Every lot behind every shop.' },
        { text: 'There’s a dot on Fenwick Street. Tuesday, 4:52.' },
        { text: 'There’s a dot on your street. There’s a dot pointing at Casey’s front door.', glitch: true },
      ],
      effects: [{ kind: 'flag', key: 'act1_b6_map_seen' }],
      next: 'hub',
    },
    back: {
      id: 'back',
      lines: [
        { text: 'Two men in good jackets who aren’t clapping, and aren’t from here, and are watching the crowd instead of the stage.' },
        { text: 'One of them is counting. You can see him doing it.' },
      ],
      effects: [{ kind: 'flag', key: 'act1_b6_back_seen' }],
      next: 'hub',
    },
    thread: {
      id: 'thread',
      lines: [
        { text: 'A grant means money. Money means somebody wrote a cheque and somebody signed for it.' },
        { text: 'The cameras aren’t a thing that happened to the town. They’re a thing the town was sold.' },
        { text: 'And it clicks over, all at once, the way a word you’ve read wrong for years suddenly reads right:' },
        { text: 'Casey. The photo. The schedule on Ellen’s fridge. Not three strange things. One thing, three times.' },
      ],
      effects: [
        { kind: 'heat', eventId: 'act1_safety_grant', delta: 3, log: true },
        { kind: 'flag', key: 'safety_grant_known', value: true },
        { kind: 'chapter', chapterId: 'act1_glitch_07' },
      ],
      end: true,
    },
  },
};

const B7_FIRST_CONTACT: Scene = {
  id: 'act1_07_first_contact',
  beat: 7,
  locationId: 'camera_pole_5th',
  hook: 'Pole 5-C. Go look at it properly.',
  language: 'B',
  requires: { chapter: 'act1_glitch_07' },
  start: 'pole',
  nodes: {
    pole: {
      id: 'pole',
      lines: [
        { text: 'Up close it’s just a pole. Grey, boring, a little sticker with a number on it.' },
        { text: 'Except: two cables come down out of the housing, and go into two different boxes, and only one of the boxes is the town’s.' },
        { text: 'The second box has no sticker, no number, and a much better lock than anything the council buys.' },
      ],
      choices: [
        { text: 'Follow the second cable.', goto: 'cable' },
        { text: 'Look at the base of the pole.', goto: 'paint' },
      ],
    },
    cable: {
      id: 'cable',
      lines: [
        { text: 'It runs down, along the kerb, and away toward the industrial end of town where the new building is.' },
        { text: 'The one with no name on it. The one everyone calls the annex because nobody was ever told what else to call it.' },
      ],
      next: 'paint',
    },
    paint: {
      id: 'paint',
      lines: [
        { text: 'Somebody has painted over something at the base, in council grey, badly, in a hurry.' },
        { text: 'Under the grey, catching the light: two letters. Clean type, the kind that comes off a laser printer.' },
        { text: 'GEN A. And around the A, drawn by hand, fresh, not quite closed — a circle.', glitch: true },
      ],
      next: 'close',
    },
    close: {
      id: 'close',
      lines: [
        { text: 'The paint is still tacky. Whoever covered it did it today.' },
        { text: 'Which means somebody put it there before today. Which means somebody else already knows.' },
        { text: 'You stand in the road until the streetlight comes on over your head, and you are not frightened, exactly.' },
        { text: 'You are the opposite of alone for the first time all week.' },
      ],
      effects: [
        { kind: 'heat', eventId: 'act1_resistance_hint', delta: 2, log: true },
        { kind: 'flag', key: 'resistance_hint_found', value: true },
        { kind: 'chapter', chapterId: 'act1_complete' },
      ],
      end: true,
    },
  },
};

export const ACT1_SCENES: Scene[] = [
  B1_OPEN,
  B1_NOVA,
  B1B_THE_IDEA,
  B2_SMALL_WRONGNESS,
  B2B_THE_HOUSE,
  B3_FIRST_DIG,
  B4_THE_CAMERA,
  B5_NOVA,
  B6_PULLING_THREAD,
  B7_FIRST_CONTACT,
];
