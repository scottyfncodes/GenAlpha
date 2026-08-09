import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { SaveState, SettingsState, StoryFlags } from './schema';
import { resolveRun, type RunResult } from '../systems/missions';
import type { Effect } from '../systems/scenes';
import { createNewSave } from './defaults';
import { clearSave, loadSave, writeSave } from './persistence';
import { applyHeat, decayTo, lieLow } from '../systems/heat';
import { applyEffects } from '../systems/effects';
import { buy, buyShdw, sell, sellShdw, tickMarket, useConsumable } from '../systems/market';
import { tickSafehouses } from '../systems/safehouse';
import { drain } from '../systems/heist';
import { collect, craft, sellMaterial } from '../systems/materials';

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
  | { type: 'COLLECT_NODE'; nodeId: string }
  | { type: 'SELL_MATERIAL'; itemId: string }
  | { type: 'CRAFT_ITEM'; recipeId: string };

function reducer(state: SaveState | null, action: Action): SaveState | null {
  if (action.type === 'NEW_GAME') return createNewSave(action.name);
  if (action.type === 'LOAD') return action.save;
  if (action.type === 'RESET') return null;
  if (!state) return state;

  switch (action.type) {
    case 'SET_LOCATION':
      return { ...state, player: { ...state.player, currentLocation: action.locationId } };

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

    /** Overworld salvage: collect, sell for SHDW, or build. See
     * systems/materials.ts — each is a no-op on the state it can't perform,
     * same "return the save unchanged" contract as buy/sell. */
    case 'COLLECT_NODE':
      return collect(state, action.nodeId);

    case 'SELL_MATERIAL':
      return sellMaterial(state, action.itemId);

    case 'CRAFT_ITEM':
      return craft(state, action.recipeId);

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

  const value = useMemo<GameApi>(
    () => ({ save, dispatch, newGame, continueGame, deleteSave, flag }),
    [save, newGame, continueGame, deleteSave, flag],
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
