import './title-crack.css';

/**
 * The veneer breaking — a handful of jagged crack lines that snap into view
 * the instant the rupture hits and then stay, permanently, once the screen
 * is claimed. That's the whole point of the effect: Language A's glass
 * doesn't heal. The same misregistration trick every other Language B mark
 * uses (a red offset copy under a pale main line) so it reads as part of
 * the same broken system as the wordmark and the Gen A mark, not a
 * one-off transition flourish.
 */
export function TitleCrack({ visible }: { visible: boolean }) {
  return (
    <svg
      className={`title__crack ${visible ? 'is-cracked' : ''}`}
      viewBox="0 0 300 500"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g className="title__crack-offset">
        {CRACK_LINES.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g className="title__crack-ink">
        {CRACK_LINES.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

/** Five main fractures from one off-centre impact point, each with a kink
 * or two rather than a straight ray, plus three short branches — enough to
 * read as shattered glass without turning into a texture pass. */
const CRACK_LINES = [
  'M 150 220 L 96 140 L 60 74',
  'M 150 220 L 190 120 L 214 34',
  'M 150 220 L 66 268 L 18 312',
  'M 150 220 L 232 300 L 268 372',
  'M 150 220 L 158 340 L 146 470',
  'M 110 168 L 76 154',
  'M 196 260 L 234 252',
  'M 118 250 L 90 288',
];
