import type { SaveState, SecurityTier, VillainWallet } from '../state/schema';
import { applyHeat } from './heat';
import { addCash } from './market';
import type { Effect } from './scenes';

/**
 * The seed phrase heist (module 03, Part B) and the Robin Hood mechanic.
 *
 * Deliberately NOT a new minigame. Module 03 is explicit that this is an
 * investigation-plus-social-engineering puzzle whose execution phase reuses
 * Hacking or Sabotage depending on the approach the player picked — so this
 * file owns the *target*: what's known about it, which approaches that opens,
 * what a drain does to the world, and what a failure does to the target. The
 * mechanics stay where they already live.
 *
 * The one thing this file must never do is make the split a puzzle with a
 * right answer. Redistribute-versus-fund is a values expression, and the
 * numbers below are deliberately symmetric: keeping the money buys real
 * capability, giving it away buys real town trust, and nothing in the code
 * scores either one.
 */

export interface HeistClue {
  id: string;
  label: string;
  /** What knowing it tells you, in fiction. */
  finding: string;
}

export interface HeistMethod {
  id: string;
  label: string;
  /** Which existing mechanic executes it. There is no third option by design. */
  kind: 'hacking' | 'sabotage';
  /** The mission id the run resolves against — cooldowns and hardening. */
  missionId: string;
  /** Gated on a clue: an approach you haven't found the way into isn't offered. */
  requiresClue: string;
  blurb: string;
}

export interface HeistTarget {
  walletId: string;
  /** Whose money, in the fiction. */
  holder: string;
  label: string;
  balance: number;
  securityTier: SecurityTier;
  clues: HeistClue[];
  methods: HeistMethod[];
}

/**
 * The drain's own Heat, on top of whatever the execution run cost.
 *
 * Module 02 puts a wallet drain at +10 to +20, the highest single action in
 * the game. The execution run charges the normal Hacking (+3..+8) or Sabotage
 * (+5..+12) cost through the shared table, and this is the rest of it: a clean
 * hack drains at 11 total, a messy physical job at 20. Both ends of the band
 * land where module 02 says they should, and neither number is hidden — the
 * run is previewed by `MissionBriefing` and this is previewed by the
 * redistribution screen before the split is committed.
 */
export const DRAIN_HEAT = 8;

/** Town trust per unit redistributed, and the ceiling on one drain's worth. */
export const TRUST_PER_UNIT = 1 / 400;
export const MAX_TRUST_PER_DRAIN = 15;

const TIER_ORDER: SecurityTier[] = ['low', 'medium', 'high'];

export function walletOf(save: SaveState, walletId: string): VillainWallet | undefined {
  return save.economy.villainWallets.find((w) => w.walletId === walletId);
}

export function isDrained(save: SaveState, walletId: string): boolean {
  return save.economy.villainWalletsDrained.some((w) => w.walletId === walletId);
}

export function hasClue(save: SaveState, walletId: string, clueId: string): boolean {
  return Boolean(walletOf(save, walletId)?.clues.includes(clueId));
}

/**
 * The authored effects that put a target into the save. Content calls this
 * rather than hand-writing the wallet effect, so the balance and security tier
 * in the save can never drift from the ones in the target definition — they're
 * the same object read twice.
 */
export function discoverEffects(target: HeistTarget): Effect[] {
  return [
    {
      kind: 'wallet',
      walletId: target.walletId,
      discover: true,
      balance: target.balance,
      securityTier: target.securityTier,
    },
  ];
}

export function clueEffect(target: HeistTarget, clueId: string): Effect {
  return { kind: 'wallet', walletId: target.walletId, clue: clueId };
}

/**
 * Which approaches are open, and why the closed ones aren't. Returned together
 * so the execution scene can show the shape of the plan the player didn't
 * make — the casing phase's "cleverness is the reward" principle, applied one
 * level up at the mission level.
 */
export function methodsFor(
  save: SaveState,
  target: HeistTarget,
): { method: HeistMethod; open: boolean; missingClue?: string }[] {
  return target.methods.map((method) => {
    const open = hasClue(save, target.walletId, method.requiresClue);
    const clue = target.clues.find((c) => c.id === method.requiresClue);
    return open ? { method, open } : { method, open: false, missingClue: clue?.label };
  });
}

/** Module 02: too hot to attempt safely — the player has to cool down first. */
export function drainBlocked(save: SaveState, walletId: string): string | null {
  if (isDrained(save, walletId)) return 'Already emptied. There’s nothing left in it.';
  if (!walletOf(save, walletId)?.discovered) return 'You don’t know where it is yet.';
  if (save.heat.threshold_tier === 'hunted') {
    return 'Not while you’re this hot. Somebody would be waiting.';
  }
  return null;
}

export function trustFromRedistribution(amount: number): number {
  return Math.min(MAX_TRUST_PER_DRAIN, Math.round(amount * TRUST_PER_UNIT));
}

export interface DrainArgs {
  walletId: string;
  /** 0–1. The rest is kept to fund the resistance. No split is "correct". */
  redistributeFraction: number;
}

/**
 * A successful drain, and everything downstream of it in one place — the
 * schema's own cross-module rule is that a drain writes a Heat history entry
 * and a town-trust delta, because theft isn't free narratively even when it's
 * a win. Splitting those across three call sites is how one of them gets
 * forgotten.
 */
export function drain(save: SaveState, args: DrainArgs): SaveState {
  const wallet = walletOf(save, args.walletId);
  if (!wallet || isDrained(save, args.walletId)) return save;

  const fraction = Math.max(0, Math.min(1, args.redistributeFraction));
  const redistributed = Math.round(wallet.balance * fraction);
  const kept = wallet.balance - redistributed;

  const funded = addCash(save, kept);

  return {
    ...funded,
    heat: applyHeat(funded.heat, {
      eventId: `drain:${args.walletId}`,
      delta: DRAIN_HEAT,
      logToHistory: true,
    }),
    world: {
      ...funded.world,
      townTrust: Math.min(100, funded.world.townTrust + trustFromRedistribution(redistributed)),
    },
    economy: {
      ...funded.economy,
      /** Zeroed, not deleted: the player found it, and that stays true. */
      villainWallets: funded.economy.villainWallets.map((w) =>
        w.walletId === args.walletId ? { ...w, balance: 0 } : w,
      ),
      villainWalletsDrained: [
        ...funded.economy.villainWalletsDrained,
        {
          walletId: args.walletId,
          amountDrained: wallet.balance,
          redistributed,
          timestamp: new Date().toISOString(),
        },
      ],
    },
  };
}

/**
 * A failed attempt. The target notices and tightens; the money doesn't move.
 * The retry cooldown isn't set here — the execution run already goes through
 * `resolveRun`, which owns cooldowns for every mission in the game, and a
 * second one measured differently would be a second source of truth.
 */
export function hardenWallet(save: SaveState, walletId: string): SaveState {
  const wallet = walletOf(save, walletId);
  if (!wallet) return save;
  const next = TIER_ORDER[Math.min(TIER_ORDER.length - 1, TIER_ORDER.indexOf(wallet.securityTier) + 1)];
  return {
    ...save,
    economy: {
      ...save.economy,
      villainWallets: save.economy.villainWallets.map((w) =>
        w.walletId === walletId ? { ...w, securityTier: next } : w,
      ),
    },
  };
}

/** What the player is looking at on the redistribution screen. */
export function drainPreview(save: SaveState, walletId: string, fraction: number) {
  const balance = walletOf(save, walletId)?.balance ?? 0;
  const redistributed = Math.round(balance * Math.max(0, Math.min(1, fraction)));
  return {
    balance,
    redistributed,
    kept: balance - redistributed,
    trust: trustFromRedistribution(redistributed),
    heat: DRAIN_HEAT,
  };
}
