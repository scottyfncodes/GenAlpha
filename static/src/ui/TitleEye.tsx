import './title-eye.css';

/**
 * What the crack used to hide, now a camera rather than a bare eyeball —
 * a dome housing with a lens mounted inside it, and the lens itself is
 * what looks around: a fixed shell, a gaze that moves inside it, the way
 * an actual dome camera pans without the housing ever turning. Sitting
 * behind the wordmark on purpose — this is the thing the title's own text
 * broke through in front of, not a separate decoration above it.
 *
 * The lens is hooded rather than a bare wide-open circle — two heavy lids
 * clipped to the lens itself, narrowing the gaze down to a watching slit,
 * and the lids themselves squint further shut in sync with the same
 * animation that sweeps the gaze — held tighter at each place it stops to
 * look, easing back only when it returns to centre. A fully open eye
 * reads as startled; this is reading the room, not caught off guard by
 * it. A clean manufactured ellipse for the housing, not a hand-cut
 * wobble: everything else in Language B is something the resistance drew
 * or scrawled by hand, but a camera housing is SafeTrace's own equipment
 * — it's supposed to look machined.
 */
export function TitleEye({ visible }: { visible: boolean }) {
  return (
    <svg
      className={`title__eye ${visible ? 'is-open' : ''}`}
      viewBox="0 0 300 500"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <Camera cx={150} cy={220} rx={78} ry={38} lensR={30} irisR={17} pupilR={8} />
    </svg>
  );
}

function Camera({
  cx,
  cy,
  rx,
  ry,
  lensR,
  irisR,
  pupilR,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  lensR: number;
  irisR: number;
  pupilR: number;
}) {
  // How much of the lens stays open at its narrowest, dead centre — small
  // on purpose, a slit rather than a squint. Both lid shapes are drawn
  // oversized (well past the lens's own edge in every direction) and then
  // clipped to the lens circle below, so the actual coverage only has to
  // clear the slit line — the clip does the precise work of matching the
  // lens's own curve.
  const slit = lensR * 0.24;
  const overshoot = lensR + 6;
  // Slanted rather than level — heavier and lower on the left, so the slit
  // reads as narrowed in suspicion rather than just sleepy. The lower lid
  // rises to meet it at a shallower angle, the way a real hooded eye's two
  // lids are never symmetric.
  const upperLid = `M ${cx - overshoot} ${cy - overshoot} L ${cx + overshoot} ${cy - overshoot} L ${cx + overshoot} ${cy - slit + 3} Q ${cx} ${cy - slit - 5} ${cx - overshoot} ${cy - slit + 8} Z`;
  const lowerLid = `M ${cx - overshoot} ${cy + overshoot} L ${cx + overshoot} ${cy + overshoot} L ${cx + overshoot} ${cy + slit + 4} Q ${cx} ${cy + slit - 2} ${cx - overshoot} ${cy + slit + 6} Z`;
  const clipId = 'title-eye-lens-clip';

  return (
    <g className="title__eye-main">
      <ellipse className="title__eye-housing" cx={cx} cy={cy} rx={rx} ry={ry} />
      {/* The lens bezel stays put; only the gaze inside it moves. */}
      <circle className="title__eye-bezel" cx={cx} cy={cy} r={lensR} />
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={lensR} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <g className="title__eye-gaze">
          <circle className="title__eye-iris" cx={cx} cy={cy} r={irisR} />
          <circle className="title__eye-pupil" cx={cx} cy={cy} r={pupilR} />
          <circle className="title__eye-glint" cx={cx - pupilR * 0.6} cy={cy - pupilR * 0.6} r={pupilR * 0.35} />
        </g>
        <path className="title__eye-lid title__eye-lid--upper" d={upperLid} />
        <path className="title__eye-lid title__eye-lid--lower" d={lowerLid} />
      </g>
    </g>
  );
}
