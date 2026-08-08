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
