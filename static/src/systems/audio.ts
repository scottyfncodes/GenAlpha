/**
 * SOUND.
 *
 * `settings.audioMuted` has been in the schema since 0.1.0 and there has been
 * nothing to mute. This is the smallest honest version of that: every cue is
 * synthesised from oscillators at call time, so the game still ships as a
 * static site with zero asset weight and zero network fetch.
 *
 * The design note this exists to obey is module 04's, and it is specific:
 * feedback on a trap trigger should be "a 'close call' jolt, not a harsh
 * failure buzzer — matches the low-frustration design goal." So the trap cue
 * is a warm, short thud that bends downward and stops. It is the sound of
 * nearly dropping something, not the sound of getting an answer wrong.
 *
 * Nothing in the game reads a return value from any of this, and every entry
 * point is a no-op when audio is unavailable or muted — a browser that blocks
 * the AudioContext until a gesture, a test run with no `window`, or a player
 * who turned it off. Sound is never load-bearing.
 */

export type Cue = 'pulse' | 'reveal' | 'trap' | 'alert' | 'clear' | 'rupture';

interface CueSpec {
  /** Hz, start and end. A bend rather than a note. */
  from: number;
  to: number;
  seconds: number;
  type: OscillatorType;
  /** Peak gain. Everything here is quiet; none of it is an event. */
  gain: number;
}

/**
 * The whole palette, as data.
 *
 * Read down the `gain` column: nothing is loud, and the trap is not the
 * loudest thing in the table. The three risk meters share one honest visual
 * language (module 07) and this is the same idea applied to the ear — the
 * player should not learn to flinch at one of these.
 */
const CUES: Record<Cue, CueSpec> = {
  /** A pulse going out. Dry, short, unremarkable — it happens a lot. */
  pulse: { from: 420, to: 400, seconds: 0.05, type: 'sine', gain: 0.05 },
  /** A node coming back safe. A shade brighter than the pulse. */
  reveal: { from: 620, to: 700, seconds: 0.07, type: 'sine', gain: 0.06 },
  /**
   * The close call. Warm triangle, bending down and away, over before it has
   * really started. Deliberately not a square wave and deliberately not
   * rising — a rising harsh tone is a buzzer, which is the exact thing module
   * 04 rules out.
   */
  trap: { from: 300, to: 120, seconds: 0.16, type: 'triangle', gain: 0.14 },
  /** Alertness climbing in the sabotage window. Low, felt more than heard. */
  alert: { from: 180, to: 160, seconds: 0.12, type: 'sine', gain: 0.09 },
  /** Getting out clean. Quiet, and does not congratulate anybody. */
  clear: { from: 540, to: 760, seconds: 0.18, type: 'sine', gain: 0.07 },
  /** The glitch moment. Rare and sharp, per Style Guide 07 — never a texture. */
  rupture: { from: 900, to: 220, seconds: 0.1, type: 'sawtooth', gain: 0.1 },
};

let ctx: AudioContext | null = null;
let muted = false;

/** Kept in sync from the settings panel. Defaults to audible. */
export function setMuted(value: boolean): void {
  muted = value;
  if (value) stopAmbient();
}

export function isMuted(): boolean {
  return muted;
}

/**
 * Lazily created, because browsers refuse an AudioContext until the player has
 * interacted with the page and creating one eagerly logs a warning on load for
 * no benefit. Returns null anywhere there isn't one — tests, SSR, a locked-down
 * browser — and every caller treats that as "no sound", never as an error.
 */
function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

/** Plays a cue. Silent and harmless if anything at all is unavailable. */
export function play(cue: Cue): void {
  if (muted) return;
  const audio = context();
  if (!audio) return;

  const spec = CUES[cue];
  const now = audio.currentTime;

  try {
    const osc = audio.createOscillator();
    const amp = audio.createGain();

    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, spec.to), now + spec.seconds);

    // Fast in, exponential out. A cue that fades slowly reads as a verdict.
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(spec.gain, now + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + spec.seconds);

    osc.connect(amp).connect(audio.destination);
    osc.start(now);
    osc.stop(now + spec.seconds + 0.02);
  } catch {
    // A cue that throws must never take a mission down with it.
  }
}

/**
 * THE AMBIENT BED.
 *
 * Every cue above is a reaction to something — a pulse, a trap, a clean
 * exit. Nothing in the game plays while nothing is happening, and Style
 * Guide 07's "warm and a little melancholy, suburban dusk" has never had a
 * sound under it. This is that: three open, unresolved sine tones (no third
 * that would resolve them into a triad — dusk doesn't resolve, it just
 * holds) drifting very slightly against each other so the pad breathes
 * instead of sitting dead static. It fades in over a few seconds and never
 * jumps, and it is quiet enough that every cue above still reads clearly
 * over the top of it — the loudest cue here (`trap`, 0.14) is more than
 * five times `AMBIENT_GAIN`.
 *
 * Started once real audio is available (App.tsx, once a save exists) and
 * stopped on mute — same "never load-bearing" contract as `play`, just
 * running continuously instead of firing once.
 */
const AMBIENT_NOTES = [110, 164.81, 220]; // A2, E3, A3 — open fifth plus octave, no third
/** Exported for tests: every reactive cue should stay clearly audible over
 * this, never the other way around. */
export const AMBIENT_GAIN = 0.025;
const AMBIENT_FADE_IN = 3;
const AMBIENT_FADE_OUT = 1.5;

let ambient: { voices: OscillatorNode[]; master: GainNode } | null = null;

export function startAmbient(): void {
  if (ambient || muted) return;
  const audio = context();
  if (!audio) return;

  try {
    const master = audio.createGain();
    master.gain.setValueAtTime(0.0001, audio.currentTime);
    master.gain.exponentialRampToValueAtTime(AMBIENT_GAIN, audio.currentTime + AMBIENT_FADE_IN);
    master.connect(audio.destination);

    const voices: OscillatorNode[] = [];
    AMBIENT_NOTES.forEach((freq, i) => {
      const osc = audio.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audio.currentTime);

      // A slow wobble on each voice's own pitch, each at a slightly
      // different rate — three voices drifting in and out of phase with
      // each other reads as alive, three voices drifting in lockstep would
      // just read as an out-of-tune single note.
      const lfo = audio.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.04 + i * 0.015, audio.currentTime);
      const lfoDepth = audio.createGain();
      lfoDepth.gain.setValueAtTime(2.5, audio.currentTime);
      lfo.connect(lfoDepth).connect(osc.detune);

      osc.connect(master);
      lfo.start();
      osc.start();
      voices.push(osc, lfo);
    });

    ambient = { voices, master };
  } catch {
    // Same contract as `play`: audio that fails must never take anything else down with it.
    ambient = null;
  }
}

export function stopAmbient(): void {
  if (!ambient) return;
  const { voices, master } = ambient;
  ambient = null;
  const audio = ctx; // don't lazily create a context just to tear one down
  if (audio) {
    try {
      master.gain.cancelScheduledValues(audio.currentTime);
      master.gain.setValueAtTime(master.gain.value, audio.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + AMBIENT_FADE_OUT);
    } catch {
      // Fall through to the hard stop below either way.
    }
  }
  window.setTimeout(
    () => voices.forEach((v) => { try { v.stop(); } catch { /* already stopped */ } }),
    audio ? AMBIENT_FADE_OUT * 1000 + 100 : 0,
  );
}

export function isAmbientPlaying(): boolean {
  return ambient !== null;
}

/** Exposed for tests: the palette is data and its shape is checkable. */
export const CUE_TABLE = CUES;
