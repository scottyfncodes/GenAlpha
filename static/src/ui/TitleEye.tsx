import './title-eye.css';

/**
 * What the crack used to hide, now a camera rather than a bare eyeball —
 * a dome housing with a lens mounted inside it, and the lens itself is
 * what looks around: a fixed shell, a gaze that moves inside it, the way
 * an actual dome camera pans without the housing ever turning. Same
 * hand-cut, slightly uneven outline every other Language B mark on this
 * screen uses (the Gen A mark's own rough loop), on purpose: this is drawn
 * by the same hand as everything else that broke through.
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
  // A hand-cut capsule for the dome housing, not a symmetrical stadium
  // shape — the same "somebody actually drew this" imprecision the crack's
  // own kinked lines have, just applied to a camera shell instead of an
  // eye's lid.
  const housing = `M ${cx - rx} ${cy} Q ${cx} ${cy - ry} ${cx + rx} ${cy} Q ${cx} ${cy + ry * 1.15} ${cx - rx} ${cy} Z`;

  return (
    <g className="title__eye-main">
      {/* A short mounting arm — this is bolted to something, not floating. */}
      <line className="title__eye-arm" x1={cx} y1={cy - ry - 22} x2={cx} y2={cy - ry + 4} />
      <path className="title__eye-housing" d={housing} />
      {/* The lens bezel stays put; only the gaze inside it moves. */}
      <circle className="title__eye-bezel" cx={cx} cy={cy} r={lensR} />
      <g className="title__eye-gaze">
        <circle className="title__eye-iris" cx={cx} cy={cy} r={irisR} />
        <circle className="title__eye-pupil" cx={cx} cy={cy} r={pupilR} />
        <circle className="title__eye-glint" cx={cx - pupilR * 0.6} cy={cy - pupilR * 0.6} r={pupilR * 0.35} />
      </g>
      <circle className="title__eye-led" cx={cx + rx - 10} cy={cy - ry * 0.3} r={2.4} />
    </g>
  );
}
