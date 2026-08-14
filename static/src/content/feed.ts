import type { EscalationStage } from '../world/escalation';

export interface FeedEntry {
  id: string;
  /**
   * The escalation stage (`world/escalation.ts`) this headline becomes true
   * at — the same stage the patrols/drones/fencing read to decide how much
   * of the town's surveillance is actually up and running. The feed is that
   * same creep given words: cameras, patrols, and fencing showing up on the
   * map is the fact; this is the town telling itself a story about why.
   */
  minStage: EscalationStage;
  headline: string;
  body: string;
}

/**
 * Continuous plot points, read off the phone rather than delivered as a
 * cutscene — new cameras going up, a new data center, safety propaganda,
 * exactly what the build note asked the feed to carry. Ordered here as the
 * rollout actually happens; `systems/feed.ts` reverses it so the phone shows
 * newest first, the way an actual feed would.
 */
export const FEED_ENTRIES: FeedEntry[] = [
  {
    id: 'feed_phase_two_announced',
    minStage: 0,
    headline: 'SafeTrace: “Phase Two on track for summer.”',
    body: 'A council notice, reposted twice already. Nobody who reads it can say what Phase Two actually is, which the notice describes as a feature, not an omission.',
  },
  {
    id: 'feed_safety_grant',
    minStage: 0,
    headline: 'Town accepts SafeTrace “Community Safety Grant”',
    body: 'Free cameras, the paperwork says, like a coupon. Nobody on the council asked, on the record, who owns the footage once they’re up.',
  },
  {
    id: 'feed_data_center_groundbreaking',
    minStage: 1,
    headline: 'Groundbreaking held for SafeTrace Regional Data Center',
    body: 'The lot used to be the Kessler farm. The ceremony had a ribbon and a shovel and nobody from the Kessler family standing anywhere near either.',
  },
  {
    id: 'feed_new_patrol_routes',
    minStage: 1,
    headline: 'SafeTrace “Community Liaison” patrols now on regular routes',
    body: 'Same uniforms, same vans, just more of them, and a published route map nobody remembers asking for.',
  },
  {
    id: 'feed_annex_fenced',
    minStage: 2,
    headline: 'Annex district fenced pending “site security review”',
    body: 'The fence went up overnight. The review it’s pending has no listed end date — several people wrote the council to point that out, and none of them got an answer back.',
  },
  {
    id: 'feed_land_seizure',
    minStage: 2,
    headline: 'Eminent domain filing covers three more blocks',
    body: 'It rarely makes the agenda by its real name — “infrastructure expansion,” same three words every time. It is always land somebody was already living on.',
  },
  {
    id: 'feed_flack_phase_three',
    minStage: 3,
    headline: 'FLACK Phase Three begins early, SafeTrace says, “by popular demand”',
    body: 'Nobody remembers being polled. The banner in the square already has the new logo on it, which took less time to print than the phase took to announce.',
  },
  {
    id: 'feed_safety_ad',
    minStage: 3,
    headline: '“You’re Never Really Alone” — new SafeTrace safety campaign',
    body: 'The ad plays before every terminal login now. It’s the same actor from the groundbreaking ribbon-cutting. He looks a little more tired this time.',
  },
];
