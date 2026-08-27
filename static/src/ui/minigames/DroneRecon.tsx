import { useEffect, useRef, useState } from 'react';
import { collides, isShotDown } from '../../systems/droneflight';
import { isRevealed, RECON_REVEAL_RADIUS, RECON_SCAN_RADIUS, type ReconPoi } from '../../systems/dronerecon';
import { RECON_FLIGHT_MS, playerDroneTuning, type PlayerDroneTier } from '../../world/playerdrone';
import { droneTuning } from '../../world/drones';
import type { EscalationStage } from '../../world/escalation';
import type { ThresholdTier } from '../../state/schema';
import { play } from '../../systems/audio';
import { drawInterceptor, drawPlayerDrone, droneSpritesReady, ensureDroneSpritesLoading } from './droneSprites';
import './drone-recon.css';

/** Square play field, centred on the player — `RECON_SCAN_RADIUS` world
 * units in every direction map onto half its width, so a POI's canvas
 * position and its real distance from centre stay in the same proportion
 * `systems/dronerecon.ts`'s own radius constants already assume. */
const BOUNDS = { w: 280, h: 280 };
const SCALE = BOUNDS.w / (RECON_SCAN_RADIUS * 2);
const CENTER = { x: BOUNDS.w / 2, y: BOUNDS.h / 2 };
const REVEAL_RADIUS_PX = RECON_REVEAL_RADIUS * SCALE;
/** How close a tap has to land to a scouted camera's own marker to read as
 * "EMP that one" rather than just steering the drone through the same spot. */
const EMP_TAP_RADIUS_PX = 16;

interface Interceptor {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

let nextId = 1;

const poiCanvasPos = (poi: ReconPoi, center: { x: number; y: number }) => ({
  x: CENTER.x + (poi.x - center.x) * SCALE,
  y: CENTER.y + (poi.y - center.y) * SCALE,
});

const KIND_COLOR: Record<ReconPoi['kind'], string> = {
  camera: '#7dd3ff',
  junction: '#ffcc66',
  patrol: '#c98bf0',
};

/**
 * The scout flight. Free-roam, not forced-scroll: the field is a fixed,
 * fogged map of the block the drone launched over (`pois`, computed by
 * `Overworld.tsx` from the player's own position), and the only "enemy" is
 * whatever FLACK actually has flying at the current Heat tier
 * (`world/drones.ts` `droneTuning`) — nothing at `clear`/`watched`, so an
 * early scout is genuinely safe to poke around in. Flying within
 * `RECON_REVEAL_RADIUS` of a fogged marker resolves it; a Tier 2+ airframe
 * can also tap a resolved camera to EMP it on the spot, once per sortie.
 *
 * Closing before a resolution is a free walk-away, same as every other
 * drone minigame — only a real finish (time's up, or shot down) calls
 * `onResolve`, and whatever was found up to that point rides along either
 * way so the debrief always tells the truth.
 */
export function DroneRecon({
  droneTier,
  pois,
  center,
  heatTier,
  stage,
  empAvailable,
  onResolve,
  onEmpCamera,
  onClose,
}: {
  droneTier: PlayerDroneTier;
  pois: ReconPoi[];
  center: { x: number; y: number };
  heatTier: ThresholdTier;
  stage: EscalationStage;
  empAvailable: boolean;
  onResolve: (result: { hit: boolean; discoveredCount: number }) => void;
  onEmpCamera: (cameraId: string) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tuning = playerDroneTuning(droneTier);
  const hazard = droneTuning(heatTier, stage);

  const dronePos = useRef({ x: CENTER.x, y: CENTER.y });
  const draggingRef = useRef(false);
  const interceptorsRef = useRef<Interceptor[]>([]);
  const hitsRef = useRef(0);
  const elapsedRef = useRef(0);
  const resolvedRef = useRef(false);
  const discoveredRef = useRef<Set<string>>(new Set());
  const empUsedRef = useRef(false);
  const flashRef = useRef<{ label: string; untilMs: number } | null>(null);

  const [progress, setProgress] = useState(0);
  const [hits, setHits] = useState(0);
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const [lastFound, setLastFound] = useState<string | null>(null);
  const [empUsed, setEmpUsed] = useState(false);
  const [result, setResult] = useState<'hit' | 'miss' | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = BOUNDS.w;
    canvas.height = BOUNDS.h;
    ensureDroneSpritesLoading();

    // How many roaming interceptors this sortie has to share the sky with —
    // zero at `clear`/`watched`, same "surveillance doesn't start until the
    // plot thickens" pacing every other hazard on this map already opens
    // with. Capped well under the town-wide route count: this is one block,
    // not the whole 3x3.
    const interceptorCount = Math.min(3, hazard.activeRoutes);
    interceptorsRef.current = Array.from({ length: interceptorCount }, () => ({
      id: nextId++,
      x: 20 + Math.random() * (BOUNDS.w - 40),
      y: 20 + Math.random() * (BOUNDS.h - 40),
      vx: (Math.random() - 0.5) * hazard.speed,
      vy: (Math.random() - 0.5) * hazard.speed,
    }));

    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (!resolvedRef.current) {
        elapsedRef.current += dt * 1000;
        setProgress(Math.min(100, (elapsedRef.current / RECON_FLIGHT_MS) * 100));

        for (const it of interceptorsRef.current) {
          it.x += it.vx * dt;
          it.y += it.vy * dt;
          if (it.x < 14 || it.x > BOUNDS.w - 14) it.vx *= -1;
          if (it.y < 14 || it.y > BOUNDS.h - 14) it.vy *= -1;
        }

        const droneHitbox = { x: dronePos.current.x, y: dronePos.current.y, r: 7 };
        const collided = interceptorsRef.current.find((it) => collides(droneHitbox, { x: it.x, y: it.y, r: 9 }));
        if (collided) {
          interceptorsRef.current = interceptorsRef.current.filter((it) => it !== collided);
          hitsRef.current += 1;
          setHits(hitsRef.current);
          play('trap');
        }

        // World-space position of the drone right now — the fixed field is
        // a projection of real coordinates, so reveal checks reuse the
        // exact same radius the pure logic (and its tests) already use.
        const worldPos = {
          x: center.x + (dronePos.current.x - CENTER.x) / SCALE,
          y: center.y + (dronePos.current.y - CENTER.y) / SCALE,
        };
        for (const poi of pois) {
          if (discoveredRef.current.has(poi.id)) continue;
          if (isRevealed(worldPos, poi)) {
            discoveredRef.current.add(poi.id);
            setDiscoveredCount(discoveredRef.current.size);
            setLastFound(poi.label);
            flashRef.current = { label: poi.label, untilMs: now + 1400 };
            play('reveal');
          }
        }

        if (isShotDown(hitsRef.current, tuning.maxHits)) {
          resolvedRef.current = true;
          play('alert');
          setResult('miss');
          window.setTimeout(() => onResolve({ hit: false, discoveredCount: discoveredRef.current.size }), 700);
        } else if (elapsedRef.current >= RECON_FLIGHT_MS) {
          resolvedRef.current = true;
          play('clear');
          setResult('hit');
          window.setTimeout(() => onResolve({ hit: true, discoveredCount: discoveredRef.current.size }), 700);
        }
      }

      // Draw. Dark field, no scroll — this is a map, not a tunnel.
      ctx.fillStyle = '#0a0e14';
      ctx.fillRect(0, 0, BOUNDS.w, BOUNDS.h);

      ctx.strokeStyle = 'rgba(125, 211, 255, 0.35)';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.arc(CENTER.x, CENTER.y, REVEAL_RADIUS_PX, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      for (const poi of pois) {
        const p = poiCanvasPos(poi, center);
        const found = discoveredRef.current.has(poi.id);
        ctx.beginPath();
        ctx.arc(p.x, p.y, found ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = found ? KIND_COLOR[poi.kind] : 'rgba(236, 226, 208, 0.25)';
        ctx.fill();
        if (!found) {
          ctx.strokeStyle = 'rgba(236, 226, 208, 0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      const spritesReady = droneSpritesReady();
      if (spritesReady) {
        for (const it of interceptorsRef.current) drawInterceptor(ctx, it.x, it.y, 20);
        drawPlayerDrone(ctx, dronePos.current.x, dronePos.current.y, 22);
      } else {
        ctx.fillStyle = '#e84ac9';
        for (const it of interceptorsRef.current) {
          ctx.beginPath();
          ctx.arc(it.x, it.y, 9, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#7dd3ff';
        ctx.beginPath();
        ctx.arc(dronePos.current.x, dronePos.current.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      if (flashRef.current && now < flashRef.current.untilMs) {
        ctx.fillStyle = 'rgba(125, 211, 255, 0.9)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(flashRef.current.label, CENTER.x, 14);
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fieldPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * BOUNDS.w,
      y: ((clientY - rect.top) / rect.height) * BOUNDS.h,
    };
  };

  const movePlayer = (p: { x: number; y: number }) => {
    dronePos.current = { x: Math.min(BOUNDS.w - 10, Math.max(10, p.x)), y: Math.min(BOUNDS.h - 10, Math.max(10, p.y)) };
  };

  /** A tap landing on an already-scouted camera EMPs it, once per sortie —
   * the recon drone's own tier-2 verb, distinct from steering. */
  const tryEmp = (p: { x: number; y: number }) => {
    if (!empAvailable || empUsedRef.current) return;
    for (const poi of pois) {
      if (poi.kind !== 'camera' || !discoveredRef.current.has(poi.id)) continue;
      const c = poiCanvasPos(poi, center);
      if (Math.hypot(c.x - p.x, c.y - p.y) <= EMP_TAP_RADIUS_PX) {
        empUsedRef.current = true;
        setEmpUsed(true);
        flashRef.current = { label: 'EMP', untilMs: performance.now() + 1000 };
        play('rupture');
        onEmpCamera(poi.id);
        return;
      }
    }
  };

  return (
    <div className="dronerecon__stage">
      <div className="dronerecon">
        <div className="dronerecon__head">
          <p className="dronerecon__framing">Scout flight — the block around you</p>
          <button className="dronerecon__close" onClick={onClose}>
            Step away
          </button>
        </div>
        <p className="dronerecon__prompt">
          {empAvailable
            ? 'Drag to fly. Get close to find out what’s here — tap a scouted camera to EMP it.'
            : 'Drag to fly. Get close to find out what’s here.'}
        </p>
        <div className="dronerecon__clock">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="dronerecon__status">
          <div className="dronerecon__hits">
            {Array.from({ length: tuning.maxHits }).map((_, i) => (
              <span key={i} className={i < hits ? 'is-lost' : ''} />
            ))}
          </div>
          <p className="dronerecon__found">
            Found: {discoveredCount}
            {empAvailable && empUsed ? ' · EMP spent' : ''}
          </p>
        </div>
        <canvas
          ref={canvasRef}
          className="dronerecon__field"
          onPointerDown={(e) => {
            const p = fieldPos(e.clientX, e.clientY);
            if (!p) return;
            draggingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            tryEmp(p);
            movePlayer(p);
          }}
          onPointerMove={(e) => {
            if (!draggingRef.current) return;
            const p = fieldPos(e.clientX, e.clientY);
            if (p) movePlayer(p);
          }}
          onPointerUp={() => {
            draggingRef.current = false;
          }}
        />
        {lastFound && !result && <p className="dronerecon__lastfound">{lastFound}</p>}
        {result && (
          <p className={`dronerecon__result dronerecon__result--${result}`}>
            {result === 'hit' ? `Home. Found ${discoveredCount}.` : `Spotted. Found ${discoveredCount} anyway.`}
          </p>
        )}
      </div>
    </div>
  );
}
