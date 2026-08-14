import type { SaveState } from '../state/schema';
import { FEED_ENTRIES, type FeedEntry } from '../content/feed';
import { escalationStage } from '../world/escalation';

/** Stored in `player.flags` like any other story flag — the highest stage
 * the player has actually opened the feed at, so a ping only ever fires for
 * headlines they genuinely haven't seen yet. */
export const FEED_LAST_SEEN_FLAG = 'feed_last_seen_stage';

/** Every headline the town's current escalation stage has actually run,
 * newest first — the same stage `world/escalation.ts` uses to decide how
 * much of the patrol/drone/fence rollout is live, just given words. */
export function visibleFeedEntries(save: SaveState): FeedEntry[] {
  const stage = escalationStage(save.world.day);
  return FEED_ENTRIES.filter((e) => e.minStage <= stage)
    .slice()
    .reverse();
}

/** How many headlines have gone up since the phone was last opened — the
 * badge on the Backpack button and the Feed app icon both read this,
 * nothing separately tracked. */
export function unreadFeedCount(save: SaveState): number {
  const lastSeen = Number(save.player.flags[FEED_LAST_SEEN_FLAG] ?? -1);
  const stage = escalationStage(save.world.day);
  return FEED_ENTRIES.filter((e) => e.minStage <= stage && e.minStage > lastSeen).length;
}
