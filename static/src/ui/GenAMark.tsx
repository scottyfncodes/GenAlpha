import './gen-a-mark.css';

/**
 * THE GEN A MARK — one logo, two readings, three states (Style Guide 07).
 *
 * "Gen A" reads as Gen Alpha to the adult world: harmless generational
 * branding. Every resistance asset renders the A as the anarchy circle-A. The
 * circle closes across the three acts and **no dialogue ever explains it**.
 * There is a test in `act3.test.ts` that fails if a line of dialogue names it.
 *
 * So the whole beat lives here, in one component with a `state` prop, and the
 * only thing content does is decide which state a surface is in:
 *
 *   clean    Act 1 — Language A typography, no circle at all. It is a logo on
 *            a council banner and it means nothing.
 *   claiming Act 2 — hand-cut, and the circle has been started by somebody with
 *            a marker and not finished. Deliberately inconsistent: it is being
 *            claimed in real time by different people who have each seen it
 *            once.
 *   closed   Act 3 — full circle-A, Language B, drawn on purpose. One frame on
 *            the big screen at Founders' Day, and then on walls in nine other
 *            towns.
 *
 * Drawn rather than lettered so the circle can actually be a stroke that
 * completes. Using a font would make the three states a typography trick; the
 * point is that somebody is closing it by hand.
 */
export type MarkState = 'clean' | 'claiming' | 'closed';

/** The A itself: apex, two legs, crossbar. Same path in all three states. */
const LEG_LEFT = 'M 50 22 L 30 74';
const LEG_RIGHT = 'M 50 22 L 70 74';
const CROSSBAR = 'M 38 58 L 62 58';

/**
 * The circle, as an arc that grows. Act 1 draws none of it; Act 2 draws most of
 * one, badly, with a gap at the top left where whoever was holding the marker
 * gave up or got interrupted; Act 3 closes it.
 *
 * `pathLength` is normalised to 100 so the dash arrays below read as
 * percentages of the circle rather than as arithmetic about radii.
 */
const CIRCLE_DASH: Record<MarkState, string | undefined> = {
  clean: undefined,
  claiming: '78 22',
  closed: '100 0',
};

export function GenAMark({
  state,
  size = 96,
  title,
}: {
  state: MarkState;
  size?: number;
  /** Accessible name. Omit on decorative uses so it isn't announced. */
  title?: string;
}) {
  const dash = CIRCLE_DASH[state];

  return (
    <svg
      className={`gen-a gen-a--${state}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/*
        The misregistration layer: a second, offset copy in the spot colour,
        like a riso print whose plates didn't quite line up. Only in the two
        hand-made states — Language A is flat, clean and slightly too polished,
        and giving it grain would say the wrong thing about it.
      */}
      {state !== 'clean' && (
        <g className="gen-a__offset" aria-hidden>
          <path d={LEG_LEFT} />
          <path d={LEG_RIGHT} />
          <path d={CROSSBAR} />
          {dash && (
            <circle cx="50" cy="50" r="40" pathLength={100} strokeDasharray={dash} />
          )}
        </g>
      )}

      <g className="gen-a__ink">
        <path d={LEG_LEFT} />
        <path d={LEG_RIGHT} />
        <path d={CROSSBAR} />
        {dash && (
          <circle
            cx="50"
            cy="50"
            r="40"
            pathLength={100}
            strokeDasharray={dash}
            /* Rotated so the gap in the claiming state sits at the top left,
               where a right-handed person with a marker runs out of arc. */
            transform="rotate(-125 50 50)"
          />
        )}
      </g>
    </svg>
  );
}

/**
 * Which state the mark is in, from the save's chapter. Content never passes a
 * state literal — the progression is a property of where the story has got to,
 * tracked as a design checklist item across three acts rather than as a
 * scripted beat.
 */
export function markStateFor(chapterId: string): MarkState {
  if (chapterId.startsWith('act3') || chapterId === 'ending') return 'closed';
  if (chapterId.startsWith('act2')) return 'claiming';
  return 'clean';
}
