import { useState } from 'react';
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
import { deckTier, heatReliefFor, owns } from '../systems/market';
import { DECK_TIERS, ITEMS_BY_ID } from '../content/economy';
import type { RunOutcome } from '../systems/missions';
import { MapView } from './MapView';
import './cyberdeck.css';

/**
 * The cyberdeck: its own device, its own screen, separate from the phone.
 * The phone is the economy (the Table, Salvage, SHDW, Leads) — a burner, the
 * kind of thing a Bellhaven kid already has. This is the thing they built
 * (`content/materials.ts` `craft_cyberdeck`), and the one door into cracking
 * an ATM or a phone line. Same `App`-per-screen shape as `Phone.tsx`, on
 * purpose — the player already knows how to drive this.
 */
type App = 'home' | 'hack' | 'rig' | 'map';

const LEVEL_LABEL: Record<HackLevel, string> = {
  quick: 'Quick read',
  standard: 'Standard crack',
  deep: 'Deep crack',
};

/** The build's own name for a given tier of the deck line — read off
 * `DECK_TIERS`/`ITEMS_BY_ID` rather than hand-duplicated, so a rename in
 * content/economy.ts can't drift out of sync with what the Hack tab says. */
function deckNameForTier(tier: number): string {
  const itemId = DECK_TIERS[tier - 1];
  return itemId ? ITEMS_BY_ID[itemId]?.name ?? itemId : `tier ${tier}`;
}

/** Same idea for a physical tool's own name. */
function toolNameFor(itemId: string): string {
  return ITEMS_BY_ID[itemId]?.name ?? itemId;
}

/** Kinds a given deck tier can reach, worst to best — what the Rig tab shows
 * as the player's own unlock ladder. */
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
        {app === 'rig' && <RigApp onBack={() => setApp('home')} />}
        {app === 'map' && <MapApp onBack={() => setApp('home')} />}
        {app === 'home' && <CyberdeckHome onOpen={setApp} onClose={onClose} />}
      </div>
    </div>
  );
}

function CyberdeckHome({ onOpen, onClose }: { onOpen: (app: App) => void; onClose: () => void }) {
  const { nearbyHackNodeId } = useGame();
  const nearby = nearbyHackNodeId ? STREET_HACK_NODES.find((n) => n.id === nearbyHackNodeId) : null;

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
        <button className="cyberdeck__app" onClick={() => onOpen('rig')}>
          <span className="cyberdeck__app-icon">🛠️</span>
          <span>Rig</span>
        </button>
      </div>
    </div>
  );
}

/**
 * The Map app — live from tier 1 on, per the build note that even a Burner
 * Deck should already have "basic map/GPS functionality." Same `MapView`
 * the standalone screen (`ui/Map.tsx`) shows; this is that content inside
 * the deck's own frame instead of its own full-screen overlay.
 */
function MapApp({ onBack }: { onBack: () => void }) {
  return (
    <div className="cyberdeck__map">
      <Header onBack={onBack} title="Map" />
      <div className="cyberdeck__map-body">
        <MapView />
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
            tier,
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
            tier,
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
 * The build itself, and the ladder it climbs — which kinds of target the
 * current deck tier can actually reach, plus the hacking skill tier (a
 * mentor-taught stat, not a build one) that quietly makes every level
 * easier regardless of kind (`content/hacking.ts`'s +1 pulse/+1 guess at
 * skill tier 2, on top of the deck's own tier-5 version of the same bonus).
 */
function RigApp({ onBack }: { onBack: () => void }) {
  const save = useSave();
  const rig = deckTier(save);
  const skillTier = save.skills.hacking.tier;
  const hasBoltCutters = owns(save, 'bolt_cutters');

  return (
    <div className="cyberdeck__hack">
      <Header onBack={onBack} title="Rig" />
      <p className="cyberdeck__hack-sub">
        {rig > 0 ? `${deckNameForTier(rig)} — build ${rig} of 5.` : 'Nothing built yet. Salvage is out there.'}
      </p>
      <dl className="cyberdeck__stats">
        <dt>Hacking skill</dt>
        <dd>{skillTier > 0 ? `Tier ${skillTier}` : 'Self-taught, so far'}</dd>
      </dl>
      <p className="cyberdeck__hack-sub" style={{ marginTop: 'calc(var(--step) * 1.5)' }}>
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
