/**
 * Two standalone images for `DroneFlight.tsx` — not part of the world's
 * tile-grid sprite pipeline (`world/spritesheet.ts`), just a pair of plain
 * PNGs loaded once and drawn at whatever size the minigame's canvas wants.
 * Both started life in Kenney's CC0 Space Shooter Remastered pack: a player
 * ship reused as-is for the player's own recon/kamikaze drone, and a flying
 * saucer reused as the SafeTrace interceptor — its ringed, lens-like design
 * already reads as a watching eye, which is exactly what an interceptor
 * drone in this story is. See `public/sprites/NOTICE.txt`.
 *
 * Same `ensureLoading`/`ready` shape every other sheet in this game
 * follows, so the minigame's draw loop can fall back to its original flat
 * shapes for the handful of frames before these decode.
 */
let playerImg: HTMLImageElement | null = null;
let interceptorImg: HTMLImageElement | null = null;
let playerReady = false;
let interceptorReady = false;

export function ensureDroneSpritesLoading(): void {
  if (!playerImg) {
    playerImg = new Image();
    playerImg.onload = () => {
      playerReady = true;
    };
    playerImg.src = './sprites/droneflight-player.png';
  }
  if (!interceptorImg) {
    interceptorImg = new Image();
    interceptorImg.onload = () => {
      interceptorReady = true;
    };
    interceptorImg.src = './sprites/droneflight-interceptor.png';
  }
}

export function droneSpritesReady(): boolean {
  return playerReady && interceptorReady;
}

export function drawPlayerDrone(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  if (!playerImg || !playerReady) return;
  const w = size;
  const h = size * (playerImg.naturalHeight / playerImg.naturalWidth);
  ctx.drawImage(playerImg, cx - w / 2, cy - h / 2, w, h);
}

export function drawInterceptor(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  if (!interceptorImg || !interceptorReady) return;
  ctx.drawImage(interceptorImg, cx - size / 2, cy - size / 2, size, size);
}
