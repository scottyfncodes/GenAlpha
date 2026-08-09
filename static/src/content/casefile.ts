export interface CaseEntry {
  id: string;
  /** The story flag that reveals this entry. Every one here is a flag a scene
   * already writes — this file adds no new discoveries, just a place for the
   * ones already earned to live. */
  flag: string;
  title: string;
  entry: string;
}

/**
 * The mystery, kept as a dossier instead of a memory test.
 *
 * A choice that reveals something is easy to lose track of forty minutes and
 * three locations later — this is what turns "I picked a dialogue option"
 * into "I have a case file with an entry in it because of what I picked."
 * Ordered as the story actually reveals it, not alphabetically, so scrolling
 * the list reads like the case building rather than a filing cabinet.
 */
export const CASE_ENTRIES: CaseEntry[] = [
  {
    id: 'casey_missing',
    flag: 'casey_missing_noticed',
    title: 'Casey’s chair is empty',
    entry:
      'Casey didn’t say goodbye. Nobody at school even looks at the seat. “Moved. It happens” is the whole explanation anyone was given, and it is the explanation everyone accepted at once, together, without being asked to.',
  },
  {
    id: 'casey_house',
    flag: 'casey_house_checked',
    title: 'The house went up for sale too fast',
    entry:
      'The FOR SALE sign has no dust on it and the mailbox is still full. Someone left in a hurry, or was made to look like they did — a cereal bowl with the spoon still in it is not what a family in a hurry to move forgets.',
  },
  {
    id: 'record_mismatch',
    flag: 'record_doesnt_match',
    title: 'The paperwork is too clean',
    entry:
      'Property records show the sale eleven days before the sign went up, forwarded to a PO box in a town nobody has heard of — box number 1. Every field filled in. Nothing missing. That is what is wrong with it.',
  },
  {
    id: 'camera_misplaced',
    flag: 'camera_misplaced_me',
    title: 'The camera put you somewhere you weren’t',
    entry:
      'An incident notice from the community safety system placed you behind the Fenwick Street shops at 4:52 on a Tuesday you were home. The photo is grainy, from above, and unmistakably wrong — and everyone believed it before they believed you.',
  },
  {
    id: 'nova_channel',
    flag: 'nova_channel_seen',
    title: 'Ellen’s whole life is scheduled content',
    entry:
      'A printed grid on her fridge, two rows a day, every day, months out — including a “surprise” that already happened off camera so it can happen again on camera. She doesn’t see anything strange in it. That might be the strangest part.',
  },
  {
    id: 'square_map',
    flag: 'act1_b6_map_seen',
    title: 'There’s a dot on Casey’s front door',
    entry:
      'The council’s own coverage map shows a blue dot on every corner in town — including one aimed straight at Casey’s front door, months before Casey disappeared.',
  },
  {
    id: 'square_back',
    flag: 'act1_b6_back_seen',
    title: 'Two men in good jackets, not clapping',
    entry:
      'Two men who aren’t from Bellhaven stand at the back of the safety-grant rally, watching the crowd instead of the stage. One of them is visibly counting heads.',
  },
  {
    id: 'safety_grant',
    flag: 'safety_grant_known',
    title: 'The cameras were sold, not installed',
    entry:
      'A safety grant paid for “effectively total” coverage — every corner, every lot, a dot on Casey’s own front door. A grant means a cheque, and a cheque means somebody signed for what the cameras are actually for.',
  },
  {
    id: 'gen_a_mark',
    flag: 'resistance_hint_found',
    title: 'Somebody already knows',
    entry:
      'Under fresh council-grey paint at the base of pole 5-C: two letters in laser-printer type, GEN A, ringed by hand in a circle that isn’t quite closed. The paint was still tacky. Whoever covered it did it today — which means someone else marked it first.',
  },
  {
    id: 'casey_answer',
    flag: 'casey_answer_found',
    title: 'What actually happened to Casey',
    entry:
      'The cameras were never the product — the behavioural dataset built from them is. Casey’s dad raised something about it internally, and the reference number for what he raised leads straight into a relocation allowance, a settlement, and a box marked MATTER CLOSED. Nobody did anything to Casey. It was administrative.',
  },
  {
    id: 'nova_schedule',
    flag: 'nova_schedule_seen',
    title: 'Ellen’s whole life, laminated and dated',
    entry:
      'A laminated month lives on her fridge — every appearance scheduled weeks out, including a “redo” of a bit that didn’t do the numbers the first time. Nine years of a channel is the biggest single pipeline of data on this town, and it has her face on it.',
  },
  {
    id: 'ledger',
    flag: 'resistance_funding_traced',
    title: 'The ledger traces back to someone you trust',
    entry:
      'A financial trace on the safety grant returns a boring database schema instead of a name — until it clicks that you’ve seen this exact shape before. There is exactly one person close to you who could have written it.',
  },
];
