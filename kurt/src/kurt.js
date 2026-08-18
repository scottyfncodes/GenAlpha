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
    thrusting: false,
    hair: createHair(),
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
  kurt.thrusting = false;
  kurt.cosmetic = cosmetic;
  resetHair(kurt.hair, x - PHYSICS.kurtRadius * 0.3, y - PHYSICS.kurtRadius * 1.05);
}

export function beginThrust(kurt) {
  kurt.thrusting = true;
  kurt.squash = 1;
  burstHair(kurt.hair, 0, -1, 160);
}

export function endThrust(kurt) {
  kurt.thrusting = false;
}

export function pulseFart(kurt, intensity) {
  kurt.squash = Math.max(kurt.squash, 0.55 * clamp(intensity, 0.3, 1.5));
}

export function updateKurt(kurt, dt, gravityMult, scrollSpeed, thrustMult = 1) {
  const g = PHYSICS.gravity * gravityMult;
  const accel = kurt.thrusting ? g - PHYSICS.holdThrustAccel * thrustMult : g;
  kurt.vy += accel * dt;
  kurt.vy = clamp(kurt.vy, PHYSICS.maxRise, PHYSICS.maxFall);
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

  const R = PHYSICS.kurtRadius;
  const rad = (kurt.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const localX = -R * 0.3;
  const localY = -R * 1.05;
  const anchorX = kurt.x + localX * cos - localY * sin;
  const anchorY = kurt.y + localX * sin + localY * cos;
  updateHair(kurt.hair, dt, anchorX, anchorY, kurt.vy, scrollSpeed);
}

export function getHitCircle(kurt) {
  return { x: kurt.x, y: kurt.y, r: PHYSICS.kurtRadius * 0.72 };
}

const SKIN = "#f4c9a0";
const SKIN_SHADE = "#e0a97c";
const SKIN_DARK = "#c98f60";
const OUTLINE = "rgba(120,66,38,0.55)";
const HAIR_BASE = "#4a2f1c";
const HAIR_HI = "#7a4f2f";
const MUSTACHE = "#5b3a24";

export function drawKurt(ctx, kurt) {
  const R = PHYSICS.kurtRadius;
  drawHair(ctx, kurt.hair, HAIR_BASE, HAIR_HI);

  ctx.save();
  ctx.translate(kurt.x, kurt.y);
  ctx.rotate((kurt.rotation * Math.PI) / 180);
  ctx.scale(kurt.scaleX, kurt.scaleY);

  drawArm(ctx, R, -1);

  // torso (tucked cannonball body)
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.ellipse(0, R * 0.08, R * 0.82, R * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();

  // chest/ab definition
  ctx.strokeStyle = "rgba(150,90,55,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-R * 0.02, -R * 0.32);
  ctx.lineTo(-R * 0.02, R * 0.28);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-R * 0.34, -R * 0.02);
  ctx.quadraticCurveTo(-R * 0.02, R * 0.08, R * 0.3, -R * 0.06);
  ctx.stroke();

  // two distinct tucked knees, front and center
  drawKnee(ctx, R, R * 0.5, R * 0.18);
  drawKnee(ctx, R, R * 0.22, R * 0.58);

  drawArm(ctx, R, 1);
  drawHand(ctx, R, -R * 0.06, R * 0.62);
  drawHand(ctx, R, R * 0.5, R * 0.5);

  drawAccessoryBehindHead(ctx, R, kurt.cosmetic);

  // neck stub connecting head to torso
  ctx.fillStyle = SKIN_SHADE;
  ctx.beginPath();
  ctx.ellipse(-R * 0.16, -R * 0.42, R * 0.22, R * 0.18, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(-R * 0.28, -R * 0.62);
  ctx.rotate(-0.08);

  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.58, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();

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

function drawKnee(ctx, R, cx, cy) {
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = SKIN_DARK;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(cx + R * 0.06, cy - R * 0.06, R * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawHand(ctx, R, cx, cy) {
  ctx.fillStyle = SKIN_SHADE;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  ctx.stroke();
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
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(side * R * 0.05, -R * 0.48);
  ctx.quadraticCurveTo(side * R * 0.92, -R * 0.05, side * R * 0.5, R * 0.58);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = R * 0.32 + 3;
  ctx.stroke();
  ctx.strokeStyle = SKIN;
  ctx.lineWidth = R * 0.32;
  ctx.stroke();
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
