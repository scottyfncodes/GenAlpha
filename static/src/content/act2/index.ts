import { ACT2_SPINE_SCENES } from './spine';
import { ACT2_NOVA_SCENES } from './nova';
import { ACT2_BETRAYAL_SCENES } from './betrayal';
import type { Scene } from '../../systems/scenes';

/**
 * Act 2, implemented from `docs/09-content-skeleton-act2.md`.
 *
 * Three threads, one cursor. Everything sequences on `missions.act2.beat`
 * rather than on a chapter string, so the mentor missions, the market and the
 * heist stay open alongside it — skeleton decision 2.
 */
export const ACT2_SCENES: Scene[] = [
  ...ACT2_SPINE_SCENES,
  ...ACT2_NOVA_SCENES,
  ...ACT2_BETRAYAL_SCENES,
];
