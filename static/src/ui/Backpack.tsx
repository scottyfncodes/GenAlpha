import { useState } from 'react';
import { useSave } from '../state/GameContext';
import { Phone } from './Phone';
import { MATERIALS } from '../content/materials';
import { BLUEPRINTS } from '../content/blueprints';
import { owns, quantityOf } from '../systems/market';
import './backpack.css';

/**
 * The backpack — the first layer now, not the phone. Everything a player is
 * actually carrying lives here: parts, cash, blueprints, and the phone
 * itself, which used to be the HUD's direct door into the market/salvage/
 * shadow/leads apps and is now one more thing in the bag. Opening it is
 * exactly the same navigation Phone.tsx already had internally — this just
 * adds one screen in front of it, and renders `<Phone>` unchanged once its
 * own tile is picked.
 */
export function Backpack({ onClose }: { onClose: () => void }) {
  const [phoneOpen, setPhoneOpen] = useState(false);

  if (phoneOpen) return <Phone onClose={() => setPhoneOpen(false)} />;

  return <BackpackHome onOpenPhone={() => setPhoneOpen(true)} onClose={onClose} />;
}

function BackpackHome({ onOpenPhone, onClose }: { onOpenPhone: () => void; onClose: () => void }) {
  const save = useSave();
  const parts = MATERIALS.filter((m) => quantityOf(save, m.itemId) > 0);
  const blueprintCount = BLUEPRINTS.filter((b) => owns(save, b.itemId)).length;

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

      <button className="backpack__phone" onClick={onOpenPhone}>
        <span className="backpack__phone-icon">📱</span>
        <span className="backpack__phone-copy">
          <b>Phone</b>
          <span>Silk Road, Files, Shadow, Leads</span>
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
        <h3 className="backpack__section-title">Blueprints</h3>
        <p className="backpack__note">
          {blueprintCount > 0
            ? `${blueprintCount} file${blueprintCount === 1 ? '' : 's'} on hand. Full details in Files, on the phone.`
            : 'None yet. A junction box has to give one up first.'}
        </p>
      </section>
    </div>
  );
}
