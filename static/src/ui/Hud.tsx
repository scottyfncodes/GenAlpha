import { Fragment, useEffect, useRef, useState } from 'react';
import { RiskMeter } from './RiskMeter';
import { Glitch } from './Glitch';
import { useGame, useSave } from '../state/GameContext';
import { tierLabel, TIER_ORDER } from '../systems/heat';
import { coverageLabel, coveragePercent, coverageTier } from '../systems/coverage';
import { progressOf } from '../systems/mentors';
import { MENTORS } from '../content/mentors';
import { deckTier, gpsTier, playerDroneTier } from '../systems/market';
import { canHackStreetNode } from '../systems/streethacks';
import { STREET_HACK_NODES } from '../world/streethacks';
import { unreadFeedCount } from '../systems/feed';
import { Minimap } from './Minimap';
import './hud.css';

/**
 * The HUD: the Heat meter, always visible, plus settings, plus a debug drawer.
 * The drawer and the Workbench are gated on `import.meta.env.DEV` and are
 * tree-shaken out of a production build — they are scaffolding, not features.
 */
export function Hud({
  onOpenWorkbench,
  onOpenSettings,
  onOpenCrew,
  onOpenBackpack,
}: {
  onOpenWorkbench: () => void;
  onOpenSettings: () => void;
  onOpenCrew: () => void;
  onOpenBackpack: () => void;
}) {
  const save = useSave();
  const {
    dispatch,
    deleteSave,
    heatAlertUntil,
    nearbyHackNodeId,
    setCyberdeckOpen,
    droneMenuOpen,
    setDroneMenuOpen,
  } = useGame();
  const hasCyberdeck = deckTier(save) > 0;
  const hasDrone = playerDroneTier(save) > 0;
  const unreadFeed = unreadFeedCount(save);
  const nearbyHackNode = nearbyHackNodeId ? STREET_HACK_NODES.find((n) => n.id === nearbyHackNodeId) : undefined;
  const cyberdeckBlinking = hasCyberdeck && Boolean(nearbyHackNode) && canHackStreetNode(save, nearbyHackNode!);
  const [open, setOpen] = useState(false);
  const [heatInfo, setHeatInfo] = useState(false);
  const [coverageInfo, setCoverageInfo] = useState(false);
  const { current, threshold_tier } = save.heat;
  const coverage = coveragePercent(save);
  const covTier = coverageTier(coverage);
  const { sweeps } = save.world.surveillance;

  /*
   * The ten-second "you can be caught right now" window a tier crossing opens
   * (GameContext.tsx) — a real setTimeout for the actual remaining time
   * rather than a fixed one, so a re-render partway through the window
   * doesn't restart the flash from ten seconds again.
   */
  const [heatAlertActive, setHeatAlertActive] = useState(false);
  useEffect(() => {
    const remaining = heatAlertUntil - performance.now();
    if (remaining <= 0) {
      setHeatAlertActive(false);
      return;
    }
    setHeatAlertActive(true);
    const id = window.setTimeout(() => setHeatAlertActive(false), remaining);
    return () => window.clearTimeout(id);
  }, [heatAlertUntil]);

  /*
   * Build Addendum Module 9, Part B.3: the Glitch effect is built once and
   * reused everywhere, and a Heat tier climbing is one of the three places
   * Style Guide 07 names for it. This fires the rupture on the *crossing*,
   * not on every render at that tier — the ambient edge-glitch already
   * drawn on Language A buildings at flagged+ (world/draw.ts) is the
   * continuous tell; this is the one sharp moment underneath it, the instant
   * the tier actually changes. Tier dropping (decay, lying low) is a relief,
   * not a rupture, so only an increase fires it.
   */
  const prevTier = useRef(threshold_tier);
  const [tierUp, setTierUp] = useState(false);
  useEffect(() => {
    if (TIER_ORDER.indexOf(threshold_tier) > TIER_ORDER.indexOf(prevTier.current)) {
      setTierUp(true);
      const id = window.setTimeout(() => setTierUp(false), 50);
      prevTier.current = threshold_tier;
      return () => window.clearTimeout(id);
    }
    prevTier.current = threshold_tier;
  }, [threshold_tier]);

  return (
    <div className="hud">
      {/* No GPS unit, no minimap — a fogged read of the town is exactly the
          thing a Dead Reckoning Rig buys you. Before that, the player's own
          memory of where they've walked is the only map there is. */}
      {gpsTier(save) > 0 && <Minimap />}
      <Glitch active={tierUp} intensity={1}>
        <div
          className={`hud__heat hud__heat--${threshold_tier}${heatAlertActive ? ' hud__heat--alert' : ''}`}
        >
          <div className="hud__heat-row">
            <RiskMeter label="Heat" value={current} max={100} status={threshold_tier} compact />
            <button
              className="hud__info"
              onClick={() => setHeatInfo((v) => !v)}
              aria-expanded={heatInfo}
              aria-label="What is Heat?"
            >
              ?
            </button>
          </div>
          <p className="hud__tierline">{tierLabel(threshold_tier)}</p>
          {heatInfo && (
            <p className="hud__heat-explain">
              How much attention you’ve drawn. It climbs when you take a risk, and eases on its
              own day by day — faster if you lie low. Past a threshold, people start looking
              harder: clear, watched, flagged, hunted.
            </p>
          )}
        </div>
      </Glitch>

      {/*
        SafeTrace's own progress bar, sitting under Heat because that's the
        relationship: Heat is how much attention you've drawn and it eases on
        its own; this only ever eases because you went out and did something
        about it. Same RiskMeter every other risk in the game uses, for the
        Style Guide 07 reason — a player who can read the Heat bar should not
        have to learn a second grammar to read this one.
      */}
      <div className={`hud__coverage hud__coverage--${covTier}`}>
        <div className="hud__heat-row">
          {/* `status` is the band name, not the number again — RiskMeter
              already renders `value`, and Heat right above reads "0 CLEAR"
              the same way. */}
          <RiskMeter label="Coverage" value={coverage} max={100} status={covTier} compact />
          <button
            className="hud__info"
            onClick={() => setCoverageInfo((v) => !v)}
            aria-expanded={coverageInfo}
            aria-label="What is Coverage?"
          >
            ?
          </button>
        </div>
        <p className="hud__tierline">{coverageLabel(covTier)}</p>
        {coverageInfo && (
          <p className="hud__heat-explain">
            How much of town SafeTrace can see. Every camera covers real ground, and every junction box
            carries the cameras nearest it — cut a box and everything it feeds goes blind until somebody
            comes out to fix it. New cameras go up as the rollout advances. At 100% they sweep the town.
            {sweeps > 0 && ` They’ve swept ${sweeps === 1 ? 'once' : `${sweeps} times`}. The lenses reach further now.`}
          </p>
        )}
      </div>

      <div className="hud__bar">
        {/*
          Deliberately not gated on a story flag. The physical table behind
          Fenwick's still opens the way it always has, once the story gets
          there — this is the same market and the same salvage economy,
          reachable from turn one, per the build note: the loop shouldn't
          have to wait on a flag to be worth playing.
        */}
        <button className="hud__toggle" onClick={onOpenBackpack}>
          Backpack
          {/* A ping for the phone's Feed app, one door down — the same
              unread count Phone.tsx shows on the Feed icon itself, surfaced
              here too so a new headline doesn't wait to be noticed until
              the player happens to open the phone for something else. */}
          {unreadFeed > 0 && (
            <span className="hud__toggle-badge" aria-label={`${unreadFeed} unread on the feed`}>
              {unreadFeed}
            </span>
          )}
        </button>
        {/* The cyberdeck's own button, separate from the phone the moment
            there's a reason for it to exist — Once built (`content/materials.ts`
            `craft_cyberdeck`), it's the one door into cracking an ATM or a
            phone line (Cyberdeck.tsx). It blinks exactly when Overworld's own
            proximity check says something in reach is actually hackable right
            now, mirrored up through GameContext's `nearbyHackNodeId` — the
            same "shown, not silent" rule Heat System guardrail 2 already
            applies to cost: the game says so before the player has to guess. */}
        {hasCyberdeck && (
          <button
            className={`hud__toggle hud__toggle--cyberdeck ${cyberdeckBlinking ? 'hud__toggle--blink' : ''}`}
            onClick={() => setCyberdeckOpen(true)}
          >
            Cyberdeck
          </button>
        )}
        {/* The actual Recon flight / Kamikaze strike panel still renders from
            Overworld.tsx — a kamikaze target only exists there, read off
            whatever camera or junction box the player's own proximity check
            already found this frame. This button just owns the shared
            open/close toggle, the same split Cyberdeck's own button uses. */}
        {hasDrone && (
          <button className="hud__toggle" onClick={() => setDroneMenuOpen(!droneMenuOpen)}>
            {droneMenuOpen ? 'Close drone' : 'Drone'}
          </button>
        )}
        {/* Only offered once there is somebody on it. Before the first mentor
            it would be an empty screen explaining that you're on your own,
            which the game is already saying perfectly well without a button. */}
        {Object.values(save.skills).some((s) => s.unlocked) && (
          <button className="hud__toggle" onClick={onOpenCrew}>
            Crew
          </button>
        )}
        <button className="hud__toggle" onClick={onOpenSettings}>
          Settings
        </button>
        {import.meta.env.DEV && (
          <button className="hud__toggle" onClick={() => setOpen((v) => !v)}>
            {open ? 'Close debug' : 'Debug'}
          </button>
        )}
      </div>

      {import.meta.env.DEV && open && (
        <div className="hud__debug">
          <div className="hud__row">
            {[1, 5, 10, 25].map((n) => (
              <button key={n} onClick={() => dispatch({ type: 'ADD_HEAT', eventId: 'debug_add', delta: n, logToHistory: n >= 10 })}>
                +{n}
              </button>
            ))}
          </div>
          <div className="hud__row">
            <button onClick={() => dispatch({ type: 'ADD_HEAT', eventId: 'debug_sub', delta: -10 })}>−10</button>
            <button onClick={() => dispatch({ type: 'ADVANCE_DAY' })}>Next day (−2)</button>
            <button onClick={() => dispatch({ type: 'LIE_LOW' })}>Lie low (−12, +1 day)</button>
          </div>
          <div className="hud__row">
            <button onClick={onOpenWorkbench}>Workbench</button>
            <button onClick={() => dispatch({ type: 'SET_TRUST', npcId: 'nova', delta: 10 })}>Ellen trust +10</button>
            <button onClick={deleteSave}>Wipe save</button>
          </div>
          <dl className="hud__state">
            <dt>day</dt><dd>{save.world.day}</dd>
            <dt>chapter</dt><dd>{save.player.currentChapter}</dd>
            <dt>location</dt><dd>{save.player.currentLocation}</dd>
            <dt>nova trust</dt><dd>{save.relationships.nova?.trust ?? 0}</dd>
            <dt>heat log</dt><dd>{save.heat.history.length} entries</dd>
            {/* The mentor cursor, which is otherwise invisible while playing —
                this is where to check that a beat advanced and a skill landed. */}
            {MENTORS.map((m) => {
              const p = progressOf(save, m);
              return (
                <Fragment key={m.id}>
                  <dt>{m.id}</dt>
                  <dd>
                    {p.complete ? 'done' : `beat ${p.beat} · ${p.beatName ?? '—'}`} · trust {p.trust}
                    {p.unlocked ? ' · unlocked' : ''}
                  </dd>
                </Fragment>
              );
            })}
          </dl>
        </div>
      )}
    </div>
  );
}
