/**
 * The wiring between the two things the player can hit. A camera is a lens
 * on a pole; a junction box is what carries that lens back to SafeTrace.
 * Cut the box and the cameras hanging off it stop reporting, whether or not
 * anybody ever climbs the pole — which is the whole reason both objects
 * exist as separate targets instead of one.
 *
 * The assignment is *derived*, never hand-authored: every camera feeds
 * through whichever junction box is physically closest to it. That's what
 * makes it survive a district reshuffle — move a box or a camera in
 * `junctionboxes.ts`/`collectibles.ts` and the network re-wires itself to
 * match the new map, with no second table to remember to update. It also
 * means the fiction reads correctly off the map itself: the box you can see
 * from the pole is the box that feeds it.
 *
 * A box that happens to be nobody's nearest still exists and still holds a
 * build plan — it just isn't load-bearing for coverage. That asymmetry is
 * deliberate: a player who learns which boxes are worth cutting has learned
 * something real about the town, and the ones that aren't are still worth
 * cracking for what's inside.
 */
import { CAMERA_NODES } from './collectibles';
import { JUNCTION_BOX_NODES } from './junctionboxes';

/** Which junction box each camera reports through, keyed by camera id.
 * Computed once at module load — both node tables are static data. */
export const CAMERA_FEED: Record<string, string> = Object.fromEntries(
  CAMERA_NODES.map((camera) => {
    let nearest = JUNCTION_BOX_NODES[0];
    let best = Infinity;
    for (const box of JUNCTION_BOX_NODES) {
      const d = Math.hypot(box.x - camera.x, box.y - camera.y);
      if (d < best) {
        best = d;
        nearest = box;
      }
    }
    return [camera.id, nearest.id];
  }),
);

/** The reverse view: every camera a given box carries. Precomputed for the
 * same reason `HIDDEN_PICKUP_OBSTACLE_IDS` is — the overworld asks this
 * question about the box the player is standing next to, and shouldn't have
 * to scan the whole camera table to answer it. */
export const CAMERAS_FED_BY: Record<string, string[]> = JUNCTION_BOX_NODES.reduce<Record<string, string[]>>(
  (acc, box) => {
    acc[box.id] = CAMERA_NODES.filter((c) => CAMERA_FEED[c.id] === box.id).map((c) => c.id);
    return acc;
  },
  {},
);
