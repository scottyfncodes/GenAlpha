import { rand } from "./utils.js";

const THEME_COLORS = [
  { from: 0, sky1: "#6fd6ff", sky2: "#eaf9ff", skyline: "#3f7a4f", ground: "#6bbf59" },
  { from: 300, sky1: "#6fd6ff", sky2: "#eaf9ff", skyline: "#8a8f99", ground: "#9aa0a8" },
  { from: 700, sky1: "#63c9ff", sky2: "#e6f7ff", skyline: "#75808f", ground: "#8b93a0" },
  { from: 1200, sky1: "#5cbdfb", sky2: "#e3f4ff", skyline: "#4b5a72", ground: "#5f6b80" },
  { from: 1800, sky1: "#ffcf7a", sky2: "#fff2da", skyline: "#c98b4a", ground: "#d9a24f" },
  { from: 2500, sky1: "#7f96e0", sky2: "#f0e6ff", skyline: "#4a4468", ground: "#5c527a" },
  { from: 3300, sky1: "#31335e", sky2: "#8a6fb0", skyline: "#211f3d", ground: "#2c2a4d" },
];

function themeColorsAt(meters) {
  let cur = THEME_COLORS[0];
  for (const t of THEME_COLORS) if (meters >= t.from) cur = t;
  return cur;
}

function lerpColor(c1, c2, t) {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bl})`;
}
function hexToRgb(hex) {
  const v = hex.replace("#", "");
  return {
    r: parseInt(v.substring(0, 2), 16),
    g: parseInt(v.substring(2, 4), 16),
    b: parseInt(v.substring(4, 6), 16),
  };
}

export function createBackground(w, h) {
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    clouds.push({ x: rand(0, w), y: rand(h * 0.05, h * 0.4), scale: rand(0.6, 1.4), speed: rand(10, 22) });
  }
  const skylineSeed = [];
  for (let i = 0; i < 12; i++) {
    skylineSeed.push({ h: rand(0.1, 0.32), w: rand(0.06, 0.11) });
  }
  return { clouds, skylineSeed, groundOffset: 0, w, h, prevMeters: 0 };
}

export function resizeBackground(bg, w, h) {
  bg.w = w;
  bg.h = h;
}

export function updateBackground(bg, dt, scrollSpeed, meters) {
  bg.prevMeters = meters;
  for (const c of bg.clouds) {
    c.x -= c.speed * dt;
    if (c.x < -80) {
      c.x = bg.w + rand(20, 100);
      c.y = rand(bg.h * 0.05, bg.h * 0.4);
    }
  }
  bg.groundOffset = (bg.groundOffset + scrollSpeed * dt) % 40;
  bg.skylineOffset = ((bg.skylineOffset || 0) + scrollSpeed * 0.45 * dt) % (bg.w / 2);
}

export function drawBackground(ctx, bg, meters, groundH) {
  const w = bg.w, h = bg.h;
  const theme = themeColorsAt(meters);
  const nextIdx = THEME_COLORS.findIndex((t) => t.from > meters);
  let colors = theme;
  if (nextIdx > 0) {
    const cur = THEME_COLORS[nextIdx - 1];
    const next = THEME_COLORS[nextIdx];
    const span = next.from - cur.from;
    const t = span > 0 ? Math.min(1, (meters - cur.from) / span) : 0;
    colors = {
      sky1: lerpColor(cur.sky1, next.sky1, t),
      sky2: lerpColor(cur.sky2, next.sky2, t),
      skyline: lerpColor(cur.skyline, next.skyline, t),
      ground: lerpColor(cur.ground, next.ground, t),
    };
  }

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, colors.sky1);
  grad.addColorStop(1, colors.sky2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  for (const c of bg.clouds) {
    drawCloud(ctx, c.x, c.y, c.scale);
  }

  const skylineBaseY = h * 0.72;
  ctx.fillStyle = colors.skyline;
  ctx.globalAlpha = 0.55;
  let sx = -(bg.skylineOffset || 0) * 2;
  let i = 0;
  while (sx < w + 60) {
    const seed = bg.skylineSeed[i % bg.skylineSeed.length];
    const bw = seed.w * w;
    const bh = seed.h * h;
    ctx.fillRect(sx, skylineBaseY - bh, bw, bh + h);
    sx += bw + 6;
    i++;
  }
  ctx.globalAlpha = 1;

  if (groundH > 0) {
    const groundY = h - groundH;
    ctx.fillStyle = colors.ground;
    ctx.fillRect(0, groundY, w, groundH);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0, groundY, w, 4);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    const off = bg.groundOffset || 0;
    for (let gx = -off; gx < w + 20; gx += 20) {
      ctx.fillRect(gx, groundY + 8, 10, 3);
    }
  }
}

function drawCloud(ctx, x, y, s) {
  ctx.beginPath();
  ctx.ellipse(x, y, 22 * s, 13 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 16 * s, y - 6 * s, 15 * s, 11 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 16 * s, y - 3 * s, 14 * s, 10 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}
