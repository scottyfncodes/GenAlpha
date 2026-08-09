import { useEffect, useRef, useState, type PointerEvent } from 'react';
import {
  LOCATIONS,
  MAP_HEIGHT,
  MAP_WIDTH,
  locationAt,
  visibleLocations,
  type OverworldLocation,
} from './locations';
import { OBSTACLES } from './obstacles';
import { PATROL_ROUTES, activeRoutes, patrolTuning, type PatrolRoute } from './patrols';
import { CAMERA_NODES, HIDDEN_PICKUPS, HIDDEN_PICKUP_OBSTACLE_IDS, type CameraNode } from './collectibles';
import { useGame, useSave } from '../state/GameContext';
import type { ThresholdTier } from '../state/schema';
import { LIE_LOW_DECAY, lieLowBlocked } from '../systems/heat';
import { safehouseBlocked, safehouseDecay } from '../systems/safehouse';
import { canCollectHidden, canDismantle } from '../systems/materials';
import { MATERIALS_BY_ID } from '../content/materials';
import { LIE_LOW_FLAG } from '../content/breather';
import { SAFEHOUSE_ID } from '../content/safehouse';
import { ALL_SCENES } from '../content/all';
import { pendingScenes, scenesAt, type Scene } from '../systems/scenes';
import { SceneView } from '../ui/SceneView';
import { drawTown } from './draw';
import { Market } from '../ui/Market';
import './overworld.css';

const SPEED = 110; // world units per second
const PLAYER_W = 12;
const PLAYER_H = 18;
const SCALE = 2; // pixel-art integer scale
/** How close counts as "close enough to dismantle" for a camera — a hidden
 * bush pickup has no radius of its own, it fires on actually overlapping the
 * bush's rect (see the frame loop), the same feet-box test a building uses. */
const CAMERA_INTERACT_RADIUS = 26;

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
  const { dispatch } = useGame();
  const [nearby, setNearby] = useState<OverworldLocation | null>(null);
  const [open, setOpen] = useState<OverworldLocation | null>(null);
  /** A brief line when a hidden bush gives something up — same "shown, not
   * silent" treatment as `spotted`, since there's no prompt to click for it. */
  const [picked, setPicked] = useState<string | null>(null);
  /** The camera close enough to dismantle right now, if any — this one keeps
   * its prompt, since spending Heat on purpose is a decision, not a walk. */
  const [nearbyCamera, setNearbyCamera] = useState<CameraNode | null>(null);
  /**
   * Held in state, not derived: a scene's own effects change the chapter part
   * way through, which would otherwise unmount the scene mid-read.
   */
  const [active, setActive] = useState<Scene | null>(null);
  const [market, setMarket] = useState(false);
  /** A brief line when a patrol clocks you — Heat that's shown, not hidden. */
  const [spotted, setSpotted] = useState<string | null>(null);

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

  /* Same reason again: `canCollectHidden`/`canDismantle` need the save's
     collected-node log and the current day, and the frame loop can't close
     over `save` directly without going stale the same way flags and tier
     would. */
  const saveRef = useRef(save);
  saveRef.current = save;

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
  };

  // Spawn on the saved location rather than a hardcoded corner, so a reload
  // doesn't put the player across town from where the story left them.
  const pos = useRef(spawnFor(save.player.currentLocation));
  const keys = useRef<Set<string>>(new Set());
  const touch = useRef({ dx: 0, dy: 0 });
  const nearbyRef = useRef<OverworldLocation | null>(null);
  const enterRef = useRef<(loc: OverworldLocation) => void>(() => {});
  const nearbyCameraRef = useRef<CameraNode | null>(null);
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

  enterRef.current = enter;
  blockedRef.current = Boolean(open);

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
      // A bush hiding a salvage find is walkable, full stop — that's the only
      // tell it ever gives, so it can't also be a wall.
      const solidObstacles = OBSTACLES.filter((o) => !HIDDEN_PICKUP_OBSTACLE_IDS.has(o.id));
      const blockers: { x: number; y: number; w: number; h: number }[] = [...visible, ...solidObstacles];
      const solid = blockers.filter((l) => !overlapsBuilding(pos.current.x, pos.current.y, l));

      const nx = clamp(pos.current.x + (dx / len) * SPEED * dt, 8, MAP_WIDTH - 8);
      if (!solid.some((l) => overlapsBuilding(nx, pos.current.y, l))) pos.current.x = nx;

      const ny = clamp(pos.current.y + (dy / len) * SPEED * dt, 8, MAP_HEIGHT - 8);
      if (!solid.some((l) => overlapsBuilding(pos.current.x, ny, l))) pos.current.y = ny;

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
      for (const pickup of HIDDEN_PICKUPS) {
        if (!canCollectHidden(saveRef.current, pickup.obstacleId)) continue;
        const bush = OBSTACLES.find((o) => o.id === pickup.obstacleId);
        if (!bush || !overlapsBuilding(pos.current.x, pos.current.y, bush)) continue;

        stillTouching.add(pickup.obstacleId);
        if (contactRef.current.has(pickup.obstacleId)) continue;

        dispatch({ type: 'COLLECT_HIDDEN', obstacleId: pickup.obstacleId });
        const name = MATERIALS_BY_ID[pickup.itemId]?.name ?? 'salvage';
        setPicked(`Found something: ${name}`);
        window.setTimeout(() => setPicked((m) => (m === `Found something: ${name}` ? null : m)), 1600);
      }
      contactRef.current = stillTouching;

      /*
       * Cameras worth dismantling. Deliberate rather than automatic — this
       * spends Heat, so it keeps the prompt-and-key pattern a location uses
       * rather than the hidden pickups' silent walk-through. Only the ones
       * `canDismantle` says are actually standing get drawn or targeted; one
       * just taken apart stays gone until Helio's had time to replace it.
       */
      const cameraDraw: { x: number; y: number; dismantlable: boolean }[] = [];
      let closestCamera: CameraNode | null = null;
      let closestCameraDist = CAMERA_INTERACT_RADIUS;
      for (const node of CAMERA_NODES) {
        if (!canDismantle(saveRef.current, node)) continue;
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
       * Patrols. Every route keeps walking regardless of tier; only the
       * active subset is drawn or checked against the player, and each has
       * its own cooldown so standing in one van's radius can't machine-gun
       * Heat every frame. The Heat cost is small and ambient on purpose —
       * this is background pressure from wandering, not a mission charge.
       */
      const tuning = patrolTuning(tierRef.current);
      const active = new Set(activeRoutes(tierRef.current).map((r) => r.id));
      const patrolDraw: { x: number; y: number; radius: number }[] = [];
      for (const route of PATROL_ROUTES) {
        const prev = patrolStateRef.current.get(route.id)!;
        const next = stepPatrol(route, prev, tuning.speed * dt);
        patrolStateRef.current.set(route.id, next);
        if (!active.has(route.id)) continue;

        const p = patrolPosition(route, next);
        patrolDraw.push({ x: p.x, y: p.y, radius: tuning.detectionRadius });

        const dist = Math.hypot(p.x - pos.current.x, p.y - pos.current.y);
        if (dist < tuning.detectionRadius) {
          const lastHit = patrolCooldownRef.current.get(route.id) ?? -Infinity;
          if (now - lastHit > tuning.cooldownMs) {
            patrolCooldownRef.current.set(route.id, now);
            dispatch({
              type: 'ADD_HEAT',
              eventId: `patrol_spotted_${route.id}`,
              delta: tuning.heatOnSpot,
              logToHistory: false,
            });
            setSpotted('A Helio van slows near you.');
            window.setTimeout(() => setSpotted((m) => (m === null ? m : null)), 1800);
          }
        }
      }

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
        OBSTACLES,
        patrolDraw,
        cameraDraw,
        moving,
        now,
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
      const isGameKey = k === 'e' || k === ' ' || MOVE.includes(k);
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
        // against a piece of street furniture.
        if (nearbyRef.current) enterRef.current(nearbyRef.current);
        else if (nearbyCameraRef.current) {
          dispatch({ type: 'DISMANTLE_CAMERA', nodeId: nearbyCameraRef.current.id });
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

      {nearby && !open && (
        <button className="overworld__prompt" onClick={() => enter(nearby)}>
          {nearbyScenes.length > 1
            ? `${nearbyScenes.length} things here · ${nearby.label}`
            : nearbyScene
              ? nearbyScene.hook
              : nearby.label}
        </button>
      )}

      {/* Same slot as the location prompt, mutually exclusive with it — the
          cost is on the button itself, per Heat System guardrail 2: nothing
          spends Heat without showing the price first. */}
      {!nearby && nearbyCamera && !open && (
        <button
          className="overworld__prompt overworld__prompt--camera"
          onClick={() => dispatch({ type: 'DISMANTLE_CAMERA', nodeId: nearbyCamera.id })}
        >
          Dismantle the camera · Heat +{nearbyCamera.heatCost}
        </button>
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

      <Joystick onChange={(dx, dy) => (touch.current = { dx, dy })} />

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
