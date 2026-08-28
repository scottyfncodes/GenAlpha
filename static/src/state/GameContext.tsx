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
import {
  collectHidden,
  craft,
  destroyJunctionBox,
  disableDrone,
  flyRecon,
  kamikazeStrike,
  markRelocated,
  sabotageCamera,
  sellMaterial,
  type KamikazeTarget,
} from '../systems/materials';
import { applyCatch } from '../systems/consequences';
import {
  markSwept,
  rearmIfClear,
  repairNetwork,
  sweepDue,
  SWEEP_DAYS,
  SWEEP_HEAT_FLOOR,
} from '../systems/coverage';
import { resolveStreetHack, type HackLevel } from '../systems/streethacks';
import type { SabotageActionId } from '../world/collectibles';
import { HOME_LOCATION_ID } from '../world/locations';
import { revealArea } from '../world/exploration';

/** How long the "you can be caught right now" window stays open after a Heat
 * tier crossing — long enough to be a real window, short enough that it
 * reads as a moment rather than a mode. */
const HEAT_ALERT_MS = 10_000;

/**
 * The only writer to the save shape. Every system dispatches through here, so
 * there is exactly one place where state changes and one place that persists.
 */
type Action =
  | { type: 'NEW_GAME'; name: string; handle: string }
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
  | { type: 'RELOCATE_NODE'; nodeId: string }
  | { type: 'SABOTAGE_CAMERA'; nodeId: string; actionId: SabotageActionId }
  | { type: 'DESTROY_JUNCTION_BOX'; nodeId: string }
  | { type: 'DISABLE_DRONE'; droneId: string; hit: boolean }
  | { type: 'FLY_RECON'; hit: boolean }
  | { type: 'KAMIKAZE_STRIKE'; target: KamikazeTarget; hit: boolean }
  | { type: 'SELL_MATERIAL'; itemId: string }
  | { type: 'CRAFT_ITEM'; recipeId: string }
  | { type: 'CAUGHT'; tier: ThresholdTier }
  | { type: 'HACK_STREET_NODE'; nodeId: string; outcome: RunOutcome; level?: HackLevel }
  | { type: 'REVEAL_AREA'; x: number; y: number; radius: number; kind?: 'explored' | 'scouted' }
  | { type: 'UNLOCK_DISTRICTS'; ids: string[] };

/**
 * Advancing the in-fiction clock, in one place. Both the explicit
 * `ADVANCE_DAY` and the lockdown sweep's own three days go through here, so
 * "a day passing" means exactly the same thing however it was caused —
 * ageing the market and the safehouses is not optional just because it was
 * SafeTrace that moved the calendar rather than the player.
 */
function advanceDays(state: SaveState, days: number): SaveState {
  const day = state.world.day + days;
  return tickSafehouses(
    tickMarket({ ...state, world: { ...state.world, day }, heat: decayTo(state.heat, day) }),
  );
}

/**
 * The lockdown sweep — what happens when SafeTrace gets to 100% coverage.
 *
 * GUARDRAIL (`systems/heat.ts`, and confirmed with the author before this was
 * built): this is a severe forced consequence, not a fail state. It takes
 * days, it takes the network back, and it leaves the town permanently harder
 * to hide in — but the run continues, and every door that was open before it
 * is still open after.
 */
function runLockdownSweep(state: SaveState): SaveState {
  const swept = repairNetwork(advanceDays(state, SWEEP_DAYS));
  // Only ever upward: a player who arrives at the sweep already past the
  // floor doesn't get Heat handed back to them for the privilege.
  const delta = Math.max(0, SWEEP_HEAT_FLOOR - swept.heat.current);
  const withHeat = {
    ...swept,
    heat: applyHeat(swept.heat, { eventId: 'lockdown_sweep', delta, logToHistory: true }),
  };
  return markSwept(withHeat, withHeat.world.day);
}

/**
 * Keep the coverage latch honest after every action that could have moved
 * it. Firing the sweep from here rather than from each of the half-dozen
 * actions that can push coverage over is what stops one of them from being
 * forgotten later — there is exactly one place that decides the town has
 * topped out, and it sees every state change.
 *
 * `sweepDue` already requires the latch to be armed, so the sweep's own
 * three-day jump can't re-trigger it on the way out.
 */
function settleSurveillance(state: SaveState): SaveState {
  if (sweepDue(state)) return runLockdownSweep(state);
  return rearmIfClear(state);
}

export function reducer(state: SaveState | null, action: Action): SaveState | null {
  const next = applyAction(state, action);
  if (!state || !next) return next;
  /*
   * Coverage is a pure function of the day, the cooldown log and the sweep
   * count, so there is nothing to settle unless one of the first two
   * actually moved. This is what keeps `TICK_PLAYTIME` — dispatched on a
   * timer for the whole session — from recomputing a 16,000-cell grid every
   * second for an answer that cannot have changed.
   */
  if (next.world.day === state.world.day && next.world.collectedNodes === state.world.collectedNodes) {
    return next;
  }
  return settleSurveillance(next);
}

function applyAction(state: SaveState | null, action: Action): SaveState | null {
  if (action.type === 'NEW_GAME') return createNewSave(action.name, action.handle);
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
    case 'ADVANCE_DAY':
      return advanceDays(state, action.days ?? 1);

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

    /** A sabotaged node's old spot has been confirmed off screen since its
     * cooldown expired — from here on it renders at its relocated spot
     * instead. See world/relocate.ts and systems/materials.ts markRelocated. */
    case 'RELOCATE_NODE':
      return markRelocated(state, action.nodeId);

    case 'SABOTAGE_CAMERA':
      return sabotageCamera(state, action.nodeId, action.actionId);

    case 'DESTROY_JUNCTION_BOX':
      return destroyJunctionBox(state, action.nodeId);

    case 'DISABLE_DRONE':
      return disableDrone(state, action.droneId, action.hit);

    case 'FLY_RECON':
      return flyRecon(state, action.hit);

    case 'KAMIKAZE_STRIKE':
      return kamikazeStrike(state, action.target, action.hit);

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
      return resolveStreetHack(state, action.nodeId, action.outcome, action.level);

    /** Foot exploration, GPS's own passive radius, and a drone recon flight
     * all funnel through the same call — see world/exploration.ts for why
     * this is a safe no-op on ground already known. */
    case 'REVEAL_AREA':
      return revealArea(state, action.x, action.y, action.radius, action.kind);

    /** A district's own thread has sent the player there — see
     * world/districtlock.ts. Same no-op-on-nothing-new shape as REVEAL_AREA,
     * since Overworld.tsx dispatches this on every render a thread is open. */
    case 'UNLOCK_DISTRICTS': {
      const additions = action.ids.filter((id) => !state.world.unlockedDistricts.includes(id));
      if (additions.length === 0) return state;
      return {
        ...state,
        world: { ...state.world, unlockedDistricts: [...state.world.unlockedDistricts, ...additions] },
      };
    }

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
  newGame: (name: string, handle: string) => void;
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
  /**
   * The street-hack node the player is standing next to right now, if any —
   * `Overworld.tsx`'s own proximity check, mirrored up here so `Hud.tsx` can
   * blink the cyberdeck button without a prop drilled down through `App.tsx`.
   * An id rather than the node itself: `STREET_HACK_NODES` is static data,
   * cheap to re-look-up, and an id is trivial to compare for the "did this
   * actually change" check both Overworld and this need to make every frame.
   */
  nearbyHackNodeId: string | null;
  setNearbyHackNodeId: (id: string | null) => void;
  /**
   * Whether the cyberdeck panel is open — lives here rather than as
   * `Shell`'s own local state (the way `Phone`'s is) because both the HUD
   * button and Overworld's own floating prompt need to open it, and neither
   * is an ancestor of the other.
   */
  cyberdeckOpen: boolean;
  setCyberdeckOpen: (open: boolean) => void;
  /**
   * Whether the full map screen is open — same reasoning as `cyberdeckOpen`:
   * both the HUD's own minimap (tap to expand) and the cyberdeck's Map app
   * need to open it, and neither is an ancestor of the other.
   */
  mapOpen: boolean;
  setMapOpen: (open: boolean) => void;
  /**
   * Whether the drone launch panel (Recon flight / Kamikaze strike) is open —
   * same reasoning as `cyberdeckOpen`: the HUD button that toggles it now
   * lives in `Hud.tsx`, but the panel itself still renders from
   * `Overworld.tsx`, since a kamikaze target has to come from the same
   * proximity data that finds a nearby camera or junction box in the first
   * place, and neither component is an ancestor of the other.
   */
  droneMenuOpen: boolean;
  setDroneMenuOpen: (open: boolean) => void;
  /**
   * The player's own position, throttled — `Overworld.tsx` only pushes an
   * update here when it's moved a few pixels since the last one, the same
   * "cheap to compare, not every frame" shape `nearbyHackNodeId` already
   * uses. Lives here rather than as a prop because the minimap is mounted
   * in `Hud.tsx`, a sibling of `Overworld`, not a descendant of it — this is
   * the only thing the two share a parent for. Null before the overworld's
   * first frame has run.
   */
  playerPos: { x: number; y: number } | null;
  setPlayerPos: (pos: { x: number; y: number }) => void;
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

  const newGame = useCallback((name: string, handle: string) => dispatch({ type: 'NEW_GAME', name, handle }), []);

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

  const [nearbyHackNodeId, setNearbyHackNodeId] = useState<string | null>(null);
  const [cyberdeckOpen, setCyberdeckOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [droneMenuOpen, setDroneMenuOpen] = useState(false);
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number } | null>(null);

  const value = useMemo<GameApi>(
    () => ({
      save,
      dispatch,
      newGame,
      continueGame,
      deleteSave,
      flag,
      heatAlertUntil,
      nearbyHackNodeId,
      setNearbyHackNodeId,
      cyberdeckOpen,
      setCyberdeckOpen,
      mapOpen,
      setMapOpen,
      droneMenuOpen,
      setDroneMenuOpen,
      playerPos,
      setPlayerPos,
    }),
    [
      save,
      newGame,
      continueGame,
      deleteSave,
      flag,
      heatAlertUntil,
      nearbyHackNodeId,
      cyberdeckOpen,
      mapOpen,
      droneMenuOpen,
      playerPos,
    ],
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
