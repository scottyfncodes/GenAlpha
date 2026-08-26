import { useEffect, useRef, useState } from 'react';
import { drawTown } from '../world/draw';
import { DISTRICTS, MAP_HEIGHT, MAP_WIDTH, locationAt, type District } from '../world/locations';
import { OBSTACLES } from '../world/obstacles';
import { NPCS, wanderPos } from '../world/npcs';
import { CAMERA_NODES } from '../world/collectibles';
import { STREET_HACK_NODES } from '../world/streethacks';
import { JUNCTION_BOX_NODES } from '../world/junctionboxes';
import { marksAtStage } from '../world/marks';
import { PATROL_ROUTES, patrolTuning } from '../world/patrols';
import { COP_ROUTES, copTuning } from '../world/copwalk';
import { DRONE_ROUTES, droneTuning } from '../world/drones';
import type { EscalationStage } from '../world/escalation';
import type { ThresholdTier } from '../state/schema';
import './mapshot.css';

/**
 * THE MAP INSPECTOR — dev scaffolding, same status as `ui/Workbench.tsx`.
 *
 * The overworld is the one part of this game that can only really be judged
 * by looking at it, and the only way to look at it used to be to start a new
 * save, walk out of the house and cross town — which meant every layout
 * change (a district's landscaping, a camera's facing, an alley's width) was
 * verified by playing rather than by seeing. This is the missing surface: it
 * calls the real `drawTown` with the real tables, at any position, zoom,
 * escalation stage and Heat tier, with none of the save state or story gating
 * in the way.
 *
 * It is deliberately its own Vite entry (`/mapshot.html`) rather than a panel
 * inside the game:
 *
 *  - Vite's production build only takes `index.html` as an input, so an extra
 *    root HTML file is served by `npm run dev` and simply never built. The
 *    page cannot reach a player because it isn't in `dist/` at all — a
 *    stronger guarantee than the Workbench's own `DEV` gate, which still ships
 *    the import boundary. The `DEV` guard below is belt and braces for the day
 *    somebody adds this to `rollupOptions.input` by accident.
 *  - It needs no `GameContext`, so it can't accidentally mutate a save while
 *    somebody is looking at a district.
 *
 * Every control writes itself into the query string, so any view is a URL —
 * which is what makes `scripts/mapshot.mjs` able to drive it for screenshots
 * without knowing anything about the controls.
 */

/** Where the camera sits for each of the nine districts: the block's own
 * centre, so a district button frames that district and nothing else. */
const DISTRICT_VIEWS: { id: string; label: string; x: number; y: number }[] = DISTRICTS.map((d: District) => ({
  id: d.id,
  label: `${d.label} · ${d.sub}`,
  x: Math.round(d.x + d.w / 2),
  y: Math.round(d.y + d.h / 2),
}));

const TIERS: ThresholdTier[] = ['clear', 'watched', 'flagged', 'hunted'];
const STAGES: EscalationStage[] = [0, 1, 2, 3];

interface View {
  x: number;
  y: number;
  scale: number;
  stage: EscalationStage;
  tier: ThresholdTier;
  /** Draw every camera as already sabotaged — the "what does the town look
   * like after the player has been through it" pass, which is otherwise
   * hours of play to reach. */
  damaged: boolean;
  /** Vans, officers and drones at their routes' first waypoints. Off by
   * default: they're the only thing on this page that moves independently
   * of the map itself, and they sit on top of the ground you're inspecting. */
  patrols: boolean;
}

function readView(): View {
  const q = new URLSearchParams(window.location.search);
  const num = (key: string, fallback: number) => {
    const raw = Number(q.get(key));
    return Number.isFinite(raw) && q.get(key) !== null ? raw : fallback;
  };
  const stage = Math.max(0, Math.min(3, Math.round(num('stage', 3)))) as EscalationStage;
  const tier = TIERS.includes(q.get('tier') as ThresholdTier) ? (q.get('tier') as ThresholdTier) : 'watched';
  return {
    x: num('x', Math.round(MAP_WIDTH / 2)),
    y: num('y', Math.round(MAP_HEIGHT / 2)),
    scale: num('s', 2),
    stage,
    tier,
    damaged: q.get('damaged') === '1',
    patrols: q.get('patrols') === '1',
  };
}

function writeView(v: View) {
  const q = new URLSearchParams({
    x: String(Math.round(v.x)),
    y: String(Math.round(v.y)),
    s: String(v.scale),
    stage: String(v.stage),
    tier: v.tier,
    damaged: v.damaged ? '1' : '0',
    patrols: v.patrols ? '1' : '0',
  });
  window.history.replaceState(null, '', `${window.location.pathname}?${q}`);
}

export function MapShot() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [view, setView] = useState<View>(readView);
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => writeView(view), [view]);

  // One rAF loop for the life of the page, reading the live view off a ref —
  // same trick `world/Overworld.tsx` uses so a control change never restarts
  // the loop or resets the sprite sheets' own load state.
  useEffect(() => {
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      // Match the backing store to the element, so a resized window renders
      // more map rather than the same map stretched.
      const w = Math.max(320, Math.round(canvas.clientWidth));
      const h = Math.max(240, Math.round(canvas.clientHeight));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const v = viewRef.current;
      const stageObstacles = OBSTACLES.filter((o) => !o.minStage || v.stage >= o.minStage);
      const cameras = CAMERA_NODES.filter((c) => c.stage <= v.stage);
      const vanCount = v.patrols ? patrolTuning(v.tier, v.stage).activeRoutes : 0;
      const copCount = v.patrols ? copTuning(v.tier, v.stage).activeRoutes : 0;
      const droneCount = v.patrols ? droneTuning(v.tier, v.stage).activeRoutes : 0;
      const head = (routes: typeof PATROL_ROUTES, count: number, radius: number) =>
        routes.slice(0, count).map((r) => ({ x: r.points[0].x, y: r.points[0].y, radius }));

      drawTown(
        ctx,
        canvas,
        { x: v.x, y: v.y },
        { x: 0, y: 1 },
        locationAt(v.x, v.y, {}),
        {},
        v.tier,
        v.scale,
        { w: 10, h: 8 },
        stageObstacles,
        new Set<string>(),
        NPCS.map((n) => ({ ...wanderPos(n, now), kind: n.kind, id: n.id })),
        head(PATROL_ROUTES, vanCount, patrolTuning(v.tier, v.stage).detectionRadius),
        cameras.map((c) => ({ x: c.x, y: c.y, facing: c.facing, dismantlable: false, damaged: v.damaged })),
        STREET_HACK_NODES.map((n) => ({ x: n.x, y: n.y, kind: n.kind, hackable: false, damaged: false })),
        JUNCTION_BOX_NODES.map((n) => ({ x: n.x, y: n.y, tier: n.tier, crackable: false, damaged: false })),
        head(DRONE_ROUTES, droneCount, droneTuning(v.tier, v.stage).detectionRadius).map((d) => ({
          ...d,
          takeable: false,
        })),
        head(COP_ROUTES, copCount, copTuning(v.tier, v.stage).detectionRadius),
        // "Cameras down" also stands in for "the player has been here":
        // every pole carries the scar it would carry after a sabotage, so
        // the toggle answers both halves of the same question — what does
        // the town look like once somebody has worked it over.
        v.damaged ? cameras.map((c, i) => ({ x: c.x, y: c.y, tagged: i % 2 === 0 })) : [],
        // The stage control already governs the camera rollout and the
        // staged fences; the Gen A marks come up the same clock, so it
        // governs those too — which makes this page the fastest way to
        // see the whole spread from day one to day fifteen.
        marksAtStage(v.stage),
        false,
        now,
        0,
        false,
      );
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const set = (patch: Partial<View>) => setView((v) => ({ ...v, ...patch }));

  return (
    <div className="mapshot">
      <div className="mapshot__bar">
        <span className="mapshot__title">Bellhaven · map inspector</span>
        <div className="mapshot__group">
          {DISTRICT_VIEWS.map((d, i) => (
            <button
              key={d.id}
              className="mapshot__btn"
              title={d.label}
              onClick={() => set({ x: d.x, y: d.y, scale: 2 })}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="mapshot__btn"
            title="The whole town at once"
            onClick={() => set({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, scale: 0.75 })}
          >
            all
          </button>
        </div>

        <label className="mapshot__field">
          zoom
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.25}
            value={view.scale}
            onChange={(e) => set({ scale: Number(e.target.value) })}
          />
          <span className="mapshot__value">{view.scale}x</span>
        </label>

        <label className="mapshot__field">
          stage
          <select
            value={view.stage}
            onChange={(e) => set({ stage: Number(e.target.value) as EscalationStage })}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="mapshot__field">
          heat
          <select value={view.tier} onChange={(e) => set({ tier: e.target.value as ThresholdTier })}>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="mapshot__field">
          <input type="checkbox" checked={view.damaged} onChange={(e) => set({ damaged: e.target.checked })} />
          cameras down
        </label>

        <label className="mapshot__field">
          <input type="checkbox" checked={view.patrols} onChange={(e) => set({ patrols: e.target.checked })} />
          patrols
        </label>

        <span className="mapshot__pos">
          {Math.round(view.x)}, {Math.round(view.y)}
        </span>
      </div>

      {/* Click to recentre: the fastest way to chase down "what is that thing
          at the edge of the frame", and it keeps the URL in step so the view
          stays shareable. */}
      <canvas
        ref={canvasRef}
        className="mapshot__canvas"
        onClick={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const v = viewRef.current;
          const viewW = canvas.clientWidth / v.scale;
          const viewH = canvas.clientHeight / v.scale;
          const camX = Math.min(Math.max(v.x - viewW / 2, 0), Math.max(0, MAP_WIDTH - viewW));
          const camY = Math.min(Math.max(v.y - viewH / 2, 0), Math.max(0, MAP_HEIGHT - viewH));
          set({
            x: camX + (e.clientX - rect.left) / v.scale,
            y: camY + (e.clientY - rect.top) / v.scale,
          });
        }}
      />
    </div>
  );
}
