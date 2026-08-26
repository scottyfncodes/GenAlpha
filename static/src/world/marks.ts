import type { EscalationStage } from './escalation';

/**
 * THE GEN A MARK, ON WALLS.
 *
 * "Every resistance asset renders the A as the anarchy circle-A. The circle
 * closes across the three acts and no dialogue ever explains it" — the rule
 * `ui/GenAMark.tsx` exists to hold, and `content/act3/act3.test.ts` fails if
 * a line of dialogue ever names it. So the town's own copies are exactly
 * that: drawn, never captioned, and never attached to a location's blurb.
 *
 * ── The rarity curve ─────────────────────────────────────────────────
 *
 * These used to be a flat list, all twenty of them standing from the first
 * frame of a new game, which got the density right and the *meaning*
 * exactly backwards. A symbol that is already everywhere on day one is
 * wallpaper. It is only worth anything if the player watches it spread.
 *
 * So each mark declares the `EscalationStage` it goes up at — the same
 * day-driven rollout clock the camera network uses (`world/escalation.ts`),
 * which means the marks and the cameras multiply against each other on the
 * same timeline. Read the stages as a story:
 *
 *   stage 0  four, all half-drawn, none of them anywhere public: a back
 *            alley, the strip, the yard behind the lot. Somebody has
 *            started doing this and almost nobody has seen it.
 *   stage 1  it reaches the streets people actually walk down.
 *   stage 2  the Civic Zone gets its first, which is the beat — somebody
 *            painted the government block and did not get caught.
 *   stage 3  everywhere, and the circles are closed. This is the one the
 *            whole thing is for: the player realises the mark is being put
 *            up by people they have never met and cannot take credit for.
 *
 * `closure` broadly climbs with stage for the same reason — the early ones
 * are hesitant and inconsistent (different hands, each having seen it
 * once), the late ones are drawn by people who know exactly what they are
 * drawing. That is `GenAMark.tsx`'s clean → claiming → closed arc told on
 * the map instead of in a cutscene.
 *
 * A player's own sabotage adds more on top of this — see `draw.ts`'s
 * `drawSabotageScar` — so a late-game town carries both the marks the
 * world put up and the ones they did, and cannot easily tell them apart.
 * That is the intended confusion.
 *
 * None of this is an `Obstacle` or a `Location`: it is paint on ground
 * somebody else's collision rect already owns, so there is no connectivity
 * or overlap pass to re-run when one moves.
 */
export interface WallMark {
  x: number;
  y: number;
  size: number;
  /** 0 = no circle at all, 1 = closed ring. */
  closure: number;
  /** A photocopied sticker rather than spray — smaller, paler, squarer. */
  sticker?: boolean;
  /** Which stage of the rollout this one goes up at. */
  stage: EscalationStage;
}

export const GEN_A_MARKS: WallMark[] = [
  /* ── Stage 0 — four, and you have to be somewhere unwatched to see any
     of them. Half-drawn, every one. ─────────────────────────────────── */
  { x: 356, y: 120, size: 9, closure: 0.25, stage: 0 }, // The Heights, the alley behind Ellen's
  { x: 130, y: 486, size: 13, closure: 0.5, stage: 0 }, // Old Market, the strip
  { x: 200, y: 664, size: 11, closure: 0.4, stage: 0 }, // Old Market, behind the lot
  { x: 700, y: 856, size: 11, closure: 0.45, stage: 0 }, // The Blocks, the back alley

  /* ── Stage 1 — it reaches streets people walk down. ─────────────────── */
  { x: 774, y: 96, size: 11, closure: 0.45, stage: 1 }, // Main Street, the school's flank
  { x: 300, y: 470, size: 9, closure: 0.6, stage: 1 }, // Old Market, the cut-through
  { x: 1300, y: 476, size: 9, closure: 0.55, stage: 1 }, // The Works, the alley mouth
  { x: 214, y: 880, size: 10, closure: 0.55, stage: 1 }, // Southside, the depot lane
  { x: 862, y: 856, size: 10, closure: 0.6, stage: 1 }, // The Blocks, the second alley

  /* ── Stage 2 — the Civic Zone gets its first. Somebody painted the
     government block and did not get caught, and after that it is on the
     park and the retail lot too. ─────────────────────────────────────── */
  { x: 1392, y: 150, size: 12, closure: 0.7, stage: 2 }, // Civic Zone, the Data Centre fence
  { x: 1344, y: 300, size: 10, closure: 0.6, stage: 2 }, // Civic Zone, the service cut
  { x: 700, y: 244, size: 7, closure: 0.7, sticker: true, stage: 2 }, // Main Street, the bandstand post
  { x: 748, y: 520, size: 10, closure: 0.8, stage: 2 }, // Liberty Park, the gazebo post
  { x: 408, y: 872, size: 8, closure: 0.4, sticker: true, stage: 2 }, // Southside, the substation fence
  { x: 1404, y: 860, size: 7, closure: 0.5, sticker: true, stage: 2 }, // The Plaza, MegaMart's lane

  /* ── Stage 3 — everywhere, and closed. Nobody the player has met put
     most of these up. ────────────────────────────────────────────────── */
  { x: 1002, y: 214, size: 8, closure: 1, sticker: true, stage: 3 }, // Main Street, the café corner
  { x: 348, y: 640, size: 8, closure: 1, sticker: true, stage: 3 }, // Old Market, the diner yard
  { x: 1520, y: 528, size: 12, closure: 1, stage: 3 }, // The Works, the Annex fence gap
  { x: 1036, y: 900, size: 9, closure: 1, stage: 3 }, // The Blocks, the east end
  { x: 1290, y: 1010, size: 8, closure: 1, sticker: true, stage: 3 }, // The Plaza, the lot
  { x: 660, y: 300, size: 12, closure: 1, stage: 3 }, // Main Street, the square itself
  { x: 1160, y: 236, size: 11, closure: 1, stage: 3 }, // Civic Zone, City Hall's own frontage
];

/** The marks standing on a given day's stage. Same shape as the camera
 * table's own `camerasAtDay` and the obstacle layer's `minStage` filter —
 * one rollout clock, three things reading off it. */
export function marksAtStage(stage: EscalationStage): WallMark[] {
  return GEN_A_MARKS.filter((m) => m.stage <= stage);
}
