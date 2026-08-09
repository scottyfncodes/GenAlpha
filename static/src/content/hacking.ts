import type { DecoyDensity, TraceConfig } from '../systems/trace';
import type { CipherConfig } from '../systems/cipher';
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

/**
 * Cipher's own difficulty table — same shape as `HACKING_TIERS`, sized for a
 * Mastermind-style deduction game instead of a grid walk. Guess budgets stay
 * small on purpose: a 10-guess ceiling still takes real deduction to beat
 * within, it just doesn't take a spreadsheet.
 */
export interface CipherTier {
  codeLength: number;
  symbolCount: number;
  guessBudget: number;
  allowRepeats: boolean;
  label: string;
}

export const CIPHER_TIERS: Record<1 | 2 | 3 | 4, CipherTier> = {
  1: { codeLength: 3, symbolCount: 4, guessBudget: 8, allowRepeats: false, label: 'Intro' },
  2: { codeLength: 4, symbolCount: 5, guessBudget: 9, allowRepeats: false, label: 'Standard' },
  3: { codeLength: 4, symbolCount: 6, guessBudget: 9, allowRepeats: true, label: 'Hardened' },
  4: { codeLength: 5, symbolCount: 6, guessBudget: 10, allowRepeats: true, label: 'Heist-grade' },
};

export interface BuildCipherArgs {
  missionId: string;
  tier: 1 | 2 | 3 | 4;
  /** skills.hacking.tier — 2 grants +1 guess, the same QoL Trace gives as +1 pulse. */
  skillTier: number;
  heatTier: ThresholdTier;
  /** missions[id].hardened — a burned target tightens the guess budget next time. */
  hardened?: number;
}

export function buildCipherConfig(args: BuildCipherArgs): CipherConfig {
  const tier = CIPHER_TIERS[args.tier];
  const hardened = args.hardened ?? 0;

  return {
    missionId: args.missionId,
    codeLength: tier.codeLength,
    symbolCount: tier.symbolCount,
    baseGuessBudget: tier.guessBudget,
    guessBudget: Math.max(
      4,
      tier.guessBudget + budgetNudge(args.heatTier) - hardened + (args.skillTier >= 2 ? 1 : 0),
    ),
    // Seeded on the mission alone — same reasoning as Trace: a hardened
    // target is the same code, just a shorter leash to find it within.
    seed: seedFrom(args.missionId),
    allowRepeats: tier.allowRepeats,
  };
}
