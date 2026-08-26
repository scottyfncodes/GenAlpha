import { useEffect, useRef, useState, type CSSProperties } from 'react';
import './title-eye.css';

/**
 * THE CAMERA THAT IS WATCHING YOU.
 *
 * The one part of the old title screen worth keeping was that the eye
 * moved; the problem was that it sat *behind* the wordmark as a pale
 * ellipse and you could barely find it. So it is still a lens that pans
 * inside a housing that doesn't move — a real dome camera's behaviour —
 * but it is now drawn as an actual municipal fitting rather than an
 * outline: a wall bracket, a hooded shell, a stack of lens rings, a
 * status LED, and an asset plate with a number on it. It is the focal
 * point of the screen and everything else is arranged under it.
 *
 * Three things it does, in descending order of how often:
 *
 *  1. **Scans.** Held positions with a jump between them, never a smooth
 *     sweep — this is looking *for* something, not admiring the view.
 *  2. **Blinks.** Rarely, and off the scan's own rhythm so the two never
 *     sync into a pattern you can predict.
 *  3. **Looks at you.** On a pointer or a touch it drops the scan and
 *     tracks, which is the whole gag: the thing on the title screen
 *     notices the cursor. It gives up after a moment of stillness and
 *     goes back to sweeping, so it never becomes a toy.
 *
 * A clean manufactured shell, not a hand-cut wobble: everything else in
 * Language B is something the resistance drew by hand, but this is
 * SafeTrace's own equipment and it is supposed to look machined. The one
 * exception is the mark sprayed on the housing — somebody has already been
 * up here, which is the only thing on this screen that is on your side.
 */

/** How long the lens keeps tracking after the last pointer movement before
 * it loses interest and resumes its own sweep. Long enough not to twitch,
 * short enough that an idle screen is always scanning within a breath. */
const TRACK_LINGER_MS = 2200;

/** How far the gaze may travel from centre, in viewBox units — kept well
 * inside the lens so the iris can never visually leave it. */
const GAZE_RANGE = 13;

export function TitleEye({ visible }: { visible: boolean }) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [gaze, setGaze] = useState<{ x: number; y: number } | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    /*
     * Tracked on the window rather than on the SVG: the lens should follow
     * the cursor anywhere on the title screen, including while the player
     * is reaching for New Game, not only in the moment they happen to pass
     * over the camera itself. Passive listeners — this never calls
     * `preventDefault`, and on touch it must not fight the tap it is
     * reacting to.
     */
    const onMove = (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      // Normalised to -1..1 from the lens's own centre, then eased so the
      // last stretch of travel compresses — a real pan slows as it reaches
      // its limit rather than slamming into it.
      const nx = Math.max(-1, Math.min(1, ((clientX - (r.left + r.width / 2)) / r.width) * 2));
      const ny = Math.max(-1, Math.min(1, ((clientY - (r.top + r.height / 2)) / r.height) * 2));
      const ease = (n: number) => Math.sign(n) * Math.sqrt(Math.abs(n));
      setGaze({ x: ease(nx) * GAZE_RANGE, y: ease(ny) * GAZE_RANGE });
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setGaze(null), TRACK_LINGER_MS);
    };

    const move = (e: PointerEvent) => onMove(e.clientX, e.clientY);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', move);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <svg
      ref={ref}
      className={`title__eye ${visible ? 'is-open' : ''} ${gaze ? 'is-tracking' : ''}`}
      viewBox="0 0 300 210"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      style={gaze ? ({ '--gaze-x': `${gaze.x}px`, '--gaze-y': `${gaze.y}px` } as CSSProperties) : undefined}
    >
      <Camera />
    </svg>
  );
}

function Camera() {
  const cx = 150;
  const cy = 118;
  const lensR = 54;
  // Both lids are drawn oversized and clipped to the lens below, so each
  // one only has to clear the slit line — the clip does the precise work
  // of matching the lens's own curve. Slanted rather than level, and never
  // symmetric, so the slit reads as narrowed in suspicion rather than
  // sleepy.
  const slit = lensR * 0.3;
  const over = lensR + 8;
  const upperLid = `M ${cx - over} ${cy - over} L ${cx + over} ${cy - over} L ${cx + over} ${cy - slit + 3} Q ${cx} ${cy - slit - 6} ${cx - over} ${cy - slit + 9} Z`;
  const lowerLid = `M ${cx - over} ${cy + over} L ${cx + over} ${cy + over} L ${cx + over} ${cy + slit + 4} Q ${cx} ${cy + slit - 3} ${cx - over} ${cy + slit + 7} Z`;

  return (
    <g className="title__eye-main">
      {/* The mount: a wall plate and the arm the housing hangs off, up and
          to the left, so the camera reads as bolted to something above the
          player rather than floating in the dark. */}
      <rect className="title__eye-mount" x={22} y={8} width={26} height={18} rx={2} />
      <path className="title__eye-arm" d="M 42 18 L 92 44" />

      {/* The shell — a hooded box with a sun visor projecting over the
          lens, which is the silhouette that says "municipal fitting"
          rather than "eyeball". */}
      <path
        className="title__eye-shell"
        d="M 66 44 L 236 44 Q 250 44 250 58 L 250 168 Q 250 182 236 182 L 66 182 Q 52 182 52 168 L 52 58 Q 52 44 66 44 Z"
      />
      <path className="title__eye-visor" d="M 52 44 L 250 44 L 258 30 L 46 30 Z" />
      <line className="title__eye-seam" x1={52} y1={150} x2={250} y2={150} />

      {/* The asset plate — the municipal number every real one carries,
          engraved as two bars rather than lettering, which would not stay
          legible at phone size. The screen's own metadata line says it in
          words instead. */}
      <rect className="title__eye-plate" x={64} y={158} width={44} height={16} rx={1} />
      <line className="title__eye-plate-line" x1={69} y1={164} x2={102} y2={164} />
      <line className="title__eye-plate-line" x1={69} y1={169} x2={94} y2={169} />

      {/* The status LED, blinking on its own beat, unrelated to the gaze. */}
      <circle className="title__eye-led" cx={236} cy={166} r={4} />

      {/* The lens assembly: bezel, barrel, and the gaze inside it. */}
      <circle className="title__eye-bezel" cx={cx} cy={cy} r={lensR + 7} />
      <circle className="title__eye-barrel" cx={cx} cy={cy} r={lensR} />
      <defs>
        <clipPath id="title-eye-lens-clip">
          <circle cx={cx} cy={cy} r={lensR} />
        </clipPath>
        <radialGradient id="title-eye-glow">
          <stop offset="0%" stopColor="var(--b-red)" stopOpacity="0.95" />
          <stop offset="55%" stopColor="var(--b-red)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--b-red)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g clipPath="url(#title-eye-lens-clip)">
        <circle className="title__eye-well" cx={cx} cy={cy} r={lensR} />
        <g className="title__eye-gaze">
          <circle className="title__eye-halo" cx={cx} cy={cy} r={34} fill="url(#title-eye-glow)" />
          <circle className="title__eye-iris" cx={cx} cy={cy} r={20} />
          <circle className="title__eye-pupil" cx={cx} cy={cy} r={8} />
          <circle className="title__eye-hot" cx={cx} cy={cy} r={3} />
          <circle className="title__eye-glint" cx={cx - 7} cy={cy - 8} r={3} />
        </g>
        <path className="title__eye-lid title__eye-lid--upper" d={upperLid} />
        <path className="title__eye-lid title__eye-lid--lower" d={lowerLid} />
      </g>

      {/* Somebody has already been up here. The only thing on this screen
          that is on the player's side, and it is deliberately small. */}
      <g className="title__eye-tag" transform="translate(200 92)">
        <path d="M 0 -12 L -10 11 M 0 -12 L 10 11 M -13 2 L 13 2" />
        <circle cx={0} cy={0} r={13} />
      </g>
    </g>
  );
}
