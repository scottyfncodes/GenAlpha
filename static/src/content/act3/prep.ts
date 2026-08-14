import type { Scene } from '../../systems/scenes';
import { clueEffect, discoverEffects } from '../../systems/heist';
import { MERROW, REYES, SORRELL, UPLINK_CABINET } from './targets';

/** Act 3, beats 1–4. Sequenced on the `act3` cursor, same as Act 2. */

const THE_ASK: Scene = {
  id: 'act3_1_the_ask',
  beat: 1,
  locationId: 'nova_house',
  hook: 'You have to go and ask Ellen for four hundred thousand people.',
  language: 'A',
  requires: { flags: ['crew_independent'], mission: { id: 'act3', beat: 1 } },
  start: 'door',
  nodes: {
    door: {
      id: 'door',
      lines: [
        { text: 'The ring light is not up. It is a Sunday and there is no slot on the laminated month and she is eating cereal at four in the afternoon like a person.' },
        { text: 'You tell her all of it. It takes about twenty minutes and she does not interrupt once, which is not like her.' },
      ],
      choices: [
        {
          text: 'Ask her.',
          goto: 'clean',
          hiddenIfFlag: 'used_nova_access',
        },
        {
          text: 'Ask her — and this time actually ask.',
          goto: 'owed',
          requiresFlag: 'used_nova_access',
        },
      ],
    },
    clean: {
      id: 'clean',
      lines: [
        { text: 'You have never taken anything of hers. Not in June when it would have saved nine days, not once.' },
        { text: 'So when you ask, it is a question, and it lands like one, and she takes it seriously because it has been made possible to take seriously.' },
        { speaker: 'Ellen', text: 'You could have just used it, you know. In the summer. I’d never have known.' },
        { speaker: 'You', text: '“I know.”' },
      ],
      next: 'terms',
    },
    owed: {
      id: 'owed',
      lines: [
        { text: 'You used the archive in June. She said it was fine. She has said everything was fine since she was three years old.' },
        { text: 'So you say that part first — that you took something without asking, that she told you it was fine, and that you are not going to treat this the same way.' },
        { speaker: 'Ellen', text: 'Oh.' },
        { text: 'She puts the bowl down. Nobody has ever unpicked one of her yeses in front of her before, and she does not have anywhere to put it.' },
        { speaker: 'Ellen', text: 'You’re allowed to just — ask me. Like a normal — you can just ask me.' },
      ],
      next: 'terms',
    },
    terms: {
      id: 'terms',
      lines: [
        { text: 'She says yes. She says it quickly and then, unusually, she says something after it.' },
        { speaker: 'Ellen', text: 'Live. Once. I’m not sending it to Mum first and I’m not doing a second take and I’m not doing a thumbnail.' },
        { speaker: 'Ellen', text: 'And then I’m done. Not — not with you. With it.' },
        { text: 'She has never made a condition before. She does not present it as one. She presents it the way you would mention the weather, because she has had no practice at wanting things out loud.' },
      ],
      effects: [
        { kind: 'trust', npcId: 'nova', delta: 20 },
        { kind: 'flag', key: 'nova_agreed' },
        { kind: 'chapter', chapterId: 'act3_01' },
        { kind: 'beat', missionId: 'act3', beat: 2 },
      ],
      end: true,
    },
  },
};

const THREE_NAMES: Scene = {
  id: 'act3_2_three_names',
  beat: 2,
  locationId: 'fenwick_lot',
  hook: 'Bishop’s list, read properly, for the first time.',
  language: 'B',
  requires: { mission: { id: 'act3', beat: 2 } },
  start: 'list',
  nodes: {
    list: {
      id: 'list',
      lines: [
        { text: 'You had expected something hidden. A room. A person at the top of it who knows.' },
        { text: 'What is actually there is a cap table, a council vote, and a services contract, all three of which are a matter of public record and none of which anybody has ever read in the same afternoon.' },
        { speaker: 'Aaron', text: 'It’s three.' },
      ],
      next: 'names',
    },
    names: {
      id: 'names',
      lines: [
        { text: 'Danny Sorrell, who founded SafeTrace, and who by every account anyone can find believes in it completely.' },
        { text: 'Councilwoman Reyes, who has been on a stage in this town handing out quite good pens since March, and whose vote is the reason the coverage is total.' },
        { text: 'Merrow Capital, which is not a person, has no opinions, and has never met a child in its life.' },
      ],
      next: 'arrangement',
    },
    arrangement: {
      id: 'arrangement',
      lines: [
        { speaker: 'Milo', text: 'So which one do we do?' },
        { speaker: 'Deja', text: 'All of them. Obviously all of them.' },
        { speaker: 'Deja', text: 'Take one out and the other two hire a replacement by Christmas. It’s not people. It’s an *arrangement*.' },
        { text: 'She is right, and it makes the job about four times harder, and nobody argues.' },
      ],
      effects: [
        ...discoverEffects(SORRELL),
        ...discoverEffects(REYES),
        ...discoverEffects(MERROW),
        { kind: 'beat', missionId: 'act3', beat: 3 },
      ],
      end: true,
    },
  },
};

/**
 * Beat 3 — the hub. Same shape as the heist's casing phase, and the exit only
 * appears once all three strands are done, which is skeleton decision 1
 * expressed as a gate rather than as a speech.
 *
 * The trace can fail. It still yields the strand, because module 02 doesn't
 * allow a wall and because a hub option that changes nothing when it fails is
 * how the recon scene in Act 2 spun forever.
 */
const WHO_THEY_ARE: Scene = {
  id: 'act3_3_who_they_are',
  beat: 3,
  locationId: 'town_library',
  hook: 'Three names. You have about a week.',
  language: 'B',
  requires: { mission: { id: 'act3', beat: 3 } },
  start: 'hub',
  nodes: {
    hub: {
      id: 'hub',
      lines: [
        { text: 'Three strands, and the broadcast is only worth doing if all three of them are in it.' },
      ],
      choices: [
        { text: 'Sorrell. Start with the man.', goto: 'sorrell_trace', hiddenIfFlag: 'act3_strand_sorrell' },
        { text: 'Reyes. Follow the money into the council.', goto: 'reyes', hiddenIfFlag: 'act3_strand_reyes' },
        { text: 'Merrow. Find out what they think they bought.', goto: 'merrow', hiddenIfFlag: 'act3_strand_merrow' },
        {
          /*
           * All three, or the exit isn't there. Skeleton decision 1 as a rule
           * rather than a speech: take one of them out and the other two hire
           * a replacement by Christmas.
           */
          text: 'That’s all three. Go.',
          goto: 'ready',
          requiresAllFlags: ['act3_strand_sorrell', 'act3_strand_reyes', 'act3_strand_merrow'],
        },
      ],
    },

    sorrell_trace: {
      id: 'sorrell_trace',
      lines: [
        { text: 'He has given about ninety interviews and they all say the same four things, which means the true thing is somewhere he wasn’t being interviewed.' },
      ],
      minigame: {
        kind: 'hacking',
        missionId: 'act3_sorrell',
        tier: 4,
        skinId: 'villain',
        brief: 'Ten years of a man’s own writing, most of it deleted, none of it very well.',
        onWin: 'brother',
        onFail: 'brother_slow',
        onAbort: 'brother_slow',
      },
    },
    brother_slow: {
      id: 'brother_slow',
      lines: [
        { text: 'You lose most of a night to it and something on their side notices you doing it.' },
        { text: 'You find it anyway, eventually, on a mirror of a blog that stopped updating in 2017.' },
      ],
      effects: [{ kind: 'heat', eventId: 'act3:sorrell_noisy', delta: 6, log: true }],
      next: 'brother',
    },
    brother: {
      id: 'brother',
      lines: [
        { text: 'March 2016. Two hundred words about a fourteen-year-old called Isaac who walked out of a house in Ohio and was missing for nine days, and about how his brother sat in a kitchen and could not tell anyone where he had been.' },
        { text: 'It is well written. It is not self-serving. It is one of the saddest things you have read.' },
        { text: 'And the thing he built so that nobody would ever sit in that kitchen again is the thing that sells Tier 3 predictions about children by subscription, with a volume discount, and he has never once been lying.', glitch: true },
      ],
      effects: [
        clueEffect(SORRELL, 'the_brother'),
        { kind: 'flag', key: 'act3_strand_sorrell' },
      ],
      next: 'hub',
    },

    reyes: {
      id: 'reyes',
      lines: [
        { text: 'You expect a bribe. You spend two days looking for a bribe. There is no bribe.' },
        { text: 'There is a consultancy retainer to a firm her brother-in-law is a partner in, declared on the correct form, in the correct month, filed publicly, and available to anyone.' },
        { speaker: 'Milo', text: 'That’s legal.' },
        { speaker: 'Aaron', text: 'Vote was 7–2.' },
        { text: 'Both of those are true at the same time and it turns out that is the whole trick — not that it was hidden, but that it was allowed.' },
      ],
      effects: [
        clueEffect(REYES, 'the_retainer'),
        { kind: 'flag', key: 'act3_strand_reyes' },
        { kind: 'heat', eventId: 'act3:reyes', delta: 4 },
      ],
      next: 'hub',
    },

    merrow: {
      id: 'merrow',
      lines: [
        { text: 'Merrow has no office you could stand outside. It has a floor of a building in a city none of you have been to and a website with a photograph of a bridge on it.' },
        { text: 'What Aaron finds is a tier sheet. Bellhaven is a row on it.' },
        { text: 'There is a per-child annual figure. There is a volume discount that applies above eight thousand children. Bellhaven qualifies, and somebody has written *nice* in a comment next to that.' },
      ],
      effects: [
        clueEffect(MERROW, 'the_tier_sheet'),
        { kind: 'flag', key: 'act3_strand_merrow' },
        { kind: 'heat', eventId: 'act3:merrow', delta: 4 },
      ],
      next: 'hub',
    },

    ready: {
      id: 'ready',
      lines: [
        { text: 'Three strands on a folding table under a bike light: a man who means it, a woman who filed the form, and a spreadsheet that priced it.' },
        { text: 'None of them think they did anything. That is going to be the hardest part to say in ninety seconds and it is the only part that matters.' },
      ],
      effects: [{ kind: 'beat', missionId: 'act3', beat: 4 }],
      end: true,
    },
  },
};

const THE_UPLINK: Scene = {
  id: 'act3_4_the_uplink',
  beat: 4,
  locationId: 'ballpark',
  hook: 'Everything that screen shows leaves through one cabinet.',
  language: 'B',
  requires: { mission: { id: 'act3', beat: 4 } },
  start: 'concourse',
  nodes: {
    concourse: {
      id: 'concourse',
      lines: [
        { text: 'Deja takes you down the third-base side on a Tuesday when there is no game on and points at a grey box with a very good lock on it.' },
        { speaker: 'Deja', text: 'That’s it. That’s the whole thing.' },
        { text: 'It is painted a nicer grey than the junction box behind the leisure centre. It has a moulded housing and a little light on it and a sticker with a logo.' },
        { speaker: 'Deja', text: 'Same cabinet. It’s always the same cabinet. They just spend more on the paint when people are going to look at it.' },
      ],
      minigame: {
        kind: 'sabotage',
        missionId: UPLINK_CABINET.missionId,
        brief: 'Saturday is Founders’ Day. It has to be in before then, and it has to still look untouched.',
        onWin: 'ready',
        onFail: 'nearly',
        onAbort: 'nearly',
      },
    },
    nearly: {
      id: 'nearly',
      lines: [
        { text: 'It does not go cleanly. You get out and you get away and the cabinet does not shut quite the way it did before.' },
        { speaker: 'Deja', text: 'It’s in. It’s ugly and it’s in.' },
        { text: 'She is not reassuring you. She has been doing jobs with her mum’s crew since she was nine and “ugly and in” is a professional grade.' },
      ],
      next: 'ready',
    },
    ready: {
      id: 'ready',
      lines: [
        { text: 'Everything Vetter Field puts on that screen on Saturday will go through a thing that Aaron can talk to.' },
        { text: 'Walking out you pass the bleachers. Somebody’s little brother is hitting a ball off a tee at the far end, badly, over and over, for no reason at all.' },
      ],
      effects: [
        { kind: 'flag', key: 'uplink_ready' },
        { kind: 'beat', missionId: 'act3', beat: 5 },
      ],
      end: true,
    },
  },
};

export const ACT3_PREP_SCENES: Scene[] = [THE_ASK, THREE_NAMES, WHO_THEY_ARE, THE_UPLINK];
