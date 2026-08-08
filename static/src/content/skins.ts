/**
 * The skin layer: one mechanic stays fresh because the fiction around it
 * changes, not the rules. This is also where the two visual languages collide
 * most directly — a Language A system being broken into with Language B tools.
 */
export type SkinId = 'records' | 'resistance' | 'villain' | 'heist' | 'infrastructure' | 'datacenter';

export interface Skin {
  id: SkinId;
  /** Which visual language the mission chrome is rendered in. */
  language: 'A' | 'B';
  title: string;
  framing: string;
  /** Villain systems tell you less per pulse — better security, same rules. */
  revealAdjacentCounts?: boolean;
}

export const SKINS: Record<SkinId, Skin> = {
  records: {
    id: 'records',
    language: 'A',
    title: 'Bellhaven Public Records',
    framing: 'Cross-reference the filed report.',
    revealAdjacentCounts: true,
  },
  resistance: {
    id: 'resistance',
    language: 'B',
    title: 'Somebody’s Homemade Tool',
    framing: 'Trace the feed back to source.',
    revealAdjacentCounts: true,
  },
  villain: {
    id: 'villain',
    language: 'A',
    title: 'Helio Family Safety Portal',
    framing: 'Spoof your way past the login wall.',
    revealAdjacentCounts: false,
  },
  heist: {
    id: 'heist',
    language: 'B',
    title: 'Cold Wallet — Live',
    framing: 'You’re inside. Don’t linger.',
    revealAdjacentCounts: false,
  },
  infrastructure: {
    id: 'infrastructure',
    language: 'B',
    title: 'Junction Box 14',
    framing: 'Neighbourhood scale. Doesn’t make it small.',
  },
  datacenter: {
    id: 'datacenter',
    language: 'A',
    title: 'Bellhaven Data Annex',
    framing: 'Deja’s mother’s crew services this building.',
  },
};
