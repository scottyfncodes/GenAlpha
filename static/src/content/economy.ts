import type { ItemCategory } from '../state/schema';

/**
 * The economy's content layer (module 03). Prices, effects and events are data
 * here; `src/systems/market.ts` is the code that reads them and never mentions
 * an item by name. Adding a good in Act 2 means adding an object to this file.
 */

export interface GoodsItem {
  itemId: string;
  name: string;
  basePrice: number;
  category: ItemCategory;
  /** Player-facing, on the listing. What it actually does, plainly. */
  effect: string;
  /** Spent on use rather than kept. */
  consumable?: boolean;
  /**
   * A consumable that stays active until the next in-fiction day rather than
   * being spent at a moment (module 03's "for that session" — see SCHEMA-NOTES
   * gap 6, closed in 0.5.0).
   */
  lastsUntilNextDay?: boolean;
  /**
   * Priced as a band rather than a point (module 03 lists intel at 30–90). The
   * event and Heat multipliers apply on top of a per-listing roll inside it.
   */
  priceBand?: [number, number];
}

export const ITEMS: GoodsItem[] = [
  {
    itemId: 'burner_phone',
    name: 'Burner Phone',
    basePrice: 45,
    category: 'gear',
    effect: 'Digital jobs run through it cost less Heat while you’re carrying it.',
  },
  {
    itemId: 'forged_id',
    name: 'Forged ID',
    basePrice: 120,
    category: 'gear',
    effect: 'Opens doors that ask who you are before they ask what you want.',
  },
  {
    itemId: 'signal_jammer',
    name: 'Signal Jammer',
    basePrice: 200,
    category: 'gear',
    consumable: true,
    effect: 'Takes one bad moment out of a job, once. Then it’s gone.',
  },
  {
    itemId: 'safehouse_upgrade_lock',
    name: 'Reinforced Lock',
    basePrice: 80,
    category: 'safehouse',
    effect: 'A place is harder to burn if it’s harder to open. Halves the chance.',
  },
  {
    itemId: 'safehouse_upgrade_power',
    name: 'Off-grid Power Rig',
    basePrice: 150,
    category: 'safehouse',
    effect: 'Somewhere to work from that isn’t on anybody’s meter. A night here does more.',
  },
  {
    itemId: 'intel_tip',
    name: 'Rumour / Intel Tip',
    basePrice: 60,
    priceBand: [30, 90],
    category: 'intel',
    consumable: true,
    effect: 'Somebody already knows the thing you’re about to spend a week finding out.',
  },
  {
    itemId: 'clean_sim',
    name: 'Clean SIM Card',
    basePrice: 25,
    category: 'gear',
    consumable: true,
    lastsUntilNextDay: true,
    effect: 'Until tomorrow, the easy tools don’t leave your name on anything.',
  },
  /*
   * The board line — walking, then five tiers up to a hoverboard. Each tier
   * is a real item, not a stat that quietly increases: `craft_board_2`
   * (content/materials.ts) consumes the tier-1 board as one of its own
   * inputs, so upgrading is trading the old one in, not stacking. Buyable at
   * the market too, same "the same money bought on the corner as it did
   * built from parts" rule the Beater used to state — the market never sold
   * tier skips, just this tier's parts already assembled.
   */
  {
    itemId: 'board_1',
    name: 'Scrap Deck',
    basePrice: 120,
    category: 'gear',
    effect: 'Four wheels and a board that used to be a fence panel. Faster than your own feet, barely.',
  },
  {
    itemId: 'board_2',
    name: 'Rebuilt Deck',
    basePrice: 220,
    category: 'gear',
    effect: 'Real bearings instead of whatever was in the scrap bin. Rolls like it means it now.',
  },
  {
    itemId: 'board_3',
    name: 'Motorized Deck',
    basePrice: 380,
    category: 'gear',
    effect: 'A salvaged motor bolted where your back foot goes. You steer; it does the work.',
  },
  {
    itemId: 'board_4',
    name: 'Prototype Hoverboard',
    basePrice: 600,
    category: 'gear',
    effect: 'Three inches of clearance and a whine that never quite stops. Unstable. Also: it works.',
  },
  {
    itemId: 'board_5',
    name: 'The Hoverboard',
    basePrice: 900,
    category: 'gear',
    effect: 'Whatever was wrong with the prototype, it isn’t wrong anymore. Bellhaven has never seen you move like this.',
  },
  /*
   * The deck line — the same "own the next tier, not the last one" shape as
   * the board. Each tier isn't just faster puzzles: it's what the rig can
   * physically reach (`systems/market.ts` `deckTier`, `systems/streethacks.ts`
   * `HACK_KIND_MIN_TIER`) — a burner deck can tap a payphone line and
   * nothing else, whatever the player's own hacking skill says.
   */
  {
    itemId: 'cyberdeck_1',
    name: 'Burner Deck',
    basePrice: 150,
    category: 'gear',
    effect: 'Reads a payphone line. That’s the whole feature list, and it’s enough to start.',
  },
  {
    itemId: 'cyberdeck_2',
    name: 'Patched Deck',
    basePrice: 260,
    category: 'gear',
    effect: 'Enough current behind it to talk to a kiosk ATM without frying either of you.',
  },
  {
    itemId: 'cyberdeck_3',
    name: 'Cracked Deck',
    basePrice: 420,
    category: 'gear',
    effect: 'Reads a FLACK housing now, not just a call box. Helio’s own network, from the outside.',
  },
  {
    itemId: 'cyberdeck_4',
    name: 'Ghost Deck',
    basePrice: 650,
    category: 'gear',
    effect: 'Quiet enough to sit inside a building’s own systems without it noticing you’re there.',
  },
  {
    itemId: 'cyberdeck_5',
    name: 'The Cyberdeck',
    basePrice: 950,
    category: 'gear',
    effect: 'Everything the last four builds were practice for. Whatever still has a chip in it, this reads it.',
  },
  /*
   * Physical tools — the first layer, before the deck ever gets to do
   * anything. `systems/streethacks.ts` (`HACK_KIND_TOOL`) and
   * `systems/materials.ts` (`canSabotage`) both check ownership alongside
   * the deck's own tier: a Cracked Deck can read a FLACK housing all it
   * wants, but the housing's still bolted to the pole until something cuts
   * it loose. Ordinary hardware-store gear, not built from salvage — a
   * screwdriver isn't a project.
   */
  {
    itemId: 'screwdriver',
    name: 'Screwdriver',
    basePrice: 15,
    category: 'gear',
    effect: 'Opens whatever four screws were holding shut. A payphone box, mostly.',
  },
  {
    itemId: 'pry_bar',
    name: 'Pry Bar',
    basePrice: 30,
    category: 'gear',
    effect: 'For the panel that four screws won’t open. An ATM fascia, mostly.',
  },
  {
    itemId: 'bolt_cutters',
    name: 'Bolt Cutters',
    basePrice: 50,
    category: 'gear',
    effect: 'Through a mounting bracket, a padlock, a fence — whatever’s between you and a FLACK housing.',
  },
  {
    itemId: 'lockpick_set',
    name: 'Lockpick Set',
    basePrice: 70,
    category: 'gear',
    effect: 'The actual door, not the box bolted to the outside of it. Building systems start here.',
  },
];

export const ITEMS_BY_ID: Record<string, GoodsItem> = Object.fromEntries(
  ITEMS.map((i) => [i.itemId, i]),
);

/**
 * Which item each mechanical hook looks for. The systems that care read these
 * constants rather than string literals, so a rename is one edit and a typo is
 * a type error instead of a silently dead effect.
 */
export const BURNER_PHONE = 'burner_phone';
export const CLEAN_SIM = 'clean_sim';
export const FORGED_ID = 'forged_id';
export const INTEL_TIP = 'intel_tip';
/** Ordered low to high — index 0 is tier 1. `systems/market.ts`'s
 * `boardTier`/`deckTier` read these to find the highest tier currently owned. */
export const BOARD_TIERS = ['board_1', 'board_2', 'board_3', 'board_4', 'board_5'] as const;
export const DECK_TIERS = ['cyberdeck_1', 'cyberdeck_2', 'cyberdeck_3', 'cyberdeck_4', 'cyberdeck_5'] as const;

/** Physical tools — the first layer a hack needs, before the deck's own
 * tier gets a say. See `systems/streethacks.ts` `HACK_KIND_TOOL`. */
export const SCREWDRIVER = 'screwdriver';
export const PRY_BAR = 'pry_bar';
export const BOLT_CUTTERS = 'bolt_cutters';
export const LOCKPICK_SET = 'lockpick_set';

/** Heat a burner takes off a digital job. Small: it's an edge, not a bypass. */
export const BURNER_HEAT_RELIEF = 2;

export type EventScope =
  | { kind: 'category'; category: ItemCategory }
  | { kind: 'item'; itemId: string }
  | { kind: 'all' };

export interface MarketEventDef {
  eventId: string;
  /** Shown in the ticker. Short, in the market's own voice. */
  ticker: string;
  /** Multiplier applied to everything inside the instance's scope. */
  multiplier: number;
  /** Days it runs for, rolled inside the band. */
  duration: [number, number];
  defaultScope: EventScope;
  /**
   * A second, narrower effect that rides along with the same instance —
   * module 03's crackdown pushes gear hard and intel gently.
   */
  also?: { scope: EventScope; multiplier: number };
  /** Vendors go dark: some listings vanish entirely while this runs. */
  removesListings?: ItemCategory;
}

/**
 * Module 03's event table. The trigger conditions live with the systems that
 * can observe them (a sabotage success is only visible to `resolveRun`); what
 * an event *does* lives here.
 */
export const MARKET_EVENTS: Record<string, MarketEventDef> = {
  crackdown_downtown: {
    eventId: 'crackdown_downtown',
    ticker: 'Downtown crackdown — gear up, everyone’s twitchy',
    multiplier: 1.4,
    duration: [3, 5],
    defaultScope: { kind: 'category', category: 'gear' },
    also: { scope: { kind: 'category', category: 'intel' }, multiplier: 1.2 },
  },
  datacenter_hit_surplus: {
    eventId: 'datacenter_hit_surplus',
    ticker: 'Somebody emptied a rack — salvage everywhere, gear cheap',
    multiplier: 0.7,
    duration: [2, 4],
    defaultScope: { kind: 'category', category: 'gear' },
  },
  informant_burned: {
    eventId: 'informant_burned',
    ticker: 'Somebody got named. Nobody’s talking, and talk costs',
    multiplier: 1.6,
    duration: [4, 6],
    defaultScope: { kind: 'category', category: 'intel' },
    removesListings: 'intel',
  },
  market_raid: {
    eventId: 'market_raid',
    ticker: 'Half the lot didn’t show tonight',
    multiplier: 1.25,
    duration: [1, 2],
    defaultScope: { kind: 'all' },
    removesListings: 'gear',
  },
  resistance_shipment: {
    eventId: 'resistance_shipment',
    ticker: 'A box came in from somewhere. No questions, low prices',
    multiplier: 0.75,
    duration: [1, 2],
    defaultScope: { kind: 'category', category: 'gear' },
  },
};

/** The in-fiction crypto. Kept light on purpose — it isn't a second minigame. */
export const SHDW = {
  asset: 'SHDW',
  name: 'Shadow',
  basePrice: 3.2,
  /** How far the rate can wander per day, as a fraction. */
  drift: 0.12,
} as const;
