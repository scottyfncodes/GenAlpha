import { useEffect, useRef, useState } from 'react';
import type { Scene, SceneChoice, SceneLine, SceneNode } from '../systems/scenes';
import { completionFlag, heatCostOf, render, visibleChoices, visibleLines } from '../systems/scenes';
import { useGame, useSave } from '../state/GameContext';
import { Glitch } from './Glitch';
import { TraceMinigame } from './minigames/TraceMinigame';
import { SabotageMission } from './minigames/SabotageMission';
import { MissionBriefing } from './minigames/MissionBriefing';
import { buildTraceConfig } from '../content/hacking';
import { buildSabotageConfig, SABOTAGE_MISSIONS } from '../content/sabotage';
import { isPrepped } from '../systems/missions';
import { consumableActive, heatReliefFor } from '../systems/market';
import { Redistribution } from './Redistribution';
import { GenAMark, markStateFor } from './GenAMark';
import type { RunOutcome } from '../systems/missions';
import { SKINS, type SkinId } from '../content/skins';
import './scene-view.css';

const CHARS_PER_TICK: Record<string, number> = { slow: 1, normal: 2, fast: 4 };

/**
 * Renders any scene from any act. Story lives in content data; this component
 * only knows how to walk nodes, reveal lines and hand off to a minigame.
 */
export function SceneView({ scene, onClose }: { scene: Scene; onClose: () => void }) {
  const save = useSave();
  const { dispatch } = useGame();
  const [nodeId, setNodeId] = useState(scene.start);
  /** Briefed once per minigame node — the player agreed to the cost. */
  const [briefed, setBriefed] = useState<string | null>(null);
  const applied = useRef<Set<string>>(new Set());
  const node: SceneNode = scene.nodes[nodeId];

  /**
   * Node effects fire once on entry, before the player reads the lines — with
   * one exception: a minigame node holds its effects until the briefing is
   * accepted, so Heat is previewed and then charged on commit.
   */
  const committed = !node?.minigame || briefed === nodeId;
  useEffect(() => {
    if (!committed || applied.current.has(nodeId)) return;
    applied.current.add(nodeId);
    if (node?.effects?.length) dispatch({ type: 'APPLY_EFFECTS', effects: node.effects });
  }, [nodeId, node, dispatch, committed]);

  const finish = () => {
    dispatch({ type: 'APPLY_EFFECTS', effects: [{ kind: 'flag', key: completionFlag(scene.id) }] });
    onClose();
  };

  if (node?.minigame) {
    const mg = node.minigame;
    const skinId: SkinId =
      mg.kind === 'hacking' ? mg.skinId : (SABOTAGE_MISSIONS[mg.missionId].skinId as SkinId);
    const skin = SKINS[skinId];
    const record = save.missions[mg.missionId];

    /**
     * A real run resolves through the shared Heat table and writes a mission
     * record; a practice run's cost belongs to the scene. Either way the
     * result only routes the story — nothing here can end a scene, and a
     * burned run still walks the player to the next beat.
     */
    const resolve = (outcome: RunOutcome, extra: number[] | string[]) => {
      if (!mg.practice) {
        dispatch({
          type: 'RESOLVE_MISSION',
          result: {
            missionId: mg.missionId,
            kind: mg.kind,
            outcome,
            bankedIntel: mg.kind === 'hacking' ? (extra as number[]) : undefined,
          },
          toolsUsed: mg.kind === 'sabotage' ? (extra as string[]) : undefined,
          // Module 03 hangs the surplus event on *which* target was hit, so
          // the skin travels with the result rather than being re-derived.
          skinId,
        });
      }
      if (outcome === 'clean' || outcome === 'messy') return setNodeId(mg.onWin);
      if (outcome === 'aborted') return setNodeId(mg.onAbort ?? mg.onFail);
      return setNodeId(mg.onFail);
    };

    /**
     * Heat System guardrail 2 applies to story missions too: nothing charges
     * Heat that the player wasn't shown first. The briefing is not optional
     * chrome around the minigame, it's the contract. A practice node states
     * its own flat cost; a real run shows the table's range.
     */
    if (briefed !== nodeId) {
      return (
        <div className="scene__stage">
          <MissionBriefing
            kind={mg.kind}
            language={skin.language}
            title={skin.title}
            framing={skin.framing}
            brief={mg.brief}
            heatRange={mg.practice ? [heatCostOf(node), heatCostOf(node)] : undefined}
            relief={mg.practice ? 0 : heatReliefFor(save, mg.kind)}
            onStart={() => setBriefed(nodeId)}
            onCancel={onClose}
          />
        </div>
      );
    }

    return (
      <div className="scene__stage">
        {mg.kind === 'hacking' ? (
          <TraceMinigame
            skinId={mg.skinId}
            config={buildTraceConfig({
              missionId: mg.missionId,
              tier: mg.tier,
              skinId: mg.skinId,
              skillTier: save.skills.hacking.tier,
              heatTier: save.heat.threshold_tier,
              hardened: mg.practice ? undefined : record?.hardened,
              bankedIntel: mg.practice ? undefined : record?.bankedIntel,
            })}
            onResolve={resolve}
          />
        ) : (
          <SabotageMission
            config={buildSabotageConfig({
              missionId: mg.missionId,
              heatTier: save.heat.threshold_tier,
              hardened: mg.practice ? undefined : record?.hardened,
              prepped: isPrepped(record),
            })}
            inventory={save.economy.inventory.map((i) => i.itemId)}
            onResolve={resolve}
          />
        )}
      </div>
    );
  }

  /**
   * The Robin Hood split. A handoff like a minigame, but it cannot fail and it
   * cannot route — the money is already taken by the time this renders, and
   * the only question left is what happens to it. So it always continues to
   * the same next node, and the scene reads the same either way.
   */
  if (node?.redistribute) {
    return (
      <div className="scene__stage">
        <Redistribution
          walletIds={node.redistribute.walletIds}
          onDone={() => (node.next ? setNodeId(node.next) : finish())}
        />
      </div>
    );
  }

  const goTo = (target?: string) => {
    if (node.end) return finish();
    if (target) return setNodeId(target);
    if (node.next) return setNodeId(node.next);
    return finish();
  };

  return (
    <div className={`scene ${scene.language === 'B' ? 'lang-b' : 'lang-a'}`}>
      <button className="scene__leave" onClick={onClose}>
        Step away
      </button>

      {/* One frame, one node, three acts in the making. Nobody explains it. */}
      {node.showMark && (
        <div className="scene__mark">
          <GenAMark
            state={markStateFor(save.player.currentChapter)}
            size={140}
          />
        </div>
      )}

      <Dialogue
        key={nodeId}
        lines={visibleLines(node, save.heat.threshold_tier)}
        choices={visibleChoices(node, save.player.flags, save.economy.inventory.map((i) => i.itemId))}
        speed={CHARS_PER_TICK[save.settings.textSpeed] ?? 2}
        renderText={(t) => render(t, save)}
        onDone={() => goTo()}
        costOf={(choice) => {
          /*
           * The button states what this actually costs *now*. A choice whose
           * Heat is covered by an active clean SIM must not still advertise
           * the charge — overstating a cost breaks the same contract as
           * hiding one, just in the direction that looks cautious.
           */
          const covered = (choice.effects ?? []).some(
            (e) => e.kind === 'heat' && e.mitigatedBy && consumableActive(save, e.mitigatedBy),
          );
          return covered ? 'Clean SIM covers it' : choice.cost;
        }}
        onChoice={(choice) => {
          if (choice.effects?.length) dispatch({ type: 'APPLY_EFFECTS', effects: choice.effects });
          goTo(choice.goto);
        }}
      />
    </div>
  );
}

function lineClass(l: SceneLine): string {
  if (l.readout) return 'scene__line scene__line--readout';
  return `scene__line ${l.speaker ? 'scene__line--said' : ''}`;
}

function Dialogue({
  lines,
  choices,
  speed,
  renderText,
  costOf,
  onDone,
  onChoice,
}: {
  /** Already resolved against Heat — this component never re-filters. */
  lines: SceneLine[];
  choices: SceneChoice[];
  speed: number;
  renderText: (t: string) => string;
  /** Resolved by the caller — see the clean-SIM note at the call site. */
  costOf: (choice: SceneChoice) => string | undefined;
  onDone: () => void;
  onChoice: (choice: SceneChoice) => void;
}) {
  const [index, setIndex] = useState(0);
  const [chars, setChars] = useState(0);
  const line = lines[index];
  const full = line ? renderText(line.text) : '';
  const typing = chars < full.length;

  useEffect(() => {
    if (!line) return;
    setChars(0);
    const id = window.setInterval(() => {
      setChars((c) => (c >= full.length ? c : c + speed));
    }, 16);
    return () => window.clearInterval(id);
  }, [index, full, speed, line]);

  const atEnd = index >= lines.length - 1;
  const showChoices = atEnd && !typing && choices.length > 0;

  const advance = () => {
    if (typing) return setChars(full.length);
    if (!atEnd) return setIndex((i) => i + 1);
    if (!choices.length) onDone();
  };

  // A node with no lines (a pure routing node) passes straight through.
  const routed = useRef(false);
  useEffect(() => {
    if (lines.length === 0 && !routed.current) {
      routed.current = true;
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Space and Enter advance dialogue. The overworld's own handler is suppressed
   * while a scene is open, so these are the only keys in play here.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (document.activeElement instanceof HTMLButtonElement) return;
      e.preventDefault();
      advance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <div className="scene__body">
        {lines.slice(0, index).map((l, i) => (
          <p key={i} className={lineClass(l)}>
            {l.speaker && <span className="scene__speaker">{l.speaker}</span>}
            {renderText(l.text)}
          </p>
        ))}
        {line && (
          <Glitch active={Boolean(line.glitch) && !typing}>
            <p className={`${lineClass(line)} scene__line--now`}>
              {line.speaker && <span className="scene__speaker">{line.speaker}</span>}
              {full.slice(0, chars)}
              {line.readout && <span className="scene__cursor" aria-hidden="true" />}
            </p>
          </Glitch>
        )}
      </div>

      <div className="scene__foot">
        {showChoices ? (
          <ul className="scene__choices">
            {choices.map((c) => (
              <li key={c.text}>
                <button onClick={() => onChoice(c)}>
                  <span>{renderText(c.text)}</span>
                  {/* An elective cost is stated on the button. Same honesty
                      rule as a mission briefing, at dialogue scale. */}
                  {costOf(c) && <em className="scene__cost">{costOf(c)}</em>}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <button className="scene__next" onClick={advance}>
            {typing ? 'Skip' : atEnd ? 'Continue' : 'Next'}
          </button>
        )}
      </div>
    </>
  );
}
