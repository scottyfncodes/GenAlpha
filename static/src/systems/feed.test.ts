import { describe, expect, it } from 'vitest';
import { createNewSave } from '../state/defaults';
import { visibleFeedEntries, unreadFeedCount, FEED_LAST_SEEN_FLAG } from './feed';
import { FEED_ENTRIES } from '../content/feed';
import { ESCALATION_DAY_THRESHOLDS } from '../world/escalation';

const save = () => createNewSave('Wren');

describe('visibleFeedEntries', () => {
  it('shows only stage-0 headlines on day one', () => {
    const entries = visibleFeedEntries(save());
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.minStage === 0)).toBe(true);
  });

  it('shows more headlines as the day advances through each threshold', () => {
    const day1 = visibleFeedEntries(save());
    const late = visibleFeedEntries({ ...save(), world: { ...save().world, day: 999 } });
    expect(late.length).toBeGreaterThan(day1.length);
    expect(late.length).toBe(FEED_ENTRIES.length);
  });

  it('orders newest (highest stage) headline first', () => {
    const entries = visibleFeedEntries({ ...save(), world: { ...save().world, day: 999 } });
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i - 1].minStage).toBeGreaterThanOrEqual(entries[i].minStage);
    }
  });
});

describe('unreadFeedCount', () => {
  it('counts every visible headline as unread before the feed has ever been opened', () => {
    const s = save();
    expect(unreadFeedCount(s)).toBe(visibleFeedEntries(s).length);
  });

  it('drops to zero once the player has seen the current stage', () => {
    const s = {
      ...save(),
      player: { ...save().player, flags: { ...save().player.flags, [FEED_LAST_SEEN_FLAG]: 0 } },
    };
    expect(unreadFeedCount(s)).toBe(0);
  });

  it('goes back up once a later stage unlocks new headlines the player hasn’t seen', () => {
    const s = {
      ...save(),
      world: { ...save().world, day: ESCALATION_DAY_THRESHOLDS[0] },
      player: { ...save().player, flags: { ...save().player.flags, [FEED_LAST_SEEN_FLAG]: 0 } },
    };
    expect(unreadFeedCount(s)).toBeGreaterThan(0);
  });
});
