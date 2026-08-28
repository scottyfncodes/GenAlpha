import { describe, expect, it } from 'vitest';
import { createNewSave } from '../state/defaults';
import { SURVEILLANCE_RELAY } from '../content/sabotage';
import {
  canSabotageNode,
  resolveSabotageNode,
  SABOTAGE_NODE_CASH,
  SABOTAGE_NODES,
} from './sabotagenodes';

describe('repeatable overworld sabotage — audit item #5', () => {
  it('is unreachable without the Sabotage skill', () => {
    const save = createNewSave('Wren');
    for (const node of SABOTAGE_NODES) expect(canSabotageNode(save, node)).toBe(false);
  });

  it('pays out clean, half messy, nothing aborted — same shape a street hack pays', () => {
    const save = createNewSave('Wren');
    const trained = { ...save, skills: { ...save.skills, sabotage: { ...save.skills.sabotage, unlocked: true } } };
    const node = SABOTAGE_NODES[0];

    const clean = resolveSabotageNode(trained, node.id, 'clean');
    expect(clean.economy.cashOnHand).toBe(trained.economy.cashOnHand + SABOTAGE_NODE_CASH);

    const messy = resolveSabotageNode(trained, node.id, 'messy');
    expect(messy.economy.cashOnHand).toBe(trained.economy.cashOnHand + Math.ceil(SABOTAGE_NODE_CASH / 2));

    const aborted = resolveSabotageNode(trained, node.id, 'aborted');
    expect(aborted.economy.cashOnHand).toBe(trained.economy.cashOnHand);
  });

  it('goes on cooldown after a landed attempt, not after an aborted one', () => {
    const save = createNewSave('Wren');
    const trained = { ...save, skills: { ...save.skills, sabotage: { ...save.skills.sabotage, unlocked: true } } };
    const node = SABOTAGE_NODES[0];

    const afterAbort = resolveSabotageNode(trained, node.id, 'aborted');
    expect(canSabotageNode(afterAbort, node)).toBe(true);

    const afterClean = resolveSabotageNode(trained, node.id, 'clean');
    expect(canSabotageNode(afterClean, node)).toBe(false);
  });

  it('every window beat has at least one option a player can always reach', () => {
    // Same invariant systems/sabotage.test.ts already checks for every
    // registered mission — restated here so this file fails on its own if
    // the config it exists to exercise ever regresses.
    const unreachable = SURVEILLANCE_RELAY.windowBeats.filter(
      (b) => !b.options.some((o) => !o.requiresCasingDetail && !o.requiresTool),
    );
    expect(unreachable).toEqual([]);
  });
});
