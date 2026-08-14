import { useEffect, useState } from 'react';
import { useGame, useSave } from '../state/GameContext';
import { Market } from './Market';
import { MATERIALS } from '../content/materials';
import { quantityOf, shdwDirection, shdwHeld, shdwRate, shdwRateOnDay } from '../systems/market';
import { SHDW } from '../content/economy';
import { discoveredEntries, undiscoveredCount } from '../systems/casefile';
import { FEED_LAST_SEEN_FLAG, unreadFeedCount, visibleFeedEntries } from '../systems/feed';
import { escalationStage } from '../world/escalation';
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
type App = 'home' | 'market' | 'salvage' | 'shadow' | 'leads' | 'feed';

export function Phone({ onClose }: { onClose: () => void }) {
  const [app, setApp] = useState<App>('home');

  return (
    <div className="phone" role="dialog" aria-label="Phone">
      <div className="phone__body">
        {app === 'market' && <Market onClose={() => setApp('home')} />}
        {app === 'salvage' && <Salvage onBack={() => setApp('home')} />}
        {app === 'shadow' && <Shadow onBack={() => setApp('home')} />}
        {app === 'leads' && <Leads onBack={() => setApp('home')} />}
        {app === 'feed' && <Feed onBack={() => setApp('home')} />}
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
  const unread = unreadFeedCount(save);

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
        <button className="phone__app" onClick={() => onOpen('feed')}>
          <span className="phone__app-icon">
            📰
            {unread > 0 && <span className="phone__app-badge">{unread}</span>}
          </span>
          <span>Feed</span>
        </button>
      </div>
    </div>
  );
}

/**
 * The news feed — continuous plot points delivered the way a phone actually
 * delivers them, instead of a cutscene: new cameras, a new data center,
 * safety propaganda, read straight off `content/feed.ts` at whatever
 * `EscalationStage` the town's currently at (`world/escalation.ts`), same
 * stage the patrols/drones/fencing are reading to decide how much of
 * themselves to put on the map. Opening this marks every headline up to the
 * current stage as seen, which is what clears the badge on both this app's
 * own icon and the Backpack button that leads here.
 */
function Feed({ onBack }: { onBack: () => void }) {
  const save = useSave();
  const { dispatch } = useGame();
  const entries = visibleFeedEntries(save);

  useEffect(() => {
    dispatch({ type: 'SET_FLAGS', flags: { [FEED_LAST_SEEN_FLAG]: escalationStage(save.world.day) } });
    // Only ever needs to fire once, on open — re-running this on every
    // render would just be re-writing the same flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="feed lang-b">
      <header className="feed__head">
        <div>
          <p className="feed__eyebrow">What SafeTrace wants the town reading</p>
          <h2 className="feed__title">Feed</h2>
        </div>
        <button className="feed__back" onClick={onBack}>
          Done
        </button>
      </header>

      <ul className="feed__list">
        {entries.map((e) => (
          <li key={e.id} className="feed__row">
            <b className="feed__row-headline">{e.headline}</b>
            <p className="feed__row-body">{e.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Files: a folder, not a workbench. Blueprints and Build both moved to the
 * Garage (`ui/Garage.tsx`) — a place, not a phone screen, per the build
 * note: turning a blueprint into a thing means walking home and going out
 * to the garage for it. Selling salvage for SHDW stays here — parts are
 * parts, unrelated to where a build happens — and stays exactly as it
 * always worked.
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

      <p className="salvage__reason">Blueprints and builds live in the garage now. Head back home for those.</p>
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
