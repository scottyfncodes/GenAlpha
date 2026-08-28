import { useEffect, useRef } from 'react';
import { useGame, useSave } from '../state/GameContext';
import { visibleLocations } from '../world/locations';
import { drawMapView } from '../world/mapview';
import { gpsTier, playerDroneTier } from '../systems/market';
import { ALL_SCENES } from '../content/all';
import { nextObjectiveLocationId } from '../systems/scenes';
import './mapview.css';

/**
 * The full-detail map surface — canvas, legend, a line of real numbers
 * about how much of the town is actually known. Shared by the standalone
 * map screen (`Map.tsx`, opened from the minimap) and the Cyberdeck's own
 * Map app: the same information at the same detail level, just inside a
 * different frame, the same way `Market.tsx` is one screen reachable from
 * two doors.
 *
 * Sized off its own container via `ResizeObserver` rather than a fixed
 * pixel size — the standalone screen fills most of the viewport, the
 * Cyberdeck's own frame is much smaller, and this draws correctly at
 * either without knowing which one it's in.
 */
export function MapView() {
  const save = useSave();
  const { playerPos } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !container || !ctx) return;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = container.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawMapView({
        ctx,
        width,
        height,
        exploration: save.world.exploration,
        player: playerPos,
        visibleLocations: visibleLocations(save.player.flags),
        detailed: true,
        objectiveLocationId: nextObjectiveLocationId(save, ALL_SCENES),
      });
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(container);
    return () => observer.disconnect();
  }, [save, playerPos]);

  const gps = gpsTier(save);
  const drone = playerDroneTier(save);
  const knownCells = save.world.exploration.explored.length + save.world.exploration.scouted.length;
  const hasObjective = Boolean(nextObjectiveLocationId(save, ALL_SCENES));

  return (
    <div className="mapview">
      <div className="mapview__canvas-wrap" ref={containerRef}>
        <canvas ref={canvasRef} className="mapview__canvas" />
      </div>
      <div className="mapview__legend">
        <span className="mapview__legend-item">
          <i className="mapview__swatch mapview__swatch--explored" /> Been there
        </span>
        <span className="mapview__legend-item">
          <i className="mapview__swatch mapview__swatch--scouted" /> Seen at a distance
        </span>
        {hasObjective && (
          <span className="mapview__legend-item">
            <i className="mapview__swatch mapview__swatch--objective" /> Where you’re needed
          </span>
        )}
      </div>
      {gps === 0 && drone === 0 && knownCells < 40 && (
        <p className="mapview__hint">
          This only fills in where you’ve actually walked. A GPS rig would keep filling it in as you go —
          a drone would let you see a lot further out without walking there at all.
        </p>
      )}
    </div>
  );
}
