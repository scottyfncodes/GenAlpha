import { useEffect, useRef, useState } from 'react';
import {
  DRONE_SHOOT_BOUNDS,
  DRONE_SHOOT_DURATION_MS,
  droneSpeedForTier,
  hitRadiusForTier,
  resolveShot,
  type DroneToolTier,
} from '../../systems/droneshoot';
import { play } from '../../systems/audio';
import './drone-shoot.css';

const RESULT_HOLD_MS = 650;

/** A random point inset from the play field's own edges, so the drone never
 * picks a waypoint it'd have to clip the frame to reach. */
function randomWaypoint() {
  const margin = 24;
  return {
    x: margin + Math.random() * (DRONE_SHOOT_BOUNDS.w - margin * 2),
    y: margin + Math.random() * (DRONE_SHOOT_BOUNDS.h - margin * 2),
  };
}

/**
 * The takedown shot, played out rather than resolved off a stat check. The
 * drone actually moves; the player actually has to put the reticle on it
 * and fire before the window closes. Closing without firing is a free
 * walk-away — no Heat, no cooldown, same as backing out of anything else in
 * this game — but a fired shot always resolves, hit or miss
 * (`systems/droneshoot.ts` `resolveShot`), and only a miss costs anything.
 */
export function DroneShoot({
  toolTier,
  onResolve,
  onClose,
}: {
  toolTier: DroneToolTier;
  onResolve: (hit: boolean) => void;
  onClose: () => void;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const droneRef = useRef(randomWaypoint());
  const waypointRef = useRef(randomWaypoint());
  const startRef = useRef(performance.now());
  const resolvedRef = useRef(false);
  const [drone, setDrone] = useState(droneRef.current);
  const [remainingPct, setRemainingPct] = useState(100);
  const [result, setResult] = useState<'hit' | 'miss' | null>(null);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const speed = droneSpeedForTier(toolTier);

    const frame = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      if (!resolvedRef.current) {
        const elapsed = now - startRef.current;
        const remaining = Math.max(0, 1 - elapsed / DRONE_SHOOT_DURATION_MS);
        setRemainingPct(remaining * 100);
        if (remaining <= 0) {
          resolvedRef.current = true;
          onClose(); // time ran out without a shot fired — a free walk-away, not a miss
          return;
        }

        const d = droneRef.current;
        const w = waypointRef.current;
        const dx = w.x - d.x;
        const dy = w.y - d.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 4) {
          waypointRef.current = randomWaypoint();
        } else {
          const step = Math.min(speed * dt, dist);
          droneRef.current = { x: d.x + (dx / dist) * step, y: d.y + (dy / dist) * step };
          setDrone(droneRef.current);
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fire = (clientX: number, clientY: number) => {
    if (resolvedRef.current) return;
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    const shot = {
      x: ((clientX - rect.left) / rect.width) * DRONE_SHOOT_BOUNDS.w,
      y: ((clientY - rect.top) / rect.height) * DRONE_SHOOT_BOUNDS.h,
    };
    resolvedRef.current = true;
    const hit = resolveShot(droneRef.current, shot, toolTier);
    play(hit ? 'clear' : 'alert');
    setResult(hit ? 'hit' : 'miss');
    window.setTimeout(() => onResolve(hit), RESULT_HOLD_MS);
  };

  return (
    <div className="droneshoot__stage">
      <div className="droneshoot">
        <div className="droneshoot__head">
          <p className="droneshoot__framing">FLACK Drone — takedown</p>
          <button className="droneshoot__close" onClick={onClose}>
            Step away
          </button>
        </div>
        <p className="droneshoot__prompt">Tap it before it clears the frame.</p>
        <div className="droneshoot__clock">
          <span style={{ width: `${remainingPct}%` }} />
        </div>
        <div
          ref={fieldRef}
          className="droneshoot__field"
          onPointerDown={(e) => fire(e.clientX, e.clientY)}
        >
          <div
            className="droneshoot__drone"
            style={{
              left: `${(drone.x / DRONE_SHOOT_BOUNDS.w) * 100}%`,
              top: `${(drone.y / DRONE_SHOOT_BOUNDS.h) * 100}%`,
              width: hitRadiusForTier(toolTier) * 2,
              height: hitRadiusForTier(toolTier) * 2,
            }}
          />
          {result && (
            <p className={`droneshoot__result droneshoot__result--${result}`}>
              {result === 'hit' ? 'Hit.' : 'Missed.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
