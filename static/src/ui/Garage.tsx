import { useState } from 'react';
import { useGame, useSave } from '../state/GameContext';
import { MATERIALS, RECIPES } from '../content/materials';
import { canCraft } from '../systems/materials';
import { isBlueprintUnlocked } from '../systems/blueprints';
import './garage.css';

/**
 * The Garage — the only place Build ever opens from. This used to be a
 * "Blueprints" and "Build" section inside the phone's Files app, reachable
 * from anywhere in town; moved here, at the build note's request, so
 * building something means walking home and going out to the garage for
 * it, not tapping a screen mid-heist. `Salvage` (still in `Phone.tsx`)
 * keeps selling parts for SHDW from wherever you are — parts are parts —
 * only turning a blueprint into a thing is tied to a place now.
 *
 * No separate blueprint list — a recipe already only shows up here once
 * its blueprint's unlocked (`isBlueprintUnlocked`, knowledge rather than an
 * inventory item — see `systems/blueprints.ts`), so a list of unlocked
 * blueprints right above it was just the same handful of names said twice.
 * Anyone curious which files are still out there can already read that off
 * which recipes are missing.
 *
 * Opens exactly the way the market table does: from the Garage location's
 * own card (`Overworld.tsx`, `open.garage`), never from the phone.
 */
export function Garage({ onClose }: { onClose: () => void }) {
  const save = useSave();
  const { dispatch } = useGame();
  const [note, setNote] = useState<string | null>(null);
  const buildableRecipes = RECIPES.filter((r) => isBlueprintUnlocked(save, r.blueprintItemId));

  return (
    <div className="garage lang-b">
      <header className="garage__head">
        <div>
          <p className="garage__eyebrow">Whatever you’ve got the plans and the parts for</p>
          <h2 className="garage__title">The Garage</h2>
        </div>
        <button className="garage__back" onClick={onClose}>
          Done
        </button>
      </header>

      {note && <p className="garage__note">{note}</p>}

      {buildableRecipes.length > 0 ? (
        <section className="garage__section">
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
