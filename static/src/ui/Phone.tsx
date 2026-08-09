import { useState } from 'react';
import { useGame, useSave } from '../state/GameContext';
import { Market } from './Market';
import { MATERIALS, RECIPES } from '../content/materials';
import { canCraft } from '../systems/materials';
import { quantityOf } from '../systems/market';
import './phone.css';

/**
 * The market, and now the salvage economy, live behind a phone screen instead
 * of only a physical table — per the build note, the market shouldn't have to
 * wait on a story flag to be worth opening. Both apps are exactly the same
 * `systems/market.ts` / `systems/materials.ts` this always was; the phone is
 * a second door into the same room, not a second economy.
 *
 * `.phone__body` carries a `transform`, which — deliberately — gives
 * `Market`'s own `position: fixed` a new containing block. Market fills the
 * phone's screen instead of the whole viewport without a single line of
 * Market's own CSS changing.
 */
type App = 'home' | 'market' | 'salvage';

export function Phone({ onClose }: { onClose: () => void }) {
  const [app, setApp] = useState<App>('home');

  return (
    <div className="phone" role="dialog" aria-label="Phone">
      <div className="phone__body">
        {app === 'market' && <Market onClose={() => setApp('home')} />}
        {app === 'salvage' && <Salvage onBack={() => setApp('home')} />}
        {app === 'home' && (
          <PhoneHome onOpen={setApp} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function PhoneHome({ onOpen, onClose }: { onOpen: (app: App) => void; onClose: () => void }) {
  return (
    <div className="phone__home">
      <div className="phone__statusbar">
        <span>{new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
        <button className="phone__power" onClick={onClose} aria-label="Close phone">
          ⏻
        </button>
      </div>
      <div className="phone__apps">
        <button className="phone__app" onClick={() => onOpen('market')}>
          <span className="phone__app-icon">💱</span>
          <span>The Table</span>
        </button>
        <button className="phone__app" onClick={() => onOpen('salvage')}>
          <span className="phone__app-icon">🔧</span>
          <span>Salvage</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Salvage: sell what you collected for SHDW, or build with it. Not a market —
 * no prices move here, no events touch it. A material is worth a flat amount
 * because it's salvage, not a listing.
 */
function Salvage({ onBack }: { onBack: () => void }) {
  const save = useSave();
  const { dispatch } = useGame();
  const [note, setNote] = useState<string | null>(null);
  const held = MATERIALS.filter((m) => quantityOf(save, m.itemId) > 0);

  return (
    <div className="salvage lang-b">
      <header className="salvage__head">
        <div>
          <p className="salvage__eyebrow">Whatever you picked up</p>
          <h2 className="salvage__title">Salvage</h2>
        </div>
        <button className="salvage__back" onClick={onBack}>
          Done
        </button>
      </header>

      {note && <p className="salvage__note">{note}</p>}

      <section className="salvage__section">
        <h3 className="salvage__section-title">On hand</h3>
        {held.length === 0 ? (
          <p className="salvage__empty">Nothing yet. It’s out there.</p>
        ) : (
          <ul className="salvage__list">
            {held.map((m) => (
              <li key={m.itemId} className="salvage__row">
                <div className="salvage__row-head">
                  <b>{m.name}</b>
                  <span>× {quantityOf(save, m.itemId)}</span>
                </div>
                <p className="salvage__effect">{m.description}</p>
                <button
                  onClick={() => {
                    dispatch({ type: 'SELL_MATERIAL', itemId: m.itemId });
                    setNote(`Sold for ${m.sellValueShdw} SHDW.`);
                  }}
                >
                  Sell · {m.sellValueShdw} SHDW
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="salvage__section">
        <h3 className="salvage__section-title">Build</h3>
        <ul className="salvage__list">
          {RECIPES.map((r) => {
            const buildable = canCraft(save, r.id);
            return (
              <li key={r.id} className="salvage__row">
                <div className="salvage__row-head">
                  <b>{r.label}</b>
                </div>
                <p className="salvage__effect">{r.description}</p>
                <p className="salvage__inputs">
                  {r.inputs
                    .map((i) => `${i.quantity}× ${MATERIALS.find((m) => m.itemId === i.itemId)?.name ?? i.itemId}`)
                    .join(' + ')}
                </p>
                <button
                  disabled={!buildable}
                  onClick={() => {
                    dispatch({ type: 'CRAFT_ITEM', recipeId: r.id });
                    setNote(`Built: ${r.label}.`);
                  }}
                >
                  Build
                </button>
                {!buildable && <span className="salvage__reason">Not enough parts yet.</span>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
