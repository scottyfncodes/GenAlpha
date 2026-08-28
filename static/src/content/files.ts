/**
 * Files: the hidden information layer of Bellhaven, not a second inventory.
 * A File is never picked up and never carried — it's a fact about the world
 * that becomes legible once Aaron's own reach crosses whatever threshold
 * would let him actually read it. `systems/files.ts` computes which ones are
 * unlocked, the same way `systems/coverage.ts` computes Coverage instead of
 * storing it: there's no way for a File's unlocked state to disagree with
 * the capability it's actually about, because nothing ever writes it down.
 *
 * `category` matches the design brief's own seven kinds of thing Aaron can
 * gain access to. `requirement` is flavor text shown next to a locked File —
 * what it would take, in-world, not a debug readout of the predicate.
 */
export type FileCategory =
  | 'corporate'
  | 'government'
  | 'security'
  | 'location'
  | 'person'
  | 'technology'
  | 'hidden';

export interface FileEntry {
  id: string;
  category: FileCategory;
  title: string;
  body: string;
  /** Shown, locked, so a player knows what they're working toward instead of
   * just seeing a blank slot. */
  requirement: string;
}

export const FILES: FileEntry[] = [
  {
    id: 'corp_safetrace_rollout',
    category: 'corporate',
    title: 'SafeTrace Rollout Memo',
    body: 'Phase language, mostly: "community safety partnership," "adaptive coverage," not one mention of a camera. The rollout schedule underneath the language is the actual information — it lines up with what’s already going up on the poles.',
    requirement: 'Notice the town escalating.',
  },
  {
    id: 'gov_municipal_contract',
    category: 'government',
    title: 'Municipal Surveillance Contract',
    body: 'The city bought this network, not SafeTrace. Line-item pricing per camera, per junction box, per "sweep event." Whoever’s watching Bellhaven is watching it out of the general fund.',
    requirement: 'Watch the rollout go all the way to total coverage.',
  },
  {
    id: 'security_flack_spec',
    category: 'security',
    title: 'FLACK Housing Spec Sheet',
    body: 'The camera housings aren’t local — FLACK is a vendor, and this is their own install guide. Tamper switch, backup battery, the exact torque spec on the bolts holding it to the pole. Everything a rig needs to know before it argues with one.',
    requirement: 'Build a rig capable of arguing with one.',
  },
  {
    id: 'location_district_survey',
    category: 'location',
    title: 'Bellhaven District Survey',
    body: 'A planning document, not a map — which parts of town the city considers worth the coverage budget, and which parts it doesn’t. Reads less like a survey and more like a list of priorities.',
    requirement: 'Get sent into a couple of districts yourself.',
  },
  {
    id: 'location_sweep_log',
    category: 'location',
    title: 'SafeTrace Sweep Log',
    body: 'Every lockdown sweep the network has run, timestamped, with the coverage percentage that triggered it. Each one hardens the lenses a little more afterward — this is the paper trail proving that’s not a rumor.',
    requirement: 'Live through the network’s first sweep.',
  },
  {
    id: 'person_deja_note',
    category: 'person',
    title: 'Personnel Note — D.',
    body: 'Somebody’s file on her, half-redacted, mostly wrong. Wrong enough that whoever wrote it never actually talked to her — they’re describing an idea of a person who casts buildings, not the person Aaron actually knows.',
    requirement: 'Learn to read infrastructure the way she does.',
  },
  {
    id: 'person_bishop_note',
    category: 'person',
    title: 'Contact Note — B.',
    body: 'Old, careful, deliberately thin — whoever kept this file knew better than to write down anything that could burn a source. What’s left is mostly the fact that somebody thought he was worth a file at all.',
    requirement: 'Get a way into the resistance.',
  },
  {
    id: 'tech_gps_teardown',
    category: 'technology',
    title: 'GPS Receiver Teardown',
    body: 'The receiver’s own guts, annotated — which chip talks to which satellite constellation, and why the cheap one only holds a fix out to a few blocks. Reads like Aaron wrote it to himself, because he did.',
    requirement: 'Build a GPS receiver.',
  },
  {
    id: 'tech_drone_flight',
    category: 'technology',
    title: 'Drone Flight Systems',
    body: 'Notes on the recon drone’s own flight envelope — how far it can range before the link degrades, what it can and can’t see through. The kind of thing you only write down once you’ve actually flown it into a wall a few times.',
    requirement: 'Build a recon drone.',
  },
  {
    id: 'hidden_littlejohn_ledger',
    category: 'hidden',
    title: 'Little John Ledger Fragment',
    body: 'A torn page of somebody else’s trades — no name attached, just amounts and dates that don’t match anything Aaron did. Little John has other users. Obviously it does. This is just the first proof.',
    requirement: 'Actually hold some.',
  },
  {
    id: 'hidden_ai_access_log',
    category: 'hidden',
    title: 'Restricted AI Access Log',
    body: 'A login history for a tool that isn’t supposed to have a login history — timestamps, query counts, nothing about who or why. Somebody built this to be quiet. It isn’t, quite.',
    requirement: 'Earn trusted access to it yourself.',
  },
];

export const FILES_BY_ID: Record<string, FileEntry> = Object.fromEntries(FILES.map((f) => [f.id, f]));
