import type { ThresholdTier } from '../state/schema';
import type { PatrolRoute } from './patrols';
import type { EscalationStage } from './escalation';

/**
 * SafeTrace officers on foot — the same contractor the vans and the "SafeTrace
 * officer" who walks you to a payphone (`systems/consequences.ts`
 * `CALL_PARENTS`) already belong to, just covering the ground a van can't:
 * the school perimeter, the square, the residential streets, the fence
 * line. Same `PatrolRoute` shape as `patrols.ts` on purpose — walked with
 * the exact same `stepPatrol`/`patrolPosition` helpers, just on foot.
 */
export const COP_ROUTES: PatrolRoute[] = [
  {
    // The school's own frontage, Main Street's local street.
    id: 'cop_school_beat',
    loop: false,
    points: [
      { x: 570, y: 196 },
      { x: 770, y: 196 },
    ],
  },
  {
    // A tighter loop around Town Square than the van's own
    // `crossroads_loop` — the ground floor of the same block, circled
    // from closer in.
    id: 'cop_square_beat',
    loop: true,
    points: [
      { x: 615, y: 215 },
      { x: 775, y: 215 },
      { x: 775, y: 305 },
      { x: 615, y: 305 },
    ],
  },
  {
    // The Civic Zone's own pavement, City Hall to the Records Office —
    // on foot, because this is the one district where somebody standing
    // still and looking at you is the normal state of the street.
    id: 'cop_civic_beat',
    loop: false,
    points: [
      { x: 1150, y: 214 },
      { x: 1560, y: 214 },
    ],
  },
  {
    // The residential street outside Home and Ellen's.
    id: 'cop_home_beat',
    loop: false,
    points: [
      { x: 40, y: 220 },
      { x: 350, y: 220 },
    ],
  },
  {
    // The Works' own row, on foot rather than the van's wider sweep.
    id: 'cop_annex_beat',
    loop: false,
    points: [
      { x: 1140, y: 536 },
      { x: 1560, y: 536 },
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

const AMBIENT_SPEED = 34;
const AMBIENT_DETECTION_RADIUS = 22;

/**
 * `stage` (see `world/escalation.ts`) adds routes on top of the Heat tier's
 * own count, capped at how many beats exist — foot patrol becoming part of
 * the ordinary background of town as the story goes on, same additive
 * relationship the drones use.
 */
export function copTuning(tier: ThresholdTier, stage: EscalationStage = 0): CopTuning {
  const base = TUNING[tier];
  const activeRoutes = Math.min(COP_ROUTES.length, base.activeRoutes + stage);
  if (activeRoutes <= 0) return base;
  return {
    ...base,
    activeRoutes,
    speed: base.speed || AMBIENT_SPEED,
    detectionRadius: (base.detectionRadius || AMBIENT_DETECTION_RADIUS) + stage * 2,
  };
}

export function activeCopRoutes(tier: ThresholdTier, stage: EscalationStage = 0): PatrolRoute[] {
  return COP_ROUTES.slice(0, copTuning(tier, stage).activeRoutes);
}
