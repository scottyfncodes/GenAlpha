import { useEffect, useRef, useState, type ReactNode } from 'react';
import './glitch.css';
import { play } from '../systems/audio';

/** How long a rupture lasts. Short on purpose. */
export const GLITCH_BURST_MS = 520;

/**
 * The glitch effect, built once and reused everywhere (Style Guide 07): the
 * title transition, investigation beats, Heat escalation at flagged+.
 *
 * It self-terminates. `active` is an edge, not a state — holding it true does
 * not hold the effect on, because "its power is in being a startling exception,
 * not a texture the player gets used to." A caller cannot accidentally leave a
 * chromatic-aberration filter running under a line of dialogue.
 */
export function Glitch({
  active,
  intensity = 1,
  ms = GLITCH_BURST_MS,
  children,
}: {
  active: boolean;
  intensity?: 0 | 1 | 2;
  ms?: number;
  children: ReactNode;
}) {
  const [running, setRunning] = useState(false);
  const wasActive = useRef(false);

  useEffect(() => {
    if (active && !wasActive.current) {
      setRunning(true);
      // Style Guide 07: the rupture is a startling exception, never a texture
      // the player gets used to. It gets the one sharp cue in the palette, and
      // it fires exactly where the visual does so the two can't drift apart.
      play('rupture');
    }
    wasActive.current = active;
  }, [active]);

  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => setRunning(false), ms);
    return () => window.clearTimeout(id);
  }, [running, ms]);

  return (
    <div className={`glitch ${running ? 'is-glitching' : ''}`} data-intensity={intensity}>
      {children}
      {running && <span className="glitch__scan" aria-hidden="true" />}
    </div>
  );
}
