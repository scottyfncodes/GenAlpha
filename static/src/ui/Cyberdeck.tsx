import { useState } from 'react';
import { useGame, useSave } from '../state/GameContext';
import { STREET_HACK_NODES } from '../world/streethacks';
import { canHackStreetNode, cashFor, effectiveTier, levelsFor, type HackLevel } from '../systems/streethacks';
import { HACKING_TIERS, CIPHER_TIERS, buildCipherConfig, buildTraceConfig } from '../content/hacking';
import { MissionBriefing } from './minigames/MissionBriefing';
import { TraceMinigame } from './minigames/TraceMinigame';
import { CipherMinigame } from './minigames/CipherMinigame';
import { SKINS } from '../content/skins';
import { heatReliefFor } from '../systems/market';
import type { RunOutcome } from '../systems/missions';
import './cyberdeck.css';

/**
 * The cyberdeck: its own device, its own screen, separate from the phone.
 * The phone is the economy (the Table, Salvage, SHDW, Leads) — a burner, the
 * kind of thing a Bellhaven kid already has. This is the thing they built
 * (`content/materials.ts` `craft_cyberdeck`), and the one door into cracking
 * an ATM or a phone line. Same `App`-per-screen shape as `Phone.tsx`, on
 * purpose — the player already knows how to drive this.
 */
type App = 'home' | 'hack' | 'rig';

const LEVEL_LABEL: Record<HackLevel, string> = {
  quick: 'Quick read',
  standard: 'Standard crack',
  deep: 'Deep crack',
};

export function Cyberdeck({ onClose }: { onClose: () => void }) {
  const [app, setApp] = useState<App>('home');

  return (
    <div className="cyberdeck" role="dialog" aria-label="Cyberdeck">
      <div className="cyberdeck__body">
        {app === 'hack' && <HackApp onBack={() => setApp('home')} onDone={onClose} />}
        {app === 'rig' && <RigApp onBack={() => setApp('home')} />}
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
    return (
      <div className="cyberdeck__hack">
        <Header onBack={onBack} title="Hack" />
        <p className="cyberdeck__empty">
          {node ? 'Nothing left to crack here — give it a few days.' : 'Nothing in range. Find an ATM or a phone line.'}
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
          })}
          onResolve={resolve}
        />
      )}
    </div>
  );
}

/** Flavour and one real stat — the hacking skill tier a mentor actually
 * taught, which is the thing that quietly makes every level easier
 * (`content/hacking.ts`'s +1 pulse/+1 guess at skill tier 2). */
function RigApp({ onBack }: { onBack: () => void }) {
  const save = useSave();
  const tier = save.skills.hacking.tier;

  return (
    <div className="cyberdeck__hack">
      <Header onBack={onBack} title="Rig" />
      <p className="cyberdeck__hack-sub">
        Home-soldered. Held together with electrical tape and somebody else’s firmware.
      </p>
      <dl className="cyberdeck__stats">
        <dt>Hacking</dt>
        <dd>{tier > 0 ? `Tier ${tier}` : 'Self-taught, so far'}</dd>
      </dl>
    </div>
  );
}
