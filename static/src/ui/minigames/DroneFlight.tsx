import { useEffect, useRef, useState } from 'react';
import { collides, FLIGHT_BOUNDS, isShotDown, progressPct } from '../../systems/droneflight';
import { KAMIKAZE_FLIGHT_MS, playerDroneTuning, RECON_FLIGHT_MS, type PlayerDroneTier } from '../../world/playerdrone';
import { play } from '../../systems/audio';
import './drone-flight.css';

interface Enemy {
  id: number;
  x: number;
  y: number;
  r: number;
  vx: number;
}

interface Shot {
  id: number;
  x: number;
  y: number;
}

let nextId = 1;

/**
 * The flight itself — a bird's-eye, forced-scroll run, the same shape a
 * classic vertical shooter uses: the drone is fixed near the bottom of its
 * own lane, the world comes at it, and the only way through is dodging or
 * clearing what's in the way before the clock runs out. Recon and kamikaze
 * share this exact mechanic (`mode` only tunes enemy density and the
 * framing text) because the thing that makes either one real is the same
 * thing either way: the player has to fly it, not just own the airframe.
 *
 * Closing before a resolution is a free walk-away, same as
 * `DroneShoot`'s "Step away" — only an actual finish (reached the end, or
 * shot down first) calls `onResolve`.
 */
export function DroneFlight({
  mode,
  droneTier,
  targetLabel,
  onResolve,
  onClose,
}: {
  mode: 'recon' | 'kamikaze';
  droneTier: PlayerDroneTier;
  targetLabel: string;
  onResolve: (hit: boolean) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tuning = playerDroneTuning(droneTier);
  const durationMs = mode === 'kamikaze' ? KAMIKAZE_FLIGHT_MS : RECON_FLIGHT_MS;

  const playerPos = useRef({ x: FLIGHT_BOUNDS.w / 2, y: FLIGHT_BOUNDS.h - 44 });
  const draggingRef = useRef(false);
  const enemiesRef = useRef<Enemy[]>([]);
  const shotsRef = useRef<Shot[]>([]);
  const hitsRef = useRef(0);
  const elapsedRef = useRef(0);
  const resolvedRef = useRef(false);

  const [progress, setProgress] = useState(0);
  const [hits, setHits] = useState(0);
  const [result, setResult] = useState<'hit' | 'miss' | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = FLIGHT_BOUNDS.w;
    canvas.height = FLIGHT_BOUNDS.h;

    // Kamikaze flies into defended airspace — more of everything comes at
    // it than a recon sweep ever sees.
    const spawnIntervalMs = mode === 'kamikaze' ? 850 : 1300;
    const scrollSpeed = mode === 'kamikaze' ? 105 : 82;

    let raf = 0;
    let last = performance.now();
    let scrollY = 0;
    let lastSpawn = last;
    let lastFire = last;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (!resolvedRef.current) {
        elapsedRef.current += dt * 1000;
        setProgress(progressPct(elapsedRef.current, durationMs));
        scrollY += dt * 90;

        if (now - lastSpawn > spawnIntervalMs) {
          lastSpawn = now;
          enemiesRef.current.push({
            id: nextId++,
            x: 20 + Math.random() * (FLIGHT_BOUNDS.w - 40),
            y: -10,
            r: 9,
            vx: (Math.random() - 0.5) * 44,
          });
        }

        if (now - lastFire > tuning.fireIntervalMs) {
          lastFire = now;
          shotsRef.current.push({ id: nextId++, x: playerPos.current.x, y: playerPos.current.y - 10 });
        }

        for (const e of enemiesRef.current) {
          e.y += scrollSpeed * dt;
          e.x += e.vx * dt;
          if (e.x < 10 || e.x > FLIGHT_BOUNDS.w - 10) e.vx *= -1;
        }
        enemiesRef.current = enemiesRef.current.filter((e) => e.y < FLIGHT_BOUNDS.h + 20);

        for (const s of shotsRef.current) s.y -= 260 * dt;
        shotsRef.current = shotsRef.current.filter((s) => s.y > -10);

        for (const s of shotsRef.current) {
          const hitEnemy = enemiesRef.current.find((e) => collides({ x: s.x, y: s.y, r: 2 }, e));
          if (hitEnemy) {
            enemiesRef.current = enemiesRef.current.filter((e) => e !== hitEnemy);
            shotsRef.current = shotsRef.current.filter((sh) => sh !== s);
          }
        }

        const playerHitbox = { x: playerPos.current.x, y: playerPos.current.y, r: 7 };
        const collided = enemiesRef.current.find((e) => collides(playerHitbox, e));
        if (collided) {
          enemiesRef.current = enemiesRef.current.filter((e) => e !== collided);
          hitsRef.current += 1;
          setHits(hitsRef.current);
          play('trap');
        }

        if (isShotDown(hitsRef.current, tuning.maxHits)) {
          resolvedRef.current = true;
          play('alert');
          setResult('miss');
          window.setTimeout(() => onResolve(false), 700);
        } else if (elapsedRef.current >= durationMs) {
          resolvedRef.current = true;
          play('clear');
          setResult('hit');
          window.setTimeout(() => onResolve(true), 700);
        }
      }

      ctx.fillStyle = '#0a0e14';
      ctx.fillRect(0, 0, FLIGHT_BOUNDS.w, FLIGHT_BOUNDS.h);

      ctx.strokeStyle = 'rgba(125, 211, 255, 0.12)';
      ctx.lineWidth = 1;
      const spacing = 34;
      const offset = scrollY % spacing;
      for (let y = -spacing + offset; y < FLIGHT_BOUNDS.h; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(FLIGHT_BOUNDS.w, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#7dd3ff';
      for (const s of shotsRef.current) ctx.fillRect(s.x - 1, s.y - 4, 2, 8);

      ctx.fillStyle = '#e84ac9';
      for (const e of enemiesRef.current) {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#7dd3ff';
      ctx.beginPath();
      ctx.moveTo(playerPos.current.x, playerPos.current.y - 9);
      ctx.lineTo(playerPos.current.x - 7, playerPos.current.y + 7);
      ctx.lineTo(playerPos.current.x + 7, playerPos.current.y + 7);
      ctx.closePath();
      ctx.fill();

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const movePlayer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * FLIGHT_BOUNDS.w;
    const y = ((clientY - rect.top) / rect.height) * FLIGHT_BOUNDS.h;
    playerPos.current = {
      x: Math.min(FLIGHT_BOUNDS.w - 10, Math.max(10, x)),
      y: Math.min(FLIGHT_BOUNDS.h - 10, Math.max(30, y)),
    };
  };

  return (
    <div className="droneflight__stage">
      <div className="droneflight">
        <div className="droneflight__head">
          <p className="droneflight__framing">
            {mode === 'kamikaze' ? 'Kamikaze run' : 'Recon flight'} — {targetLabel}
          </p>
          <button className="droneflight__close" onClick={onClose}>
            Step away
          </button>
        </div>
        <p className="droneflight__prompt">
          {mode === 'kamikaze'
            ? 'Drag to fly. It only has to get there once.'
            : 'Drag to fly. Stay clear and bring it home.'}
        </p>
        <div className="droneflight__clock">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="droneflight__hits">
          {Array.from({ length: tuning.maxHits }).map((_, i) => (
            <span key={i} className={i < hits ? 'is-lost' : ''} />
          ))}
        </div>
        <canvas
          ref={canvasRef}
          className="droneflight__field"
          onPointerDown={(e) => {
            draggingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            movePlayer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (draggingRef.current) movePlayer(e.clientX, e.clientY);
          }}
          onPointerUp={() => {
            draggingRef.current = false;
          }}
        />
        {result && (
          <p className={`droneflight__result droneflight__result--${result}`}>
            {result === 'hit' ? (mode === 'kamikaze' ? 'Impact.' : 'Home.') : 'Shot down.'}
          </p>
        )}
      </div>
    </div>
  );
}
