import type { SaveState, VillainWallet } from '../state/schema';
import { applyHeat } from './heat';
import { addCash, consumableActive, grantItem, refreshPrices } from './market';
import { establish } from './safehouse';
import type { Effect } from './scenes';

/**
 * Authored content's only route into the save. Pure, so it can be driven
 * through a whole mentor mission in a test — which is the point of it living
 * here rather than inside the reducer, where the beat cursor and the skill
 * grants were unreachable by anything except a browser.
 *
 * `GameContext` remains the only *writer*: it owns when this runs and what
 * gets persisted. This owns what an effect means.
 */
export function applyEffects(state: SaveState, effects: Effect[]): SaveState {
  return effects.reduce<SaveState>((acc, effect) => {
    switch (effect.kind) {
      case 'flag':
        return {
          ...acc,
          player: {
            ...acc.player,
            flags: { ...acc.player.flags, [effect.key]: effect.value ?? true },
          },
        };

      /**
       * A mitigated charge is skipped outright rather than reduced to zero, so
       * nothing lands in the history log either — the point of a clean SIM is
       * that this action isn't on your record, not that it cost you less.
       */
      case 'heat': {
        if (effect.mitigatedBy && consumableActive(acc, effect.mitigatedBy)) return acc;
        return {
          ...acc,
          heat: applyHeat(acc.heat, {
            eventId: effect.eventId,
            delta: effect.delta,
            logToHistory: effect.log,
          }),
        };
      }

      case 'trust': {
        const prev = acc.relationships[effect.npcId] ?? {
          trust: 0,
          metAt: effect.metAt ?? acc.player.currentChapter,
        };
        return {
          ...acc,
          relationships: {
            ...acc.relationships,
            [effect.npcId]: {
              ...prev,
              trust: Math.max(0, Math.min(100, prev.trust + effect.delta)),
            },
          },
        };
      }

      case 'chapter':
        return { ...acc, player: { ...acc.player, currentChapter: effect.chapterId } };

      /**
       * Mentor Beat 4. `tier` and `trustedMode` are applied only where the
       * skill actually has them — aiToolAccess has no tier, resistanceIntel has
       * no tier, and a content typo shouldn't be able to graft one on.
       */
      case 'skill': {
        const prev = acc.skills[effect.skill];
        const next = { ...prev } as typeof prev & {
          tier?: number;
          trustedMode?: boolean;
          compromised?: boolean;
        };
        if (effect.unlocked !== undefined) next.unlocked = effect.unlocked;
        if (effect.tier !== undefined && 'tier' in prev) next.tier = effect.tier;
        if (effect.trustedMode !== undefined && 'trustedMode' in prev) {
          next.trustedMode = effect.trustedMode;
        }
        if (effect.compromised !== undefined && 'compromised' in prev) {
          next.compromised = effect.compromised;
        }
        return { ...acc, skills: { ...acc.skills, [effect.skill]: next } };
      }

      /**
       * The mentor template's cursor. This is what closes the door behind a
       * mentor scene, the way a chapter advance does for act content — so it
       * has to create the record on first write, not assume one exists.
       */
      case 'beat': {
        const prev = acc.missions[effect.missionId] ?? {
          status: 'available' as const,
          attempts: 0,
          hardened: 0,
        };
        return {
          ...acc,
          missions: {
            ...acc.missions,
            [effect.missionId]: {
              ...prev,
              beat: effect.beat,
              status: effect.done ? 'complete' : 'in_progress',
            },
          },
        };
      }

      /** Content is the only source of money in the game. See scenes.ts. */
      case 'cash':
        return refreshPrices(addCash(acc, effect.delta));

      case 'item':
        return grantItem(acc, effect.itemId, effect.quantity ?? 1, effect.via ?? 'mission_reward');

      case 'townTrust':
        return {
          ...acc,
          world: {
            ...acc.world,
            townTrust: Math.max(0, Math.min(100, acc.world.townTrust + effect.delta)),
          },
        };

      /**
       * Recon. A wallet is created here on first mention rather than seeded
       * into a new save, so an unfound target leaves no trace in the save file
       * — the player's state should say what they know, not what exists.
       * Balance and security tier are filled in by the heist system when it
       * discovers the target; this only records that they know it's there.
       */
      case 'wallet': {
        const wallets = acc.economy.villainWallets;
        const prev: VillainWallet = wallets.find((w) => w.walletId === effect.walletId) ?? {
          walletId: effect.walletId,
          balance: 0,
          securityTier: 'low',
          discovered: false,
          clues: [],
        };
        const next: VillainWallet = {
          ...prev,
          balance: effect.balance ?? prev.balance,
          securityTier: effect.securityTier ?? prev.securityTier,
          discovered: prev.discovered || Boolean(effect.discover),
          clues: effect.clue && !prev.clues.includes(effect.clue) ? [...prev.clues, effect.clue] : prev.clues,
        };
        return {
          ...acc,
          economy: {
            ...acc.economy,
            villainWallets: wallets.some((w) => w.walletId === effect.walletId)
              ? wallets.map((w) => (w.walletId === effect.walletId ? next : w))
              : [...wallets, next],
          },
        };
      }

      case 'safehouse':
        return establish(acc, effect.id);

      case 'prep': {
        const prev = acc.missions[effect.missionId] ?? {
          status: 'available' as const,
          attempts: 0,
          hardened: 0,
        };
        return {
          ...acc,
          missions: { ...acc.missions, [effect.missionId]: { ...prev, prepped: true } },
        };
      }

      default:
        return acc;
    }
  }, state);
}
