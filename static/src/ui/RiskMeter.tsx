import { useEffect, useRef, useState } from 'react';
import './risk-meter.css';

/**
 * ONE risk meter, used by Heat, the Trace Counter (hacking) and Alertness
 * (sabotage). Style Guide 07: the player should never have to relearn how to
 * read risk when a new mechanic appears.
 *
 * Two honesty rules are built in rather than left to each caller:
 *   - `pending` previews the cost of the action under consideration.
 *   - `ceiling` is the un-nudged budget. When `max` is below it, the track
 *     itself renders shorter, so a Heat-driven difficulty nudge is something
 *     the player can see rather than a denominator that quietly changed.
 */
export interface RiskMeterProps {
  label: string;
  value: number;
  max: number;
  /** Cost of the action under consideration, previewed on the bar. */
  pending?: number;
  /** Un-nudged budget. Defaults to `max` (no nudge in play). */
  ceiling?: number;
  /** Tier name / short status shown next to the number. */
  status?: string;
  compact?: boolean;
}

export function RiskMeter({
  label,
  value,
  max,
  pending = 0,
  ceiling,
  status,
  compact,
}: RiskMeterProps) {
  const top = Math.max(max, ceiling ?? max);
  const tightened = top > max;
  // Track occupies only the share of the full ceiling this budget still has.
  const trackPct = (max / top) * 100;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const pendingPct = Math.max(0, Math.min(100 - pct, (pending / max) * 100));

  /*
   * Build Addendum Module 9, Part B.2: "a difficulty nudge is visible or it
   * isn't a nudge" already governs `ceiling` above; the same honesty rule
   * says a *gain* should be visible too, not just the number changing. A
   * pulse fires on any increase, scaled by how big it was — a +1 tick and a
   * +8 spike must not look the same — and a separate jolt fires once the
   * bar is genuinely close to maxed, distinct from an ordinary gain pulse.
   * One shared component, three callers (Heat, Trace, Alertness): no caller
   * has to know its own band, this reads it off value/max like everything
   * else in here.
   */
  const prevValue = useRef(value);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const delta = value - prevValue.current;
    prevValue.current = value;
    if (delta <= 0) return;
    // 1 tick barely registers; a spike near a whole budget reads as a jolt.
    const strength = Math.max(1, Math.min(3, Math.ceil((delta / max) * 6)));
    setPulse(strength);
    const id = window.setTimeout(() => setPulse(0), 420);
    return () => window.clearTimeout(id);
  }, [value, max]);

  const band = pct >= 80 ? 'danger' : pct >= 50 ? 'watch' : 'calm';
  const closeCall = pct >= 90;

  return (
    <div className={`risk ${compact ? 'risk--compact' : ''} ${closeCall ? 'risk--close' : ''}`}>
      <div className="risk__head">
        <span className="risk__label">{label}</span>
        <span className="risk__value">
          {value}
          {pending > 0 && <em className="risk__pending"> +{pending}</em>}
          {tightened && <span className="risk__tightened">tightened</span>}
          {status && <span className="risk__status">{status}</span>}
        </span>
      </div>
      <div className="risk__bed">
        <div
          className={`risk__track ${tightened ? 'is-tightened' : ''}`}
          style={{ width: `${trackPct}%` }}
          role="meter"
          aria-label={tightened ? `${label} (budget tightened)` : label}
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          <div
            className={`risk__fill risk__fill--${band} ${pulse ? `risk__fill--pulse-${pulse}` : ''}`}
            style={{ width: `${pct}%` }}
          />
          {pendingPct > 0 && (
            <div className="risk__preview" style={{ left: `${pct}%`, width: `${pendingPct}%` }} />
          )}
          {[25, 50, 75].map((t) => (
            <span key={t} className="risk__tick" style={{ left: `${t}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
