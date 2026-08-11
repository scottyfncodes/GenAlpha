import { useEffect, useRef } from 'react';
import { play } from '../systems/audio';

/**
 * A heartbeat for a risk meter that's about to fill. Shared by Trace and
 * Cipher — both already have their own per-action cue (a pulse's reveal/
 * trap/dead-end sound, a guess's read), so this fires on top of those only
 * once the budget is genuinely tight (RiskMeter's own "danger" band, 80%+),
 * and only on an actual increase — a meter sitting still at 80% doesn't tick.
 * Same low-key cue SabotageMission's Alertness meter already uses, so a
 * player who's felt this in one minigame recognises it in the other.
 */
export function TensionCue({ value, max }: { value: number; max: number }) {
  const previous = useRef(value);
  useEffect(() => {
    const inDanger = max > 0 && value / max >= 0.8;
    if (value > previous.current && inDanger) play('alert');
    previous.current = value;
  }, [value, max]);
  return null;
}
