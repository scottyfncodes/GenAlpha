/**
 * Build plans — the file a recipe needs before it can be built at all.
 * Knowing salvage will make a Rebuilt Deck isn't the same as having the
 * actual diagram for one; a blueprint is what closes that gap. Each is a
 * plain inventory item (owned via `systems/market.ts` `grantItem`/`owns`,
 * same as any other good) rather than a new kind of state, so nothing here
 * needed a save-schema change.
 *
 * Found exactly one way: destroying a junction box (`world/junctionboxes.ts`).
 * `tier` isn't cosmetic — it's the number a junction box's own Heat cost and
 * respawn window scale off of, so a Hoverboard's diagram is guarded by
 * something that actually costs more to crack than a Scrap Deck's.
 */
export interface Blueprint {
  itemId: string;
  name: string;
  /** Which recipe (`content/materials.ts`) this unlocks. */
  recipeId: string;
  /** 1 (cheapest, earliest junction boxes) through 5 (the last tier of
   * either line) — see `world/junctionboxes.ts` for how this maps to risk. */
  tier: 1 | 2 | 3 | 4 | 5;
  /** Player-facing, wherever the file is listed. */
  description: string;
}

export const BLUEPRINTS: Blueprint[] = [
  {
    itemId: 'bp_signal_jammer',
    name: 'Signal Jammer — build plan',
    recipeId: 'craft_signal_jammer',
    tier: 1,
    description: 'Somebody’s handwriting on a photocopy of a photocopy. Still readable.',
  },
  {
    itemId: 'bp_clean_sim',
    name: 'Clean SIM — build plan',
    recipeId: 'craft_clean_sim',
    tier: 1,
    description: 'Half a page. It doesn’t take much to explain a SIM with no name on it.',
  },
  {
    itemId: 'bp_board_1',
    name: 'Scrap Deck — build plan',
    recipeId: 'craft_board_1',
    tier: 1,
    description: 'A diagram of a fence panel with wheels drawn on in a different pen.',
  },
  {
    itemId: 'bp_cyberdeck_1',
    name: 'Burner Deck — build plan',
    recipeId: 'craft_cyberdeck_1',
    tier: 1,
    description: 'The wiring for a call-box reader, traced by hand off a real one.',
  },
  {
    itemId: 'bp_board_2',
    name: 'Rebuilt Deck — build plan',
    recipeId: 'craft_board_2',
    tier: 2,
    description: 'Notes in the margin about which bushings actually turn true.',
  },
  {
    itemId: 'bp_cyberdeck_2',
    name: 'Patched Deck — build plan',
    recipeId: 'craft_cyberdeck_2',
    tier: 2,
    description: 'The current draw worked out in pencil, corrected twice.',
  },
  {
    itemId: 'bp_board_3',
    name: 'Motorized Deck — build plan',
    recipeId: 'craft_board_3',
    tier: 3,
    description: 'Where the motor actually bolts on, and why it has to be there and not somewhere sensible.',
  },
  {
    itemId: 'bp_cyberdeck_3',
    name: 'Cracked Deck — build plan',
    recipeId: 'craft_cyberdeck_3',
    tier: 3,
    description: 'The part of Helio’s own network diagram somebody wasn’t supposed to still have.',
  },
  {
    itemId: 'bp_board_4',
    name: 'Prototype Hoverboard — build plan',
    recipeId: 'craft_board_4',
    tier: 4,
    description: 'Three inches of clearance, and four crossed-out attempts at how to keep it stable.',
  },
  {
    itemId: 'bp_cyberdeck_4',
    name: 'Ghost Deck — build plan',
    recipeId: 'craft_cyberdeck_4',
    tier: 4,
    description: 'How to sit inside a building’s systems without the building noticing. Worth what it costs to find.',
  },
  {
    itemId: 'bp_board_5',
    name: 'The Hoverboard — build plan',
    recipeId: 'craft_board_5',
    tier: 5,
    description: 'The finished version. Whatever was wrong with the prototype is crossed out here, fixed.',
  },
  {
    itemId: 'bp_cyberdeck_5',
    name: 'The Cyberdeck — build plan',
    recipeId: 'craft_cyberdeck_5',
    tier: 5,
    description: 'Everything the last four decks were practice for, drawn out whole.',
  },
  {
    itemId: 'bp_slingshot',
    name: 'Slingshot — build plan',
    recipeId: 'craft_slingshot',
    tier: 1,
    description: 'A kid’s drawing of a fork and a band, except the angles are all measured.',
  },
  {
    itemId: 'bp_net_gun',
    name: 'Net Gun — build plan',
    recipeId: 'craft_net_gun',
    tier: 2,
    description: 'The sling’s diagram with a motor bolted onto the margin, in different handwriting.',
  },
  {
    itemId: 'bp_emp_gun',
    name: 'EMP Gun — build plan',
    recipeId: 'craft_emp_gun',
    tier: 3,
    description: 'A capacitor curve somebody plotted by hand, and a warning underlined twice.',
  },
];

export const BLUEPRINTS_BY_ID: Record<string, Blueprint> = Object.fromEntries(
  BLUEPRINTS.map((b) => [b.itemId, b]),
);

export function blueprintForRecipe(recipeId: string): Blueprint | undefined {
  return BLUEPRINTS.find((b) => b.recipeId === recipeId);
}
