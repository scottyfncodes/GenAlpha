import { describe, expect, it } from 'vitest';
import { createNewSave } from '../state/defaults';
import { bumpIncident, INCIDENT_LABELS, totalIncidents } from './incidents';
import { sabotageActionsFor } from '../world/collectibles';
import { sabotageCamera, destroyJunctionBox } from './materials';
import { CAMERA_NODES } from '../world/collectibles';
import { JUNCTION_BOX_NODES } from '../world/junctionboxes';
import { BOLT_CUTTERS, DECK_TIERS } from '../content/economy';
import { grantItem } from './market';

/**
 * The Incident Book's own guardrail, mirrored from `state/schema.ts`'s doc
 * comment on `IncidentLog`: this is a tally for the player to admire, never
 * a gate. Nothing here should ever end up read by `canX` checks — these
 * tests only defend the counting itself.
 */
describe('the Incident Book', () => {
  it('starts every kind at zero', () => {
    const save = createNewSave('Wren');
    expect(totalIncidents(save)).toBe(0);
    for (const { kind } of INCIDENT_LABELS) expect(save.world.incidents[kind]).toBe(0);
  });

  it('bumps one kind without touching the others', () => {
    const save = createNewSave('Wren');
    const next = bumpIncident(save.world.incidents, 'camera_disabled');
    expect(next.camera_disabled).toBe(1);
    expect(next.junction_box_cracked).toBe(0);
  });

  it('bumps by a custom amount', () => {
    const save = createNewSave('Wren');
    const next = bumpIncident(save.world.incidents, 'times_caught', 3);
    expect(next.times_caught).toBe(3);
  });

  it('lists every schema kind exactly once, for the UI to render off', () => {
    const save = createNewSave('Wren');
    const kinds = INCIDENT_LABELS.map((l) => l.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
    for (const kind of kinds) expect(save.world.incidents).toHaveProperty(kind);
  });

  /**
   * The integration checks: real actions that already exist actually land
   * in the tally, not just the pure `bumpIncident` helper in isolation.
   */
  it('a landed camera sabotage bumps the tally', () => {
    let save = createNewSave('Wren');
    save = grantItem(save, BOLT_CUTTERS, 1, 'found');
    save = grantItem(save, DECK_TIERS[2], 1, 'found'); // cyberdeck_3 — canSabotage's own gate
    const node = CAMERA_NODES[0];
    const action = sabotageActionsFor(node)[0];
    save = sabotageCamera(save, node.id, action.id);
    expect(save.world.incidents.camera_disabled).toBe(1);
  });

  it('a cracked junction box bumps the tally', () => {
    let save = createNewSave('Wren');
    save = destroyJunctionBox(save, JUNCTION_BOX_NODES[0].id);
    expect(save.world.incidents.junction_box_cracked).toBe(1);
  });
});
