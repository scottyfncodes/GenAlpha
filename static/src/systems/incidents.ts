import type { IncidentKind, IncidentLog, SaveState } from '../state/schema';

/**
 * The Incident Book. See `state/schema.ts`'s own doc comment on `IncidentLog`
 * for why this is a separate tally from `systems/casefile.ts`'s dossier: a
 * case entry is a clue the story revealed, an incident is a count of a thing
 * the player did. Nothing here reads a flag, gates an unlock, or ends a run —
 * it is purely "look at all the ridiculous stuff I have done."
 */

/** Display order and copy for the Incidents screen — a fixed list rather
 * than `Object.keys`, so the order is authored (worst-sounding first) and
 * stable across a schema that might grow more kinds later. */
export const INCIDENT_LABELS: { kind: IncidentKind; label: string }[] = [
  { kind: 'camera_disabled', label: 'Cameras disabled' },
  { kind: 'junction_box_cracked', label: 'Junction boxes cracked' },
  { kind: 'signage_hacked', label: 'Signage hacked' },
  { kind: 'street_hack_landed', label: 'Street hacks landed' },
  { kind: 'drone_downed', label: 'Drones downed' },
  { kind: 'times_caught', label: 'Times caught' },
];

/** Bump one counter by `amount` (default 1). Pure, same shape as every other
 * small state-touching helper in this game — callers fold the result into
 * whatever save they're already building rather than dispatching a second
 * action. */
export function bumpIncident(incidents: IncidentLog, kind: IncidentKind, amount = 1): IncidentLog {
  return { ...incidents, [kind]: incidents[kind] + amount };
}

/** Total incidents logged, for the one summary line above the list. */
export function totalIncidents(save: SaveState): number {
  return INCIDENT_LABELS.reduce((sum, { kind }) => sum + save.world.incidents[kind], 0);
}
