import { useState } from 'react';
import { useGame, useSave } from '../state/GameContext';
import { Market } from './Market';
import { MATERIALS, RECIPES } from '../content/materials';
import { BLUEPRINTS } from '../content/blueprints';
import { canCraft } from '../systems/materials';
import { owns, quantityOf, shdwDirection, shdwHeld, shdwRate, shdwRateOnDay } from '../systems/market';
import { SHDW } from '../content/economy';
import { discoveredEntries, undiscoveredCount } from '../systems/casefile';
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
type App = 'home' | 'market' | 'salvage' | 'shadow' | 'leads';

export function Phone({ onClose }: { onClose: () => void }) {
  const [app, setApp] = useState<App>('home');

  return (
    <div className="phone" role="dialog" aria-label="Phone">
      <div className="phone__body">
        {app === 'market' && <Market onClose={() => setApp('home')} />}
        {app === 'salvage' && <Salvage onBack={() => setApp('home')} />}
        {app === 'shadow' && <Shadow onBack={() => setApp('home')} />}
        {app === 'leads' && <Leads onBack={() => setApp('home')} />}
        {app === 'home' && (
          <PhoneHome onOpen={setApp} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function PhoneHome({ onOpen, onClose }: { onOpen: (app: App) => void; onClose: () => void }) {
  const save = useSave();
  const leads = discoveredEntries(save).length;

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
          <span className="phone__app-icon">🐪</span>
          <span>Silk Road</span>
        </button>
        <button className="phone__app" onClick={() => onOpen('salvage')}>
          <span className="phone__app-icon">📁</span>
          <span>Files</span>
        </button>
        <button className="phone__app" onClick={() => onOpen('shadow')}>
          <span className="phone__app-icon">📈</span>
          <span>{SHDW.name}</span>
        </button>
        <button className="phone__app" onClick={() => onOpen('leads')}>
          <span className="phone__app-icon">🗂️</span>
          <span>Leads{leads > 0 ? ` (${leads})` : ''}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Files: a folder, not a workbench. Every recipe needs its own build plan
 * before it can be built at all — found exactly one way, destroying a
 * junction box (`world/junctionboxes.ts`) — so Build only ever lists what
 * there's actually a file for. No quest markers for the rest: a recipe with
 * no blueprint owned doesn't appear here half-greyed-out, it just isn't
 * listed, same as a hidden bush gives no other tell than the sparkle.
 * Selling salvage for SHDW is unrelated to any of that — parts are parts,
 * not diagrams — and stays exactly as it always worked.
 */
function Salvage({ onBack }: { onBack: () => void }) {
  const save = useSave();
  const { dispatch } = useGame();
  const [note, setNote] = useState<string | null>(null);
  const held = MATERIALS.filter((m) => quantityOf(save, m.itemId) > 0);
  const ownedBlueprints = BLUEPRINTS.filter((b) => owns(save, b.itemId));
  const buildableRecipes = RECIPES.filter((r) => owns(save, r.blueprintItemId));
  const remainingBlueprints = BLUEPRINTS.length - ownedBlueprints.length;

  return (
    <div className="salvage lang-b">
      <header className="salvage__head">
        <div>
          <p className="salvage__eyebrow">Whatever you picked up, whatever you cracked open</p>
          <h2 className="salvage__title">Files</h2>
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
        <h3 className="salvage__section-title">Blueprints</h3>
        {ownedBlueprints.length === 0 ? (
          <p className="salvage__empty">No files yet. A junction box has to give one up first.</p>
        ) : (
          <ul className="salvage__list">
            {ownedBlueprints.map((b) => (
              <li key={b.itemId} className="salvage__row">
                <div className="salvage__row-head">
                  <b>{b.name}</b>
                </div>
                <p className="salvage__effect">{b.description}</p>
              </li>
            ))}
          </ul>
        )}
        {remainingBlueprints > 0 && (
          <p className="salvage__reason">
            {remainingBlueprints} more file{remainingBlueprints === 1 ? '' : 's'} out there, unaccounted for.
          </p>
        )}
      </section>

      {buildableRecipes.length > 0 && (
        <section className="salvage__section">
          <h3 className="salvage__section-title">Build</h3>
          <ul className="salvage__list">
            {buildableRecipes.map((r) => {
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
      )}
    </div>
  );
}

/**
 * SHDW, on its own screen instead of buried at the bottom of the market list —
 * a store of value and a way to move money that isn't a pocket, still
 * deliberately not a second minigame (module 03), but the one number in this
 * game that's supposed to read as genuinely live. The bars are the last
 * several in-fiction days computed straight from `shdwRateOnDay`, not stored
 * history — nothing new to migrate, and a save from day 2 just shows a
 * flatter week instead of a special case.
 */
function Shadow({ onBack }: { onBack: () => void }) {
  const save = useSave();
  const { dispatch } = useGame();
  const [note, setNote] = useState<string | null>(null);

  const rate = shdwRate(save);
  const dir = shdwDirection(save);
  const held = shdwHeld(save);
  const cash = save.economy.cashOnHand;

  const history = Array.from({ length: 7 }, (_, i) =>
    shdwRateOnDay(save, Math.max(1, save.world.day - 6 + i)),
  );
  const max = Math.max(...history);
  const min = Math.min(...history);
  const span = max - min || 1;

  return (
    <div className="shadow lang-b">
      <header className="shadow__head">
        <div>
          <p className="shadow__eyebrow">Nobody explains what it is. Everybody uses it.</p>
          <h2 className="shadow__title">{SHDW.name}</h2>
        </div>
        <button className="shadow__back" onClick={onBack}>
          Done
        </button>
      </header>

      <div className={`shadow__rate shadow__rate--${dir}`}>
        <span className="shadow__rate-value">${rate.toFixed(2)}</span>
        <i className="shadow__rate-arrow" aria-hidden>
          {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '·'}
        </i>
      </div>
      <p className="shadow__rate-label">per SHDW, today</p>

      <div className="shadow__chart" role="img" aria-label={`Rate over the last ${history.length} days`}>
        {history.map((v, i) => (
          <span key={i} className="shadow__bar" style={{ height: `${8 + ((v - min) / span) * 32}px` }} />
        ))}
      </div>

      {note && <p className="shadow__note">{note}</p>}

      <p className="shadow__held">
        {held > 0 ? `You hold ${held.toFixed(4)} — about $${Math.round(held * rate)}.` : 'You hold none.'}
      </p>

      <div className="shadow__actions">
        {[25, 100].map((amount) => (
          <button
            key={amount}
            disabled={cash < amount}
            onClick={() => {
              dispatch({ type: 'BUY_SHDW', cash: amount });
              setNote(`Put $${amount} into it.`);
            }}
          >
            Buy ${amount}
          </button>
        ))}
        {held > 0 && (
          <button
            onClick={() => {
              dispatch({ type: 'SELL_SHDW', amount: held });
              setNote('Back into cash.');
            }}
          >
            Sell all
          </button>
        )}
      </div>

      <p className="shadow__footnote">
        Ines takes cash. The rate is the rate; she doesn’t haggle and she doesn’t explain.
      </p>
    </div>
  );
}

/**
 * Leads: the mystery, kept as a dossier instead of something the player has
 * to remember. Every entry here is unlocked by a flag a scene already wrote —
 * this reads it back, in the order it was found, so a choice that revealed
 * something has a place to show for it besides forty minutes of dialogue ago.
 * The undiscovered count is a number, never a list — the point is "there is
 * more to find," not a spoiler of what it is.
 */
function Leads({ onBack }: { onBack: () => void }) {
  const save = useSave();
  const found = discoveredEntries(save);
  const remaining = undiscoveredCount(save);

  return (
    <div className="leads lang-b">
      <header className="leads__head">
        <div>
          <p className="leads__eyebrow">What you’ve actually got</p>
          <h2 className="leads__title">Leads</h2>
        </div>
        <button className="leads__back" onClick={onBack}>
          Done
        </button>
      </header>

      {found.length === 0 ? (
        <p className="leads__empty">Nothing on paper yet. Keep pulling on things.</p>
      ) : (
        <ul className="leads__list">
          {found.map((e) => (
            <li key={e.id} className="leads__row">
              <b className="leads__row-title">{e.title}</b>
              <p className="leads__row-entry">{e.entry}</p>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <p className="leads__remaining">
          {remaining} more thread{remaining === 1 ? '' : 's'} out there, unaccounted for.
        </p>
      )}
    </div>
  );
}
