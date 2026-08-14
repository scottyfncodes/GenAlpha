import './title-crack.css';

/**
 * The veneer breaking — glass doesn't fracture as a handful of straight
 * rays; it webs. This is built in three layers around one off-centre impact
 * point: a dense tangle of hairline cracks right at the point of impact,
 * the long primary fractures that actually reach the edges, and a scatter
 * of curved shard facets connecting them so the spaces between the rays
 * read as broken panes instead of empty gaps. The same misregistration
 * trick every other Language B mark uses (a red offset copy under a pale
 * main line) ties it to the same broken system as the wordmark and the
 * Gen A mark, not a one-off transition flourish.
 */
export function TitleCrack({ visible }: { visible: boolean }) {
  return (
    <svg
      className={`title__crack ${visible ? 'is-cracked' : ''}`}
      viewBox="0 0 300 500"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <circle className="title__crack-flash" cx={IMPACT.x} cy={IMPACT.y} r={5} />
      <Layer paths={ARC_LINES} className="title__crack-arc" />
      <Layer paths={PRIMARY_LINES} className="title__crack-primary" />
      <Layer paths={PRIMARY_ROOTS} className="title__crack-root" />
      <Layer paths={BRANCH_LINES} className="title__crack-branch" />
      <Layer paths={MICRO_LINES} className="title__crack-micro" />
    </svg>
  );
}

function Layer({ paths, className }: { paths: string[]; className: string }) {
  return (
    <>
      <g className={`${className} title__crack-offset`}>
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g className={`${className} title__crack-ink`}>
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </>
  );
}

const IMPACT = { x: 150, y: 220 };

/** Five main fractures running from the impact point out toward the edges,
 * each with a kink or two rather than a straight ray. */
const PRIMARY_LINES = [
  'M 150 220 L 96 140 L 60 74',
  'M 150 220 L 190 120 L 214 34',
  'M 150 220 L 66 268 L 18 312',
  'M 150 220 L 232 300 L 268 372',
  'M 150 220 L 158 340 L 146 470',
];

/** A short, thicker stub laid under the first few px of each primary line —
 * real cracks are widest at the point of impact and taper as they run, and
 * a single fixed stroke-width can't fake that on its own. */
const PRIMARY_ROOTS = [
  'M 150 220 L 122 178',
  'M 150 220 L 176 172',
  'M 150 220 L 104 250',
  'M 150 220 L 196 262',
  'M 150 220 L 154 268',
];

/** Mid-length branches peeling off the primaries — more of them, and at
 * more varied lengths, than a single generation of splinters would give. */
const BRANCH_LINES = [
  'M 110 168 L 76 154',
  'M 110 168 L 118 132',
  'M 196 260 L 234 252',
  'M 174 158 L 208 176',
  'M 118 250 L 90 288',
  'M 118 250 L 138 282 L 128 310',
  'M 220 292 L 244 314',
  'M 88 208 L 54 218',
];

/** A dense tangle right at the point of impact — this is where real glass
 * webs hardest, a knot of very short hairlines rather than one clean
 * origin point for the primaries to fan out from. */
const MICRO_LINES = [
  'M 150 220 L 138 206',
  'M 150 220 L 164 204',
  'M 150 220 L 172 224',
  'M 150 220 L 168 240',
  'M 150 220 L 132 232',
  'M 150 220 L 140 244',
  'M 144 212 L 156 210',
  'M 158 214 L 168 210',
];

/** Short curved facets connecting adjacent primaries at a couple of radii,
 * so the wedges between the main rays read as broken panes instead of
 * open gaps — the "rings" a real shatter pattern webs across the rays. */
const ARC_LINES = [
  'M 96 140 Q 150 158 190 120',
  'M 190 120 Q 210 190 232 300',
  'M 66 268 Q 60 190 96 140',
  'M 66 268 Q 150 300 232 300',
  'M 158 340 Q 200 330 232 300',
  'M 158 340 Q 110 320 66 268',
];
