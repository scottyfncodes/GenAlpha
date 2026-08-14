import './title-eye.css';

/**
 * What the crack used to hide, now a camera rather than a bare eyeball —
 * a dome housing with a lens mounted inside it, and the lens itself is
 * what looks around: a fixed shell, a gaze that moves inside it, the way
 * an actual dome camera pans without the housing ever turning.
 *
 * Sitting above the wordmark rather than behind it — the two used to
 * overlap (the eye centred roughly where the text also lands), which read
 * as clutter on the one frame every player sees first, not as two things
 * layered on purpose. A clean manufactured ellipse for the housing, not a
 * hand-cut wobble, on purpose too: everything else in Language B is
 * something the resistance drew or scrawled by hand, but a camera housing
 * is TraceBook's own equipment — it's supposed to look machined.
 */
export function TitleEye({ visible }: { visible: boolean }) {
  return (
    <svg
      className={`title__eye ${visible ? 'is-open' : ''}`}
      viewBox="0 0 300 500"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <Camera cx={150} cy={92} rx={58} ry={30} lensR={23} irisR={13} pupilR={6} />
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
  return (
    <g className="title__eye-main">
      <ellipse className="title__eye-housing" cx={cx} cy={cy} rx={rx} ry={ry} />
      {/* The lens bezel stays put; only the gaze inside it moves. */}
      <circle className="title__eye-bezel" cx={cx} cy={cy} r={lensR} />
      <g className="title__eye-gaze">
        <circle className="title__eye-iris" cx={cx} cy={cy} r={irisR} />
        <circle className="title__eye-pupil" cx={cx} cy={cy} r={pupilR} />
        <circle className="title__eye-glint" cx={cx - pupilR * 0.6} cy={cy - pupilR * 0.6} r={pupilR * 0.35} />
      </g>
      <circle className="title__eye-led" cx={cx + rx - 8} cy={cy - ry * 0.4} r={2.2} />
    </g>
  );
}
