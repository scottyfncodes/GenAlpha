import { useState } from 'react';
import { useGame, useSave } from '../state/GameContext';
import { drainPreview, walletOf } from '../systems/heist';
import { RiskMeter } from './RiskMeter';
import './redistribution.css';

/**
 * The Robin Hood choice (module 03).
 *
 * The design note this component exists to obey: there is no correct split.
 * Both options are always partially available, most play lands in between, and
 * nothing in the game scores it. So there is no recommended preset, no
 * highlighted option, no "the town needs you" copy on one side and dry
 * accounting on the other — both consequences are stated in the same voice, in
 * the same size, and then the player decides.
 *
 * The Heat cost is stated before the button, same as a mission briefing. This
 * is the single most expensive action in the game (module 02) and it is not
 * going to be the one place the player finds out afterwards.
 */
const PRESETS: { label: string; fraction: number }[] = [
  { label: 'Nearly all of it back', fraction: 0.9 },
  { label: 'Half and half', fraction: 0.5 },
  { label: 'Mostly keep it', fraction: 0.1 },
];

export function Redistribution({
  walletIds,
  onDone,
}: {
  walletIds: string[];
  onDone: () => void;
}) {
  const save = useSave();
  const { dispatch } = useGame();
  const [fraction, setFraction] = useState(0.5);
  const [done, setDone] = useState(false);

  /*
   * One slider, however many wallets. Act 3 empties three in the same minute
   * and the split is one decision about all of it — but `drain` is still
   * called once per wallet, so the totals here are a sum of the same previews
   * the single-wallet case uses rather than a second way of doing the sums.
   */
  const live = walletIds.filter((id) => (walletOf(save, id)?.balance ?? 0) > 0);
  const previews = live.map((id) => drainPreview(save, id, fraction));
  const preview = previews.reduce(
    (acc, p) => ({
      balance: acc.balance + p.balance,
      redistributed: acc.redistributed + p.redistributed,
      kept: acc.kept + p.kept,
      trust: acc.trust + p.trust,
      heat: Math.max(acc.heat, p.heat),
    }),
    { balance: 0, redistributed: 0, kept: 0, trust: 0, heat: 0 },
  );

  /**
   * If the wallet is already empty the drain has happened — a re-render after
   * commit, or a reload landing back on this node. Show what was decided and
   * move on rather than offering the choice twice.
   */
  if (done || live.length === 0) {
    return (
      <div className="redist lang-b">
        <h2 className="redist__title">Sent.</h2>
        <p className="redist__body">
          It goes out in pieces, to accounts with names on them, over about four days.
        </p>
        <button className="redist__go" onClick={onDone}>
          Continue
        </button>
      </div>
    );
  }

  const commit = () => {
    for (const walletId of live) {
      dispatch({ type: 'DRAIN_WALLET', walletId, redistributeFraction: fraction });
    }
    setDone(true);
  };

  return (
    <div className="redist lang-b">
      <p className="redist__eyebrow">
        {preview.balance.toLocaleString()} dollars
        {live.length > 1 ? `, out of ${live.length} accounts, in one minute` : ', and a box asking where'}
      </p>
      <h2 className="redist__title">Where does it go?</h2>

      <div className="redist__split">
        <label htmlFor="redist-slider" className="redist__label">
          Back to the town
        </label>
        <input
          id="redist-slider"
          className="redist__slider"
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(fraction * 100)}
          onChange={(e) => setFraction(Number(e.target.value) / 100)}
        />
        <div className="redist__numbers">
          <span>
            <b>${preview.redistributed.toLocaleString()}</b> out
          </span>
          <span>
            <b>${preview.kept.toLocaleString()}</b> kept
          </span>
        </div>
      </div>

      <ul className="redist__presets">
        {PRESETS.map((p) => (
          <li key={p.label}>
            <button onClick={() => setFraction(p.fraction)}>{p.label}</button>
          </li>
        ))}
      </ul>

      {/*
        Both consequences, same voice, same weight. Neither is the right one.
      */}
      <dl className="redist__consequences">
        <dt>Out</dt>
        <dd>
          Debts nobody will trace, paid off by nobody in particular. Town trust
          {preview.trust > 0 ? ` +${preview.trust}` : ' unchanged'}.
        </dd>
        <dt>Kept</dt>
        <dd>Gear, and a next time. ${preview.kept.toLocaleString()} on the table at Fenwick.</dd>
      </dl>

      <div className="redist__cost">
        <RiskMeter
          label="Heat, either way"
          value={save.heat.current}
          max={100}
          pending={preview.heat}
          status={`+${preview.heat} — moving it is the loud part`}
        />
      </div>

      <button className="redist__go" onClick={commit}>
        Send it
      </button>
    </div>
  );
}
