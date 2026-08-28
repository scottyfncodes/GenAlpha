import { useState } from 'react';
import { useGame, useSave } from '../state/GameContext';
import { Phone } from './Phone';
import { MATERIALS } from '../content/materials';
import { BOARD_TIERS, DECK_TIERS, GPS_TIERS, ITEMS, PLAYER_DRONE_TIERS } from '../content/economy';
import { deckTier, quantityOf } from '../systems/market';
import './backpack.css';

/**
 * Every trade-up line's own tier itemIds — deliberately excluded from the
 * Backpack's "Items" list below. A board/deck/GPS/drone tier isn't a thing
 * you're carrying alongside your gear, it *is* your current gear on that
 * line (crafting the next tier consumes this one as an input, so at most
 * one of each line is ever owned at once) — its own tier readout already
 * lives wherever that line's own status shows (the Cyberdeck's Rig app for
 * the deck, for instance). Listing it again here would just be the same
 * fact said twice in two screens that disagree the moment either drifts.
 */
const TIER_ITEM_IDS = new Set<string>([...BOARD_TIERS, ...DECK_TIERS, ...GPS_TIERS, ...PLAYER_DRONE_TIERS]);

/**
 * The backpack — the first layer now, not the phone. What a player is
 * physically carrying lives here: cash, parts, standalone gear, and doors
 * into the phone and the cyberdeck (both are things Aaron has on him, even
 * though the cyberdeck also gets its own always-visible HUD button once
 * it's built — it's a primary tool, not something that should take an
 * extra tap to reach). Blueprints don't live here any more: a blueprint is
 * knowledge, not cargo — see `systems/blueprints.ts` — and the Garage is
 * where owning one actually means something.
 */
export function Backpack({
  onClose,
  onOpenSettings,
}: {
  onClose: () => void;
  /** The one settings door that works from turn one, before a cyberdeck
   * exists to hold the real one — see `ui/Hud.tsx`'s own doc comment. */
  onOpenSettings: () => void;
}) {
  const [phoneOpen, setPhoneOpen] = useState(false);

  if (phoneOpen) return <Phone onClose={() => setPhoneOpen(false)} />;

  return <BackpackHome onOpenPhone={() => setPhoneOpen(true)} onOpenSettings={onOpenSettings} onClose={onClose} />;
}

function BackpackHome({
  onOpenPhone,
  onOpenSettings,
  onClose,
}: {
  onOpenPhone: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
}) {
  const save = useSave();
  const { setCyberdeckOpen } = useGame();
  const parts = MATERIALS.filter((m) => quantityOf(save, m.itemId) > 0);
  const items = ITEMS.filter((i) => !TIER_ITEM_IDS.has(i.itemId) && quantityOf(save, i.itemId) > 0);
  const hasCyberdeck = deckTier(save) > 0;

  return (
    <div className="backpack lang-b">
      <header className="backpack__head">
        <div>
          <p className="backpack__eyebrow">Whatever’s actually in it</p>
          <h2 className="backpack__title">Backpack</h2>
        </div>
        <button className="backpack__close" onClick={onClose}>
          Done
        </button>
      </header>

      {hasCyberdeck && (
        <button className="backpack__tile" onClick={() => setCyberdeckOpen(true)}>
          <span className="backpack__tile-icon">🖥️</span>
          <span className="backpack__tile-copy">
            <b>Cyberdeck</b>
            <span>Little John, Leads, Feed, Coverage, Heat, Crew, Settings</span>
          </span>
        </button>
      )}

      <button className="backpack__tile" onClick={onOpenPhone}>
        <span className="backpack__tile-icon">📱</span>
        <span className="backpack__tile-copy">
          <b>Phone</b>
          <span>Fenwick Lot, Silk Road, Salvage</span>
        </span>
      </button>

      {/* The one settings door that works before a cyberdeck exists — see
          Hud.tsx's own doc comment. Once the deck's built it's also inside
          it, but this one never goes away: a kid should always be able to
          mute the game. */}
      <button className="backpack__tile" onClick={onOpenSettings}>
        <span className="backpack__tile-icon">⚙️</span>
        <span className="backpack__tile-copy">
          <b>Settings</b>
          <span>Sound, text speed, screen effects</span>
        </span>
      </button>

      <section className="backpack__section">
        <h3 className="backpack__section-title">Cash</h3>
        <p className="backpack__cash">${save.economy.cashOnHand}</p>
      </section>

      <section className="backpack__section">
        <h3 className="backpack__section-title">Parts</h3>
        {parts.length === 0 ? (
          <p className="backpack__empty">Nothing yet. It’s out there.</p>
        ) : (
          <ul className="backpack__list">
            {parts.map((m) => (
              <li key={m.itemId} className="backpack__row">
                <span>{m.name}</span>
                <span className="backpack__qty">× {quantityOf(save, m.itemId)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="backpack__section">
        <h3 className="backpack__section-title">Items</h3>
        {items.length === 0 ? (
          <p className="backpack__empty">Nothing carried yet, past what's built into a build.</p>
        ) : (
          <ul className="backpack__list">
            {items.map((i) => (
              <li key={i.itemId} className="backpack__row">
                <span>{i.name}</span>
                <span className="backpack__qty">× {quantityOf(save, i.itemId)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
