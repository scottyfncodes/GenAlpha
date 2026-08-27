/**
 * Speed, eased rather than switched — the "acceleration, momentum, carving"
 * half of the board pass. Walking off a board stays effectively instant (the
 * existing, already-tuned foot-feel is not something this pass touches);
 * riding one now spins up over a beat and coasts rather than snapping to its
 * top speed and stopping dead the instant input releases.
 *
 * Deliberately *not* full vector inertia: direction still follows the input
 * (or the joystick/keys) exactly, every frame — only the magnitude eases.
 * True drift, where the board keeps sliding somewhere the player didn't just
 * point it, reads great with an analog stick and terribly with a thumb on
 * glass: it's the thing that gets a mobile player stuck against a fence
 * fighting a vector they didn't choose. Easing the speed alone gets the
 * "this thing has weight" feeling without that failure mode.
 */
export interface MomentumTuning {
  /** Units/sec² spinning up toward a faster target. */
  accelPerSec: number;
  /** Units/sec² coasting down toward a slower one (usually a stop). */
  decelPerSec: number;
}

/** Walking's own curve is fast enough to be indistinguishable from the old
 * instant switch at ordinary frame rates — this file exists for the board,
 * not to quietly change how walking feels. */
const WALK_TUNING: MomentumTuning = { accelPerSec: 2000, decelPerSec: 2000 };

/** A few hundred milliseconds to spin up to top speed, a little under half a
 * second to coast down from it — long enough to feel like a real vehicle,
 * short enough that it never reads as sluggish on a screen this size. */
const BOARD_TUNING: MomentumTuning = { accelPerSec: 420, decelPerSec: 520 };

export function momentumTuningFor(boardTier: number): MomentumTuning {
  return boardTier > 0 ? BOARD_TUNING : WALK_TUNING;
}

/** One frame's step from `current` toward `target`, at whichever of the
 * tuning's two rates applies to the direction of travel — never overshoots. */
export function easeSpeed(current: number, target: number, dt: number, tuning: MomentumTuning): number {
  const rate = target >= current ? tuning.accelPerSec : tuning.decelPerSec;
  const maxStep = rate * dt;
  const delta = target - current;
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}
