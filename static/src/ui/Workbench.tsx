import { useState } from 'react';
import { TraceMinigame } from './minigames/TraceMinigame';
import { CipherMinigame } from './minigames/CipherMinigame';
import { SabotageMission } from './minigames/SabotageMission';
import { MissionBriefing } from './minigames/MissionBriefing';
import { buildTraceConfig, buildCipherConfig } from '../content/hacking';
import { buildSabotageConfig, SABOTAGE_MISSIONS } from '../content/sabotage';
import { SKINS, type SkinId } from '../content/skins';
import { useGame, useSave } from '../state/GameContext';
import { isOnCooldown, isPrepped } from '../systems/missions';
import type { RunOutcome } from '../systems/missions';
import './workbench.css';

type Launch =
  | { kind: 'hacking'; missionId: string; tier: 1 | 2 | 3 | 4; skinId: SkinId }
  | { kind: 'cipher'; missionId: string; tier: 1 | 2 | 3 | 4; skinId: SkinId }
  | { kind: 'sabotage'; missionId: string };

/**
 * Phase 2 test harness. Both mechanics are launchable standalone at every tier
 * and skin, against live save state — so Heat writes, threshold nudges,
 * hardening and cooldowns can be verified before any story content exists.
 * This screen is scaffolding; it doesn't ship to players.
 */
export function Workbench({ onClose }: { onClose: () => void }) {
  const save = useSave();
  const { dispatch } = useGame();
  const [launch, setLaunch] = useState<Launch | null>(null);
  const [running, setRunning] = useState(false);

  const inventory = save.economy.inventory.map((i) => i.itemId);

  const resolve = (kind: 'hacking' | 'sabotage', missionId: string) =>
    (outcome: RunOutcome, extra: number[] | string[]) => {
      dispatch({
        type: 'RESOLVE_MISSION',
        result: {
          missionId,
          kind,
          outcome,
          bankedIntel: kind === 'hacking' ? (extra as number[]) : undefined,
        },
        toolsUsed: kind === 'sabotage' ? (extra as string[]) : undefined,
      });
      setLaunch(null);
      setRunning(false);
    };

  if (launch && running) {
    if (launch.kind === 'hacking') {
      const record = save.missions[launch.missionId];
      return (
        <div className="workbench__stage">
          <TraceMinigame
            key={`${launch.missionId}:${record?.attempts ?? 0}`}
            skinId={launch.skinId}
            config={buildTraceConfig({
              missionId: launch.missionId,
              tier: launch.tier,
              skinId: launch.skinId,
              skillTier: save.skills.hacking.tier,
              heatTier: save.heat.threshold_tier,
              hardened: record?.hardened,
              bankedIntel: record?.bankedIntel,
            })}
            onResolve={resolve('hacking', launch.missionId)}
          />
        </div>
      );
    }
    if (launch.kind === 'cipher') {
      const record = save.missions[launch.missionId];
      return (
        <div className="workbench__stage">
          <CipherMinigame
            key={`${launch.missionId}:${record?.attempts ?? 0}`}
            skinId={launch.skinId}
            config={buildCipherConfig({
              missionId: launch.missionId,
              tier: launch.tier,
              skillTier: save.skills.hacking.tier,
              heatTier: save.heat.threshold_tier,
              hardened: record?.hardened,
            })}
            // Cipher resolves through the same 'hacking' mission record as
            // Trace — it's a different feel on the same mechanic slot, not a
            // different mission kind.
            onResolve={resolve('hacking', launch.missionId)}
          />
        </div>
      );
    }
    const record = save.missions[launch.missionId];
    return (
      <div className="workbench__stage">
        <SabotageMission
          key={`${launch.missionId}:${record?.attempts ?? 0}`}
          config={buildSabotageConfig({
            missionId: launch.missionId,
            heatTier: save.heat.threshold_tier,
            hardened: record?.hardened,
            prepped: isPrepped(record),
          })}
          inventory={inventory}
          onResolve={resolve('sabotage', launch.missionId)}
        />
      </div>
    );
  }

  if (launch) {
    const skin =
      launch.kind === 'sabotage'
        ? SKINS[SABOTAGE_MISSIONS[launch.missionId].skinId as SkinId]
        : SKINS[launch.skinId];
    return (
      <div className="workbench__stage">
        <MissionBriefing
          kind={launch.kind === 'cipher' ? 'hacking' : launch.kind}
          variant={launch.kind === 'cipher' ? 'cipher' : undefined}
          language={skin.language}
          title={launch.kind === 'sabotage' ? SABOTAGE_MISSIONS[launch.missionId].title : skin.title}
          framing={skin.framing}
          brief={launch.kind === 'sabotage' ? SABOTAGE_MISSIONS[launch.missionId].brief : undefined}
          onStart={() => setRunning(true)}
          onCancel={() => setLaunch(null)}
        />
      </div>
    );
  }

  return (
    <div className="workbench">
      <header>
        <h2>Workbench</h2>
        <button onClick={onClose}>Close</button>
      </header>

      <p className="workbench__meta">
        Day {save.world.day} · Heat {save.heat.current} ({save.heat.threshold_tier}) · hacking skill
        tier {save.skills.hacking.tier}
      </p>

      <h3>Trace — hacking</h3>
      <div className="workbench__row">
        {([1, 2, 3, 4] as const).map((tier) => {
          const id = `wb_hack_t${tier}`;
          const cooling = isOnCooldown(save.missions[id], save.world.day);
          return (
          <button
            key={tier}
            disabled={cooling}
            onClick={() =>
              setLaunch({
                kind: 'hacking',
                missionId: id,
                tier,
                skinId: tier === 1 ? 'records' : tier === 2 ? 'resistance' : tier === 3 ? 'villain' : 'heist',
              })
            }
          >
            Tier {tier}
            {cooling ? ' (cooling)' : ''}
          </button>
          );
        })}
      </div>
      <p className="workbench__hint">
        Tier 3 uses the villain skin — it withholds adjacent trap counts. Same rules, worse
        visibility, which is what better security means here.
      </p>

      <h3>Cipher — hacking</h3>
      <div className="workbench__row">
        {([1, 2, 3, 4] as const).map((tier) => {
          const id = `wb_cipher_t${tier}`;
          const cooling = isOnCooldown(save.missions[id], save.world.day);
          return (
            <button
              key={tier}
              disabled={cooling}
              onClick={() =>
                setLaunch({
                  kind: 'cipher',
                  missionId: id,
                  tier,
                  skinId: tier === 1 ? 'records' : tier === 2 ? 'resistance' : tier === 3 ? 'villain' : 'heist',
                })
              }
            >
              Tier {tier}
              {cooling ? ' (cooling)' : ''}
            </button>
          );
        })}
      </div>
      <p className="workbench__hint">
        Same mission plumbing as Trace, a code-breaking feel instead of a grid walk — set a guess,
        read it back, and learn only how many symbols landed and how many were just present.
      </p>

      <h3>Casing &amp; the Window — sabotage</h3>
      <div className="workbench__row">
        {Object.values(SABOTAGE_MISSIONS).map((m) => {
          const cooling = isOnCooldown(save.missions[m.missionId], save.world.day);
          return (
            <button
              key={m.missionId}
              disabled={cooling}
              onClick={() => setLaunch({ kind: 'sabotage', missionId: m.missionId })}
            >
              {m.title}
              {cooling ? ' (cooling)' : ''}
            </button>
          );
        })}
      </div>

      <h3>Test rig</h3>
      <div className="workbench__row">
        <button onClick={() => dispatch({ type: 'ADVANCE_DAY' })}>Advance day (clears cooldowns)</button>
      </div>
      <div className="workbench__row">
        <button
          onClick={() =>
            setLaunch({
              kind: 'hacking',
              missionId: 'annex_side_door',
              tier: 2,
              skinId: 'datacenter',
            })
          }
        >
          Trace the annex first (Tier 2)
        </button>
      </div>
      <p className="workbench__hint">
        Prep is no longer a story flag: run a hacking trace against{' '}
        <code>annex_side_door</code> and the record marks itself prepped, which is what reveals the
        hidden casing detail.
      </p>

      <table className="workbench__table">
        <tbody>
          {Object.entries(save.missions).map(([id, r]) => (
            <tr key={id}>
              <td>{id}</td>
              <td>{r.status}</td>
              <td>×{r.attempts}</td>
              <td>hardened {r.hardened}</td>
              <td>{r.prepped ? 'prepped' : ''}</td>
              <td>{r.cooldownUntilDay ? `until day ${r.cooldownUntilDay}` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
