const SEGMENT_COUNT = 8;
const REST_LENGTHS = [15, 14.5, 14, 13, 12, 10.5, 9, 7.5];
const DAMPING = 0.94;

export function createHair() {
  const points = [];
  for (let i = 0; i < SEGMENT_COUNT; i++) {
    points.push({ x: 0, y: 0, px: 0, py: 0 });
  }
  return { points, windX: -60, windY: 0 };
}

export function resetHair(hair, x, y) {
  for (let i = 0; i < hair.points.length; i++) {
    const p = hair.points[i];
    p.x = x - i * 10;
    p.y = y + i * 2;
    p.px = p.x;
    p.py = p.y;
  }
}

export function burstHair(hair, dirX, dirY, strength) {
  for (let i = 1; i < hair.points.length; i++) {
    const p = hair.points[i];
    const falloff = 1 - i / hair.points.length;
    p.px -= dirX * strength * falloff * 0.06;
    p.py -= dirY * strength * falloff * 0.06;
  }
}

export function updateHair(hair, dt, anchorX, anchorY, kurtVy, scrollSpeed) {
  const pts = hair.points;
  pts[0].px = pts[0].x;
  pts[0].py = pts[0].y;
  pts[0].x = anchorX;
  pts[0].y = anchorY;

  const ax = -scrollSpeed * 0.9;
  const ay = kurtVy * 0.35 + 220;
  const clampedDt = Math.min(dt, 1 / 30);

  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const vx = (p.x - p.px) * DAMPING;
    const vy = (p.y - p.py) * DAMPING;
    p.px = p.x;
    p.py = p.y;
    p.x += vx + ax * clampedDt * clampedDt;
    p.y += vy + ay * clampedDt * clampedDt;
  }

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const p = pts[i];
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const target = REST_LENGTHS[i - 1];
    const diff = (dist - target) / dist;
    p.x -= dx * diff;
    p.y -= dy * diff;
  }
}

export function drawHair(ctx, hair, baseColor, highlightColor) {
  const pts = hair.points;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let pass = 0; pass < 2; pass++) {
    const strand = pass === 0 ? 0 : 1;
    const offsetSign = strand === 0 ? 1 : -1;
    ctx.strokeStyle = pass === 0 ? baseColor : highlightColor;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y + offsetSign * 2);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y + offsetSign * 2 * (1 - i / pts.length), mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.lineWidth = pass === 0 ? 13 : 5;
    ctx.globalAlpha = pass === 0 ? 1 : 0.55;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.lineWidth = 8;
  ctx.strokeStyle = baseColor;
  ctx.beginPath();
  ctx.moveTo(pts[pts.length - 3].x, pts[pts.length - 3].y);
  ctx.lineTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.restore();
}
