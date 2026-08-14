/**
 * Salvage: what the overworld collectible nodes hand out (module 9 addendum,
 * Part A). Deliberately not in `content/economy.ts`'s ITEMS — a material has
 * no cash price, no event multiplier, no Heat-tier markup. It's worth a flat
 * amount of SHDW and nothing else, because salvage is salvage; the *market*
 * is where a price gets to mean something.
 *
 * Two families, kept honest about what they actually are rather than
 * generic "wire and boards": real PC hardware for the deck line (a hard
 * drive, a logic board, a graphics card, an air-gapped drive nobody's
 * supposed to still have), and real skateboard parts for the board line
 * (trucks, wheels, bearings, bushings) before either line's own fictional
 * top end (Mag-Lift, Cracked Chipset) takes over.
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
  // Tech — the deck line's own parts bin.
  {
    itemId: 'hard_drive',
    name: 'Hard Drive',
    sellValueShdw: 0.8,
    description: 'Still spins. Whatever was on it isn’t your problem.',
  },
  {
    itemId: 'logic_board',
    name: 'Logic Board',
    sellValueShdw: 1.4,
    description: 'Half the traces are dead. Half aren’t.',
  },
  {
    itemId: 'cracked_chipset',
    name: 'Cracked Chipset',
    sellValueShdw: 2.2,
    description: 'Reads fine. Looks like it survived a fire.',
  },
  {
    itemId: 'battery_pack',
    name: 'Battery Pack',
    sellValueShdw: 1.0,
    description: 'Eighty percent of a charge, forever.',
  },
  {
    itemId: 'graphics_card',
    name: 'Graphics Card',
    sellValueShdw: 2.6,
    description: 'Overkill for anything Bellhaven runs on it. That’s the point.',
  },
  {
    itemId: 'air_gapped_drive',
    name: 'Air-Gapped Drive',
    sellValueShdw: 2.8,
    description: 'Never touched a network in its life. Somebody’s whole world on it anyway — not yours to read, yours to strip for parts.',
  },
  // Skate — real parts, not a fictional stand-in for them.
  {
    itemId: 'wheels',
    name: 'Wheels',
    sellValueShdw: 0.6,
    description: 'Flat-spotted on one side. Still roll true on the other three quarters.',
  },
  {
    itemId: 'trucks',
    name: 'Trucks',
    sellValueShdw: 0.9,
    description: 'The axle assembly. Bent, but bent evenly.',
  },
  {
    itemId: 'bearings',
    name: 'Bearings',
    sellValueShdw: 0.6,
    description: 'A little gritty. Still round.',
  },
  {
    itemId: 'bushings',
    name: 'Bushings',
    sellValueShdw: 1.1,
    description: 'The soft part between the truck and the board. Worn down to one turning radius.',
  },
  {
    itemId: 'motor_kit',
    name: 'Motor Kit',
    sellValueShdw: 2.0,
    description: 'Out of a dead scooter, or a dead something. Spins true.',
  },
  {
    itemId: 'mag_lift_coil',
    name: 'Mag-Lift Coil',
    sellValueShdw: 3.5,
    description: 'Nobody in Bellhaven sells these. Somebody in Bellhaven built one anyway.',
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
  /** The file this recipe needs before it can be built at all —
   * `content/blueprints.ts`. Checked alongside the material inputs in
   * `systems/materials.ts` `canCraft`. */
  blueprintItemId: string;
}

export const RECIPES: Recipe[] = [
  {
    id: 'craft_signal_jammer',
    label: 'Signal Jammer',
    inputs: [
      { itemId: 'hard_drive', quantity: 2 },
      { itemId: 'cracked_chipset', quantity: 1 },
    ],
    outputItemId: 'signal_jammer',
    description: 'Same trick the market sells, built instead of bought.',
    blueprintItemId: 'bp_signal_jammer',
  },
  {
    id: 'craft_clean_sim',
    label: 'Clean SIM Card',
    inputs: [
      { itemId: 'battery_pack', quantity: 1 },
      { itemId: 'logic_board', quantity: 1 },
    ],
    outputItemId: 'clean_sim',
    description: 'A phone with no history is just a phone somebody forgot to register.',
    blueprintItemId: 'bp_clean_sim',
  },
  /*
   * The board line. Each tier upgrade consumes the tier below it as one of
   * its own inputs — `craft()` (systems/materials.ts) is generic over any
   * itemId already in the inventory, so this needed no engine change, just
   * a recipe that names the previous board as a part. Trading up, not
   * stacking: a player can never hold two boards at once, and `boardTier`
   * (systems/market.ts) reads whichever one that leaves. Real assembly order
   * too: trucks and wheels and bearings before anything electric, a motor
   * before Mag-Lift, never the other way round.
   */
  {
    id: 'craft_board_1',
    label: 'Scrap Deck',
    inputs: [
      { itemId: 'trucks', quantity: 1 },
      { itemId: 'wheels', quantity: 2 },
      { itemId: 'bearings', quantity: 2 },
    ],
    outputItemId: 'board_1',
    description: 'A board that used to be a fence panel, trucked and wheeled. The first real reason to look twice at a bush.',
    blueprintItemId: 'bp_board_1',
  },
  {
    id: 'craft_board_2',
    label: 'Rebuilt Deck',
    inputs: [
      { itemId: 'board_1', quantity: 1 },
      { itemId: 'bearings', quantity: 2 },
      { itemId: 'bushings', quantity: 1 },
    ],
    outputItemId: 'board_2',
    description: 'New bearings so it stops sounding like it’s dying, new bushings so it actually turns.',
    blueprintItemId: 'bp_board_2',
  },
  {
    id: 'craft_board_3',
    label: 'Motorized Deck',
    inputs: [
      { itemId: 'board_2', quantity: 1 },
      { itemId: 'motor_kit', quantity: 1 },
      { itemId: 'battery_pack', quantity: 2 },
      { itemId: 'logic_board', quantity: 1 },
    ],
    outputItemId: 'board_3',
    description: 'A motor where your back foot goes and a logic board to keep it from running away with you. Now it does some of the work.',
    blueprintItemId: 'bp_board_3',
  },
  {
    id: 'craft_board_4',
    label: 'Prototype Hoverboard',
    inputs: [
      { itemId: 'board_3', quantity: 1 },
      { itemId: 'mag_lift_coil', quantity: 2 },
      { itemId: 'logic_board', quantity: 2 },
      { itemId: 'motor_kit', quantity: 1 },
    ],
    outputItemId: 'board_4',
    description: 'Three inches of clearance nobody in Bellhaven has seen before. Unstable. Also: it works.',
    blueprintItemId: 'bp_board_4',
  },
  {
    id: 'craft_board_5',
    label: 'The Hoverboard',
    inputs: [
      { itemId: 'board_4', quantity: 1 },
      { itemId: 'mag_lift_coil', quantity: 3 },
      { itemId: 'motor_kit', quantity: 2 },
      { itemId: 'battery_pack', quantity: 1 },
    ],
    outputItemId: 'board_5',
    description: 'Whatever was wrong with the prototype, it isn’t wrong anymore.',
    blueprintItemId: 'bp_board_5',
  },
  /*
   * The deck line. Same trade-up shape as the board — `deckTier`
   * (systems/market.ts) is what actually gates which kind of target a hack
   * attempt can even reach (`systems/streethacks.ts` `HACK_KIND_MIN_TIER`),
   * not just how hard the puzzle plays. The Graphics Card and Air-Gapped
   * Drive don't show up until tier 3+ on purpose — cracking Helio's own
   * network takes more than a hard drive and a chipset.
   */
  {
    id: 'craft_cyberdeck_1',
    label: 'Burner Deck',
    inputs: [
      { itemId: 'cracked_chipset', quantity: 2 },
      { itemId: 'hard_drive', quantity: 1 },
    ],
    outputItemId: 'cyberdeck_1',
    description: 'Everything it needs is already lying around Bellhaven, if you know which bushes to check and which cameras to take apart. Reads a payphone line — nothing else, yet.',
    blueprintItemId: 'bp_cyberdeck_1',
  },
  {
    id: 'craft_cyberdeck_2',
    label: 'Patched Deck',
    inputs: [
      { itemId: 'cyberdeck_1', quantity: 1 },
      { itemId: 'logic_board', quantity: 2 },
      { itemId: 'battery_pack', quantity: 1 },
    ],
    outputItemId: 'cyberdeck_2',
    description: 'Enough current behind it to talk to a kiosk ATM without frying either of you.',
    blueprintItemId: 'bp_cyberdeck_2',
  },
  {
    id: 'craft_cyberdeck_3',
    label: 'Cracked Deck',
    inputs: [
      { itemId: 'cyberdeck_2', quantity: 1 },
      { itemId: 'cracked_chipset', quantity: 2 },
      { itemId: 'graphics_card', quantity: 1 },
    ],
    outputItemId: 'cyberdeck_3',
    description: 'Reads a FLACK housing now, not just a call box. Helio’s own network, from the outside — the graphics card is what actually breaks the encryption fast enough to matter.',
    blueprintItemId: 'bp_cyberdeck_3',
  },
  {
    id: 'craft_cyberdeck_4',
    label: 'Ghost Deck',
    inputs: [
      { itemId: 'cyberdeck_3', quantity: 1 },
      { itemId: 'air_gapped_drive', quantity: 2 },
      { itemId: 'graphics_card', quantity: 1 },
    ],
    outputItemId: 'cyberdeck_4',
    description: 'Quiet enough to sit inside a building’s own systems without it noticing you’re there.',
    blueprintItemId: 'bp_cyberdeck_4',
  },
  {
    id: 'craft_cyberdeck_5',
    label: 'The Cyberdeck',
    inputs: [
      { itemId: 'cyberdeck_4', quantity: 1 },
      { itemId: 'air_gapped_drive', quantity: 3 },
      { itemId: 'graphics_card', quantity: 2 },
      { itemId: 'cracked_chipset', quantity: 2 },
    ],
    outputItemId: 'cyberdeck_5',
    description: 'Everything the last four builds were practice for.',
    blueprintItemId: 'bp_cyberdeck_5',
  },
  /*
   * The anti-drone tool line — three tiers, same trade-up shape as the
   * board and deck (`craft_net_gun` consumes the slingshot, `craft_emp_gun`
   * consumes the net gun), so a player only ever holds the one tool that
   * matters. `world/drones.ts` reads whichever tier that leaves the same
   * way `boardTier`/`deckTier` already do.
   */
  {
    id: 'craft_slingshot',
    label: 'Slingshot',
    inputs: [
      { itemId: 'trucks', quantity: 1 },
      { itemId: 'bushings', quantity: 1 },
    ],
    outputItemId: 'slingshot',
    description: 'A fork off a bent truck and a length of bushing rubber. Enough to knock something out of the air, briefly.',
    blueprintItemId: 'bp_slingshot',
  },
  {
    id: 'craft_net_gun',
    label: 'Net Gun',
    inputs: [
      { itemId: 'slingshot', quantity: 1 },
      { itemId: 'motor_kit', quantity: 1 },
      { itemId: 'battery_pack', quantity: 1 },
    ],
    outputItemId: 'net_gun',
    description: 'The sling gets a motor and something to actually throw. Whatever it hits stays hit.',
    blueprintItemId: 'bp_net_gun',
  },
  {
    id: 'craft_emp_gun',
    label: 'EMP Gun',
    inputs: [
      { itemId: 'net_gun', quantity: 1 },
      { itemId: 'graphics_card', quantity: 1 },
      { itemId: 'cracked_chipset', quantity: 2 },
      { itemId: 'battery_pack', quantity: 1 },
    ],
    outputItemId: 'emp_gun',
    description: 'A capacitor bank and enough board to aim the discharge. It doesn’t hit the drone. It hits everything the drone is.',
    blueprintItemId: 'bp_emp_gun',
  },
  /*
   * The player's own drone line — same trade-up shape again. Flown, not
   * carried: `world/playerdrone.ts` is what actually uses one, this just
   * builds it.
   */
  {
    id: 'craft_scout_drone',
    label: 'Scout Drone',
    inputs: [
      { itemId: 'hard_drive', quantity: 1 },
      { itemId: 'motor_kit', quantity: 1 },
      { itemId: 'battery_pack', quantity: 1 },
    ],
    outputItemId: 'scout_drone',
    description: 'Four motors off the salvage pile and a hard drive standing in for a flight controller. It flies. That’s the whole review.',
    blueprintItemId: 'bp_scout_drone',
  },
  {
    id: 'craft_recon_drone',
    label: 'Recon Drone',
    inputs: [
      { itemId: 'scout_drone', quantity: 1 },
      { itemId: 'logic_board', quantity: 1 },
      { itemId: 'graphics_card', quantity: 1 },
      { itemId: 'battery_pack', quantity: 1 },
    ],
    outputItemId: 'recon_drone',
    description: 'A real logic board instead of a spare hard drive, and enough current behind it to take a hit and keep flying.',
    blueprintItemId: 'bp_recon_drone',
  },
  {
    id: 'craft_strike_drone',
    label: 'Strike Drone',
    inputs: [
      { itemId: 'recon_drone', quantity: 1 },
      { itemId: 'air_gapped_drive', quantity: 1 },
      { itemId: 'graphics_card', quantity: 1 },
      { itemId: 'cracked_chipset', quantity: 2 },
    ],
    outputItemId: 'strike_drone',
    description: 'Armour plate cut from the same stock as everything else in this town, bolted on until the thing can survive reaching a defended target.',
    blueprintItemId: 'bp_strike_drone',
  },
];
