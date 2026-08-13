import { describe, expect, it } from 'vitest';
import {
  AMBIENT_GAIN,
  CUE_TABLE,
  isAmbientPlaying,
  isMuted,
  play,
  setMuted,
  startAmbient,
  stopAmbient,
  type Cue,
} from './audio';

/**
 * The audio module is mostly a browser API call, and the browser isn't here.
 * What is checkable is the palette — which is data — and the promise that none
 * of it is load-bearing.
 */
describe('the cue palette', () => {
  const cues = Object.keys(CUE_TABLE) as Cue[];

  it('keeps every cue short enough to be feedback rather than an event', () => {
    for (const cue of cues) {
      expect(CUE_TABLE[cue].seconds, `${cue} runs long`).toBeLessThanOrEqual(0.2);
      expect(CUE_TABLE[cue].seconds).toBeGreaterThan(0);
    }
  });

  it('keeps everything quiet', () => {
    for (const cue of cues) {
      expect(CUE_TABLE[cue].gain, `${cue} is loud`).toBeLessThanOrEqual(0.15);
    }
  });

  /**
   * Module 04, stated as a number: trap feedback is "a 'close call' jolt, not a
   * harsh failure buzzer". A jolt bends *down* and is not the loudest thing in
   * the game — a rising harsh tone that dominates the palette is the buzzer,
   * and it is the exact thing the module rules out.
   */
  it('makes the trap a close call rather than a buzzer', () => {
    const trap = CUE_TABLE.trap;
    expect(trap.to).toBeLessThan(trap.from);
    expect(trap.type).not.toBe('square');
    const loudest = Math.max(...Object.values(CUE_TABLE).map((c) => c.gain));
    expect(trap.gain).toBeLessThanOrEqual(loudest);
    // And it is over fast. A cue that lingers reads as a verdict.
    expect(trap.seconds).toBeLessThan(0.2);
  });

  it('never rises harshly on a failure', () => {
    for (const cue of ['trap', 'alert', 'rupture'] as Cue[]) {
      expect(CUE_TABLE[cue].to, `${cue} rises`).toBeLessThan(CUE_TABLE[cue].from);
    }
  });
});

describe('never load-bearing', () => {
  /** No AudioContext in a test run. Every entry point must simply do nothing. */
  it('is silent and harmless with no audio available', () => {
    for (const cue of Object.keys(CUE_TABLE) as Cue[]) {
      expect(() => play(cue)).not.toThrow();
    }
  });

  it('tracks the mute flag the settings panel sets', () => {
    setMuted(true);
    expect(isMuted()).toBe(true);
    expect(() => play('trap')).not.toThrow();
    setMuted(false);
    expect(isMuted()).toBe(false);
  });
});

describe('the ambient bed', () => {
  it('stays quieter than every reactive cue — a bed, never a competitor', () => {
    for (const cue of Object.keys(CUE_TABLE) as Cue[]) {
      expect(AMBIENT_GAIN, `${cue} is not clearly audible over the ambient bed`).toBeLessThan(CUE_TABLE[cue].gain);
    }
  });

  it('is silent and harmless with no audio available, start or stop, either order', () => {
    expect(() => startAmbient()).not.toThrow();
    expect(isAmbientPlaying()).toBe(false); // no AudioContext in a test run — never actually starts
    expect(() => stopAmbient()).not.toThrow();
  });

  it('never starts while muted', () => {
    setMuted(true);
    startAmbient();
    expect(isAmbientPlaying()).toBe(false);
    setMuted(false);
  });
});

/**
 * Every cue in the palette is called from somewhere. A synthesiser with dead
 * entries is the audio version of an item that sits in a bag doing nothing —
 * it looks like the feature exists and it doesn't.
 *
 * Checked against the source rather than by wiring, because there is no DOM
 * here to fire one in. Crude, and it catches the thing that actually goes
 * wrong: a cue added to the table and never hooked up.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

describe('nothing in the palette is dead', () => {
  it('calls every cue from somewhere in the UI', () => {
    const root = path.resolve(import.meta.dirname, '..');
    const sources: string[] = [];
    (function walk(dir: string) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) {
          sources.push(readFileSync(p, 'utf8'));
        }
      }
    })(root);

    const all = sources.join('\n');
    for (const cue of Object.keys(CUE_TABLE)) {
      expect(all, `nothing plays the "${cue}" cue`).toContain(`play('${cue}')`);
    }
  });
});
