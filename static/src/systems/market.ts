import type {
  AcquiredVia,
  ActiveConsumable,
  ItemCategory,
  MarketEventInstance,
  SaveState,
  ThresholdTier,
} from '../state/schema';
import {
  BOARD_TIERS,
  BURNER_HEAT_RELIEF,
  BURNER_PHONE,
  DECK_TIERS,
  DRONE_TOOL_TIERS,
  GPS_TIERS,
  ITEMS,
  PLAYER_DRONE_TIERS,
  ITEMS_BY_ID,
  MARKET_EVENTS,
  SHDW,
  type EventScope,
  type GoodsItem,
} from '../content/economy';
import { mulberry32, seedFrom } from './rng';
import { hasSafehouse, hasUpgrade, install } from './safehouse';

/**
 * The black market (module 03, Part A) plus the SHDW layer (Part B's player
 * half). Pure functions over the save, same as heat.ts and missions.ts — the
 * market screen renders what these return and dispatches the results back.
 *
 * The design intent this file is built for: the market should be worth poking
 * at outside a story mission. That only works if prices *move* for reasons the
 * player can read, so every multiplier here is legible and every event that
 * applies one is announced in the ticker. Nothing moves a price silently.
 */

/** Vendors price in their own risk of dealing with a hot customer (module 03). */
export const HEAT_MULTIPLIER: Record<ThresholdTier, number> = {
  clear: 1.0,
  watched: 1.1,
  flagged: 1.3,
  hunted: 1.6,
};

/** Nothing is ever free and nothing is ever absurd (module 03's sane band). */
export const PRICE_FLOOR_MULTIPLE = 0.5;
export const PRICE_CEILING_MULTIPLE = 2.5;

/** What the market pays for something you're selling back. */
export const RESALE_FRACTION = 0.6;

const round = (n: number) => Math.max(1, Math.round(n));

function inScope(item: GoodsItem, scope: EventScope): boolean {
  if (scope.kind === 'all') return true;
  if (scope.kind === 'category') return item.category === scope.category;
  return item.itemId === scope.itemId;
}

/** Live events, after anything that has run its course is dropped. */
export function activeEvents(save: SaveState): MarketEventInstance[] {
  return save.economy.marketState.activeEvents.filter((e) => save.world.day < e.expiresOnDay);
}

/**
 * Product of every live event touching this item. Compounding rather than
 * taking the largest: two things happening at once to the same category is
 * exactly the situation the player is meant to notice and act on.
 */
export function eventMultiplier(save: SaveState, itemId: string): number {
  const item = ITEMS_BY_ID[itemId];
  if (!item) return 1;
  return activeEvents(save).reduce((mult, instance) => {
    const def = MARKET_EVENTS[instance.eventId];
    if (!def) return mult;
    let m = mult;
    if (inScope(item, instance.scope)) m *= def.multiplier;
    if (def.also && inScope(item, def.also.scope)) m *= def.also.multiplier;
    return m;
  }, 1);
}

/**
 * `basePrice * eventMultiplier * heatMultiplier`, clamped to the band.
 *
 * Banded goods (intel) get a per-day roll inside their band first, so the tip
 * on the table tonight isn't the same tip as yesterday's. Seeded on the day and
 * the item, so it's stable for as long as the player is looking at it and
 * different tomorrow — a price that changed while you read it would make the
 * whole screen untrustworthy.
 */
export function priceOf(save: SaveState, itemId: string): number {
  const item = ITEMS_BY_ID[itemId];
  if (!item) return 0;

  let base = item.basePrice;
  if (item.priceBand) {
    const [low, high] = item.priceBand;
    const roll = mulberry32(seedFrom(`${itemId}:${save.world.day}`))();
    base = low + roll * (high - low);
  }

  const raw = base * eventMultiplier(save, itemId) * HEAT_MULTIPLIER[save.heat.threshold_tier];
  return round(
    Math.min(
      item.basePrice * PRICE_CEILING_MULTIPLE,
      Math.max(item.basePrice * PRICE_FLOOR_MULTIPLE, raw),
    ),
  );
}

/** Up, down or level against the item's own base — the arrow on the listing. */
export function priceDirection(save: SaveState, itemId: string): 'up' | 'down' | 'level' {
  const item = ITEMS_BY_ID[itemId];
  if (!item) return 'level';
  const price = priceOf(save, itemId);
  if (price > item.basePrice * 1.05) return 'up';
  if (price < item.basePrice * 0.95) return 'down';
  return 'level';
}

export function resaleValue(save: SaveState, itemId: string): number {
  return round(priceOf(save, itemId) * RESALE_FRACTION);
}

/**
 * Why a listing isn't buyable, or null if it is. One function so the market
 * screen never has to decide for itself, and so the reason is always shown
 * rather than the button just being dead.
 */
export function unavailableReason(save: SaveState, itemId: string): string | null {
  const item = ITEMS_BY_ID[itemId];
  if (!item) return 'Not stocked.';

  /*
   * Safehouse goods are for a place, and for most of the game there isn't one.
   * This used to be a static string on the catalog entry; it is a real check
   * now that safehouses exist, so the same listing goes from "nowhere to put
   * it" to buyable to "already in" without anybody editing content.
   */
  if (item.category === 'safehouse') {
    if (!hasSafehouse(save)) return 'Nowhere to put it yet.';
    if (hasUpgrade(save, itemId)) return 'Already in.';
  }

  for (const instance of activeEvents(save)) {
    const def = MARKET_EVENTS[instance.eventId];
    if (def?.removesListings && def.removesListings === item.category) {
      return 'Nobody’s selling this tonight.';
    }
  }
  // Module 02: vendor inventory thins at flagged+, independently of price.
  if (save.heat.threshold_tier === 'hunted' && item.category === 'gear' && item.basePrice >= 120) {
    return 'Not to you. Not this week.';
  }
  if (priceOf(save, itemId) > save.economy.cashOnHand) return 'You can’t afford it.';
  return null;
}

export function canBuy(save: SaveState, itemId: string): boolean {
  return unavailableReason(save, itemId) === null;
}

export function quantityOf(save: SaveState, itemId: string): number {
  return save.economy.inventory.find((i) => i.itemId === itemId)?.quantity ?? 0;
}

export function owns(save: SaveState, itemId: string): boolean {
  return quantityOf(save, itemId) > 0;
}

/**
 * Highest tier owned in an ordered trade-up line (`BOARD_TIERS`/`DECK_TIERS`,
 * content/economy.ts) — 0 if none. Each upgrade recipe consumes the tier
 * below it, so a player can never hold two at once in practice, but this
 * takes the max rather than assuming that to stay correct even if a save
 * somehow ends up holding more than one (a hand-edited save, a future
 * gifting path — cheap insurance against a assumption nothing enforces at
 * the type level).
 */
function highestTierOwned(save: SaveState, tiers: readonly string[]): number {
  let highest = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (owns(save, tiers[i])) highest = i + 1;
  }
  return highest;
}

/** Walking (0) up to the Hoverboard (5). Drives both the movement speed
 * multiplier (Overworld.tsx) and the board sprite drawn under the player's
 * feet (world/draw.ts). */
export function boardTier(save: SaveState): number {
  return highestTierOwned(save, BOARD_TIERS);
}

/** No deck (0) up to the Cyberdeck (5). Gates which *kind* of target a hack
 * can even reach (`systems/streethacks.ts` `HACK_KIND_MIN_TIER`) — a
 * separate axis from the Quick/Standard/Deep level picked once a target is
 * actually in reach. */
export function deckTier(save: SaveState): number {
  return highestTierOwned(save, DECK_TIERS);
}

/** No GPS (0) up to the Ghost Positioning Rig (3) — a separate axis from
 * the deck's own tier: what the map screen and the minimap draw as
 * `explored` while it's carried (`world/exploration.ts`
 * `GPS_REVEAL_RADIUS`), not what the player can do once they get there. */
export function gpsTier(save: SaveState): number {
  return highestTierOwned(save, GPS_TIERS);
}

/** No tool (0) up to the EMP Gun (3) — what a drone encounter turns into,
 * not just how loudly it goes (`world/drones.ts`). */
export function droneToolTier(save: SaveState): number {
  return highestTierOwned(save, DRONE_TOOL_TIERS);
}

/** No drone (0) up to the Strike Drone (3) — the player's own airframe,
 * not the tool used against FLACK's. Decides how forgiving a flight is,
 * not whether a recon or kamikaze run can be attempted at all
 * (`world/playerdrone.ts`). */
export function playerDroneTier(save: SaveState): number {
  return highestTierOwned(save, PLAYER_DRONE_TIERS);
}

/** Adds to inventory, merging with an existing stack. Also the reward path. */
export function grantItem(
  save: SaveState,
  itemId: string,
  quantity = 1,
  via: AcquiredVia = 'purchase',
): SaveState {
  const existing = save.economy.inventory.find((i) => i.itemId === itemId);
  const inventory = existing
    ? save.economy.inventory.map((i) =>
        i.itemId === itemId ? { ...i, quantity: i.quantity + quantity } : i,
      )
    : [...save.economy.inventory, { itemId, quantity, acquiredVia: via }];
  return { ...save, economy: { ...save.economy, inventory } };
}

export function removeItem(save: SaveState, itemId: string, quantity = 1): SaveState {
  const inventory = save.economy.inventory
    .map((i) => (i.itemId === itemId ? { ...i, quantity: i.quantity - quantity } : i))
    .filter((i) => i.quantity > 0);
  return { ...save, economy: { ...save.economy, inventory } };
}

export function addCash(save: SaveState, delta: number): SaveState {
  return {
    ...save,
    economy: { ...save.economy, cashOnHand: Math.max(0, save.economy.cashOnHand + delta) },
  };
}

/**
 * Buy one. Returns the save unchanged if it isn't buyable — the caller has
 * already been told why by `unavailableReason`, and a purchase that silently
 * half-happens is worse than one that doesn't.
 */
export function buy(save: SaveState, itemId: string): SaveState {
  if (!canBuy(save, itemId)) return save;
  const paid = addCash(save, -priceOf(save, itemId));
  // You cannot carry a power rig around. Safehouse goods are installed where
  // they belong rather than sitting in a bag doing nothing.
  const item = ITEMS_BY_ID[itemId];
  return refreshPrices(
    item.category === 'safehouse' ? install(paid, itemId) : grantItem(paid, itemId),
  );
}

export function sell(save: SaveState, itemId: string): SaveState {
  if (!owns(save, itemId)) return save;
  return refreshPrices(removeItem(addCash(save, resaleValue(save, itemId)), itemId));
}

/**
 * Use a consumable that acts over time rather than at a moment (`clean_sim`).
 * Spent from inventory immediately and recorded as active until tomorrow —
 * the item is gone either way, which is what makes the timing a real choice.
 */
export function useConsumable(save: SaveState, itemId: string): SaveState {
  const item = ITEMS_BY_ID[itemId];
  if (!item?.lastsUntilNextDay || !owns(save, itemId)) return save;
  const spent = removeItem(save, itemId);
  const activeConsumables: ActiveConsumable[] = [
    ...spent.economy.activeConsumables.filter((c) => c.itemId !== itemId),
    { itemId, expiresOnDay: save.world.day + 1 },
  ];
  return { ...spent, economy: { ...spent.economy, activeConsumables } };
}

export function consumableActive(save: SaveState, itemId: string): boolean {
  return save.economy.activeConsumables.some(
    (c) => c.itemId === itemId && save.world.day < c.expiresOnDay,
  );
}

/**
 * The cached snapshot in `marketState.prices`. Derived, and written here so a
 * save file is readable on its own; nothing reads it to make a decision.
 */
export function refreshPrices(save: SaveState): SaveState {
  const prices: Record<string, number> = {};
  for (const item of ITEMS) prices[item.itemId] = priceOf(save, item.itemId);
  prices[SHDW.asset] = shdwRate(save);
  return {
    ...save,
    economy: { ...save.economy, marketState: { ...save.economy.marketState, prices } },
  };
}

/**
 * Start an event. Idempotent per event id — a second crackdown while one is
 * running extends nothing and stacks nothing, it's already crackdown weather.
 */
export function startEvent(save: SaveState, eventId: string, scope?: EventScope): SaveState {
  const def = MARKET_EVENTS[eventId];
  if (!def) return save;
  if (activeEvents(save).some((e) => e.eventId === eventId)) return save;

  const [minDays, maxDays] = def.duration;
  const roll = mulberry32(seedFrom(`${eventId}:${save.world.day}`))();
  const days = minDays + Math.floor(roll * (maxDays - minDays + 1));

  const instance: MarketEventInstance = {
    eventId,
    startedOnDay: save.world.day,
    expiresOnDay: save.world.day + days,
    scope: scope ?? def.defaultScope,
  };

  return refreshPrices({
    ...save,
    economy: {
      ...save.economy,
      marketState: {
        ...save.economy.marketState,
        activeEvents: [...activeEvents(save), instance],
      },
    },
  });
}

/**
 * Housekeeping for a new day: expired events and spent consumables drop off,
 * and the ambient raid gets its roll. Called from the one place that advances
 * the clock, so nothing can advance the day and forget to age the market.
 */
export function tickMarket(save: SaveState): SaveState {
  const cleaned: SaveState = {
    ...save,
    economy: {
      ...save.economy,
      marketState: { ...save.economy.marketState, activeEvents: activeEvents(save) },
      activeConsumables: save.economy.activeConsumables.filter(
        (c) => save.world.day < c.expiresOnDay,
      ),
    },
  };
  return refreshPrices(rollRaid(cleaned));
}

/**
 * `market_raid` is the one event with no author behind it — module 03 rolls it
 * randomly, weighted by Heat, and only at flagged+. Seeded on the day so a
 * reload can't reroll it.
 */
export function rollRaid(save: SaveState): SaveState {
  const tier = save.heat.threshold_tier;
  if (tier !== 'flagged' && tier !== 'hunted') return save;
  const chance = tier === 'hunted' ? 0.3 : 0.15;
  const roll = mulberry32(seedFrom(`market_raid:${save.world.day}`))();
  return roll < chance ? startEvent(save, 'market_raid') : save;
}

/**
 * Events a finished mission sets off. Module 03 hangs two of its five triggers
 * on sabotage outcomes, which is the loop the whole market runs on: the player
 * moves a price by doing the thing the story asked them to do.
 */
export function eventsFromRun(kind: string, outcome: string, skinId?: string): string[] {
  if (kind !== 'sabotage') return [];
  if (outcome === 'failed' || outcome === 'aborted') return [];
  const events = ['crackdown_downtown'];
  if (skinId === 'datacenter') events.push('datacenter_hit_surplus');
  return events;
}

/**
 * SHDW: a store of value and a laundering vector, deliberately not a
 * minigame. `shdwRateOnDay` takes the day as a parameter — still seeded, so a
 * reload can't reroll any single day — so the Shadow app can look a few days
 * back and draw a trend line without that history ever being stored.
 */
export function shdwRateOnDay(save: SaveState, day: number): number {
  const wander = mulberry32(seedFrom(`shdw:${day}`))() * 2 - 1;
  const heat = HEAT_MULTIPLIER[save.heat.threshold_tier];
  const rate = SHDW.basePrice * (1 + wander * SHDW.drift) * heat;
  return Math.round(rate * 100) / 100;
}

export function shdwRate(save: SaveState): number {
  return shdwRateOnDay(save, save.world.day);
}

/** Up, down or level against yesterday's rate — the arrow on the Shadow app. */
export function shdwDirection(save: SaveState): 'up' | 'down' | 'level' {
  if (save.world.day <= 1) return 'level';
  const prev = shdwRateOnDay(save, save.world.day - 1);
  const now = shdwRate(save);
  if (now > prev * 1.02) return 'up';
  if (now < prev * 0.98) return 'down';
  return 'level';
}

export function shdwHeld(save: SaveState): number {
  return save.economy.cryptoWallets.find((w) => w.asset === SHDW.asset)?.amount ?? 0;
}

function setShdw(save: SaveState, amount: number): SaveState {
  const others = save.economy.cryptoWallets.filter((w) => w.asset !== SHDW.asset);
  const cryptoWallets = amount > 0 ? [...others, { asset: SHDW.asset, amount }] : others;
  return { ...save, economy: { ...save.economy, cryptoWallets } };
}

/** Adds (or, with a negative delta, spends) SHDW directly — the write side
 * `systems/materials.ts` needs for selling salvage without duplicating the
 * wallet's own merge-or-drop logic. */
export function addShdw(save: SaveState, delta: number): SaveState {
  return setShdw(save, Math.max(0, shdwHeld(save) + delta));
}

/** Buys as much SHDW as `cash` covers, to four decimal places. */
export function buyShdw(save: SaveState, cash: number): SaveState {
  const spend = Math.min(cash, save.economy.cashOnHand);
  if (spend <= 0) return save;
  const amount = Math.round((spend / shdwRate(save)) * 10000) / 10000;
  return setShdw(addCash(save, -spend), shdwHeld(save) + amount);
}

export function sellShdw(save: SaveState, amount: number): SaveState {
  const held = shdwHeld(save);
  const sold = Math.min(amount, held);
  if (sold <= 0) return save;
  return setShdw(addCash(save, Math.round(sold * shdwRate(save))), held - sold);
}

/** Cash plus holdings at today's rate — what the market screen calls "worth". */
export function netWorth(save: SaveState): number {
  return Math.round(save.economy.cashOnHand + shdwHeld(save) * shdwRate(save));
}

export function tickerLines(save: SaveState): { eventId: string; text: string; endsInDays: number }[] {
  return activeEvents(save).map((e) => ({
    eventId: e.eventId,
    text: MARKET_EVENTS[e.eventId]?.ticker ?? e.eventId,
    endsInDays: e.expiresOnDay - save.world.day,
  }));
}

export function categoryLabel(category: ItemCategory): string {
  return category === 'gear' ? 'Gear' : category === 'intel' ? 'Word going round' : 'For a place';
}

/**
 * The burner's discount on a digital job (module 03: "reduces Heat gain from
 * digital actions while active"). It lives here rather than in `missions.ts`
 * so the Heat table stays the only thing that file knows, and so the briefing
 * and the charge read the same number from the same place — a discount the
 * player wasn't shown would break Heat guardrail 2 as surely as a hidden cost.
 */
export function heatReliefFor(save: SaveState, kind: string): number {
  if (kind !== 'hacking') return 0;
  return owns(save, BURNER_PHONE) ? BURNER_HEAT_RELIEF : 0;
}
