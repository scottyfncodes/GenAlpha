/**
 * Salvage: what the overworld collectible nodes hand out (module 9 addendum,
 * Part A). Deliberately not in `content/economy.ts`'s ITEMS — a material has
 * no cash price, no event multiplier, no Heat-tier markup. It's worth a flat
 * amount of SHDW and nothing else, because salvage is salvage; the *market*
 * is where a price gets to mean something.
 */
export interface Material {
  itemId: string;
  name: string;
  /** Flat SHDW value on sale — no drift, no events. */
  sellValueShdw: number;
  /** Player-facing, wherever the material is listed. */
  description: string;
}

export const MATERIALS: Material[] = [
  {
    itemId: 'copper_wire',
    name: 'Copper Wire',
    sellValueShdw: 0.8,
    description: 'Stripped, coiled, still good.',
  },
  {
    itemId: 'salvaged_board',
    name: 'Salvaged Board',
    sellValueShdw: 1.4,
    description: 'Half the chips are dead. Half aren’t.',
  },
  {
    itemId: 'cracked_chipset',
    name: 'Cracked Chipset',
    sellValueShdw: 2.2,
    description: 'Reads fine. Looks like it survived a fire.',
  },
  {
    itemId: 'spare_battery',
    name: 'Spare Battery',
    sellValueShdw: 1.0,
    description: 'Eighty percent of a charge, forever.',
  },
];

export const MATERIALS_BY_ID: Record<string, Material> = Object.fromEntries(
  MATERIALS.map((m) => [m.itemId, m]),
);

/**
 * Building something out of salvage instead of buying it built. The output is
 * always an existing `content/economy.ts` gear item — this is a second way to
 * get a `signal_jammer`, not a second catalog of gear that needs its own
 * balancing pass.
 */
export interface Recipe {
  id: string;
  label: string;
  inputs: { itemId: string; quantity: number }[];
  outputItemId: string;
  description: string;
}

export const RECIPES: Recipe[] = [
  {
    id: 'craft_signal_jammer',
    label: 'Signal Jammer',
    inputs: [
      { itemId: 'copper_wire', quantity: 2 },
      { itemId: 'cracked_chipset', quantity: 1 },
    ],
    outputItemId: 'signal_jammer',
    description: 'Same trick the market sells, built instead of bought.',
  },
  {
    id: 'craft_clean_sim',
    label: 'Clean SIM Card',
    inputs: [
      { itemId: 'spare_battery', quantity: 1 },
      { itemId: 'salvaged_board', quantity: 1 },
    ],
    outputItemId: 'clean_sim',
    description: 'A phone with no history is just a phone somebody forgot to register.',
  },
  {
    id: 'craft_beater_car',
    label: 'The Beater',
    inputs: [
      { itemId: 'salvaged_board', quantity: 4 },
      { itemId: 'cracked_chipset', quantity: 3 },
      { itemId: 'spare_battery', quantity: 2 },
      { itemId: 'copper_wire', quantity: 2 },
    ],
    outputItemId: 'beater_car',
    description: 'Nobody sells you a whole car built from parts. It still counts.',
  },
];
