/**
 * Per-character speaker colour. Until now every name tag was one of exactly
 * two colours — Language A's blue or Language B's red — which tells you which
 * *world* a line was spoken in but nothing about *who* said it. Mom, Reeta and
 * Councilwoman Reyes all shared one blue tag; Deja, Aaron and Bishop all
 * shared one red one. This gives named, recurring characters their own colour
 * so a speaker is recognisable at a glance, independent of which language
 * scope the scene happens to be in.
 *
 * Deliberately not exhaustive: a name with no entry here falls back to the
 * existing per-language colour in scene-view.css, which is exactly right for
 * a one-line walk-on nobody needs to be able to pick out of a lineup.
 */
export const SPEAKER_COLORS: Record<string, string> = {
  Mom: '#5b96ff',
  'Mr. Arroyo': '#3f9d95',
  Beau: '#c9932a',
  Ellen: '#d1518c',
  Deja: '#f0a03c',
  Aaron: '#7d8fa8',
  Milo: '#4f9e5c',
  Bishop: '#8b5fc9',
  Reeta: '#b3752f',
  Ridge: '#8a9436',
  Ines: '#3aa39c',
  'Councilwoman Reyes': '#3a6fd8',
};

export function speakerColor(name: string): string | undefined {
  return SPEAKER_COLORS[name];
}
