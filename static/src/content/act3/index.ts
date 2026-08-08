import { ACT3_PREP_SCENES } from './prep';
import { ACT3_FINALE_SCENES } from './finale';
import type { Scene } from '../../systems/scenes';

/**
 * Act 3, implemented from `docs/10-content-skeleton-act3.md`.
 *
 * `systems/heist.ts` was not modified to make this act work, which was the
 * tripwire set in the Phase 5 handoff: if the finale had needed the heist
 * system changed, that would have meant it was being improvised. It didn't.
 */
export const ACT3_SCENES: Scene[] = [...ACT3_PREP_SCENES, ...ACT3_FINALE_SCENES];
