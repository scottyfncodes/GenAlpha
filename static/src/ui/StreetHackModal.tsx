import { useState } from 'react';
import type { StreetHackNode } from '../world/streethacks';
import { cashFor } from '../systems/streethacks';
import { buildCipherConfig, buildTraceConfig } from '../content/hacking';
import { TraceMinigame } from './minigames/TraceMinigame';
import { CipherMinigame } from './minigames/CipherMinigame';
import { MissionBriefing } from './minigames/MissionBriefing';
import { SKINS } from '../content/skins';
import { heatReliefFor } from '../systems/market';
import { useGame, useSave } from '../state/GameContext';
import type { RunOutcome } from '../systems/missions';

/**
 * The street-hack version of `SceneView`'s minigame branch — same briefing,
 * same two mechanics, same result plumbing — just triggered by proximity to
 * a `StreetHackNode` (Overworld.tsx) instead of by a dialogue node. It
 * doesn't own a scene to route through when it's done: there's no "next
 * node" for an ATM, so `onClose` is the whole exit.
 */
export function StreetHackModal({ node, onClose }: { node: StreetHackNode; onClose: () => void }) {
  const save = useSave();
  const { dispatch } = useGame();
  const [briefed, setBriefed] = useState(false);
  const skin = SKINS[node.skinId];

  const resolve = (outcome: RunOutcome) => {
    dispatch({ type: 'HACK_STREET_NODE', nodeId: node.id, outcome });
    onClose();
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
          brief={`${node.label}. Clean, this pays $${cashFor(node.tier)} — messy pays about half.`}
          relief={heatReliefFor(save, 'hacking')}
          onStart={() => setBriefed(true)}
          onCancel={onClose}
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
            tier: node.tier,
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
            tier: node.tier,
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
