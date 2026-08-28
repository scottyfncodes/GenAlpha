import { useEffect, useRef } from 'react';
import { useGame, useSave } from '../state/GameContext';
import { visibleLocations } from '../world/locations';
import { drawMapView } from '../world/mapview';
import { ALL_SCENES } from '../content/all';
import { nextObjectiveLocationId } from '../systems/scenes';
import './minimap.css';

const SIZE = 84;

/**
 * The corner minimap — a compressed, fogged read of the same grid the full
 * map screen (`ui/Map.tsx`) draws, tapped open into it. Deliberately tiny
 * and detail-free (no labels, no legend): this is a glance, not a screen,
 * per the design brief's own "don't turn this into a UI project" warning.
 * Redraws only when the save or the player's own (throttled) position
 * changes — `GameContext`'s `playerPos`, pushed from `Overworld.tsx`'s game
 * loop at a few times a second while moving, never every frame.
 */
export function Minimap() {
  const save = useSave();
  const { playerPos, setMapOpen } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawMapView({
      ctx,
      width: SIZE,
      height: SIZE,
      exploration: save.world.exploration,
      player: playerPos,
      visibleLocations: visibleLocations(save.player.flags),
      detailed: false,
      objectiveLocationId: nextObjectiveLocationId(save, ALL_SCENES),
    });
  }, [save, playerPos, dpr]);

  return (
    <button className="minimap" onClick={() => setMapOpen(true)} aria-label="Open map">
      <canvas ref={canvasRef} className="minimap__canvas" style={{ width: SIZE, height: SIZE }} />
    </button>
  );
}
