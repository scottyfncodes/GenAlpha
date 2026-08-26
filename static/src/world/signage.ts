/**
 * Street-level SafeTrace signage — small civic notice boards, not the
 * Plaza's own landmark billboard (`obstacles.ts`'s `plaza_pylon` and
 * `commercial_billboard`, drawn by `draw.ts`'s `drawBillboard`). Those two
 * are singular, hand-placed district anchors, found already corrected —
 * this is the ordinary version of the same object, standing clean until the
 * player does something about it.
 *
 * Deliberately the *cheapest* interaction in the game: no tool, no deck
 * tier, same "the Heat cost is the only gate" shape `junctionboxes.ts`
 * already established. A camera needs bolt cutters and a Tier-3 rig before
 * it's reachable at all; a sign needs nothing but the walk over — which is
 * on purpose, since this is meant to be the first thing a brand-new player
 * can actually do something to.
 *
 * `before`/`after` is the joke itself, shown as a line of text (the toast
 * Overworld.tsx fires on a landed hack) rather than painted on the canvas —
 * every sign in this game is a shape standing in for type, never literal
 * copy at a scale nobody could read, and that rule doesn't bend for this
 * one prop. `drawBillboard`'s existing hand-drawn "correction" scrawl is the
 * physical tell instead: absent until hacked, present after, same red as
 * the Plaza's own landmark uses for exactly the same gag.
 */
export interface SignageNode {
  id: string;
  x: number;
  y: number;
  before: string;
  after: string;
  heatCost: number;
  respawnDays: number;
}

export const SIGNAGE_NODES: SignageNode[] = [
  {
    id: 'sign_heights_corner',
    x: 212,
    y: 176,
    before: 'A WATCHFUL TOWN IS A SAFE TOWN.',
    after: 'A WATCHED TOWN IS A WATCHED TOWN.',
    heatCost: 2,
    respawnDays: 6,
  },
  {
    id: 'sign_main_square',
    x: 632,
    y: 318,
    before: 'SAFE. SECURE. COMPLIANT.',
    after: 'SAFE. SECURE. PROBABLY.',
    heatCost: 3,
    respawnDays: 6,
  },
  {
    id: 'sign_civic_gate',
    x: 1178,
    y: 336,
    before: 'NOTHING TO HIDE, NOTHING TO FEAR.',
    after: 'NOTHING TO HIDE FROM YOU. EVERYTHING TO HIDE FROM US.',
    heatCost: 4,
    respawnDays: 7,
  },
];

/** Same radius the other street furniture uses. */
export const SIGNAGE_INTERACT_RADIUS = 26;
