import { useState } from 'react';
import { useGame, useSave } from '../state/GameContext';
import { MATERIALS, RECIPES } from '../content/materials';
import { BLUEPRINTS } from '../content/blueprints';
import { canCraft } from '../systems/materials';
import { owns } from '../systems/market';
import './garage.css';

/**
 * The Garage — where the blueprints actually live, and the only place
 * Build ever opens from. This used to be a "Blueprints" and "Build"
 * section inside the phone's Files app, reachable from anywhere in town;
 * moved here, at the build note's request, so building something means
 * walking home and going out to the garage for it, not tapping a screen
 * mid-heist. `Salvage` (still in `Phone.tsx`) keeps selling parts for SHDW
 * from wherever you are — parts are parts — only turning a blueprint into
 * a thing is tied to a place now.
 *
 * Opens exactly the way the market table does: from the Garage location's
 * own card (`Overworld.tsx`, `open.garage`), never from the phone.
 */
export function Garage({ onClose }: { onClose: () => void }) {
  const save = useSave();
  const { dispatch } = useGame();
  const [note, setNote] = useState<string | null>(null);
  const ownedBlueprints = BLUEPRINTS.filter((b) => owns(save, b.itemId));
  const buildableRecipes = RECIPES.filter((r) => owns(save, r.blueprintItemId));
  const remainingBlueprints = BLUEPRINTS.length - ownedBlueprints.length;

  return (
    <div className="garage lang-b">
      <header className="garage__head">
        <div>
          <p className="garage__eyebrow">Every blueprint you’ve ever cracked a junction box open for</p>
          <h2 className="garage__title">The Garage</h2>
        </div>
        <button className="garage__back" onClick={onClose}>
          Done
        </button>
      </header>

      {note && <p className="garage__note">{note}</p>}

      <section className="garage__section">
        <h3 className="garage__section-title">Blueprints</h3>
        {ownedBlueprints.length === 0 ? (
          <p className="garage__empty">No files yet. A junction box has to give one up first.</p>
        ) : (
          <ul className="garage__list">
            {ownedBlueprints.map((b) => (
              <li key={b.itemId} className="garage__row">
                <div className="garage__row-head">
                  <b>{b.name}</b>
                </div>
                <p className="garage__effect">{b.description}</p>
              </li>
            ))}
          </ul>
        )}
        {remainingBlueprints > 0 && (
          <p className="garage__reason">
            {remainingBlueprints} more file{remainingBlueprints === 1 ? '' : 's'} out there, unaccounted for.
          </p>
        )}
      </section>

      {buildableRecipes.length > 0 ? (
        <section className="garage__section">
          <h3 className="garage__section-title">Build</h3>
          <ul className="garage__list">
            {buildableRecipes.map((r) => {
              const buildable = canCraft(save, r.id);
              return (
                <li key={r.id} className="garage__row">
                  <div className="garage__row-head">
                    <b>{r.label}</b>
                  </div>
                  <p className="garage__effect">{r.description}</p>
                  <p className="garage__inputs">
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
                  {!buildable && <span className="garage__reason">Not enough parts yet.</span>}
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className="garage__empty">Nothing to build yet — no owned blueprint has enough parts on hand.</p>
      )}
    </div>
  );
}
