import type { SaveState } from '../state/schema';
import { gpsTier } from '../systems/market';
import { onCooldown } from '../systems/materials';
import { JUNCTION_BOX_NODES, JUNCTION_BOX_RISK } from './junctionboxes';
import { STREET_HACK_NODES } from './streethacks';
import { SABOTAGE_NODES, SABOTAGE_NODE_RESPAWN_DAYS } from './sabotagenodes';

export interface Poi {
  x: number;
  y: number;
  label: string;
}

/**
 * GPS tier 3's "what's worth investigating" layer — Player-Freedom Audit
 * item #6. A name, never contents: `world/mapview.ts`'s `drawMapView`
 * already refuses to show one outside explored/scouted ground, so this
 * only has to decide *which* fixed points still have something to find,
 * not where the player's allowed to see them. Three sources, three words,
 * on purpose — a marker for every camera, junction box and street-hack
 * node on the map would be exploration's replacement, not its invitation.
 */
export function poisFor(save: SaveState): Poi[] {
  if (gpsTier(save) < 3) return [];
  const pois: Poi[] = [];
  for (const n of JUNCTION_BOX_NODES) {
    if (!onCooldown(save, n.id, JUNCTION_BOX_RISK[n.tier].respawnDays)) pois.push({ x: n.x, y: n.y, label: 'JUNCTION' });
  }
  for (const n of STREET_HACK_NODES) {
    if (!onCooldown(save, n.id, n.respawnDays)) pois.push({ x: n.x, y: n.y, label: 'SIGNAL' });
  }
  for (const n of SABOTAGE_NODES) {
    if (!onCooldown(save, n.id, SABOTAGE_NODE_RESPAWN_DAYS)) pois.push({ x: n.x, y: n.y, label: 'ANOMALY' });
  }
  return pois;
}
