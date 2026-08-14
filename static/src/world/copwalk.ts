import type { ThresholdTier } from '../state/schema';
import type { PatrolRoute } from './patrols';

/**
 * Helio officers on foot — the same contractor the vans and the "Helio
 * officer" who walks you to a payphone (`systems/consequences.ts`
 * `CALL_PARENTS`) already belong to, just covering the ground a van can't:
 * the school perimeter, the square, the residential streets, the fence
 * line. Same `PatrolRoute` shape as `patrols.ts` on purpose — walked with
 * the exact same `stepPatrol`/`patrolPosition` helpers, just on foot.
 */
export const COP_ROUTES: PatrolRoute[] = [
  {
    // The school's own frontage, north side.
    id: 'cop_school_beat',
    loop: false,
    points: [
      { x: 512, y: 60 },
      { x: 700, y: 60 },
    ],
  },
  {
    // A loop around the Town Square, the ground floor of the same block
    // the van's own `center_loop` circles from the road.
    id: 'cop_square_beat',
    loop: true,
    points: [
      { x: 500, y: 350 },
      { x: 630, y: 350 },
      { x: 630, y: 450 },
      { x: 500, y: 450 },
    ],
  },
  {
    // The residential street outside Home and Ellen's.
    id: 'cop_home_beat',
    loop: false,
    points: [
      { x: 176, y: 200 },
      { x: 176, y: 340 },
    ],
  },
  {
    // The Annex fence line, on foot rather than the van's own wider ring.
    id: 'cop_annex_beat',
    loop: false,
    points: [
      { x: 850, y: 400 },
      { x: 1000, y: 400 },
    ],
  },
];

/** Same shape as `PatrolTuning` — slower than a van (this is on foot),
 * closer detection range in exchange (a van drives past, an officer on
 * foot actually looks around). */
export interface CopTuning {
  activeRoutes: number;
  speed: number;
  detectionRadius: number;
  cooldownMs: number;
  heatOnSpot: number;
  hunting: boolean;
}

/**
 * `clear` runs zero, same pacing every other hazard on this map opens
 * with. Officers come online at `watched`, same tier the vans do — foot
 * patrol is the baseline presence, not an escalation past it.
 */
const TUNING: Record<ThresholdTier, CopTuning> = {
  clear: { activeRoutes: 0, speed: 0, detectionRadius: 0, cooldownMs: 6000, heatOnSpot: 0, hunting: false },
  watched: { activeRoutes: 2, speed: 42, detectionRadius: 30, cooldownMs: 5500, heatOnSpot: 1, hunting: false },
  flagged: { activeRoutes: 3, speed: 52, detectionRadius: 38, cooldownMs: 4500, heatOnSpot: 2, hunting: true },
  hunted: { activeRoutes: 4, speed: 62, detectionRadius: 46, cooldownMs: 3500, heatOnSpot: 3, hunting: true },
};

export function copTuning(tier: ThresholdTier): CopTuning {
  return TUNING[tier];
}

export function activeCopRoutes(tier: ThresholdTier): PatrolRoute[] {
  return COP_ROUTES.slice(0, copTuning(tier).activeRoutes);
}
