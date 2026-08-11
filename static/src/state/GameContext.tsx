import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { SaveState, SettingsState, StoryFlags, ThresholdTier } from './schema';
import { resolveRun, type RunOutcome, type RunResult } from '../systems/missions';
import type { Effect } from '../systems/scenes';
import { createNewSave } from './defaults';
import { clearSave, loadSave, writeSave } from './persistence';
import { applyHeat, decayTo, HOME_RELIEF_DECAY, HOME_RELIEF_FLAG, lieLow, TIER_ORDER } from '../systems/heat';
import { applyEffects } from '../systems/effects';
import { buy, buyShdw, sell, sellShdw, tickMarket, useConsumable } from '../systems/market';
import { tickSafehouses } from '../systems/safehouse';
import { drain } from '../systems/heist';
import { collectHidden, craft, sabotageCamera, sellMaterial } from '../systems/materials';
import { applyCatch } from '../systems/consequences';
import { resolveStreetHack } from '../systems/streethacks';
import type { SabotageActionId } from '../world/collectibles';
import { HOME_LOCATION_ID } from '../world/locations';

/** How long the "you can be caught right now" window stays open after a Heat
 * tier crossing — long enough to be a real window, short enough that it
 * reads as a moment rather than a mode. */
const HEAT_ALERT_MS = 10_000;

/**
 * The only writer to the save shape. Every system dispatches through here, so
 * there is exactly one place where state changes and one place that persists.
 */
type Action =
  | { type: 'NEW_GAME'; name: string }
  | { type: 'LOAD'; save: SaveState }
  | { type: 'SET_LOCATION'; locationId: string }
  | { type: 'SET_CHAPTER'; chapterId: string }
  | { type: 'SET_FLAGS'; flags: StoryFlags }
  | { type: 'ADD_HEAT'; eventId: string; delta: number; logToHistory?: boolean }
  | { type: 'LIE_LOW'; amount?: number }
  | { type: 'SET_TRUST'; npcId: string; delta: number; metAt?: string }
  | { type: 'ADVANCE_DAY'; days?: number }
  | { type: 'RESET' }
  | { type: 'RESOLVE_MISSION'; result: RunResult; toolsUsed?: string[]; skinId?: string }
  | { type: 'BUY_ITEM'; itemId: string }
  | { type: 'SELL_ITEM'; itemId: string }
  | { type: 'USE_CONSUMABLE'; itemId: string }
  | { type: 'BUY_SHDW'; cash: number }
  | { type: 'SELL_SHDW'; amount: number }
  | { type: 'DRAIN_WALLET'; walletId: string; redistributeFraction: number }
  | { type: 'SET_SETTING'; patch: Partial<SettingsState> }
  | { type: 'APPLY_EFFECTS'; effects: Effect[] }
  | { type: 'TICK_PLAYTIME'; seconds: number }
  | { type: 'COLLECT_HIDDEN'; obstacleId: string }
  | { type: 'SABOTAGE_CAMERA'; nodeId: string; actionId: SabotageActionId }
  | { type: 'SELL_MATERIAL'; itemId: string }
  | { type: 'CRAFT_ITEM'; recipeId: string }
  | { type: 'CAUGHT'; tier: ThresholdTier }
  | { type: 'HACK_STREET_NODE'; nodeId: string; outcome: RunOutcome };

function reducer(state: SaveState | null, action: Action): SaveState | null {
  if (action.type === 'NEW_GAME') return createNewSave(action.name);
  if (action.type === 'LOAD') return action.save;
  if (action.type === 'RESET') return null;
  if (!state) return state;

  switch (action.type) {
    /**
     * Arriving home is a small, automatic Heat relief — not the Lie Low
     * choice, which costs a day on purpose. Once per in-fiction day
     * (`HOME_RELIEF_FLAG` stamped with the day it was given) so walking in
     * and back out can't be farmed for free Heat.
     */
    case 'SET_LOCATION': {
      const next = { ...state, player: { ...state.player, currentLocation: action.locationId } };
      if (action.locationId !== HOME_LOCATION_ID) return next;
      if (state.player.flags[HOME_RELIEF_FLAG] === state.world.day) return next;
      return {
        ...next,
        heat: applyHeat(next.heat, { eventId: 'home_relief', delta: -HOME_RELIEF_DECAY }),
        player: { ...next.player, flags: { ...next.player.flags, [HOME_RELIEF_FLAG]: state.world.day } },
      };
    }

    case 'SET_CHAPTER':
      return { ...state, player: { ...state.player, currentChapter: action.chapterId } };

    case 'SET_FLAGS':
      return { ...state, player: { ...state.player, flags: { ...state.player.flags, ...action.flags } } };

    case 'ADD_HEAT':
      return { ...state, heat: applyHeat(state.heat, action) };

    /**
     * Lying low costs a day, which is what makes it a choice rather than a
     * reset button. Passive decay for that day is folded in, not stacked —
     * `lieLow` stamps `lastDecayDay`, so `decayTo` won't charge it twice.
     */
    case 'LIE_LOW': {
      const day = state.world.day + 1;
      return tickSafehouses(
        tickMarket({
          ...state,
          world: { ...state.world, day },
          heat: lieLow(state.heat, day, action.amount),
        }),
      );
    }

    case 'SET_TRUST': {
      const prev = state.relationships[action.npcId] ?? {
        trust: 0,
        metAt: action.metAt ?? state.player.currentChapter,
      };
      const trust = Math.max(0, Math.min(100, prev.trust + action.delta));
      return { ...state, relationships: { ...state.relationships, [action.npcId]: { ...prev, trust } } };
    }

    /** The in-fiction clock. Heat decay hangs off this and nothing else. */
    case 'ADVANCE_DAY': {
      const day = state.world.day + (action.days ?? 1);
      // Ageing the market is not optional just because nothing new started:
      // an event that can't expire is a price change that never ends.
      return tickSafehouses(
        tickMarket({ ...state, world: { ...state.world, day }, heat: decayTo(state.heat, day) }),
      );
    }

    /**
     * A finished run. The whole of it lives in `resolveRun` so the Heat cost,
     * the day advance it triggers and the cooldown measured against that day
     * can be tested together — they only make sense together.
     */
    case 'RESOLVE_MISSION':
      return resolveRun(state, action.result, action.toolsUsed, action.skinId);

    /**
     * The market. Every one of these is a pure function of the save that
     * returns the save unchanged when the move isn't legal — the UI has
     * already been told why by `unavailableReason`, and a purchase that half
     * happens is worse than one that doesn't.
     */
    case 'BUY_ITEM':
      return buy(state, action.itemId);

    case 'SELL_ITEM':
      return sell(state, action.itemId);

    case 'USE_CONSUMABLE':
      return useConsumable(state, action.itemId);

    case 'BUY_SHDW':
      return buyShdw(state, action.cash);

    case 'SELL_SHDW':
      return sellShdw(state, action.amount);

    /** Overworld salvage: a hidden bush, a sabotaged camera, sold for SHDW,
     * or built. See systems/materials.ts — each is a no-op on the state it
     * can't perform, same "return the save unchanged" contract as buy/sell. */
    case 'COLLECT_HIDDEN':
      return collectHidden(state, action.obstacleId);

    case 'SABOTAGE_CAMERA':
      return sabotageCamera(state, action.nodeId, action.actionId);

    case 'SELL_MATERIAL':
      return sellMaterial(state, action.itemId);

    case 'CRAFT_ITEM':
      return craft(state, action.recipeId);

    /** A patrol closed the distance inside the alert window. See
     * systems/consequences.ts — no hard fail, ever, just a cost. */
    case 'CAUGHT':
      return applyCatch(state, action.tier);

    /** A cyberdeck job against an ATM or a phone line — cash on a landed
     * run, the same Heat table as any other hack, no mission record. See
     * systems/streethacks.ts. */
    case 'HACK_STREET_NODE':
      return resolveStreetHack(state, action.nodeId, action.outcome);

    /**
     * The drain writes cash, Heat history, town trust and the drained-wallet
     * log together, because the schema's own cross-module rule says a drain
     * does all four and splitting them across call sites is how one gets
     * forgotten.
     */
    case 'DRAIN_WALLET':
      return drain(state, {
        walletId: action.walletId,
        redistributeFraction: action.redistributeFraction,
      });

    /** Scene effects — the only way authored content touches the save. */
    case 'APPLY_EFFECTS':
      return applyEffects(state, action.effects);

    case 'SET_SETTING':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'TICK_PLAYTIME':
      return {
        ...state,
        meta: {
          ...state.meta,
          playtimeSeconds: state.meta.playtimeSeconds + action.seconds,
          lastPlayedAt: new Date().toISOString(),
        },
      };

    default:
      return state;
  }
}

interface GameApi {
  save: SaveState | null;
  dispatch: Dispatch<Action>;
  newGame: (name: string) => void;
  continueGame: () => boolean;
  deleteSave: () => void;
  flag: (key: string) => boolean;
  /**
   * A `performance.now()` timestamp: while `now < heatAlertUntil`, the Heat
   * bar flashes (Hud.tsx) and a patrol that catches the player triggers an
   * escalated consequence instead of the ordinary ambient tick
   * (Overworld.tsx, systems/consequences.ts). 0 when no window is open.
   * Lives here rather than in either component because both need the exact
   * same crossing the other computes — one source, read twice.
   */
  heatAlertUntil: number;
}

const GameCtx = createContext<GameApi | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [save, dispatch] = useReducer(reducer, null);
  const saveRef = useRef(save);
  saveRef.current = save;

  // Persist on every change. Small state, cheap write, no debounce needed yet.
  useEffect(() => {
    if (save) writeSave(save);
  }, [save]);

  // Playtime accrual, also refreshes lastPlayedAt for the continue screen.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (saveRef.current) dispatch({ type: 'TICK_PLAYTIME', seconds: 30 });
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const newGame = useCallback((name: string) => dispatch({ type: 'NEW_GAME', name }), []);

  const continueGame = useCallback(() => {
    const loaded = loadSave();
    if (!loaded) return false;
    // Reconcile decay against the saved day. A no-op unless a migration or a
    // hand-edited save left the two out of step; wall-clock time never matters.
    dispatch({
      type: 'LOAD',
      save: { ...loaded, heat: decayTo(loaded.heat, loaded.world.day) },
    });
    return true;
  }, []);

  const deleteSave = useCallback(() => {
    clearSave();
    dispatch({ type: 'RESET' });
  }, []);

  const flag = useCallback((key: string) => Boolean(saveRef.current?.player.flags[key]), []);

  /*
   * The alert window opens on a tier *increase* only — dropping back down
   * (decay, lying low) is a relief, not a rupture, same rule Hud.tsx's own
   * glitch-on-crossing effect already follows for the same event. Detected
   * here rather than in either consumer so Hud and Overworld can't compute
   * two different answers to "is it flashing right now."
   */
  const [heatAlertUntil, setHeatAlertUntil] = useState(0);
  const prevTierRef = useRef<ThresholdTier | undefined>(save?.heat.threshold_tier);
  useEffect(() => {
    const tier = save?.heat.threshold_tier;
    if (tier && prevTierRef.current && TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(prevTierRef.current)) {
      setHeatAlertUntil(performance.now() + HEAT_ALERT_MS);
    }
    prevTierRef.current = tier;
  }, [save?.heat.threshold_tier]);

  const value = useMemo<GameApi>(
    () => ({ save, dispatch, newGame, continueGame, deleteSave, flag, heatAlertUntil }),
    [save, newGame, continueGame, deleteSave, flag, heatAlertUntil],
  );

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame(): GameApi {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}

/** Convenience for systems that require an active save (overworld, HUD, minigames). */
export function useSave(): SaveState {
  const { save } = useGame();
  if (!save) throw new Error('No active save — render this only inside the game shell');
  return save;
}
