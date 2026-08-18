import { PHYSICS } from "./config.js";
import { clamp, expLerp } from "./utils.js";
import { createHair, resetHair, updateHair, burstHair, drawHair } from "./hair.js";

export function createKurt() {
  return {
    x: 0,
    y: 0,
    vy: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    squash: 0,
    rapidTapStreak: 0,
    lastTapTime: -999,
    hair: createHair(),
    flinch: 0,
    cosmetic: null,
  };
}

export function resetKurt(kurt, x, y, cosmetic) {
  kurt.x = x;
  kurt.y = y;
  kurt.vy = 0;
  kurt.rotation = 0;
  kurt.scaleX = 1;
  kurt.scaleY = 1;
  kurt.squash = 0;
  kurt.rapidTapStreak = 0;
  kurt.lastTapTime = -999;
  kurt.flinch = 0;
  kurt.cosmetic = cosmetic;
  resetHair(kurt.hair, x - PHYSICS.kurtRadius * 0.4, y - PHYSICS.kurtRadius * 0.5);
}

export function tapKurt(kurt, nowSec, thrustMult = 1) {
  const dt = nowSec - kurt.lastTapTime;
  if (dt < PHYSICS.rapidTapWindow) {
    kurt.rapidTapStreak += 1;
  } else {
    kurt.rapidTapStreak = 0;
  }
  kurt.lastTapTime = nowSec;

  const decay = Math.max(
    PHYSICS.rapidTapFloor,
    1 - kurt.rapidTapStreak * PHYSICS.rapidTapDecay
  );
  const impulse = PHYSICS.thrustImpulse * decay * thrustMult;
  kurt.vy = Math.max(kurt.vy + impulse, PHYSICS.maxRise * Math.max(1, thrustMult));

  kurt.squash = 1;
  burstHair(kurt.hair, 0, -1, 220 * decay * thrustMult);

  return { intensity: decay * clamp(thrustMult, 0.4, 2) };
}

export function updateKurt(kurt, dt, gravityMult, scrollSpeed) {
  kurt.vy += PHYSICS.gravity * gravityMult * dt;
  kurt.vy = clamp(kurt.vy, PHYSICS.maxRise * 1.4, PHYSICS.maxFall);
  kurt.y += kurt.vy * dt;

  const targetRotation =
    kurt.vy < 0
      ? clamp((kurt.vy / PHYSICS.maxRise) * PHYSICS.maxRotationUp, PHYSICS.maxRotationUp, 0)
      : clamp((kurt.vy / PHYSICS.maxFall) * PHYSICS.maxRotationDown, 0, PHYSICS.maxRotationDown);
  kurt.rotation = expLerp(kurt.rotation, targetRotation, PHYSICS.rotationLerp, dt);

  kurt.squash = Math.max(0, kurt.squash - dt * 4.5);
  const squashAmt = Math.sin(Math.min(1, kurt.squash) * Math.PI) * 0.22;
  kurt.scaleY = 1 - squashAmt;
  kurt.scaleX = 1 + squashAmt * 0.6;

  kurt.flinch = Math.max(0, kurt.flinch - dt * 3);

  const rad = (kurt.rotation * Math.PI) / 180;
  const anchorX = kurt.x - Math.cos(rad) * PHYSICS.kurtRadius * 0.3 - Math.sin(rad) * PHYSICS.kurtRadius * 0.1;
  const anchorY = kurt.y - Math.sin(rad) * PHYSICS.kurtRadius * 0.1 - PHYSICS.kurtRadius * 0.55;
  updateHair(kurt.hair, dt, anchorX, anchorY, kurt.vy, scrollSpeed);
}

export function getHitCircle(kurt) {
  return { x: kurt.x, y: kurt.y, r: PHYSICS.kurtRadius * 0.72 };
}

const SKIN = "#f4c9a0";
const SKIN_SHADE = "#e0a97c";
const HAIR_BASE = "#5b3a24";
const HAIR_HI = "#8a5a35";
const MUSTACHE = "#5b3a24";

export function drawKurt(ctx, kurt) {
  const R = PHYSICS.kurtRadius;
  drawHair(ctx, kurt.hair, HAIR_BASE, HAIR_HI);

  ctx.save();
  ctx.translate(kurt.x, kurt.y);
  ctx.rotate((kurt.rotation * Math.PI) / 180);
  ctx.scale(kurt.scaleX, kurt.scaleY);

  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.ellipse(0, 2, R * 0.98, R * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = SKIN_SHADE;
  ctx.beginPath();
  ctx.ellipse(R * 0.42, R * 0.18, R * 0.48, R * 0.42, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(R * 0.46, R * 0.55, R * 0.4, R * 0.36, 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(150,90,55,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-R * 0.05, -R * 0.15, R * 0.42, 0.7, 2.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-R * 0.3, R * 0.05);
  ctx.quadraticCurveTo(0, R * 0.2, R * 0.05, R * 0.55);
  ctx.stroke();

  drawArm(ctx, R, -1);
  drawArm(ctx, R, 1);

  drawAccessoryBehindHead(ctx, R, kurt.cosmetic);

  ctx.save();
  ctx.translate(-R * 0.28, -R * 0.62);
  ctx.rotate(-0.08);

  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.58, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(190,120,80,0.35)";
  ctx.beginPath();
  ctx.arc(R * 0.18, R * 0.1, R * 0.4, 0.2, 2.6);
  ctx.fill();

  const eyeY = -R * 0.06;
  drawEye(ctx, -R * 0.14, eyeY, R);
  drawEye(ctx, R * 0.2, eyeY, R);

  ctx.strokeStyle = "rgba(120,70,40,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(-R * 0.14, eyeY - R * 0.14, R * 0.13, Math.PI * 1.05, Math.PI * 1.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(R * 0.2, eyeY - R * 0.14, R * 0.13, Math.PI * 1.05, Math.PI * 1.85);
  ctx.stroke();

  ctx.fillStyle = MUSTACHE;
  ctx.beginPath();
  ctx.moveTo(-R * 0.32, R * 0.22);
  ctx.quadraticCurveTo(-R * 0.12, R * 0.12, 0, R * 0.22);
  ctx.quadraticCurveTo(R * 0.12, R * 0.12, R * 0.34, R * 0.22);
  ctx.quadraticCurveTo(R * 0.14, R * 0.34, 0, R * 0.24);
  ctx.quadraticCurveTo(-R * 0.14, R * 0.34, -R * 0.32, R * 0.22);
  ctx.fill();

  ctx.strokeStyle = "#8a5a35";
  ctx.lineWidth = R * 0.05;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, R * 0.34, R * 0.16, 0.25, Math.PI - 0.25);
  ctx.stroke();

  drawAccessoryOnHead(ctx, R, kurt.cosmetic);

  ctx.restore();

  ctx.restore();
}

function drawEye(ctx, ex, ey, R) {
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(ex, ey, R * 0.13, R * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2b2016";
  ctx.beginPath();
  ctx.arc(ex + R * 0.02, ey + R * 0.01, R * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(ex + R * 0.045, ey - R * 0.02, R * 0.018, 0, Math.PI * 2);
  ctx.fill();
}

function drawArm(ctx, R, side) {
  ctx.strokeStyle = SKIN;
  ctx.lineWidth = R * 0.36;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(side * R * 0.1, -R * 0.5);
  ctx.quadraticCurveTo(side * R * 0.95, -R * 0.1, side * R * 0.5, R * 0.6);
  ctx.stroke();
  ctx.fillStyle = SKIN_SHADE;
  ctx.beginPath();
  ctx.arc(side * R * 0.5, R * 0.6, R * 0.19, 0, Math.PI * 2);
  ctx.fill();
}

function drawAccessoryOnHead(ctx, R, cosmetic) {
  if (!cosmetic || !cosmetic.accessory) return;
  const accent = cosmetic.accent;
  switch (cosmetic.accessory) {
    case "cowboy":
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.ellipse(0, -R * 0.42, R * 0.62, R * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -R * 0.58, R * 0.34, Math.PI, Math.PI * 2);
      ctx.fill();
      break;
    case "viking":
      ctx.fillStyle = "#c9c9c9";
      ctx.beginPath();
      ctx.arc(0, -R * 0.5, R * 0.42, Math.PI * 1.05, Math.PI * 1.95);
      ctx.fill();
      ctx.fillStyle = "#eee6d0";
      ctx.beginPath();
      ctx.moveTo(-R * 0.4, -R * 0.5);
      ctx.quadraticCurveTo(-R * 0.62, -R * 0.75, -R * 0.5, -R * 0.9);
      ctx.quadraticCurveTo(-R * 0.35, -R * 0.68, -R * 0.28, -R * 0.52);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(R * 0.4, -R * 0.5);
      ctx.quadraticCurveTo(R * 0.62, -R * 0.75, R * 0.5, -R * 0.9);
      ctx.quadraticCurveTo(R * 0.35, -R * 0.68, R * 0.28, -R * 0.52);
      ctx.fill();
      break;
    case "disco":
      ctx.strokeStyle = accent;
      ctx.lineWidth = R * 0.1;
      ctx.beginPath();
      ctx.arc(0, -R * 0.38, R * 0.42, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      break;
    case "laurel":
      ctx.strokeStyle = "#7a9a5a";
      ctx.lineWidth = R * 0.08;
      ctx.beginPath();
      ctx.arc(0, -R * 0.4, R * 0.44, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.fillStyle = "#8fae63";
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * 1.2 + i * 0.14;
        const lx = Math.cos(a) * R * 0.46;
        const ly = -R * 0.4 + Math.sin(a) * R * 0.46;
        ctx.beginPath();
        ctx.ellipse(lx, ly, R * 0.09, R * 0.05, a, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "astro":
      ctx.strokeStyle = accent;
      ctx.lineWidth = R * 0.08;
      ctx.beginPath();
      ctx.arc(0, -R * 0.02, R * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(160,210,255,0.25)";
      ctx.beginPath();
      ctx.arc(0, -R * 0.02, R * 0.68, Math.PI * 1.2, Math.PI * 1.9);
      ctx.fill();
      break;
    default:
      break;
  }
}

function drawAccessoryBehindHead(ctx, R, cosmetic) {
  if (!cosmetic) return;
  if (cosmetic.accessory === "tie") {
    ctx.fillStyle = cosmetic.accent;
    ctx.beginPath();
    ctx.moveTo(-R * 0.1, -R * 0.15);
    ctx.lineTo(R * 0.1, -R * 0.15);
    ctx.lineTo(R * 0.14, R * 0.45);
    ctx.lineTo(0, R * 0.6);
    ctx.lineTo(-R * 0.14, R * 0.45);
    ctx.closePath();
    ctx.fill();
  }
}
