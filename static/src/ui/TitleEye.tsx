import './title-eye.css';

/**
 * What the crack was hiding — an eye behind the veneer the whole time, not
 * a new thing that shows up once it breaks. Invisible while Language A
 * still holds (same rule the crack follows), it snaps in at the rupture
 * and stays, faint but never gone again, once the screen is claimed. Two
 * smaller satellite eyes flank it — Bellhaven isn't watched by one thing.
 * Same hand-cut, slightly uneven outline every other Language B mark on
 * this screen uses (the crack, the Gen A mark's own rough loop), on
 * purpose: this is drawn by the same hand as everything else that broke
 * through.
 */
export function TitleEye({ visible }: { visible: boolean }) {
  return (
    <svg
      className={`title__eye ${visible ? 'is-open' : ''}`}
      viewBox="0 0 300 500"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <Eye cx={150} cy={220} rx={78} ry={38} irisR={24} pupilR={10} className="title__eye-main" />
      <Eye cx={58} cy={54} rx={26} ry={13} irisR={8} pupilR={3.5} className="title__eye-small" />
      <Eye cx={244} cy={58} rx={26} ry={13} irisR={8} pupilR={3.5} className="title__eye-small" />
    </svg>
  );
}

function Eye({
  cx,
  cy,
  rx,
  ry,
  irisR,
  pupilR,
  className,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  irisR: number;
  pupilR: number;
  className: string;
}) {
  // A hand-cut almond, not a symmetrical ellipse — the lower lid sags a
  // couple of px off true, same "somebody actually drew this" imprecision
  // the crack's own kinked lines have.
  const d = `M ${cx - rx} ${cy} Q ${cx} ${cy - ry} ${cx + rx} ${cy} Q ${cx} ${cy + ry * 1.15} ${cx - rx} ${cy} Z`;
  return (
    <g className={className}>
      <path className="title__eye-lid" d={d} />
      <circle className="title__eye-iris" cx={cx} cy={cy} r={irisR} />
      <circle className="title__eye-pupil" cx={cx} cy={cy} r={pupilR} />
    </g>
  );
}
