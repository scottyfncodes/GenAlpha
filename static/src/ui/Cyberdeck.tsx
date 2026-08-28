import { useEffect, useState } from 'react';
import { useGame, useSave } from '../state/GameContext';
import { STREET_HACK_NODES, type StreetHackNode } from '../world/streethacks';
import {
  canHackStreetNode,
  cashFor,
  effectiveTier,
  HACK_KIND_MIN_TIER,
  HACK_KIND_TOOL,
  levelsFor,
  type HackLevel,
} from '../systems/streethacks';
import { HACKING_TIERS, CIPHER_TIERS, buildCipherConfig, buildTraceConfig } from '../content/hacking';
import { MissionBriefing } from './minigames/MissionBriefing';
import { TraceMinigame } from './minigames/TraceMinigame';
import { CipherMinigame } from './minigames/CipherMinigame';
import { SKINS } from '../content/skins';
import {
  deckTier,
  gpsTier,
  heatReliefFor,
  owns,
  shdwDirection,
  shdwHeld,
  shdwRate,
  shdwRateOnDay,
} from '../systems/market';
import { DECK_TIERS, ITEMS_BY_ID, SHDW } from '../content/economy';
import type { RunOutcome } from '../systems/missions';
import { MapView } from './MapView';
import { RiskMeter } from './RiskMeter';
import { coverageLabel, coveragePercent, coverageTier } from '../systems/coverage';
import { tierLabel } from '../systems/heat';
import { discoveredEntries, undiscoveredCount } from '../systems/casefile';
import { FEED_LAST_SEEN_FLAG, unreadFeedCount, visibleFeedEntries } from '../systems/feed';
import { escalationStage } from '../world/escalation';
import { unlockedFiles } from '../systems/files';
import { FILES, type FileCategory } from '../content/files';
import { Crew } from './Crew';
import { SettingsPanel } from './SettingsPanel';
import './hud.css';
import './phone.css';
import './cyberdeck.css';

/**
 * The cyberdeck: its own device, its own screen, separate from the phone.
 * The phone is now just the early-game door — Fenwick Lot, Silk Road, and
 * Salvage — the kind of thing a Bellhaven kid already has. This is the thing Aaron built
 * (`content/materials.ts` `craft_cyberdeck`), and it's grown into the command
 * centre: the one door into cracking an ATM or a phone line, plus everything
 * that used to be scattered across the phone and the HUD — Little John,
 * Leads, Feed, Coverage, Heat, Crew, and Settings. "Rig" no longer exists as
 * its own top-level destination; that content lives under Settings → Device
 * Settings now, since a build's own configuration is part of the deck's
 * operating system, not a peer of Map or Hack.
 *
 * Little John/Leads/Feed reuse `phone.css`'s lang-b classes as-is rather than
 * a fresh terminal reskin — same components, same behaviour, just opened from
 * a different door. They're due their own pass once the visual language for
 * "inside the deck" settles; functionally, moving where a screen lives
 * shouldn't also require redrawing it.
 */
type App =
  | 'home'
  | 'hack'
  | 'map'
  | 'littlejohn'
  | 'leads'
  | 'feed'
  | 'files'
  | 'coverage'
  | 'heat'
  | 'crew'
  | 'settings';

const LEVEL_LABEL: Record<HackLevel, string> = {
  quick: 'Quick read',
  standard: 'Standard crack',
  deep: 'Deep crack',
};

/** The build's own name for a given tier of the deck line — read off
 * `DECK_TIERS`/`ITEMS_BY_ID` rather than hand-duplicated, so a rename in
 * content/economy.ts can't drift out of sync with what Device Settings says. */
function deckNameForTier(tier: number): string {
  const itemId = DECK_TIERS[tier - 1];
  return itemId ? ITEMS_BY_ID[itemId]?.name ?? itemId : `tier ${tier}`;
}

/** Same idea for a physical tool's own name. */
function toolNameFor(itemId: string): string {
  return ITEMS_BY_ID[itemId]?.name ?? itemId;
}

/** Kinds a given deck tier can reach, worst to best — what Device Settings
 * shows as the player's own unlock ladder. */
const HACK_KIND_LABEL: Record<StreetHackNode['kind'], string> = {
  phone: 'Payphones',
  atm: 'ATMs',
  building: 'Building systems',
};

export function Cyberdeck({ onClose }: { onClose: () => void }) {
  const [app, setApp] = useState<App>('home');

  return (
    <div className="cyberdeck" role="dialog" aria-label="Cyberdeck">
      <div className="cyberdeck__body">
        {app === 'hack' && <HackApp onBack={() => setApp('home')} onDone={onClose} />}
        {app === 'map' && <MapApp onBack={() => setApp('home')} />}
        {app === 'littlejohn' && <LittleJohnApp onBack={() => setApp('home')} />}
        {app === 'leads' && <LeadsApp onBack={() => setApp('home')} />}
        {app === 'feed' && <FeedApp onBack={() => setApp('home')} />}
        {app === 'files' && <FilesApp onBack={() => setApp('home')} />}
        {app === 'coverage' && <CoverageApp onBack={() => setApp('home')} />}
        {app === 'heat' && <HeatApp onBack={() => setApp('home')} />}
        {app === 'crew' && <CrewApp onBack={() => setApp('home')} />}
        {app === 'settings' && <SettingsApp onBack={() => setApp('home')} />}
        {app === 'home' && <CyberdeckHome onOpen={setApp} onClose={onClose} />}
      </div>
    </div>
  );
}

function CyberdeckHome({ onOpen, onClose }: { onOpen: (app: App) => void; onClose: () => void }) {
  const save = useSave();
  const { nearbyHackNodeId } = useGame();
  const nearby = nearbyHackNodeId ? STREET_HACK_NODES.find((n) => n.id === nearbyHackNodeId) : null;
  const leads = discoveredEntries(save).length;
  const unread = unreadFeedCount(save);
  const hasCrew = Object.values(save.skills).some((s) => s.unlocked);

  return (
    <div className="cyberdeck__home">
      <div className="cyberdeck__statusbar">
        <span>RIG — ONLINE</span>
        <button className="cyberdeck__power" onClick={onClose} aria-label="Close cyberdeck">
          ⏻
        </button>
      </div>
      <div className="cyberdeck__apps">
        <button className="cyberdeck__app" onClick={() => onOpen('map')}>
          <span className="cyberdeck__app-icon">🗺️</span>
          <span>Map</span>
        </button>
        <button className="cyberdeck__app" onClick={() => onOpen('hack')}>
          <span className="cyberdeck__app-icon">🔓</span>
          <span>Hack{nearby ? ' — in range' : ''}</span>
        </button>
        <button className="cyberdeck__app" onClick={() => onOpen('littlejohn')}>
          <span className="cyberdeck__app-icon">📈</span>
          <span>{SHDW.name}</span>
        </button>
        <button className="cyberdeck__app" onClick={() => onOpen('leads')}>
          <span className="cyberdeck__app-icon">🗂️</span>
          <span>Leads{leads > 0 ? ` (${leads})` : ''}</span>
        </button>
        <button className="cyberdeck__app" onClick={() => onOpen('feed')}>
          <span className="cyberdeck__app-icon">
            📰
            {unread > 0 && <span className="phone__app-badge">{unread}</span>}
          </span>
          <span>Feed</span>
        </button>
        <button className="cyberdeck__app" onClick={() => onOpen('files')}>
          <span className="cyberdeck__app-icon">🗄️</span>
          <span>Files{unlockedFiles(save).length > 0 ? ` (${unlockedFiles(save).length})` : ''}</span>
        </button>
        <button className="cyberdeck__app" onClick={() => onOpen('coverage')}>
          <span className="cyberdeck__app-icon">📡</span>
          <span>Coverage</span>
        </button>
        <button className="cyberdeck__app" onClick={() => onOpen('heat')}>
          <span className="cyberdeck__app-icon">🔥</span>
          <span>Heat</span>
        </button>
        {hasCrew && (
          <button className="cyberdeck__app" onClick={() => onOpen('crew')}>
            <span className="cyberdeck__app-icon">🤝</span>
            <span>Crew</span>
          </button>
        )}
        <button className="cyberdeck__app" onClick={() => onOpen('settings')}>
          <span className="cyberdeck__app-icon">⚙️</span>
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}

/**
 * The Map app — reachable from any deck tier, but the screen itself is
 * dead until a GPS unit is built: the deck can run the software, it just
 * has nothing to plot without a receiver. Same `MapView` the standalone
 * screen (`ui/Map.tsx`) shows once unlocked; this is that content inside
 * the deck's own frame instead of its own full-screen overlay.
 */
function MapApp({ onBack }: { onBack: () => void }) {
  const save = useSave();
  return (
    <div className="cyberdeck__map">
      <Header onBack={onBack} title="Map" />
      <div className="cyberdeck__map-body">
        {gpsTier(save) > 0 ? (
          <MapView />
        ) : (
          <p className="cyberdeck__map-locked">
            No receiver. Build a GPS unit — even the cheapest one — and this screen has something to draw.
          </p>
        )}
      </div>
    </div>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <header className="cyberdeck__head">
      <h2 className="cyberdeck__title">{title}</h2>
      <button className="cyberdeck__back" onClick={onBack}>
        Back
      </button>
    </header>
  );
}

/**
 * The whole point of the device. A node in range gets a level picker instead
 * of one fixed difficulty — `levelsFor`/`effectiveTier` (systems/streethacks.ts)
 * read the node's own tier one notch easier or harder, the same idea as a
 * camera's tamper/dismantle/overload trio, just a shift on one number instead
 * of three separate actions. Picking a level commits to the same briefing →
 * Trace/Cipher → resolve pipeline every hacking mission in the game already
 * runs — no bespoke puzzle screens, only a different config object.
 */
function HackApp({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const save = useSave();
  const { dispatch, nearbyHackNodeId } = useGame();
  const [level, setLevel] = useState<HackLevel | null>(null);
  const [briefed, setBriefed] = useState(false);
  const [toolAssisted, setToolAssisted] = useState(false);

  const node = nearbyHackNodeId ? STREET_HACK_NODES.find((n) => n.id === nearbyHackNodeId) ?? null : null;

  if (!node || !canHackStreetNode(save, node)) {
    // The physical layer first — the box is still bolted shut whatever the
    // deck says — then the rig's own tier, then it's just on cooldown.
    const toolMissing = node && !owns(save, HACK_KIND_TOOL[node.kind]);
    const rigTooLow = node && !toolMissing && deckTier(save) < HACK_KIND_MIN_TIER[node.kind];
    return (
      <div className="cyberdeck__hack">
        <Header onBack={onBack} title="Hack" />
        <p className="cyberdeck__empty">
          {!node
            ? 'Nothing in range. Find an ATM, a payphone, or a building panel.'
            : toolMissing
              ? `This needs a ${toolNameFor(HACK_KIND_TOOL[node.kind])} before anything digital matters — it’s still bolted shut.`
              : rigTooLow
                ? `This needs a ${deckNameForTier(HACK_KIND_MIN_TIER[node.kind])} (rig tier ${HACK_KIND_MIN_TIER[node.kind]}). Yours isn’t there yet.`
                : 'Already cracked — give it a few days.'}
        </p>
      </div>
    );
  }

  const skin = SKINS[node.skinId];

  if (!level) {
    return (
      <div className="cyberdeck__hack">
        <Header onBack={onBack} title={node.label} />
        <p className="cyberdeck__hack-sub">{skin.framing}</p>
        <ul className="cyberdeck__levels">
          {levelsFor(node).map((lvl) => {
            const tier = effectiveTier(node, lvl);
            const difficulty = node.variant === 'cipher' ? CIPHER_TIERS[tier].label : HACKING_TIERS[tier].label;
            return (
              <li key={lvl}>
                <button className="cyberdeck__level" onClick={() => setLevel(lvl)}>
                  <span className="cyberdeck__level-name">{LEVEL_LABEL[lvl]}</span>
                  <span className="cyberdeck__level-diff">{difficulty}</span>
                  <span className="cyberdeck__level-pay">${cashFor(tier)} clean · ${Math.ceil(cashFor(tier) / 2)} messy</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const tier = effectiveTier(node, level);

  const resolve = (outcome: RunOutcome) => {
    dispatch({ type: 'HACK_STREET_NODE', nodeId: node.id, outcome, level });
    onDone();
  };

  /**
   * Tool Assist — Milo's actual mentor payoff, not a passive flag. Both his
   * branches grant `aiToolAccess.unlocked`; `trustedMode` is which lesson
   * landed. His own words for it: "You find the thing, you write down what
   * you think it means, and then you let the machine argue with you." So
   * this only ever softens a run already committed to (after Start is a
   * step too late to matter here, but the cost lands before the pulse/guess
   * budget does, same as every other cost in this game) — never a solve,
   * never free, and cheaper for the player who actually learned the
   * discipline than for the one who took the shortcut version of the lesson.
   */
  const canAssist = save.skills.aiToolAccess.unlocked && tier > 1;
  const assistHeatCost = save.skills.aiToolAccess.trustedMode ? 2 : 5;
  const minigameTier = (toolAssisted ? Math.max(1, tier - 1) : tier) as 1 | 2 | 3 | 4;

  if (!briefed) {
    return (
      <div className="scene__stage">
        <MissionBriefing
          kind="hacking"
          variant={node.variant}
          language={skin.language}
          title={skin.title}
          framing={skin.framing}
          brief={`${node.label} — ${LEVEL_LABEL[level]}. Clean, this pays $${cashFor(tier)} — messy pays about half.`}
          relief={heatReliefFor(save, 'hacking')}
          onStart={() => setBriefed(true)}
          onCancel={() => setLevel(null)}
        />
        {canAssist && (
          <div className="cyberdeck__toolassist">
            <button
              disabled={toolAssisted}
              onClick={() => {
                setToolAssisted(true);
                dispatch({
                  type: 'ADD_HEAT',
                  eventId: `tool_assist_${node.id}`,
                  delta: assistHeatCost,
                  logToHistory: true,
                });
              }}
            >
              {toolAssisted
                ? 'Tool assist applied — one tier easier this run'
                : `Ask the tool · one tier easier · Heat +${assistHeatCost}`}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="scene__stage">
      {node.variant === 'cipher' ? (
        <CipherMinigame
          skinId={node.skinId}
          config={buildCipherConfig({
            missionId: node.id,
            tier: minigameTier,
            skillTier: save.skills.hacking.tier,
            heatTier: save.heat.threshold_tier,
            deckTier: deckTier(save),
          })}
          onResolve={resolve}
        />
      ) : (
        <TraceMinigame
          skinId={node.skinId}
          config={buildTraceConfig({
            missionId: node.id,
            tier: minigameTier,
            skinId: node.skinId,
            skillTier: save.skills.hacking.tier,
            heatTier: save.heat.threshold_tier,
            deckTier: deckTier(save),
          })}
          onResolve={resolve}
        />
      )}
    </div>
  );
}

/**
 * Little John — the coin, on its own screen rather than buried at the bottom
 * of a shop list. Ported unchanged from the phone (`Shadow`, as it used to
 * be called there) once Little John became something the deck manages
 * instead of the phone: a store of value and a way to move money that isn't
 * a pocket, still deliberately not a second minigame, but the one number in
 * this game that's supposed to read as genuinely live. The bars are the last
 * several in-fiction days computed straight from `shdwRateOnDay`, not stored
 * history — nothing new to migrate.
 */
function LittleJohnApp({ onBack }: { onBack: () => void }) {
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
function LeadsApp({ onBack }: { onBack: () => void }) {
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

/**
 * The news feed — continuous plot points delivered the way a phone actually
 * delivers them, instead of a cutscene: new cameras, a new data center,
 * safety propaganda, read straight off `content/feed.ts` at whatever
 * `EscalationStage` the town's currently at (`world/escalation.ts`), same
 * stage the patrols/drones/fencing are reading to decide how much of
 * themselves to put on the map. Opening this marks every headline up to the
 * current stage as seen, which is what clears the badge on both this app's
 * own icon and the Cyberdeck button that leads here.
 */
function FeedApp({ onBack }: { onBack: () => void }) {
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

const FILE_CATEGORY_LABEL: Record<FileCategory, string> = {
  corporate: 'Corporate',
  government: 'Government',
  security: 'Security',
  location: 'Location intelligence',
  person: 'Person dossiers',
  technology: 'Technology research',
  hidden: 'Hidden',
};

/**
 * Files: the hidden information layer, unlocked rather than carried — see
 * `content/files.ts`'s own doc comment for why nothing here is a flag. A
 * locked File still gets a row, title withheld, so the list itself is a map
 * of what's still out there rather than a spoiler-free void; the requirement
 * line is in-world flavor, not a debug readout of the actual predicate.
 */
function FilesApp({ onBack }: { onBack: () => void }) {
  const save = useSave();
  const unlocked = new Set(unlockedFiles(save).map((f) => f.id));

  return (
    <div className="cyberdeck__hack">
      <Header onBack={onBack} title="Files" />
      <p className="cyberdeck__hack-sub">
        What the town’s own systems have let slip, once Aaron’s capable of reading it.
      </p>
      <ul className="cyberdeck__files">
        {FILES.map((f) => {
          const isUnlocked = unlocked.has(f.id);
          return (
            <li key={f.id} className={`cyberdeck__file ${isUnlocked ? 'is-unlocked' : ''}`}>
              <span className="cyberdeck__file-category">{FILE_CATEGORY_LABEL[f.category]}</span>
              <b className="cyberdeck__file-title">{isUnlocked ? f.title : 'Locked'}</b>
              <p className="cyberdeck__file-body">{isUnlocked ? f.body : f.requirement}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Coverage, read here instead of off a persistent HUD box — a strategic
 * number a player checks between moves, not one they need mid-step the way
 * Heat's compact bar still is. Same figures, same explain text the HUD box
 * used to carry, just behind a door now instead of parked over the map at
 * all times.
 */
function CoverageApp({ onBack }: { onBack: () => void }) {
  const save = useSave();
  const coverage = coveragePercent(save);
  const covTier = coverageTier(coverage);
  const { sweeps } = save.world.surveillance;

  return (
    <div className="cyberdeck__hack">
      <Header onBack={onBack} title="Coverage" />
      <div className={`hud__coverage hud__coverage--${covTier}`}>
        <div className="hud__heat-row">
          <RiskMeter label="Coverage" value={coverage} max={100} status={covTier} compact />
        </div>
        <p className="hud__tierline">{coverageLabel(covTier)}</p>
        <p className="hud__heat-explain">
          How much of town SafeTrace can see. Every camera covers real ground, and every junction box
          carries the cameras nearest it — cut a box and everything it feeds goes blind until somebody
          comes out to fix it. New cameras go up as the rollout advances. At 100% they sweep the town.
          {sweeps > 0 && ` They’ve swept ${sweeps === 1 ? 'once' : `${sweeps} times`}. The lenses reach further now.`}
        </p>
      </div>
    </div>
  );
}

/**
 * Heat's fuller view. The compact bar stays live in the HUD — the one stat a
 * stealth decision needs mid-step — this is the reference screen underneath
 * it: the same explain text, plus the actual recent history a glance at the
 * HUD can't show.
 */
function HeatApp({ onBack }: { onBack: () => void }) {
  const save = useSave();
  const { current, threshold_tier, history } = save.heat;
  const recent = [...history].slice(-8).reverse();

  return (
    <div className="cyberdeck__hack">
      <Header onBack={onBack} title="Heat" />
      <div className={`hud__heat hud__heat--${threshold_tier}`}>
        <div className="hud__heat-row">
          <RiskMeter label="Heat" value={current} max={100} status={threshold_tier} compact />
        </div>
        <p className="hud__tierline">{tierLabel(threshold_tier)}</p>
        <p className="hud__heat-explain">
          How much attention you’ve drawn. It climbs when you take a risk, and eases on its own day
          by day — faster if you lie low. Past a threshold, people start looking harder: clear,
          watched, flagged, hunted.
        </p>
      </div>
      {recent.length > 0 && (
        <>
          <p className="cyberdeck__hack-sub" style={{ marginTop: 'calc(var(--step) * 1.5)' }}>
            Recent
          </p>
          <ul className="cyberdeck__unlocks">
            {recent.map((e, i) => (
              <li key={i} className="is-unlocked">
                {e.eventId} <span>· {e.delta > 0 ? '+' : ''}{e.delta}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Wraps the existing full-screen Crew overlay inside the deck's own door —
 * same component, same gate (at least one mentor skill unlocked) the HUD
 * button used to check before it would even show. */
function CrewApp({ onBack }: { onBack: () => void }) {
  return <Crew onClose={onBack} />;
}

/**
 * Settings, now living inside the deck rather than floating free — a menu
 * of two doors: Device Settings (the old "Rig" screen, renamed per the build
 * note — a build's own configuration is part of the deck's operating system
 * now, not a peer of Map or Hack) and General Settings (the existing
 * `SettingsPanel`, unchanged, just opened from here). The Backpack keeps its
 * own always-available Settings tile too — see `ui/Hud.tsx`'s doc comment —
 * for a player who hasn't built a deck yet and still needs to mute the game.
 */
function SettingsApp({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<'menu' | 'device' | 'general'>('menu');

  if (view === 'device') return <DeviceSettingsApp onBack={() => setView('menu')} />;
  if (view === 'general') return <SettingsPanel onClose={() => setView('menu')} />;

  return (
    <div className="cyberdeck__hack">
      <Header onBack={onBack} title="Settings" />
      <ul className="cyberdeck__levels">
        <li>
          <button className="cyberdeck__level" onClick={() => setView('device')}>
            <span className="cyberdeck__level-name">Device Settings</span>
            <span className="cyberdeck__level-pay">The build itself — rig tier, what it can reach</span>
          </button>
        </li>
        <li>
          <button className="cyberdeck__level" onClick={() => setView('general')}>
            <span className="cyberdeck__level-name">General Settings</span>
            <span className="cyberdeck__level-pay">Sound, text speed, screen effects</span>
          </button>
        </li>
      </ul>
    </div>
  );
}

/**
 * The build itself, and the ladder it climbs — which kinds of target the
 * current deck tier can actually reach, plus the hacking skill tier (a
 * mentor-taught stat, not a build one) that quietly makes every level
 * easier regardless of kind (`content/hacking.ts`'s +1 pulse/+1 guess at
 * skill tier 2, on top of the deck's own tier-5 version of the same bonus).
 * Formerly the standalone "Rig" screen — same content, now reached through
 * Settings instead of sitting as its own tile on the home grid.
 */
function DeviceSettingsApp({ onBack }: { onBack: () => void }) {
  const save = useSave();
  const rig = deckTier(save);
  const skillTier = save.skills.hacking.tier;
  const hasBoltCutters = owns(save, 'bolt_cutters');

  return (
    <div className="cyberdeck__hack">
      <Header onBack={onBack} title="Device Settings" />
      <p className="cyberdeck__hack-sub">
        {rig > 0 ? `${deckNameForTier(rig)} — build ${rig} of 5.` : 'Nothing built yet. Salvage is out there.'}
      </p>
      <dl className="cyberdeck__stats">
        <dt>Deck tier</dt>
        <dd>{rig > 0 ? `${rig} — what this rig can physically reach` : 'Not built yet'}</dd>
        <dt>Hacking skill</dt>
        <dd>
          {skillTier > 0
            ? `Tier ${skillTier} — how well you work a system once you’re in`
            : 'Self-taught, so far — how well you work a system once you’re in'}
        </dd>
      </dl>
      {/*
        Player-Freedom Audit item #9: two numbers that both read as
        "hacking got better" unless something says otherwise. Copy only —
        the mechanics underneath (`HACK_KIND_MIN_TIER` for the deck tier,
        `skillTier` feeding the minigame's own pulse/guess budget) are
        unchanged.
      */}
      <p className="cyberdeck__hack-sub" style={{ marginTop: 'calc(var(--step) * 1.5)' }}>
        Two different numbers, on purpose. Deck tier decides what you can even reach — the target
        kind, the housing, the door. Hacking skill decides how well you do once you’re inside it.
        Building gets you somewhere new; the mentor lessons make you better once you’re there.
      </p>
      <p className="cyberdeck__hack-sub">
        What this build can reach — the tool opens it, the tier reads it:
      </p>
      <ul className="cyberdeck__unlocks">
        {(Object.entries(HACK_KIND_LABEL) as [StreetHackNode['kind'], string][]).map(([kind, label]) => {
          const unlocked = rig >= HACK_KIND_MIN_TIER[kind] && owns(save, HACK_KIND_TOOL[kind]);
          return (
            <li key={kind} className={unlocked ? 'is-unlocked' : ''}>
              {label} <span>· {toolNameFor(HACK_KIND_TOOL[kind])} · tier {HACK_KIND_MIN_TIER[kind]}</span>
            </li>
          );
        })}
        <li className={rig >= 3 && hasBoltCutters ? 'is-unlocked' : ''}>
          Cameras (FLACK housings) <span>· Bolt Cutters · tier 3</span>
        </li>
        <li className={rig >= 5 ? 'is-unlocked' : ''}>
          +1 pulse/guess on every hack <span>· tier 5</span>
        </li>
      </ul>
    </div>
  );
}
