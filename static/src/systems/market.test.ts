import { describe, expect, it } from 'vitest';
import { createNewSave } from '../state/defaults';
import type { SaveState } from '../state/schema';
import { ITEMS, ITEMS_BY_ID, MARKET_EVENTS } from '../content/economy';
import {
  HEAT_MULTIPLIER,
  PRICE_CEILING_MULTIPLE,
  PRICE_FLOOR_MULTIPLE,
  activeEvents,
  buy,
  buyShdw,
  canBuy,
  consumableActive,
  eventsFromRun,
  heatReliefFor,
  netWorth,
  owns,
  priceOf,
  quantityOf,
  refreshPrices,
  sell,
  sellShdw,
  shdwHeld,
  startEvent,
  tickMarket,
  unavailableReason,
  useConsumable,
} from './market';
import { tierFor } from './heat';

const rich = (cash = 1000): SaveState => {
  const save = createNewSave('Wren');
  return { ...save, economy: { ...save.economy, cashOnHand: cash } };
};

const atHeat = (save: SaveState, current: number): SaveState => ({
  ...save,
  heat: { ...save.heat, current, threshold_tier: tierFor(current) },
});

const onDay = (save: SaveState, day: number): SaveState => ({
  ...save,
  world: { ...save.world, day },
});

describe('the catalog', () => {
  it('has a unique id per item', () => {
    const ids = ITEMS.map((i) => i.itemId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('prices everything above zero, so nothing is accidentally free', () => {
    for (const item of ITEMS) expect(item.basePrice).toBeGreaterThan(0);
  });

  /*
   * A banded item's base price has to sit inside its own band, or the arrow on
   * the listing lies: every roll would read as "up" or "down" against a base
   * the item never actually trades at.
   */
  it('keeps a banded item’s base price inside its band', () => {
    for (const item of ITEMS.filter((i) => i.priceBand)) {
      const [low, high] = item.priceBand!;
      expect(item.basePrice).toBeGreaterThanOrEqual(low);
      expect(item.basePrice).toBeLessThanOrEqual(high);
    }
  });

  it('gives every event a definition the ticker can render', () => {
    for (const [key, def] of Object.entries(MARKET_EVENTS)) {
      expect(def.eventId).toBe(key);
      expect(def.ticker.length).toBeGreaterThan(0);
      expect(def.duration[0]).toBeLessThanOrEqual(def.duration[1]);
    }
  });
});

describe('pricing', () => {
  it('charges base price in a quiet week at clear Heat', () => {
    expect(priceOf(rich(), 'burner_phone')).toBe(ITEMS_BY_ID.burner_phone.basePrice);
  });

  /** Vendors price in their own risk of dealing with a hot customer. */
  it('rises with Heat tier, monotonically', () => {
    const base = rich();
    const prices = [0, 30, 60, 90].map((h) => priceOf(atHeat(base, h), 'burner_phone'));
    expect(prices[1]).toBeGreaterThan(prices[0]);
    expect(prices[2]).toBeGreaterThan(prices[1]);
    expect(prices[3]).toBeGreaterThan(prices[2]);
    expect(prices[3]).toBe(Math.round(45 * HEAT_MULTIPLIER.hunted));
  });

  it('moves a whole category when an event says so', () => {
    const before = priceOf(rich(), 'burner_phone');
    const after = priceOf(startEvent(rich(), 'crackdown_downtown'), 'burner_phone');
    expect(after).toBeGreaterThan(before);
  });

  it('cuts prices on a surplus, which is the buy-low half of the loop', () => {
    const after = startEvent(rich(), 'datacenter_hit_surplus');
    expect(priceOf(after, 'burner_phone')).toBeLessThan(priceOf(rich(), 'burner_phone'));
  });

  /**
   * The clamp is what stops the systems-toy becoming a joke: nothing is ever
   * free and nothing is ever absurd, however many multipliers stack up.
   */
  it('never leaves the sane band, however much is stacked on', () => {
    let save = atHeat(rich(), 90);
    save = startEvent(save, 'crackdown_downtown');
    save = startEvent(save, 'market_raid');
    for (const item of ITEMS) {
      const price = priceOf(save, item.itemId);
      expect(price).toBeLessThanOrEqual(Math.round(item.basePrice * PRICE_CEILING_MULTIPLE));
      expect(price).toBeGreaterThanOrEqual(Math.round(item.basePrice * PRICE_FLOOR_MULTIPLE));
    }
  });

  it('holds a banded price steady within a day and rerolls the next', () => {
    const save = rich();
    expect(priceOf(save, 'intel_tip')).toBe(priceOf(save, 'intel_tip'));
    const later = [2, 3, 4, 5, 6].map((d) => priceOf(onDay(save, d), 'intel_tip'));
    expect(new Set(later).size).toBeGreaterThan(1);
  });
});

describe('events over time', () => {
  it('expires an event once its days have run', () => {
    const started = startEvent(rich(), 'crackdown_downtown');
    const [live] = started.economy.marketState.activeEvents;
    expect(activeEvents(started)).toHaveLength(1);
    expect(activeEvents(onDay(started, live.expiresOnDay))).toHaveLength(0);
  });

  it('returns the price to base once the event is over', () => {
    const started = startEvent(rich(), 'crackdown_downtown');
    const [live] = started.economy.marketState.activeEvents;
    const after = tickMarket(onDay(started, live.expiresOnDay));
    expect(priceOf(after, 'burner_phone')).toBe(ITEMS_BY_ID.burner_phone.basePrice);
    expect(after.economy.marketState.activeEvents).toEqual([]);
  });

  it('does not stack a second copy of an event already running', () => {
    const once = startEvent(rich(), 'crackdown_downtown');
    const twice = startEvent(once, 'crackdown_downtown');
    expect(activeEvents(twice)).toHaveLength(1);
    expect(priceOf(twice, 'burner_phone')).toBe(priceOf(once, 'burner_phone'));
  });

  it('takes listings off the table entirely when an informant burns', () => {
    const save = startEvent(rich(), 'informant_burned');
    expect(unavailableReason(save, 'intel_tip')).toBe('Nobody’s selling this tonight.');
    expect(canBuy(save, 'intel_tip')).toBe(false);
    // Gear is untouched — an event's scope is the whole point of recording it.
    expect(canBuy(save, 'burner_phone')).toBe(true);
  });

  /** Module 03 hangs two of five triggers on sabotage outcomes; hacking moves nothing. */
  it('fires events off clean sabotage and nothing else', () => {
    expect(eventsFromRun('sabotage', 'clean')).toContain('crackdown_downtown');
    expect(eventsFromRun('sabotage', 'clean', 'datacenter')).toContain('datacenter_hit_surplus');
    expect(eventsFromRun('sabotage', 'failed')).toEqual([]);
    expect(eventsFromRun('hacking', 'clean')).toEqual([]);
  });
});

describe('buying and selling', () => {
  it('takes the money and hands over the goods', () => {
    const save = buy(rich(100), 'burner_phone');
    expect(save.economy.cashOnHand).toBe(55);
    expect(quantityOf(save, 'burner_phone')).toBe(1);
  });

  it('refuses rather than half-completing when the money isn’t there', () => {
    const broke = rich(10);
    expect(unavailableReason(broke, 'burner_phone')).toBe('You can’t afford it.');
    expect(buy(broke, 'burner_phone')).toEqual(broke);
  });

  it('never sells something that isn’t owned', () => {
    const save = rich(0);
    expect(sell(save, 'burner_phone')).toEqual(save);
  });

  it('pays less on resale than it charged — the table is not a bank', () => {
    const bought = buy(rich(100), 'burner_phone');
    const sold = sell(bought, 'burner_phone');
    expect(sold.economy.cashOnHand).toBeLessThan(100);
    expect(owns(sold, 'burner_phone')).toBe(false);
  });

  it('lists the safehouse upgrades with the reason showing, not silently dead', () => {
    const reason = unavailableReason(rich(), 'safehouse_upgrade_lock');
    expect(reason).toBe('Nowhere to put it yet.');
  });

  it('thins vendor inventory at hunted, independently of price', () => {
    const hot = atHeat(rich(10000), 90);
    expect(canBuy(hot, 'forged_id')).toBe(false);
    // Cheap gear still moves. Getting hot narrows the market, it doesn't close it.
    expect(canBuy(hot, 'clean_sim')).toBe(true);
  });

  it('caches a price snapshot for every item on refresh', () => {
    const save = refreshPrices(rich());
    for (const item of ITEMS) expect(save.economy.marketState.prices[item.itemId]).toBeGreaterThan(0);
  });
});

describe('consumables that last', () => {
  it('spends the item and stays active until the next day', () => {
    const used = useConsumable(buy(rich(100), 'clean_sim'), 'clean_sim');
    expect(owns(used, 'clean_sim')).toBe(false);
    expect(consumableActive(used, 'clean_sim')).toBe(true);
    expect(consumableActive(onDay(used, 2), 'clean_sim')).toBe(false);
  });

  it('drops the spent record when the day turns', () => {
    const used = useConsumable(buy(rich(100), 'clean_sim'), 'clean_sim');
    expect(tickMarket(onDay(used, 2)).economy.activeConsumables).toEqual([]);
  });

  it('does nothing when the item isn’t held', () => {
    const save = rich();
    expect(useConsumable(save, 'clean_sim')).toEqual(save);
  });
});

describe('gear with mechanical weight', () => {
  it('takes Heat off a digital job only while the burner is carried', () => {
    expect(heatReliefFor(rich(), 'hacking')).toBe(0);
    const carrying = buy(rich(100), 'burner_phone');
    expect(heatReliefFor(carrying, 'hacking')).toBeGreaterThan(0);
    // Physical jobs leave physical evidence; a phone doesn't help.
    expect(heatReliefFor(carrying, 'sabotage')).toBe(0);
  });
});

describe('SHDW', () => {
  it('converts cash into holdings and back without inventing money', () => {
    const bought = buyShdw(rich(100), 100);
    expect(bought.economy.cashOnHand).toBe(0);
    expect(shdwHeld(bought)).toBeGreaterThan(0);
    const sold = sellShdw(bought, shdwHeld(bought));
    expect(shdwHeld(sold)).toBe(0);
    expect(Math.abs(sold.economy.cashOnHand - 100)).toBeLessThanOrEqual(1);
  });

  it('spends only what the player actually has', () => {
    const bought = buyShdw(rich(20), 500);
    expect(bought.economy.cashOnHand).toBe(0);
  });

  it('counts holdings toward net worth', () => {
    const bought = buyShdw(rich(100), 100);
    expect(netWorth(bought)).toBeGreaterThan(90);
  });

  it('drops the wallet entry entirely when the last of it is sold', () => {
    const sold = sellShdw(buyShdw(rich(100), 100), 999);
    expect(sold.economy.cryptoWallets).toEqual([]);
  });
});
