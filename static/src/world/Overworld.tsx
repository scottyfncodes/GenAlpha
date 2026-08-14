import { useEffect, useRef, useState, type PointerEvent } from 'react';
import {
  HOME_LOCATION_ID,
  LOCATIONS,
  MAP_HEIGHT,
  MAP_WIDTH,
  locationAt,
  visibleLocations,
  type OverworldLocation,
} from './locations';
import { OBSTACLES } from './obstacles';
import { NPCS, wanderPos } from './npcs';
import { PATROL_ROUTES, activeRoutes, patrolTuning, type PatrolRoute } from './patrols';
import { activeDroneRoutes, droneTuning, DRONE_ROUTES, DRONE_TAKEDOWN_BY_TOOL_TIER, DRONE_TAKEDOWN_RADIUS } from './drones';
import { COP_ROUTES, activeCopRoutes, copTuning } from './copwalk';
import { gravitate, underTreeCover, UNSEEN_COOLDOWN_MS, UNSEEN_RELIEF_PER_TICK, UNSEEN_TICK_MS } from '../systems/pursuit';
import { escalationStage } from './escalation';
import {
  CAMERA_NODES,
  HIDDEN_PICKUPS,
  HIDDEN_PICKUP_OBSTACLE_IDS,
  sabotageActionsFor,
  type CameraNode,
} from './collectibles';
import { useGame, useSave } from '../state/GameContext';
import type { ThresholdTier } from '../state/schema';
import { LIE_LOW_DECAY, lieLowBlocked } from '../systems/heat';
import { safehouseBlocked, safehouseDecay } from '../systems/safehouse';
import {
  canCollectHidden,
  canDestroyJunctionBox,
  canDisableDrone,
  canFlyRecon,
  canKamikaze,
  canSabotage,
  onCooldown,
  type KamikazeTarget,
} from '../systems/materials';
import { boardTier, droneToolTier, owns, playerDroneTier } from '../systems/market';
import { consequenceFor, HURT_UNTIL_DAY_FLAG } from '../systems/consequences';
import { MATERIALS_BY_ID } from '../content/materials';
import { BLUEPRINTS_BY_ID } from '../content/blueprints';
import { JUNCTION_BOX_NODES, JUNCTION_BOX_RISK, type JunctionBoxNode } from './junctionboxes';
import { ITEMS_BY_ID } from '../content/economy';
import { LIE_LOW_FLAG } from '../content/breather';
import { SAFEHOUSE_ID } from '../content/safehouse';
import { ALL_SCENES } from '../content/all';
import { pendingScenes, scenesAt, type Scene } from '../systems/scenes';
import { SceneView } from '../ui/SceneView';
import { STREET_HACK_INTERACT_RADIUS, STREET_HACK_NODES, type StreetHackNode } from './streethacks';
import { canHackStreetNode, HACK_KIND_TOOL } from '../systems/streethacks';
import { drawTown } from './draw';
import { Market } from '../ui/Market';
import { Garage } from '../ui/Garage';
import { DroneShoot } from '../ui/minigames/DroneShoot';
import { DroneFlight } from '../ui/minigames/DroneFlight';
import { RECON_FAIL_HEAT_PENALTY, type PlayerDroneTier } from '../world/playerdrone';
import { DRONE_SHOOT_MISS_HEAT_PENALTY } from '../systems/droneshoot';
import { play } from '../systems/audio';
import './overworld.css';

/**
 * On foot, deliberately slow — a walk should feel like the thing you're
 * trying to get off of, not a perfectly fine way to cover the map. A first
 * board tier roughly gets a player back to what walking used to feel like;
 * everything past that is the actual payoff.
 */
const SPEED = 80; // world units per second
/**
 * Walking (index 0, implicit — nothing to look up) up through the Hoverboard
 * at tier 5. `boardTier` (systems/market.ts) reads which one's owned; this is
 * purely the speed curve, indexed board-tier 1 to array index 0. Steeper than
 * the old curve on purpose, off a lower walking base: each tier has to read
 * as a real jump, not a rounding error, for the slower walk above to actually
 * feel like it's building toward something.
 */
const BOARD_SPEED: readonly number[] = [1.4, 1.7, 2.1, 2.6, 3.2];
/** Sprint, on foot only — a board already covers "faster" once you own one.
 * Real movement expression instead of pure point-to-point transit: Shift,
 * or the touch Run button, for as long as it's held. */
const SPRINT_MULTIPLIER = 1.6;
/** A van that clocks you while you're running hears you twice as well —
 * getting somewhere fast costs more if you get seen doing it. Applied only
 * at the moment a sighting actually charges Heat, so it's felt exactly when
 * it's paid, not as an invisible always-on tax. */
const SPRINT_HEAT_MULTIPLIER = 2;
/** A close call: standing in a hunting van's circle for this long before
 * stepping back out is close enough to feel it, without it being the catch
 * itself — a fraction of `LINGER_CATCH_MS` below, tuned so it fires with
 * real time to spare rather than right at the wire. */
const CLOSE_CALL_MS = 1200;
/** Fourteen, not a grown mentor's height — shorter than the old proportions
 * on purpose, and shorter than the head radius shrinks by (drawPlayer keeps
 * `headR` fixed), so the head-to-body ratio reads younger on its own. */
const PLAYER_W = 11;
const PLAYER_H = 15;
const SCALE = 2; // pixel-art integer scale
/** How close counts as "close enough to dismantle" for a camera — a hidden
 * bush pickup has no radius of its own, it fires on actually overlapping the
 * bush's rect (see the frame loop), the same feet-box test a building uses. */
const CAMERA_INTERACT_RADIUS = 26;
/** Same idea as `CAMERA_INTERACT_RADIUS`, for a junction box. */
const JUNCTION_BOX_INTERACT_RADIUS = 26;
/**
 * The walkable interior of `home` (locations.ts: x 32-160, y 184-280),
 * inset from `drawHouse`'s own wall rect (y 217-280) so the sprite's head —
 * drawn `PLAYER_H` above its feet — never rises into the roof's airspace
 * (roof bottom at y≈217), and never sinks low enough to sit on top of the
 * door/colour band `drawHomeInteriorMask` (world/draw.ts) paints over.
 * Matched to the same window band the mask cuts out (`houseWindowGeometry`,
 * world/draw.ts — home's own windows run larger than an ordinary house's,
 * on purpose, so there's more to actually see), so wandering the bounds
 * actually carries the player's head through both windows rather than
 * past them.
 */
const HOME_BOUNDS = { x: [44, 148] as const, y: [234, 276] as const };
/**
 * Where the player lands the moment confinement lifts — just outside
 * home's own front door (locations.ts: x32-160,y184-280), offset west of
 * the door's own drawn centre (x96) so the spawn point clears the Garage's
 * interact padding (x92-170 once its own 10px pad is added) rather than
 * landing arguably "at" both locations at once.
 */
const FRONT_DOOR_SPAWN = { x: 70, y: 284 };
/** How far past its own detection radius a hunting van keeps chasing —
 * wider than the circle that started the chase, so breaking line of sight
 * for a moment doesn't shake it instantly. */
const CHASE_RADIUS_MULTIPLIER = 2.5;
/** How long standing inside a hunting van's own red circle takes before it
 * counts as caught, continuous exposure rather than a single sighting. */
const LINGER_CATCH_MS = 2000;

/** Position along a patrol route: which leg (the segment between two
 * consecutive waypoints), how far into it (0..1), and — for a there-and-back
 * route — which direction it's currently walking that leg in. Loop routes
 * never reverse; `dir` only matters for `loop: false` routes. */
interface PatrolState {
  leg: number;
  t: number;
  dir: 1 | -1;
}

function legEndpoints(route: PatrolRoute, leg: number) {
  const n = route.points.length;
  return [route.points[leg], route.points[(leg + 1) % n]] as const;
}

function stepPatrol(route: PatrolRoute, state: PatrolState, distance: number): PatrolState {
  const legCount = route.loop ? route.points.length : route.points.length - 1;
  let { leg, t, dir } = state;
  let remaining = distance;
  // A handful of legs at most, walked a few px per frame — this converges
  // immediately in practice, the cap just rules out an infinite loop if a
  // route were ever authored with a zero-length leg.
  for (let guard = 0; guard < 64 && remaining > 0; guard++) {
    const [a, b] = legEndpoints(route, leg);
    const legLen = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const toEdge = (dir === 1 ? 1 - t : t) * legLen;
    if (remaining < toEdge) {
      t += (dir * remaining) / legLen;
      remaining = 0;
    } else {
      remaining -= toEdge;
      if (route.loop) {
        leg = (leg + 1) % legCount;
        t = 0;
      } else if (dir === 1) {
        if (leg + 1 < legCount) {
          leg += 1;
          t = 0;
        } else {
          dir = -1;
          t = 1;
        }
      } else if (leg - 1 >= 0) {
        leg -= 1;
        t = 1;
      } else {
        dir = 1;
        t = 0;
      }
    }
  }
  return { leg, t, dir };
}

function patrolPosition(route: PatrolRoute, state: PatrolState): { x: number; y: number } {
  const [a, b] = legEndpoints(route, state.leg);
  return { x: a.x + (b.x - a.x) * state.t, y: a.y + (b.y - a.y) * state.t };
}

/**
 * The overworld: sprite, movement, placeholder-rectangle locations, and the
 * entry point into scenes. Rendering is canvas so the map can grow without DOM
 * cost. Palette stays in Language A's cooler tones by default; Language-B
 * locations shift warm locally as pocket-environments (Style Guide 07).
 */
export function Overworld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const save = useSave();
  const { dispatch, heatAlertUntil, setNearbyHackNodeId, setCyberdeckOpen, cyberdeckOpen } = useGame();
  const [nearby, setNearby] = useState<OverworldLocation | null>(null);
  const [open, setOpen] = useState<OverworldLocation | null>(null);
  /** A brief line when a hidden bush gives something up — same "shown, not
   * silent" treatment as `spotted`, since there's no prompt to click for it. */
  const [picked, setPicked] = useState<string | null>(null);
  /** The camera close enough to dismantle right now, if any — this one keeps
   * its prompt, since spending Heat on purpose is a decision, not a walk. */
  const [nearbyCamera, setNearbyCamera] = useState<CameraNode | null>(null);
  /** The ATM or phone close enough to hack right now, if any. Visible and
   * promptable whether or not the player owns a cyberdeck — the node is
   * there either way, same as a camera is; only whether the prompt is
   * clickable depends on the rig. */
  const [nearbyHack, setNearbyHack] = useState<StreetHackNode | null>(null);
  /** The junction box close enough to crack open right now, if any — same
   * "spending Heat is a decision, not a walk" reasoning a camera gets. */
  const [nearbyJunctionBox, setNearbyJunctionBox] = useState<JunctionBoxNode | null>(null);
  /** The drone close enough to take a shot at right now, if any. Unlike a
   * camera or junction box it's also moving and might spot the player back
   * — this is the one prompt on the map for something that isn't just
   * waiting there. */
  const [nearbyDrone, setNearbyDrone] = useState<{ id: string; x: number; y: number } | null>(null);
  /** The drone id currently in the shooting minigame, if any — set the
   * instant the take-down prompt is tapped, cleared on either an actual
   * resolution or a free walk-away. */
  const [droneShootTarget, setDroneShootTarget] = useState<string | null>(null);
  /** The small "Recon flight / Kamikaze strike" panel — the player's own
   * drone, as opposed to the FLACK ones above. */
  const [droneMenuOpen, setDroneMenuOpen] = useState(false);
  /** The flight currently in progress, if any — which mode, and for a
   * kamikaze run, which node it's aimed at. */
  const [droneFlight, setDroneFlight] = useState<
    { mode: 'recon'; targetLabel: string } | { mode: 'kamikaze'; target: KamikazeTarget; targetLabel: string } | null
  >(null);
  /**
   * Held in state, not derived: a scene's own effects change the chapter part
   * way through, which would otherwise unmount the scene mid-read.
   */
  const [active, setActive] = useState<Scene | null>(null);
  const [market, setMarket] = useState(false);
  const [garageOpen, setGarageOpen] = useState(false);
  /** A brief line when a patrol clocks you — Heat that's shown, not hidden. */
  const [spotted, setSpotted] = useState<string | null>(null);
  /** The consequence text when a catch lands inside the alert window —
   * separate from `spotted` because this is a real cost, not ambient
   * pressure, and deserves its own line rather than overwriting one. */
  const [caught, setCaught] = useState<string | null>(null);
  /** A close call: got out of a hunting van's circle with real time already
   * spent in it. Nothing was lost — this is the payoff for the tension, not
   * another cost — so it gets its own line rather than reusing `spotted`'s
   * ambient tone or `caught`'s consequence one. */
  const [closeCall, setCloseCall] = useState<string | null>(null);
  /** Walking (0) up through the Hoverboard (5) — checked every render off
   * inventory rather than a schema field, same as any other owned gear. No
   * mount/dismount toggle the way the car had one: a board isn't something
   * you park, you're just faster once you've built it. */
  const currentBoardTier = boardTier(save);

  /*
   * The draw loop runs off refs rather than closing over state, so the
   * safehouse appearing mid-session has to reach it the same way. A ref kept in
   * sync each render is cheaper than tearing down and rebuilding the loop every
   * time a flag is written.
   */
  const flagsRef = useRef(save.player.flags);
  flagsRef.current = save.player.flags;

  /* Same reason as the flags: the draw loop needs the tier for the Language A
     edge-glitch at flagged+, and rebuilding the loop on every Heat tick would
     be a lot of teardown for a two-pixel scanline. */
  const tierRef = useRef(save.heat.threshold_tier);
  tierRef.current = save.heat.threshold_tier;

  /* Same reason again: `canCollectHidden`/`canSabotage` need the save's
     collected-node log and the current day, and the frame loop can't close
     over `save` directly without going stale the same way flags and tier
     would. */
  const saveRef = useRef(save);
  saveRef.current = save;

  /* Same reason again — the frame loop needs the current board tier for
     both the speed curve and the sprite drawn under the player's feet. */
  const boardTierRef = useRef(0);
  boardTierRef.current = currentBoardTier;

  /* Same reason again: the frame loop needs to know whether the ten-second
     alert window is open right now without waiting for a re-render. */
  const heatAlertUntilRef = useRef(heatAlertUntil);
  heatAlertUntilRef.current = heatAlertUntil;
  /** Which alert window (identified by its own timestamp) has already cost
   * the player a catch — so a second sighting inside the same ten seconds
   * doesn't fire a second consequence on top of the first. */
  const consumedAlertRef = useRef(0);

  /* Last direction of travel, so the sprite reads as turning. Held in a ref
     because it changes every frame and nothing outside the canvas cares. */
  const facing = useRef({ x: 0, y: 1 });

  /**
   * Every thread this location is offering, not just the first. Two mentors
   * can seed a Contact in the same place — Deja and Aaron both start at the
   * school — and taking only the first made the second invisible until the
   * first was finished, which is a hard ordering gate nobody wrote.
   */
  const nearbyScenes = nearby ? scenesAt(save, ALL_SCENES, nearby.id) : [];
  const nearbyScene = nearbyScenes[0] ?? null;
  /** True until Beat 1 closes out — the chapter every new save starts on
   * (`createNewSave`) and `act1.ts`'s own opening scene requires. Drives the
   * one-time "tap to start" callout below; nothing reads this afterward. */
  const isFirstBeat = save.player.currentChapter === 'act1_glitch_01';
  /**
   * Act 1 has one open thread at a time. Once the mentor missions unlock there
   * are up to four, so the hint names the first and says how many others are
   * waiting — still no quest markers, just an honest count.
   */
  const pending = pendingScenes(save, ALL_SCENES);
  const next = pending[0] ?? null;

  const enter = (loc: OverworldLocation) => {
    setOpen(loc);
    // One thread goes straight in. Several, and the player picks — the choice
    // is theirs to make, so it can't be made for them by array order.
    const here = scenesAt(save, ALL_SCENES, loc.id);
    setActive(here.length === 1 ? here[0] : null);
  };
  const leave = () => {
    setOpen(null);
    setActive(null);
    setMarket(false);
    setGarageOpen(false);
  };

  // Spawn on the saved location rather than a hardcoded corner, so a reload
  // doesn't put the player across town from where the story left them.
  const pos = useRef(spawnFor(save.player.currentLocation));
  /**
   * Seeded from the save's own state at mount, not hardcoded `true` — a
   * save that's already past the opening beat has to start this `false`,
   * or the very first frame after a Continue would read as confinement
   * lifting *right now* and teleport the player to the front door on every
   * load. Only a save that's still mid-confinement on mount can ever see
   * this flip during the session, which is the one moment the front-door
   * spawn below is supposed to fire.
   */
  const wasConfinedRef = useRef(save.player.currentChapter === 'act1_glitch_01');
  const keys = useRef<Set<string>>(new Set());
  const touch = useRef({ dx: 0, dy: 0 });
  const nearbyRef = useRef<OverworldLocation | null>(null);
  const enterRef = useRef<(loc: OverworldLocation) => void>(() => {});
  const nearbyCameraRef = useRef<CameraNode | null>(null);
  const nearbyHackRef = useRef<StreetHackNode | null>(null);
  const nearbyJunctionBoxRef = useRef<JunctionBoxNode | null>(null);
  const nearbyDroneRef = useRef<{ id: string; x: number; y: number } | null>(null);
  /** Mirrors `active` for the frame loop, same reason `saveRef`/`tierRef` do
   * — a closure created once by `useEffect` can't read fresh state directly. */
  const activeRef = useRef<Scene | null>(null);
  activeRef.current = active;
  /** Mirrors `open` for the frame loop — whether the player currently has
   * a location's own card up, and specifically whether that location is a
   * `canLieLow` one, is what the gravity/unseen-cooldown logic below reads
   * as "actually out of sight" rather than just standing in the street. */
  const openRef = useRef<OverworldLocation | null>(null);
  openRef.current = open;
  /** Hidden pickups currently underfoot, so one fires once on approach rather
   * than every single frame the player happens to be standing on it. */
  const contactRef = useRef<Set<string>>(new Set());
  /** True while a scene or location card owns the screen. */
  const blockedRef = useRef(false);

  /*
   * Every route keeps moving all the time, even the ones Heat hasn't turned
   * on yet — so when a fifth van comes online at `hunted` it's mid-beat like
   * the rest of them, not spawning fresh at its own start point. Only the
   * ones `activeRoutes(tier)` currently includes get drawn or checked for a
   * sighting. Per-route cooldown timestamps live alongside so one van can't
   * charge Heat every single frame it happens to be standing on the player.
   */
  const patrolStateRef = useRef<Map<string, PatrolState>>(
    new Map(PATROL_ROUTES.map((r) => [r.id, { leg: 0, t: 0, dir: 1 as const }])),
  );
  const patrolCooldownRef = useRef<Map<string, number>>(new Map());
  /** Where a hunting van actually is right now, once it's peeled off its
   * route to chase — diverges from `patrolStateRef`'s route math for as
   * long as the chase lasts, and is what gets drawn and checked against the
   * player instead. Absent for a van that's never left its route. */
  const patrolChaseRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  /** When the player entered a van's circle without having left it since —
   * cleared the instant they step outside it, so this measures continuous
   * exposure, not a running total. */
  const patrolLingerRef = useRef<Map<string, number>>(new Map());

  /** Same "always walking, only the active subset drawn or checked" shape
   * as `patrolStateRef` — a drone that comes online at `hunted` is already
   * mid-route, not spawning fresh. No chase/linger state: a drone that
   * spots the player logs it and keeps flying its route rather than
   * peeling off after them — it can still coincide with a Heat-tier alert
   * window and count as a catch, same as a van or an officer would, just
   * never by actively pursuing. */
  const droneStateRef = useRef<Map<string, PatrolState>>(
    new Map(DRONE_ROUTES.map((r) => [r.id, { leg: 0, t: 0, dir: 1 as const }])),
  );
  const droneCooldownRef = useRef<Map<string, number>>(new Map());

  /** An officer on foot — same shape as the drone's own state, no chase or
   * linger of its own; gravity (`systems/pursuit.ts`) is what brings one
   * close enough to matter as Heat climbs. */
  const copStateRef = useRef<Map<string, PatrolState>>(
    new Map(COP_ROUTES.map((r) => [r.id, { leg: 0, t: 0, dir: 1 as const }])),
  );
  const copCooldownRef = useRef<Map<string, number>>(new Map());

  /** The last moment any van, drone or officer actually had the player
   * inside its own detection radius — reset every time one does, read
   * after all three loops to see whether enough uninterrupted time (or a
   * `canLieLow` roof) has passed to start easing Heat off on its own,
   * on top of the ordinary day-based decay (`systems/pursuit.ts`
   * `UNSEEN_COOLDOWN_MS`). Starts at `now` on mount rather than 0 so a
   * fresh page load doesn't read as "already been hidden forever". */
  const lastSpottedAtRef = useRef(performance.now());
  const lastUnseenTickRef = useRef(performance.now());

  enterRef.current = enter;
  blockedRef.current = Boolean(open) || cyberdeckOpen || Boolean(droneShootTarget) || Boolean(droneFlight);

  // Movement + render loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener('resize', resize);

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      let dx = blockedRef.current ? 0 : touch.current.dx;
      let dy = blockedRef.current ? 0 : touch.current.dy;
      if (keys.current.has('a') || keys.current.has('arrowleft')) dx -= 1;
      if (keys.current.has('d') || keys.current.has('arrowright')) dx += 1;
      if (keys.current.has('w') || keys.current.has('arrowup')) dy -= 1;
      if (keys.current.has('s') || keys.current.has('arrowdown')) dy += 1;

      const moving = dx !== 0 || dy !== 0;
      if (moving) facing.current = { x: Math.sign(dx), y: Math.sign(dy) };

      const len = Math.hypot(dx, dy) || 1;

      // A board already means "faster" — sprint is on-foot expression, not a
      // stack. Keyboard only: Shift, held, read fresh off the same keys set
      // movement already reads. No touch equivalent — the joystick is
      // already the whole surface touch gets, and a second held button
      // crowded the corner for a mechanic keyboard players get for free.
      const sprinting = moving && boardTierRef.current === 0 && keys.current.has('shift');

      /*
       * Buildings are solid: the player can no longer walk through or over
       * one. Whichever building the player is already standing in (the one
       * they spawned in, or the one their last scene closed on) stays
       * passable for this frame — otherwise a save that opens dead centre on
       * a location's rectangle would find that same rectangle unwalkable and
       * be stuck. Every other visible building blocks, and so does every
       * maze filler — those have no "already inside" case since nothing ever
       * spawns inside one. Movement resolves one axis at a time so the
       * player slides along a wall rather than stopping dead on a diagonal
       * approach.
       */
      const visible = visibleLocations(flagsRef.current);
      // How far the town's own baseline surveillance has crept up over the
      // course of the story so far — see world/escalation.ts. Filters both
      // collision and drawing below, so a stage-gated fence segment isn't
      // just invisible before its day, it isn't solid yet either.
      const stage = escalationStage(saveRef.current.world.day);
      const activeObstacles = OBSTACLES.filter((o) => !o.minStage || stage >= o.minStage);
      // A bush hiding a salvage find is walkable, full stop — that's the only
      // tell it ever gives, so it can't also be a wall.
      const solidObstacles = activeObstacles.filter((o) => !HIDDEN_PICKUP_OBSTACLE_IDS.has(o.id));
      const blockers: { x: number; y: number; w: number; h: number }[] = [...visible, ...solidObstacles];
      const solid = blockers.filter((l) => !overlapsBuilding(pos.current.x, pos.current.y, l));

      // A skull-cracked consequence leaves this behind for a day — a cost
      // that's felt rather than a screen that says so.
      const hurt = Number(flagsRef.current[HURT_UNTIL_DAY_FLAG] ?? 0) > saveRef.current.world.day;
      const boardMultiplier = boardTierRef.current > 0 ? BOARD_SPEED[boardTierRef.current - 1] : 1;
      const base = boardTierRef.current > 0 ? SPEED * boardMultiplier : SPEED * (sprinting ? SPRINT_MULTIPLIER : 1);
      const speed = base * (hurt ? 0.6 : 1);

      /*
       * Before the very first prompt is ever tapped, the player doesn't get
       * to leave the house — the door isn't a door yet, it's a wall with a
       * different colour on it. `confinedToHome` covers exactly the window
       * from a new save's first frame to the moment `enter(nearby)` opens
       * the opening scene: the whole beat plays out inside that one active
       * scene afterward (chapter only advances once it closes), so there's
       * no later point this could wrongly re-trigger at. `HOME_BOUNDS` sits
       * inside the wall rect `world/draw.ts` `drawHouse` actually paints,
       * with enough headroom that the sprite's head — drawn above its own
       * feet — never pokes above the roofline into open air.
       */
      const confinedToHome = saveRef.current.player.currentChapter === 'act1_glitch_01' && !activeRef.current;
      // The instant confinement lifts (the opening scene just closed), the
      // player steps out at the front door rather than wherever inside
      // `HOME_BOUNDS` they happened to be standing when it ended.
      if (wasConfinedRef.current && !confinedToHome) pos.current = { ...FRONT_DOOR_SPAWN };
      wasConfinedRef.current = confinedToHome;
      const xBounds = confinedToHome ? HOME_BOUNDS.x : ([8, MAP_WIDTH - 8] as const);
      const yBounds = confinedToHome ? HOME_BOUNDS.y : ([8, MAP_HEIGHT - 8] as const);

      const nx = clamp(pos.current.x + (dx / len) * speed * dt, xBounds[0], xBounds[1]);
      if (confinedToHome || !solid.some((l) => overlapsBuilding(nx, pos.current.y, l))) pos.current.x = nx;

      const ny = clamp(pos.current.y + (dy / len) * speed * dt, yBounds[0], yBounds[1]);
      if (confinedToHome || !solid.some((l) => overlapsBuilding(pos.current.x, ny, l))) pos.current.y = ny;

      const here = locationAt(pos.current.x, pos.current.y, flagsRef.current);
      if (here?.id !== nearbyRef.current?.id) {
        nearbyRef.current = here;
        setNearby(here);
        if (here) dispatch({ type: 'SET_LOCATION', locationId: here.id });
      }

      /*
       * Hidden bush pickups. No prompt, no key to press — walking into one is
       * the whole interaction, and nothing about it looks different from any
       * other bush until you're standing in it (see collectibles.ts). One
       * already taken and on cooldown is skipped here the same way a spent
       * location thread would be.
       *
       * `contactRef` fires the pickup once per approach rather than once per
       * frame spent standing on it — `collectHidden` is idempotent either way
       * (systems/materials.ts), this is purely so the toast doesn't reset
       * itself twenty times while the player is still standing there.
       */
      const stillTouching = new Set<string>();
      // A very slight sparkle on any bush that still has something in it —
      // just enough of a tell that a player who's found one once starts
      // noticing the others, without spelling out which bush before they've
      // walked into it (the "cut every bush" instinct stays the discovery,
      // this only rewards a second look at the right one).
      const sparklingObstacleIds = new Set<string>();
      for (const pickup of HIDDEN_PICKUPS) {
        if (!canCollectHidden(saveRef.current, pickup.obstacleId)) continue;
        sparklingObstacleIds.add(pickup.obstacleId);
        const bush = OBSTACLES.find((o) => o.id === pickup.obstacleId);
        if (!bush || !overlapsBuilding(pos.current.x, pos.current.y, bush)) continue;

        stillTouching.add(pickup.obstacleId);
        if (contactRef.current.has(pickup.obstacleId)) continue;

        dispatch({ type: 'COLLECT_HIDDEN', obstacleId: pickup.obstacleId });
        // A find is a material, cash, or both — say whichever it actually was
        // rather than defaulting to a generic "salvage" that's wrong for a
        // pure cash pickup.
        const itemName = pickup.itemId ? MATERIALS_BY_ID[pickup.itemId]?.name : undefined;
        const parts = [
          itemName ? `${pickup.quantity && pickup.quantity > 1 ? `${pickup.quantity}× ` : ''}${itemName}` : null,
          pickup.cash ? `$${pickup.cash}` : null,
        ].filter(Boolean);
        const found = parts.length > 0 ? parts.join(' + ') : 'salvage';
        setPicked(`Found something: ${found}`);
        window.setTimeout(() => setPicked((m) => (m === `Found something: ${found}` ? null : m)), 1600);
      }
      contactRef.current = stillTouching;

      /*
       * Cameras worth sabotaging. Deliberate rather than automatic — every
       * tier spends Heat, so this keeps the prompt-and-key pattern a location
       * uses rather than the hidden pickups' silent walk-through. Visible and
       * targetable on cooldown rules alone — same as a street hack node —
       * regardless of whether the deck can actually reach one yet
       * (`canSabotage` also requires deck tier 3+); a FLACK housing standing
       * on its pole is still standing whether or not the player's rig can
       * read it. One just taken down stays gone until TraceBook's had time to
       * replace it, regardless of which of the three actions did it.
       */
      const cameraDraw: { x: number; y: number; dismantlable: boolean }[] = [];
      let closestCamera: CameraNode | null = null;
      let closestCameraDist = CAMERA_INTERACT_RADIUS;
      for (const node of CAMERA_NODES) {
        if (onCooldown(saveRef.current, node.id, node.respawnDays)) continue;
        const dist = Math.hypot(node.x - pos.current.x, node.y - pos.current.y);
        const inRange = dist < CAMERA_INTERACT_RADIUS;
        cameraDraw.push({ x: node.x, y: node.y, dismantlable: inRange });
        if (inRange && dist < closestCameraDist) {
          closestCameraDist = dist;
          closestCamera = node;
        }
      }
      if (closestCamera?.id !== nearbyCameraRef.current?.id) {
        nearbyCameraRef.current = closestCamera;
        setNearbyCamera(closestCamera);
      }

      /*
       * Street hacks: ATMs, phone lines. Visible and promptable on cooldown
       * rules alone — same `onCooldown` log the cameras use — regardless of
       * whether the player owns a cyberdeck yet; a locked door is still a
       * door. Whether it's actually openable is a `canHackStreetNode` check
       * at the point of interaction, not a reason to hide it from the map.
       */
      const hackDraw: { x: number; y: number; kind: StreetHackNode['kind']; hackable: boolean }[] = [];
      let closestHack: StreetHackNode | null = null;
      let closestHackDist = STREET_HACK_INTERACT_RADIUS;
      for (const node of STREET_HACK_NODES) {
        if (onCooldown(saveRef.current, node.id, node.respawnDays)) continue;
        const dist = Math.hypot(node.x - pos.current.x, node.y - pos.current.y);
        const inRange = dist < STREET_HACK_INTERACT_RADIUS;
        hackDraw.push({ x: node.x, y: node.y, kind: node.kind, hackable: inRange });
        if (inRange && dist < closestHackDist) {
          closestHackDist = dist;
          closestHack = node;
        }
      }
      if (closestHack?.id !== nearbyHackRef.current?.id) {
        nearbyHackRef.current = closestHack;
        setNearbyHack(closestHack);
        // Mirrored into GameContext so the HUD's cyberdeck button can blink
        // without Overworld having to reach up through App.tsx to do it.
        setNearbyHackNodeId(closestHack?.id ?? null);
      }

      /*
       * Junction boxes. Visible on cooldown rules alone, same as a camera or
       * a street hack — the box is there whether or not it's worth cracking
       * open right now.
       */
      const junctionBoxDraw: { x: number; y: number; tier: JunctionBoxNode['tier']; crackable: boolean }[] = [];
      let closestJunctionBox: JunctionBoxNode | null = null;
      let closestJunctionBoxDist = JUNCTION_BOX_INTERACT_RADIUS;
      for (const node of JUNCTION_BOX_NODES) {
        if (onCooldown(saveRef.current, node.id, JUNCTION_BOX_RISK[node.tier].respawnDays)) continue;
        const dist = Math.hypot(node.x - pos.current.x, node.y - pos.current.y);
        const inRange = dist < JUNCTION_BOX_INTERACT_RADIUS;
        junctionBoxDraw.push({ x: node.x, y: node.y, tier: node.tier, crackable: inRange });
        if (inRange && dist < closestJunctionBoxDist) {
          closestJunctionBoxDist = dist;
          closestJunctionBox = node;
        }
      }
      if (closestJunctionBox?.id !== nearbyJunctionBoxRef.current?.id) {
        nearbyJunctionBoxRef.current = closestJunctionBox;
        setNearbyJunctionBox(closestJunctionBox);
      }

      // A location's own card up, and it's one of the ones you can
      // actually disappear into (home, the arcade, the treehouse, …) —
      // gravity stops pulling anything toward the player this frame, and
      // the unseen-cooldown relief below fires immediately rather than
      // waiting out `UNSEEN_COOLDOWN_MS` in the open.
      const inSafeSpace = Boolean(openRef.current?.canLieLow);

      // A tree's canopy blocks a drone's own downward-looking eye — not a
      // van's or a cop's, both of which are looking straight ahead at
      // ground level and couldn't care less what's overhead. Only the
      // drone loop below reads this.
      const hiddenByTree = underTreeCover(pos.current, activeObstacles);

      /*
       * Drones — FLACK Phase Two. Every route keeps flying regardless of
       * tier, same "always moving, only the active subset checked" shape as
       * the ground patrols; only spotting differs, since a drone that
       * clocks the player logs it and keeps flying rather than giving
       * chase of its own. It can still coincide with a Heat-tier alert
       * window and count as a catch — same consequence, same trip home,
       * just never by actively pursuing. Independently, whichever drone is
       * currently closest and within `DRONE_TAKEDOWN_RADIUS` becomes the
       * one the take-down prompt offers — a drone already knocked down for
       * the day (`onCooldown`) isn't drawn or checked at all, same as a
       * cracked junction box. Standing under a tree suppresses both the
       * gravity pull and the detection check below — a drone can fly
       * directly overhead and never know.
       */
      const droneTune = droneTuning(tierRef.current, stage);
      const activeDrones = new Set(activeDroneRoutes(tierRef.current, stage).map((r) => r.id));
      const droneDraw: { x: number; y: number; radius: number; takeable: boolean }[] = [];
      let closestDrone: { id: string; x: number; y: number } | null = null;
      let closestDroneDist = DRONE_TAKEDOWN_RADIUS;
      for (const route of DRONE_ROUTES) {
        const prev = droneStateRef.current.get(route.id)!;
        const next = stepPatrol(route, prev, droneTune.speed * dt);
        droneStateRef.current.set(route.id, next);
        if (!activeDrones.has(route.id)) continue;
        if (onCooldown(saveRef.current, route.id, DRONE_TAKEDOWN_BY_TOOL_TIER[1].respawnDays)) continue;

        const basePos = patrolPosition(route, next);
        const p = inSafeSpace || hiddenByTree ? basePos : gravitate(basePos, pos.current, tierRef.current, dt);
        const dist = Math.hypot(p.x - pos.current.x, p.y - pos.current.y);
        const inRange = dist < DRONE_TAKEDOWN_RADIUS;
        droneDraw.push({ x: p.x, y: p.y, radius: droneTune.detectionRadius, takeable: inRange });
        if (inRange && dist < closestDroneDist) {
          closestDroneDist = dist;
          closestDrone = { id: route.id, x: p.x, y: p.y };
        }

        if (dist < droneTune.detectionRadius && !hiddenByTree) {
          lastSpottedAtRef.current = now;

          const inAlertWindow =
            now < heatAlertUntilRef.current && heatAlertUntilRef.current !== consumedAlertRef.current;
          if (inAlertWindow) {
            consumedAlertRef.current = heatAlertUntilRef.current;
            const tier = tierRef.current;
            const consequence = consequenceFor(saveRef.current, tier);
            if (consequence) {
              dispatch({ type: 'CAUGHT', tier });
              pos.current = spawnFor(HOME_LOCATION_ID);
              setCaught(consequence.label);
              window.setTimeout(() => setCaught((m) => (m === consequence.label ? null : m)), 4000);
              continue;
            }
          }

          const lastHit = droneCooldownRef.current.get(route.id) ?? -Infinity;
          if (now - lastHit > droneTune.cooldownMs) {
            droneCooldownRef.current.set(route.id, now);
            const heatOnSpot = droneTune.heatOnSpot * (sprinting ? SPRINT_HEAT_MULTIPLIER : 1);
            dispatch({
              type: 'ADD_HEAT',
              eventId: `drone_spotted_${route.id}`,
              delta: heatOnSpot,
              logToHistory: false,
            });
            setSpotted(sprinting ? 'Running got you noticed — that’s double the Heat.' : 'A drone banks toward you, then away.');
            window.setTimeout(() => setSpotted((m) => (m === null ? m : null)), 1800);
          }
        }
      }
      if (closestDrone?.id !== nearbyDroneRef.current?.id) {
        nearbyDroneRef.current = closestDrone;
        setNearbyDrone(closestDrone);
      }

      /*
       * Patrols. Every route keeps walking regardless of tier; only the
       * active subset is drawn or checked against the player, and each has
       * its own cooldown so standing in one van's radius can't machine-gun
       * Heat every frame. The Heat cost is small and ambient on purpose —
       * this is background pressure from wandering, not a mission charge.
       *
       * At `flagged`+ (`tuning.hunting`), a van already close enough to spot
       * the player stops following its route and drives straight at them
       * instead, for as long as they stay within chase range — security
       * going from passive to aggressive at the quarterly thresholds. The
       * route's own state keeps advancing underneath the chase either way,
       * so a van that gives up resumes patrolling from wherever the route
       * naturally is rather than picking up mid-chase.
       */
      const tuning = patrolTuning(tierRef.current, stage);
      const active = new Set(activeRoutes(tierRef.current, stage).map((r) => r.id));
      const patrolDraw: { x: number; y: number; radius: number }[] = [];
      for (const route of PATROL_ROUTES) {
        const prev = patrolStateRef.current.get(route.id)!;
        const next = stepPatrol(route, prev, tuning.speed * dt);
        patrolStateRef.current.set(route.id, next);
        if (!active.has(route.id)) continue;

        const routePos = inSafeSpace
          ? patrolPosition(route, next)
          : gravitate(patrolPosition(route, next), pos.current, tierRef.current, dt);
        // Already chasing gets the wider give-up radius; starting one at all
        // still needs an actual sighting at the van's own detection range —
        // otherwise a van two and a half circles away would start driving at
        // the player without ever having "spotted" them.
        const wasChasing = patrolChaseRef.current.has(route.id);
        const lastPos = patrolChaseRef.current.get(route.id) ?? routePos;
        const chaseRadius = tuning.detectionRadius * (wasChasing ? CHASE_RADIUS_MULTIPLIER : 1);
        const chasing =
          tuning.hunting && Math.hypot(lastPos.x - pos.current.x, lastPos.y - pos.current.y) < chaseRadius;

        let p: { x: number; y: number };
        if (chasing) {
          const dx = pos.current.x - lastPos.x;
          const dy = pos.current.y - lastPos.y;
          const toPlayer = Math.hypot(dx, dy) || 1;
          const step = Math.min(tuning.speed * dt, toPlayer);
          p = { x: lastPos.x + (dx / toPlayer) * step, y: lastPos.y + (dy / toPlayer) * step };
          patrolChaseRef.current.set(route.id, p);
        } else {
          p = routePos;
          patrolChaseRef.current.delete(route.id);
        }
        patrolDraw.push({ x: p.x, y: p.y, radius: tuning.detectionRadius });

        const dist = Math.hypot(p.x - pos.current.x, p.y - pos.current.y);
        if (dist >= tuning.detectionRadius) {
          // Getting out with real time already spent inside is the payoff
          // for the tension the chase mechanic adds — nothing was lost, but
          // it was close, and that's worth its own moment.
          const spentInside = patrolLingerRef.current.get(route.id);
          if (tuning.hunting && spentInside !== undefined && now - spentInside >= CLOSE_CALL_MS) {
            play('trap'); // the same "close call" cue the hacking minigame's trap uses
            setCloseCall('Too close.');
            window.setTimeout(() => setCloseCall((m) => (m === 'Too close.' ? null : m)), 1600);
          }
          patrolLingerRef.current.delete(route.id);
          continue;
        }
        lastSpottedAtRef.current = now;

        let since = patrolLingerRef.current.get(route.id);
        if (since === undefined) {
          since = now;
          patrolLingerRef.current.set(route.id, since);
        }

        /*
         * Two ways to get caught inside the same circle: a Heat tier
         * crossing opened a ten-second window (GameContext.tsx
         * `heatAlertUntil`, only once per window via `consumedAlertRef`), or
         * — new — a hunting van has had the player continuously inside its
         * own circle for `LINGER_CATCH_MS`. Either fires the same escalating
         * consequence; the linger timer resets on its own trigger so it
         * takes a fresh two seconds to fire again, the same way stepping
         * outside the circle resets it above.
         */
        const inAlertWindow =
          now < heatAlertUntilRef.current && heatAlertUntilRef.current !== consumedAlertRef.current;
        const lingerCaught = tuning.hunting && now - since >= LINGER_CATCH_MS;

        if (inAlertWindow || lingerCaught) {
          if (inAlertWindow) consumedAlertRef.current = heatAlertUntilRef.current;
          if (lingerCaught) patrolLingerRef.current.delete(route.id);
          const tier = tierRef.current;
          const consequence = consequenceFor(saveRef.current, tier);
          if (consequence) {
            dispatch({ type: 'CAUGHT', tier });
            // The save already sends `currentLocation` home
            // (systems/consequences.ts `applyCatch`) — this is the same
            // thing true of the live view, so the player doesn't stay
            // standing in the spot they were caught until a reload catches up.
            pos.current = spawnFor(HOME_LOCATION_ID);
            setCaught(consequence.label);
            window.setTimeout(() => setCaught((m) => (m === consequence.label ? null : m)), 4000);
            continue;
          }
        }

        const lastHit = patrolCooldownRef.current.get(route.id) ?? -Infinity;
        if (now - lastHit > tuning.cooldownMs) {
          patrolCooldownRef.current.set(route.id, now);
          // Running past a van is louder than walking past one — charged
          // only at the moment it's actually paid, same as every other Heat
          // cost in this loop, and said out loud in the line the player sees.
          const heatOnSpot = tuning.heatOnSpot * (sprinting ? SPRINT_HEAT_MULTIPLIER : 1);
          dispatch({
            type: 'ADD_HEAT',
            eventId: `patrol_spotted_${route.id}`,
            delta: heatOnSpot,
            logToHistory: false,
          });
          setSpotted(sprinting ? 'Running got you noticed — that’s double the Heat.' : 'A TraceBook van slows near you.');
          window.setTimeout(() => setSpotted((m) => (m === null ? m : null)), 1800);
        }
      }

      /*
       * Officers on foot. No chase or linger of their own — same simpler
       * shape as a drone's, spot-on-cooldown plus an alert-window catch —
       * gravity is what actually brings one into range as Heat climbs
       * rather than an active pursuit AI standing in for it.
       */
      const copTune = copTuning(tierRef.current, stage);
      const activeCops = new Set(activeCopRoutes(tierRef.current, stage).map((r) => r.id));
      const copDraw: { x: number; y: number; radius: number }[] = [];
      for (const route of COP_ROUTES) {
        const prev = copStateRef.current.get(route.id)!;
        const next = stepPatrol(route, prev, copTune.speed * dt);
        copStateRef.current.set(route.id, next);
        if (!activeCops.has(route.id)) continue;

        const basePos = patrolPosition(route, next);
        const p = inSafeSpace ? basePos : gravitate(basePos, pos.current, tierRef.current, dt);
        copDraw.push({ x: p.x, y: p.y, radius: copTune.detectionRadius });

        const dist = Math.hypot(p.x - pos.current.x, p.y - pos.current.y);
        if (dist >= copTune.detectionRadius) continue;
        lastSpottedAtRef.current = now;

        const inAlertWindow =
          now < heatAlertUntilRef.current && heatAlertUntilRef.current !== consumedAlertRef.current;
        if (inAlertWindow) {
          consumedAlertRef.current = heatAlertUntilRef.current;
          const tier = tierRef.current;
          const consequence = consequenceFor(saveRef.current, tier);
          if (consequence) {
            dispatch({ type: 'CAUGHT', tier });
            pos.current = spawnFor(HOME_LOCATION_ID);
            setCaught(consequence.label);
            window.setTimeout(() => setCaught((m) => (m === consequence.label ? null : m)), 4000);
            continue;
          }
        }

        const lastHit = copCooldownRef.current.get(route.id) ?? -Infinity;
        if (now - lastHit > copTune.cooldownMs) {
          copCooldownRef.current.set(route.id, now);
          const heatOnSpot = copTune.heatOnSpot * (sprinting ? SPRINT_HEAT_MULTIPLIER : 1);
          dispatch({
            type: 'ADD_HEAT',
            eventId: `cop_spotted_${route.id}`,
            delta: heatOnSpot,
            logToHistory: false,
          });
          setSpotted(sprinting ? 'Running got you noticed — that’s double the Heat.' : 'An officer clocks you, then keeps walking.');
          window.setTimeout(() => setSpotted((m) => (m === null ? m : null)), 1800);
        }
      }

      /*
       * The payoff for staying out of sight: once nothing has had the
       * player inside its own detection radius for `UNSEEN_COOLDOWN_MS`
       * — or immediately, standing in a `canLieLow` location's own card —
       * Heat starts easing off on its own, on a slow tick, independent of
       * the ordinary day-based decay. Guarded on there being any Heat left
       * to ease, so this never fires a string of no-op dispatches at 0.
       */
      const unseenLongEnough = inSafeSpace || now - lastSpottedAtRef.current >= UNSEEN_COOLDOWN_MS;
      if (unseenLongEnough && saveRef.current.heat.current > 0 && now - lastUnseenTickRef.current > UNSEEN_TICK_MS) {
        lastUnseenTickRef.current = now;
        dispatch({
          type: 'ADD_HEAT',
          eventId: 'unseen_cooldown',
          delta: -UNSEEN_RELIEF_PER_TICK,
          logToHistory: false,
        });
      }

      const npcDraw = NPCS.map((npc) => ({ ...wanderPos(npc, now), kind: npc.kind, id: npc.id }));

      drawTown(
        ctx,
        canvas,
        pos.current,
        facing.current,
        here,
        flagsRef.current,
        tierRef.current,
        SCALE,
        { w: PLAYER_W, h: PLAYER_H },
        activeObstacles,
        sparklingObstacleIds,
        npcDraw,
        patrolDraw,
        cameraDraw,
        hackDraw,
        junctionBoxDraw,
        droneDraw,
        copDraw,
        moving,
        now,
        boardTierRef.current,
        confinedToHome,
      );
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [dispatch]);

  // Keyboard. Movement and the interact key are both suppressed while a scene
  // is open — otherwise Space, the natural key for advancing dialogue, would
  // re-trigger the location and close the scene out from under the player.
  useEffect(() => {
    const MOVE = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];

    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const isGameKey = k === 'e' || k === ' ' || k === 'shift' || MOVE.includes(k);
      // The browser's own scroll-on-arrow-key default has to be cancelled
      // whether or not the game is currently blocked — the earlier version
      // returned before this ran while a scene or location card was open,
      // which is exactly when there's no dialogue box also swallowing the
      // key, so pressing Down there scrolled the page out from under it.
      if (isGameKey) e.preventDefault();
      if (blockedRef.current || !isGameKey) return;

      if (k === 'e' || k === ' ') {
        // A location wins ties — the rare case where a camera sits inside a
        // location's radius should read as "walk in and talk", not a race
        // against a piece of street furniture. The key picks the middle
        // tier — the three risk/reward options are otherwise a mouse/tap
        // choice on the prompt itself.
        if (nearbyRef.current) enterRef.current(nearbyRef.current);
        else if (nearbyCameraRef.current) {
          dispatch({ type: 'SABOTAGE_CAMERA', nodeId: nearbyCameraRef.current.id, actionId: 'dismantle' });
        }
        return;
      }
      keys.current.add(k);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    // A key held while the tab loses focus never fires keyup, which would leave
    // the sprite walking into a wall forever.
    const release = () => keys.current.clear();

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', release);
    };
  }, []);

  return (
    <div className="overworld">
      <canvas ref={canvasRef} className="overworld__canvas" aria-label="Bellhaven, evening" />

      {spotted && (
        <p className="overworld__spotted" role="status">
          {spotted}
        </p>
      )}

      {picked && (
        <p className="overworld__picked" role="status">
          {picked}
        </p>
      )}

      {caught && (
        <p className="overworld__caught" role="status">
          {caught}
        </p>
      )}

      {closeCall && (
        <p className="overworld__closecall" role="status">
          {closeCall}
        </p>
      )}

      {nearby && !open && (
        // One flex-stacked column instead of four independently
        // bottom-anchored elements — the old scheme hand-tuned a `bottom`
        // offset per line, which held up on a tall desktop test window and
        // visibly collided on an actual phone's shorter viewport. Normal
        // flow with a `gap` can't do that: each line's height pushes the
        // next one, on any screen.
        <div className="overworld__promptstack">
          {/* The very first thing a new player sees is this bubble, and
              nothing else on screen says "click here" — no tutorial, no
              quest arrow, nothing. `isFirstBeat` is true only until Beat 1
              closes out (the chapter `createNewSave` starts every save on),
              so this teaches the one interaction the whole game runs on and
              then gets out of the way for good. */}
          {isFirstBeat && !active && (
            <p className="overworld__confinedhint">Not heading out till the day actually starts.</p>
          )}
          {isFirstBeat && <p className="overworld__firsthint">Tap to start</p>}
          {/* A structure's name, on its own, whenever a scene hook is about
              to replace it in the prompt below — every place says what it
              is on approach (a house, the arcade, Sal's Pizza) whether or
              not there's also a story thread here right now. */}
          {nearbyScene && nearbyScenes.length === 1 && (
            <p className="overworld__nameplate">{nearby.label}</p>
          )}
          <button
            className={`overworld__prompt ${isFirstBeat ? 'overworld__prompt--first' : ''}`}
            onClick={() => enter(nearby)}
          >
            {nearbyScenes.length > 1
              ? `${nearbyScenes.length} things here · ${nearby.label}`
              : nearbyScene
                ? nearbyScene.hook
                : nearby.label}
          </button>
        </div>
      )}

      {/* Same slot as the location prompt, mutually exclusive with it — three
          risk/reward tiers instead of one, each with its own cost and payout
          stated on the button itself, per Heat System guardrail 2: nothing
          spends Heat without showing the price first. Below deck tier 3
          (canSabotage's own gate) the camera is still right there, same
          "locked door is still a door" rule a street hack node follows —
          just one disabled prompt saying what it's waiting on instead of
          three live ones. */}
      {!nearby && nearbyCamera && !open && (
        <div className="overworld__sabotage">
          {canSabotage(save, nearbyCamera) ? (
            sabotageActionsFor(nearbyCamera).map((action) => (
              <button
                key={action.id}
                className="overworld__prompt overworld__prompt--camera"
                onClick={() => dispatch({ type: 'SABOTAGE_CAMERA', nodeId: nearbyCamera.id, actionId: action.id })}
              >
                {action.label} · Heat +{action.heatCost} · {action.quantity}×{' '}
                {MATERIALS_BY_ID[action.itemId]?.name ?? action.itemId}
              </button>
            ))
          ) : (
            <button className="overworld__prompt overworld__prompt--camera" disabled>
              FLACK Camera Housing · {owns(save, 'bolt_cutters') ? 'Needs a Cracked Deck (rig tier 3)' : 'Needs Bolt Cutters'}
            </button>
          )}
        </div>
      )}

      {/* Same slot again, one step further down the priority order: a
          location wins, a camera wins over this, and only then does an ATM
          or a phone line get to offer itself. Disabled rather than hidden
          without the gear — the machine is right there, the reason you
          can't touch it yet is the whole point of building it. Cracking it
          itself doesn't happen here anymore: this opens the cyberdeck, same
          as the HUD's own (blinking) button does — one door either way. */}
      {!nearby && !nearbyCamera && nearbyHack && !open && (
        <button
          className="overworld__prompt overworld__prompt--hack"
          disabled={!canHackStreetNode(save, nearbyHack)}
          onClick={() => setCyberdeckOpen(true)}
        >
          {nearbyHack.label} ·{' '}
          {canHackStreetNode(save, nearbyHack)
            ? 'Open cyberdeck'
            : owns(save, HACK_KIND_TOOL[nearbyHack.kind])
              ? 'Needs a better rig'
              : `Needs ${toolArticleFor(HACK_KIND_TOOL[nearbyHack.kind])}`}
        </button>
      )}

      {/* Last in the priority order — a location, a camera, a street hack
          all win over this. One action, not three tiers: the choice already
          happened when the player decided this box was worth the walk. */}
      {!nearby && !nearbyCamera && !nearbyHack && nearbyJunctionBox && !open && (
        <button
          className="overworld__prompt overworld__prompt--junction"
          disabled={!canDestroyJunctionBox(save, nearbyJunctionBox)}
          onClick={() => dispatch({ type: 'DESTROY_JUNCTION_BOX', nodeId: nearbyJunctionBox.id })}
        >
          Junction box · Heat +{JUNCTION_BOX_RISK[nearbyJunctionBox.tier].heatCost} ·{' '}
          {BLUEPRINTS_BY_ID[nearbyJunctionBox.blueprintItemId]?.name ?? 'build plan'}
        </button>
      )}

      {/* Last in the priority order, same as a junction box — except this
          one might not still be there by the time the player reads the
          button, since it's the only point object on the map that moves.
          The prompt opens the shot, it doesn't resolve it — Heat System
          guardrail 2 still holds, there are just two prices to show now:
          what a hit pays and what a miss costs. */}
      {!nearby && !nearbyCamera && !nearbyHack && !nearbyJunctionBox && nearbyDrone && !open && (
        <button
          className="overworld__prompt overworld__prompt--drone"
          disabled={!canDisableDrone(save, nearbyDrone.id)}
          onClick={() => setDroneShootTarget(nearbyDrone.id)}
        >
          {droneToolTier(save) > 0
            ? `Take a shot · Hit: ${
                MATERIALS_BY_ID[DRONE_TAKEDOWN_BY_TOOL_TIER[droneToolTier(save) as 1 | 2 | 3].itemId]?.name ?? ''
              } · Miss: Heat +${DRONE_SHOOT_MISS_HEAT_PENALTY}`
            : 'FLACK Drone · Needs a Slingshot'}
        </button>
      )}

      {droneShootTarget && (
        <DroneShoot
          toolTier={Math.min(3, Math.max(1, droneToolTier(save))) as 1 | 2 | 3}
          onResolve={(hit) => {
            dispatch({ type: 'DISABLE_DRONE', droneId: droneShootTarget, hit });
            setDroneShootTarget(null);
          }}
          onClose={() => setDroneShootTarget(null)}
        />
      )}

      {/*
        The player's own drone — a toggle rather than a nearby-object prompt,
        since a recon flight needs no target at all and a kamikaze run just
        reads whichever nearby node (camera or junction box) the overworld's
        own detection already found this frame. Only shown once a drone
        exists to fly; an empty menu offering nothing isn't worth a button.
      */}
      {playerDroneTier(save) > 0 && !open && !cyberdeckOpen && !droneShootTarget && (
        <div className="overworld__dronemenu">
          <button className="overworld__dronetoggle" onClick={() => setDroneMenuOpen((v) => !v)}>
            {droneMenuOpen ? 'Close drone' : 'Drone'}
          </button>
          {droneMenuOpen && (
            <div className="overworld__dronepanel">
              <button
                className="overworld__prompt overworld__prompt--drone"
                disabled={!canFlyRecon(save)}
                onClick={() => {
                  setDroneMenuOpen(false);
                  setDroneFlight({ mode: 'recon', targetLabel: 'Bellhaven sweep' });
                }}
              >
                Recon flight · Hit: Heat relief · Miss: Heat +{RECON_FAIL_HEAT_PENALTY}
              </button>
              {(() => {
                const target: KamikazeTarget | null = nearbyCamera
                  ? { kind: 'camera', id: nearbyCamera.id }
                  : nearbyJunctionBox
                    ? { kind: 'junction', id: nearbyJunctionBox.id }
                    : null;
                const targetLabel = nearbyCamera
                  ? 'FLACK Camera Housing'
                  : nearbyJunctionBox
                    ? (BLUEPRINTS_BY_ID[nearbyJunctionBox.blueprintItemId]?.name ?? 'Junction box')
                    : '';
                return (
                  <button
                    className="overworld__prompt overworld__prompt--drone"
                    disabled={!target || !canKamikaze(save, target)}
                    onClick={() => {
                      if (!target) return;
                      setDroneMenuOpen(false);
                      setDroneFlight({ mode: 'kamikaze', target, targetLabel });
                    }}
                  >
                    {target ? `Kamikaze strike · ${targetLabel} · one-way` : 'Kamikaze strike · needs a camera or junction box in reach'}
                  </button>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {droneFlight && (
        <DroneFlight
          mode={droneFlight.mode}
          droneTier={Math.min(3, Math.max(1, playerDroneTier(save))) as PlayerDroneTier}
          targetLabel={droneFlight.targetLabel}
          onResolve={(hit) => {
            if (droneFlight.mode === 'recon') dispatch({ type: 'FLY_RECON', hit });
            else dispatch({ type: 'KAMIKAZE_STRIKE', target: droneFlight.target, hit });
            setDroneFlight(null);
          }}
          onClose={() => setDroneFlight(null)}
        />
      )}

      {active && <SceneView scene={active} onClose={leave} />}

      {open && !active && (
        <div className={`overworld__scene ${open.language === 'B' ? 'lang-b' : 'lang-a'}`}>
          <h2>{open.label}</h2>
          <p>{ambientFor(open, save.heat.threshold_tier, save.world.townTrust)}</p>
          {/*
            No quest markers, per the Story Bible — these are the hooks as
            written, in the player's own words, not a task list.
          */}
          {scenesAt(save, ALL_SCENES, open.id).length > 1 && (
            <ul className="overworld__threads">
              {scenesAt(save, ALL_SCENES, open.id).map((s) => (
                <li key={s.id}>
                  <button onClick={() => setActive(s)}>{s.hook}</button>
                </li>
              ))}
            </ul>
          )}
          {/* The market is a place, not a menu — it opens from the location
              card the same way a scene does, and only once you know it's there. */}
          {open.marketFlag && save.player.flags[open.marketFlag] && (
            <button className="overworld__market" onClick={() => setMarket(true)}>
              The Wednesday table · ${save.economy.cashOnHand}
            </button>
          )}
          {/* Same shape as the market button above — the one place Build
              ever opens from, per the build note. */}
          {open.garage && (
            <button className="overworld__market" onClick={() => setGarageOpen(true)}>
              Blueprints &amp; Build
            </button>
          )}
          {/*
            Module 02's player action, with the cost on the button and the
            reason showing when it isn't available. Lying low costs a day,
            which is what keeps it a choice rather than a reset button.
          */}
          {open.canLieLow && <LieLow at={open} />}
          <button onClick={leave}>Back to the street</button>
        </div>
      )}

      {market && <Market onClose={() => setMarket(false)} />}
      {garageOpen && <Garage onClose={() => setGarageOpen(false)} />}

      {/* Hidden rather than just covered — it already does nothing here
          (`blockedRef` zeroes touch input under the same two conditions),
          so leaving it on screen was just a control sitting on top of a
          location card with no function, not a real toggle underneath it. */}
      {!open && !cyberdeckOpen && !droneShootTarget && !droneFlight && (
        <Joystick onChange={(dx, dy) => (touch.current = { dx, dy })} />
      )}

      {!open && (
        <p className="overworld__hint">
          {next
            ? `${next.hook} — ${locationLabel(next.locationId)}${
                pending.length > 1 ? ` · and ${pending.length - 1} other thread${pending.length > 2 ? 's' : ''}` : ''
              }`
            : 'Bellhaven, evening. Nothing is asking anything of you tonight.'}
        </p>
      )}
    </div>
  );
}

/** How far the knob can travel from center, in px — also the denominator that
 * turns that travel into a -1..1 direction. */
const JOYSTICK_RADIUS = 38;

/**
 * Touch movement, as one draggable stick rather than four separate buttons.
 * Press anywhere on the base, drag, the knob follows clamped to the radius,
 * release recenters it — one control surface instead of four hit targets to
 * scan for. Not in the tab order, same reasoning as the four buttons it
 * replaces: keyboard users have WASD, so there is nothing here for Tab to
 * usefully reach.
 */
function Joystick({ onChange }: { onChange: (dx: number, dy: number) => void }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(dist, JOYSTICK_RADIUS);
    const x = (dx / dist) * clamped;
    const y = (dy / dist) * clamped;
    setKnob({ x, y });
    onChange(x / JOYSTICK_RADIUS, y / JOYSTICK_RADIUS);
  };

  const release = (e: PointerEvent) => {
    if (activeId.current !== e.pointerId) return;
    activeId.current = null;
    setKnob({ x: 0, y: 0 });
    onChange(0, 0);
  };

  return (
    <div
      ref={baseRef}
      className="joystick"
      role="group"
      aria-label="Move"
      onPointerDown={(e) => {
        activeId.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (activeId.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div className="joystick__knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}

/** Centre of a location's rectangle, or the old default if it's unknown. */
function spawnFor(locationId: string): { x: number; y: number } {
  const loc = LOCATIONS.find((l) => l.id === locationId);
  return loc ? { x: loc.x + loc.w / 2, y: loc.y + loc.h / 2 } : { x: 150, y: 470 };
}

function locationLabel(locationId: string): string {
  return LOCATIONS.find((l) => l.id === locationId)?.label ?? 'somewhere in town';
}

/** "a Screwdriver", "a Pry Bar" — the floating prompt's short version of the
 * same physical-tool gate the Cyberdeck panel spells out in full. */
function toolArticleFor(itemId: string): string {
  const name = ITEMS_BY_ID[itemId]?.name ?? itemId;
  return /^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** A small footprint at the player's feet, not the full sprite — a building
 * blocks where you'd stand, not where your head would be if this were 3D. */
const FEET_W = 10;
const FEET_H = 8;

function overlapsBuilding(x: number, y: number, loc: { x: number; y: number; w: number; h: number }): boolean {
  const left = x - FEET_W / 2;
  const right = x + FEET_W / 2;
  const top = y - FEET_H / 2;
  const bottom = y + FEET_H / 2;
  return left < loc.x + loc.w && right > loc.x && top < loc.y + loc.h && bottom > loc.y;
}

/**
 * What the location says right now. Heat first — an active threat outranks
 * background weather — then the town-trust band the Robin Hood mechanic moves,
 * then the default. Ambient, never announced: the player is meant to notice a
 * shutter is up, not be told that their generosity scored points.
 */
function ambientFor(loc: OverworldLocation, tier: ThresholdTier, townTrust: number): string {
  const byHeat = loc.ambient?.[tier];
  if (byHeat) return byHeat;
  const band = (loc.trustAmbient ?? [])
    .filter((b) => townTrust > b.above)
    .sort((a, b) => b.above - a.above)[0];
  return band?.text ?? loc.blurb;
}

/**
 * Staying in for a few days. Costs a day, buys back about twelve Heat, and is
 * unavailable at `hunted` until the forced breather beat has been played —
 * which is not a block, because that beat is sitting at this same location
 * waiting to be walked into.
 */
function LieLow({ at }: { at: OverworldLocation }) {
  const save = useSave();
  const { dispatch } = useGame();

  /*
   * A place of your own does more than a kitchen you're being quiet in, and
   * the Off-grid Power Rig does more again — module 03's "a base", read as
   * somewhere you can actually stay rather than as a tier gate. The number is
   * on the button either way, because a benefit the player has to infer is the
   * same broken contract as a hidden cost.
   */
  const own = at.id === SAFEHOUSE_ID;
  const amount = own ? safehouseDecay(save) : LIE_LOW_DECAY;
  const blocked =
    (own ? safehouseBlocked(save) : null) ??
    lieLowBlocked(save.heat, Boolean(save.player.flags[LIE_LOW_FLAG]));

  return (
    <div className="overworld__lielow">
      <button
        disabled={Boolean(blocked)}
        onClick={() => dispatch({ type: 'LIE_LOW', amount })}
      >
        {own ? 'Stay at the unit' : 'Stay in for a few days'} · −{amount} Heat, costs a day
      </button>
      {blocked && <p className="overworld__lielow-why">{blocked}</p>}
    </div>
  );
}
