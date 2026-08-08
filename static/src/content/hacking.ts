import type { DecoyDensity, TraceConfig } from '../systems/trace';
import { SKINS, type SkinId } from './skins';
import { seedFrom } from '../systems/rng';
import { budgetNudge } from '../systems/missions';
import type { ThresholdTier } from '../state/schema';

/** Difficulty tiers straight from module 04's table. Config, not code paths. */
export interface HackingTier {
  gridSize: number;
  decoyDensity: DecoyDensity;
  traceCounterBudget: number;
  pulses: number;
  extraTrapPenalty: boolean;
  label: string;
}

export const HACKING_TIERS: Record<1 | 2 | 3 | 4, HackingTier> = {
  1: { gridSize: 4, decoyDensity: 'low', traceCounterBudget: 14, pulses: 12, extraTrapPenalty: false, label: 'Intro' },
  2: { gridSize: 6, decoyDensity: 'medium', traceCounterBudget: 20, pulses: 18, extraTrapPenalty: false, label: 'Standard' },
  3: { gridSize: 8, decoyDensity: 'high', traceCounterBudget: 26, pulses: 24, extraTrapPenalty: false, label: 'Hardened' },
  4: { gridSize: 9, decoyDensity: 'high', traceCounterBudget: 28, pulses: 26, extraTrapPenalty: true, label: 'Heist-grade' },
};

export interface BuildTraceArgs {
  missionId: string;
  tier: 1 | 2 | 3 | 4;
  skinId: SkinId;
  /** skills.hacking.tier — 2 grants +1 pulse, small QoL, not power creep. */
  skillTier: number;
  heatTier: ThresholdTier;
  /** missions[id].hardened — a burned target is tighter next time. */
  hardened?: number;
  bankedIntel?: number[];
}

export function buildTraceConfig(args: BuildTraceArgs): TraceConfig {
  const tier = HACKING_TIERS[args.tier];
  const skin = SKINS[args.skinId];
  const hardened = args.hardened ?? 0;

  return {
    missionId: args.missionId,
    gridSize: tier.gridSize,
    decoyDensity: tier.decoyDensity,
    baseCounterBudget: tier.traceCounterBudget,
    traceCounterBudget: Math.max(
      6,
      tier.traceCounterBudget + budgetNudge(args.heatTier) * 2 - hardened * 2,
    ),
    pulses: tier.pulses + (args.skillTier >= 2 ? 1 : 0),
    /**
     * Seeded on the mission alone, never on `hardened`. A target that hardens
     * is the same building with tighter security, not a different building —
     * and banked intel is node indices, so reseeding on retry would hand the
     * player four confidently-wrong reveals.
     */
    seed: seedFrom(args.missionId),
    extraTrapPenalty: tier.extraTrapPenalty,
    revealAdjacentCounts: skin.revealAdjacentCounts ?? true,
    bankedIntel: args.bankedIntel,
  };
}
