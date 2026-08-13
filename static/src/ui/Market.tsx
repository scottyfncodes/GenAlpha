import { useState } from 'react';
import { useGame, useSave } from '../state/GameContext';
import { ITEMS } from '../content/economy';
import {
  categoryLabel,
  netWorth,
  priceDirection,
  priceOf,
  quantityOf,
  resaleValue,
  shdwHeld,
  tickerLines,
  unavailableReason,
} from '../systems/market';
import type { ItemCategory } from '../state/schema';
import './market.css';

/**
 * The market (module 03's UI notes, and module 07's).
 *
 * "A scrappy resistance-run trading app, not a polished stock ticker." This is
 * the screen where the two-language system does its most pointed work: it is
 * displaying numbers, which is the most Language A thing a screen can do, and
 * it has to refuse to look neutral while doing it. Money in this game is never
 * neutral, so it doesn't get a neutral typeface.
 *
 * Everything here reads from `systems/market.ts`. This component computes no
 * price and decides no availability — if a button is disabled, the reason came
 * from `unavailableReason` and is printed next to it. Never a dead button.
 */
const ORDER: ItemCategory[] = ['gear', 'intel', 'safehouse'];

/** The reducer's action union isn't exported; this is the honest way to name it. */
type MarketAction = Parameters<ReturnType<typeof useGame>['dispatch']>[0];

export function Market({ onClose }: { onClose: () => void }) {
  const save = useSave();
  const { dispatch } = useGame();
  const [note, setNote] = useState<string | null>(null);
  const events = tickerLines(save);

  const act = (action: MarketAction, said: string) => {
    dispatch(action);
    setNote(said);
  };

  return (
    <div className="market lang-b" role="dialog" aria-label="Silk Road">
      <header className="market__head">
        <div>
          <p className="market__eyebrow">Built goods, no questions</p>
          <h2 className="market__title">Silk Road 🐪</h2>
        </div>
        <button className="market__close" onClick={onClose}>
          Done
        </button>
      </header>

      <div className="market__purse">
        <span className="market__cash">${save.economy.cashOnHand}</span>
        {shdwHeld(save) > 0 && (
          <span className="market__worth">worth ${netWorth(save)} with the SHDW</span>
        )}
      </div>

      {/*
        The ticker. Module 03: events must be visible, or pricing is noise
        instead of a system. This is the whole reason the market is worth
        opening on a day nothing is happening.
      */}
      <ul className="market__ticker">
        {events.length === 0 && <li className="market__quiet">Quiet week. Prices are what they are.</li>}
        {events.map((e) => (
          <li key={e.eventId}>
            <span>{e.text}</span>
            <em>{e.endsInDays === 1 ? 'gone tomorrow' : `${e.endsInDays} days`}</em>
          </li>
        ))}
      </ul>

      {note && <p className="market__note">{note}</p>}

      {ORDER.map((category) => (
        <section key={category} className="market__section">
          <h3 className="market__section-title">{categoryLabel(category)}</h3>
          <ul className="market__list">
            {ITEMS.filter((i) => i.category === category).map((item) => {
              const price = priceOf(save, item.itemId);
              const dir = priceDirection(save, item.itemId);
              const held = quantityOf(save, item.itemId);
              const reason = unavailableReason(save, item.itemId);
              return (
                <li key={item.itemId} className="market__row">
                  <div className="market__row-head">
                    <b>{item.name}</b>
                    <span className={`market__price market__price--${dir}`}>
                      ${price}
                      <i aria-hidden>{dir === 'up' ? '▲' : dir === 'down' ? '▼' : '·'}</i>
                    </span>
                  </div>
                  <p className="market__effect">{item.effect}</p>
                  {held > 0 && <p className="market__held">You have {held}.</p>}

                  <div className="market__row-actions">
                    <button
                      disabled={Boolean(reason)}
                      onClick={() => act({ type: 'BUY_ITEM', itemId: item.itemId }, `Bought a ${item.name.toLowerCase()} for $${price}.`)}
                    >
                      Buy
                    </button>
                    {held > 0 && (
                      <button
                        onClick={() =>
                          act(
                            { type: 'SELL_ITEM', itemId: item.itemId },
                            `Sold it back for $${resaleValue(save, item.itemId)}. She didn't ask why.`,
                          )
                        }
                      >
                        Sell · ${resaleValue(save, item.itemId)}
                      </button>
                    )}
                    {held > 0 && item.lastsUntilNextDay && (
                      <button
                        onClick={() =>
                          act(
                            { type: 'USE_CONSUMABLE', itemId: item.itemId },
                            'In the phone. Good until tomorrow.',
                          )
                        }
                      >
                        Use now
                      </button>
                    )}
                    {/* Always the reason, never a silently dead control. */}
                    {reason && <span className="market__reason">{reason}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
