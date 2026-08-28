import { useState } from 'react';
import { useSave } from '../state/GameContext';
import { useGame } from '../state/GameContext';
import { FenwickLot } from './FenwickLot';
import { SilkRoad } from './SilkRoad';
import { MATERIALS } from '../content/materials';
import { quantityOf } from '../systems/market';
import './phone.css';

/**
 * Fenwick Lot, Silk Road, and now the salvage economy, all live behind a
 * phone screen instead of only a physical table — per the build note, the
 * market shouldn't have to wait on a story flag to be worth opening. All
 * three are exactly the same `systems/market.ts` / `systems/materials.ts`
 * this always was; the phone is a second door into the same rooms, not a
 * second economy. Fenwick Lot and Silk Road used to be one screen wearing
 * Silk Road's name — see `ui/FenwickLot.tsx`/`ui/SilkRoad.tsx` for why
 * they're two doors now, one ordinary and one not.
 *
 * The phone's own home screen is deliberately down to three apps now —
 * Little John, Leads and Feed all moved into the Cyberdeck
 * (`ui/Cyberdeck.tsx`) once that's built, because none of them are "a kid's
 * first device" any more, they're what a built computer manages. What's
 * left here is what a phone still is even after the deck exists: the two
 * doors into the market, and a place to check what's actually in a bag.
 *
 * `.phone__body` carries a `transform`, which — deliberately — gives
 * `FenwickLot`/`SilkRoad`'s own `position: fixed` a new containing block.
 * Either fills the phone's screen instead of the whole viewport without a
 * single line of their own CSS changing.
 */
type App = 'home' | 'fenwick' | 'silkroad' | 'salvage';

export function Phone({ onClose }: { onClose: () => void }) {
  const [app, setApp] = useState<App>('home');

  return (
    <div className="phone" role="dialog" aria-label="Phone">
      <div className="phone__body">
        {app === 'fenwick' && <FenwickLot onClose={() => setApp('home')} />}
        {app === 'silkroad' && <SilkRoad onClose={() => setApp('home')} />}
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
        <button className="phone__app" onClick={() => onOpen('fenwick')}>
          <span className="phone__app-icon">🏚️</span>
          <span>Fenwick Lot</span>
        </button>
        <button className="phone__app" onClick={() => onOpen('silkroad')}>
          <span className="phone__app-icon">🐫</span>
          <span>Slik Rd</span>
        </button>
        <button className="phone__app" onClick={() => onOpen('salvage')}>
          <span className="phone__app-icon">🔩</span>
          <span>Salvage</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Salvage: raw parts turned into SHDW, nothing else — renamed off "Files"
 * (what this screen used to be called, confusingly, back when Files meant
 * "whatever's in the bag" instead of an actual information system). The
 * real Files — corporate memos, government contracts, dossiers, the hidden
 * layer of Bellhaven Aaron's tech reveals — live in the Cyberdeck now
 * (`ui/Cyberdeck.tsx`'s `FilesApp`, `systems/files.ts`). Blueprints and
 * Build both moved to the Garage (`ui/Garage.tsx`) — a place, not a phone
 * screen, per the build note: turning a blueprint into a thing means
 * walking home and going out to the garage for it. Selling salvage for
 * SHDW stays here — parts are parts, unrelated to where a build happens —
 * and stays exactly as it always worked.
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

      <p className="salvage__reason">Blueprints and builds live in the garage now. Head back home for those.</p>
    </div>
  );
}

