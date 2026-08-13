import type { StoryFlags } from '../state/schema';

/**
 * What happens when the name the player picks for themselves is also a
 * character's name already in the game. "Ellen: Ellen! Hold on—" reads as a
 * bug even though it technically isn't one, so it never ships: the
 * *character* gets bumped to a backup name instead, quietly, once, at the
 * moment the save is created. The player's own name is never touched —
 * asking someone to rename themselves out of a collision they didn't cause
 * is the wrong direction to solve this in.
 *
 * Scoped to given names a player might plausibly type for themselves —
 * relational terms like "Mom" or titled ones like "Councilwoman Reyes"
 * aren't included, because swapping those would change what they mean
 * rather than just who they sound like.
 */
export const RESERVED_NAMES = [
  'Ellen',
  'Deja',
  'Aaron',
  'Milo',
  'Bishop',
  'Reeta',
  'Ridge',
  'Ines',
  'Beau',
  'Casey',
  'Sorrell',
] as const;

/**
 * One backup per reserved name, each distinct from every name in the list
 * above (and from every other backup) so swapping one collision can never
 * create a second one.
 */
const BACKUPS: Record<(typeof RESERVED_NAMES)[number], string> = {
  Ellen: 'Robyn',
  Deja: 'Nadia',
  Aaron: 'Theo',
  Milo: 'Jonah',
  Bishop: 'Corvin',
  Reeta: 'Solene',
  Ridge: 'Wynn',
  Ines: 'Priya',
  Beau: 'Remy',
  Casey: 'Jordan',
  Sorrell: 'Halloway',
};

export const NAME_SWAP_FROM_FLAG = 'name_swap_from';
export const NAME_SWAP_TO_FLAG = 'name_swap_to';

/** Case-insensitive, and trimmed the same way the title screen already
 * trims before it ever reaches here — "ellen " and "Ellen" are the same
 * collision. Returns the reserved name's canonical casing, or null. */
export function collidingCharacter(playerName: string): (typeof RESERVED_NAMES)[number] | null {
  const typed = playerName.trim().toLowerCase();
  return RESERVED_NAMES.find((n) => n.toLowerCase() === typed) ?? null;
}

export function backupNameFor(canonical: (typeof RESERVED_NAMES)[number]): string {
  return BACKUPS[canonical];
}

/**
 * What a character's name should actually render as in this save — the
 * backup if the player's own name collided with them at creation, the
 * canonical name otherwise. The one function every display surface
 * (dialogue text, speaker tags, the Crew screen) calls instead of trusting
 * a name literal directly.
 */
export function resolveCharacterName(flags: StoryFlags, canonical: string): string {
  if (flags[NAME_SWAP_FROM_FLAG] === canonical && typeof flags[NAME_SWAP_TO_FLAG] === 'string') {
    return flags[NAME_SWAP_TO_FLAG];
  }
  return canonical;
}
