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
  {
    itemId: 'skate_bearings',
    name: 'Skate Bearings',
    sellValueShdw: 0.6,
    description: 'A little gritty. Still round.',
  },
  {
    itemId: 'salvaged_motor',
    name: 'Salvaged Motor',
    sellValueShdw: 2.0,
    description: 'Out of a dead scooter, or a dead something. Spins true.',
  },
  {
    itemId: 'mag_coil',
    name: 'Mag-Lift Coil',
    sellValueShdw: 3.5,
    description: 'Nobody in Bellhaven sells these. Somebody in Bellhaven built one anyway.',
  },
  {
    itemId: 'encrypted_drive',
    name: 'Encrypted Drive',
    sellValueShdw: 2.8,
    description: 'Somebody’s whole life on it. Not yours to read — yours to strip for parts.',
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
  /*
   * The board line. Each tier upgrade consumes the tier below it as one of
   * its own inputs — `craft()` (systems/materials.ts) is generic over any
   * itemId already in the inventory, so this needed no engine change, just
   * a recipe that names the previous board as a part. Trading up, not
   * stacking: a player can never hold two boards at once, and `boardTier`
   * (systems/market.ts) reads whichever one that leaves.
   */
  {
    id: 'craft_board_1',
    label: 'Scrap Deck',
    inputs: [
      { itemId: 'salvaged_board', quantity: 2 },
      { itemId: 'copper_wire', quantity: 1 },
    ],
    outputItemId: 'board_1',
    description: 'Four wheels and a board that used to be a fence panel. The first real reason to look twice at a bush.',
  },
  {
    id: 'craft_board_2',
    label: 'Rebuilt Deck',
    inputs: [
      { itemId: 'board_1', quantity: 1 },
      { itemId: 'skate_bearings', quantity: 2 },
      { itemId: 'copper_wire', quantity: 1 },
    ],
    outputItemId: 'board_2',
    description: 'Swap the bearings, and it stops sounding like it’s dying.',
  },
  {
    id: 'craft_board_3',
    label: 'Motorized Deck',
    inputs: [
      { itemId: 'board_2', quantity: 1 },
      { itemId: 'salvaged_motor', quantity: 1 },
      { itemId: 'spare_battery', quantity: 2 },
      { itemId: 'cracked_chipset', quantity: 1 },
    ],
    outputItemId: 'board_3',
    description: 'A motor where your back foot goes. Now it does some of the work.',
  },
  {
    id: 'craft_board_4',
    label: 'Prototype Hoverboard',
    inputs: [
      { itemId: 'board_3', quantity: 1 },
      { itemId: 'mag_coil', quantity: 2 },
      { itemId: 'cracked_chipset', quantity: 2 },
      { itemId: 'salvaged_motor', quantity: 1 },
    ],
    outputItemId: 'board_4',
    description: 'Three inches of clearance nobody in Bellhaven has seen before. Unstable. Also: it works.',
  },
  {
    id: 'craft_board_5',
    label: 'The Hoverboard',
    inputs: [
      { itemId: 'board_4', quantity: 1 },
      { itemId: 'mag_coil', quantity: 3 },
      { itemId: 'salvaged_motor', quantity: 2 },
      { itemId: 'spare_battery', quantity: 1 },
    ],
    outputItemId: 'board_5',
    description: 'Whatever was wrong with the prototype, it isn’t wrong anymore.',
  },
  /*
   * The deck line. Same trade-up shape as the board — `deckTier`
   * (systems/market.ts) is what actually gates which kind of target a hack
   * attempt can even reach (`systems/streethacks.ts` `HACK_KIND_MIN_TIER`),
   * not just how hard the puzzle plays.
   */
  {
    id: 'craft_cyberdeck_1',
    label: 'Burner Deck',
    inputs: [
      { itemId: 'cracked_chipset', quantity: 2 },
      { itemId: 'copper_wire', quantity: 1 },
    ],
    outputItemId: 'cyberdeck_1',
    description: 'Everything it needs is already lying around Bellhaven, if you know which bushes to check and which cameras to take apart. Reads a payphone line — nothing else, yet.',
  },
  {
    id: 'craft_cyberdeck_2',
    label: 'Patched Deck',
    inputs: [
      { itemId: 'cyberdeck_1', quantity: 1 },
      { itemId: 'salvaged_board', quantity: 2 },
      { itemId: 'spare_battery', quantity: 1 },
    ],
    outputItemId: 'cyberdeck_2',
    description: 'Enough current behind it to talk to a kiosk ATM without frying either of you.',
  },
  {
    id: 'craft_cyberdeck_3',
    label: 'Cracked Deck',
    inputs: [
      { itemId: 'cyberdeck_2', quantity: 1 },
      { itemId: 'cracked_chipset', quantity: 2 },
      { itemId: 'encrypted_drive', quantity: 1 },
    ],
    outputItemId: 'cyberdeck_3',
    description: 'Reads a FLACK housing now, not just a call box. Helio’s own network, from the outside.',
  },
  {
    id: 'craft_cyberdeck_4',
    label: 'Ghost Deck',
    inputs: [
      { itemId: 'cyberdeck_3', quantity: 1 },
      { itemId: 'encrypted_drive', quantity: 2 },
      { itemId: 'spare_battery', quantity: 2 },
    ],
    outputItemId: 'cyberdeck_4',
    description: 'Quiet enough to sit inside a building’s own systems without it noticing you’re there.',
  },
  {
    id: 'craft_cyberdeck_5',
    label: 'The Cyberdeck',
    inputs: [
      { itemId: 'cyberdeck_4', quantity: 1 },
      { itemId: 'encrypted_drive', quantity: 3 },
      { itemId: 'cracked_chipset', quantity: 2 },
    ],
    outputItemId: 'cyberdeck_5',
    description: 'Everything the last four builds were practice for.',
  },
];
