import { useState } from 'react';
import { useGame, useSave } from '../state/GameContext';
import { ITEMS, SILK_ROAD_ITEM_IDS } from '../content/economy';
import { priceDirection, priceOf, quantityOf, resaleValue, unavailableReason } from '../systems/market';
import './market.css';
import './silk-road.css';

/** The reducer's action union isn't exported; this is the honest way to name it. */
type MarketAction = Parameters<ReturnType<typeof useGame>['dispatch']>[0];

/**
 * Silk Road — Aaron's own door, not a second Fenwick Lot. Everything Fenwick
 * Lot sells is the ordinary Wednesday table's own stock; this is the tier
 * that table never carries — `content/economy.ts`'s `SILK_ROAD_ITEM_IDS`,
 * exactly four items, on purpose. No ticker, no weekly events, no browsing
 * five sections — a secret door, not another Walmart. Reuses `market.css`'s
 * own row/list/price classes (same underlying `systems/market.ts` pricing
 * engine, same fiction of a real economy) with a short intro instead of a
 * whole shell, in `silk-road.css`.
 */
export function SilkRoad({ onClose }: { onClose: () => void }) {
  const save = useSave();
  const { dispatch } = useGame();
  const [note, setNote] = useState<string | null>(null);

  const act = (action: MarketAction, said: string) => {
    dispatch(action);
    setNote(said);
  };

  const items = ITEMS.filter((i) => SILK_ROAD_ITEM_IDS.has(i.itemId));

  return (
    <div className="market lang-b silk-road" role="dialog" aria-label="Silk Road">
      <header className="market__head">
        <div>
          <p className="market__eyebrow">Nobody advertises this door</p>
          <h2 className="market__title">Silk Road 🐪</h2>
        </div>
        <button className="market__close" onClick={onClose}>
          Done
        </button>
      </header>

      <p className="silk-road__intro">
        Not the lot. Not Ines. Whoever’s on the other end of this one doesn’t do Wednesdays, doesn’t
        haggle, and doesn’t stock anything that isn’t already the best version of itself.
      </p>

      <div className="market__purse">
        <span className="market__cash">${save.economy.cashOnHand}</span>
      </div>

      {note && <p className="market__note">{note}</p>}

      <ul className="market__list">
        {items.map((item) => {
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
                        `Sold it back for $${resaleValue(save, item.itemId)}.`,
                      )
                    }
                  >
                    Sell · ${resaleValue(save, item.itemId)}
                  </button>
                )}
                {reason && <span className="market__reason">{reason}</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
