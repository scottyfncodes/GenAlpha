import { useEffect, useRef, useState } from 'react';
import {
  LOCATIONS,
  MAP_HEIGHT,
  MAP_WIDTH,
  locationAt,
  type OverworldLocation,
} from './locations';
import { useGame, useSave } from '../state/GameContext';
import type { ThresholdTier } from '../state/schema';
import { LIE_LOW_DECAY, lieLowBlocked } from '../systems/heat';
import { safehouseBlocked, safehouseDecay } from '../systems/safehouse';
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
  /**
   * Held in state, not derived: a scene's own effects change the chapter part
   * way through, which would otherwise unmount the scene mid-read.
   */
  const [active, setActive] = useState<Scene | null>(null);
  const [market, setMarket] = useState(false);

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

  /* Last direction of travel, so the sprite reads as turning. Held in a ref
     because it changes every frame and nothing outside the canvas cares. */
  const facing = useRef({ x: 0, y: 1 });

  /**
   * Every thread this location is offering, not just the first. Two mentors
   * can seed a Contact in the same place — Deja and Files both start at the
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
  /** True while a scene or location card owns the screen. */
  const blockedRef = useRef(false);

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

      if (dx !== 0 || dy !== 0) facing.current = { x: Math.sign(dx), y: Math.sign(dy) };

      const len = Math.hypot(dx, dy) || 1;
      pos.current.x = clamp(pos.current.x + (dx / len) * SPEED * dt, 8, MAP_WIDTH - 8);
      pos.current.y = clamp(pos.current.y + (dy / len) * SPEED * dt, 8, MAP_HEIGHT - 8);

      const here = locationAt(pos.current.x, pos.current.y, flagsRef.current);
      if (here?.id !== nearbyRef.current?.id) {
        nearbyRef.current = here;
        setNearby(here);
        if (here) dispatch({ type: 'SET_LOCATION', locationId: here.id });
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
      if (blockedRef.current) return;
      const k = e.key.toLowerCase();
      if (k === 'e' || k === ' ') {
        e.preventDefault();
        if (nearbyRef.current) enterRef.current(nearbyRef.current);
        return;
      }
      if (!MOVE.includes(k)) return;
      e.preventDefault(); // arrows would otherwise scroll the page under the canvas
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

      {nearby && !open && (
        <button className="overworld__prompt" onClick={() => enter(nearby)}>
          {nearbyScenes.length > 1
            ? `${nearbyScenes.length} things here · ${nearby.label}`
            : nearbyScene
              ? nearbyScene.hook
              : `Look around · ${nearby.label}`}
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

      <Dpad onChange={(dx, dy) => (touch.current = { dx, dy })} />

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

function Dpad({ onChange }: { onChange: (dx: number, dy: number) => void }) {
  const press = (dx: number, dy: number) => ({
    onPointerDown: () => onChange(dx, dy),
    onPointerUp: () => onChange(0, 0),
    onPointerLeave: () => onChange(0, 0),
    onPointerCancel: () => onChange(0, 0),
  });
  /**
   * Touch controls. Previously aria-hidden with four focusable buttons inside,
   * which announces nothing to a screen reader while still catching Tab. They
   * are labelled and taken out of the tab order instead: keyboard users have
   * WASD, so there is nothing here for Tab to usefully reach.
   */
  return (
    <div className="dpad" role="group" aria-label="Move">
      <button className="dpad__up" tabIndex={-1} aria-label="Move up" {...press(0, -1)}>↑</button>
      <button className="dpad__left" tabIndex={-1} aria-label="Move left" {...press(-1, 0)}>←</button>
      <button className="dpad__right" tabIndex={-1} aria-label="Move right" {...press(1, 0)}>→</button>
      <button className="dpad__down" tabIndex={-1} aria-label="Move down" {...press(0, 1)}>↓</button>
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
