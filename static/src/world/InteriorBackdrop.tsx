import { useEffect, useRef } from 'react';
import { TILE, ensureSpriteSheetLoading, interiorSheetReady, drawInteriorTileAt } from './spritesheet';
import { BED, FLOOR_WOOD, NIGHTSTAND, PICTURE_FRAME } from './spriteIndexInterior';

/** The room strip in tiles — wide enough to read as a corner of a room,
 * short enough to sit above a location panel's text without pushing it
 * off screen on a phone. */
const COLS = 8;
const ROWS = 3;

/**
 * A small peek of an actual room behind a location panel's ambient text —
 * floor, a bed, a lit nightstand, a picture on the wall. Purely
 * decorative and purely static (nothing here is interactive or animated),
 * so unlike every sprite in `draw.ts` this has no procedural fallback: the
 * sheet hasn't loaded yet, nothing renders, same as a location panel
 * opened before the interior pack was added at all.
 *
 * Drawn at native tile resolution into a small canvas and scaled up with
 * CSS (`image-rendering: pixelated` in overworld.css) rather than drawn at
 * display size — the same crisp-pixel-art trick the main overworld canvas
 * uses via its own `SCALE` constant, just resolved by the browser instead
 * of a JS scale factor since this canvas never needs per-frame redraws.
 */
export function HomeInteriorBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    ensureSpriteSheetLoading();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let x = 0; x < COLS; x++) {
        for (let y = 1; y < ROWS; y++) {
          drawInteriorTileAt(ctx, FLOOR_WOOD, x * TILE, y * TILE);
        }
      }
      drawInteriorTileAt(ctx, BED.top, (COLS - 2) * TILE, 1 * TILE);
      drawInteriorTileAt(ctx, BED.base, (COLS - 2) * TILE, 2 * TILE);
      drawInteriorTileAt(ctx, NIGHTSTAND, (COLS - 3) * TILE, 2 * TILE);
      drawInteriorTileAt(ctx, PICTURE_FRAME, (COLS - 2) * TILE, 0);
    };

    if (interiorSheetReady()) {
      draw();
      return;
    }
    const id = window.setInterval(() => {
      if (!interiorSheetReady()) return;
      draw();
      window.clearInterval(id);
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="overworld__interior"
      width={COLS * TILE}
      height={ROWS * TILE}
    />
  );
}
