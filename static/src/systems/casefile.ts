import type { SaveState } from '../state/schema';
import { CASE_ENTRIES, type CaseEntry } from '../content/casefile';

/** Entries the player has actually earned, in reveal order. */
export function discoveredEntries(save: SaveState): CaseEntry[] {
  return CASE_ENTRIES.filter((e) => save.player.flags[e.flag]);
}

/** How many threads are still out there — a count, never a list, so the
 * unopened half of the dossier stays a reason to keep pulling threads rather
 * than a spoiler. */
export function undiscoveredCount(save: SaveState): number {
  return CASE_ENTRIES.length - discoveredEntries(save).length;
}
