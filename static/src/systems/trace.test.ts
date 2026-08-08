import { describe, expect, it } from 'vitest';
import { buildTraceConfig, HACKING_TIERS } from '../content/hacking';
import { canPulse, createTrace, neighbours, pulse } from './trace';

const cfg = (over: Partial<Parameters<typeof buildTraceConfig>[0]> = {}) =>
  buildTraceConfig({
    missionId: 'test_target',
    tier: 2,
    skinId: 'resistance',
    skillTier: 0,
    heatTier: 'clear',
    ...over,
  });

describe('grid generation', () => {
  it('always leaves a walkable route to the target', () => {
    for (let seed = 0; seed < 500; seed++) {
      const t = createTrace({ ...cfg({ tier: 3 }), seed });
      const seen = new Set([t.entry]);
      const queue = [t.entry];
      let reached = false;
      while (queue.length) {
        const at = queue.shift()!;
        if (at === t.target) {
          reached = true;
          break;
        }
        for (const n of neighbours(at, t.config.gridSize)) {
          if (seen.has(n) || t.nodes[n].type === 'dead_end') continue;
          seen.add(n);
          queue.push(n);
        }
      }
      expect(reached, `seed ${seed} generated an unsolvable grid`).toBe(true);
    }
  });
});

describe('hardening', () => {
  /**
   * The whole point: banked intel is a list of node indices. If hardening
   * reseeded the grid, a retry would silently reveal four unrelated nodes.
   */
  it('tightens the budget without regenerating the map', () => {
    const clean = createTrace(cfg({ hardened: 0 }));
    const hard = createTrace(cfg({ hardened: 2 }));
    expect(hard.nodes.map((n) => n.type)).toEqual(clean.nodes.map((n) => n.type));
    expect(hard.config.traceCounterBudget).toBeLessThan(clean.config.traceCounterBudget);
  });

  it('carries the tier ceiling so the meter can show what was taken', () => {
    const c = cfg({ heatTier: 'hunted' });
    expect(c.baseCounterBudget).toBe(HACKING_TIERS[2].traceCounterBudget);
    expect(c.traceCounterBudget).toBeLessThan(c.baseCounterBudget);
  });
});

describe('pulsing', () => {
  const withNeighbourOfType = (type: 'dead_end' | 'trap') => {
    for (let seed = 0; seed < 400; seed++) {
      const t = createTrace({ ...cfg(), seed, decoyDensity: 'high' });
      const hit = neighbours(t.entry, t.config.gridSize).find((i) => t.nodes[i].type === type);
      if (hit !== undefined) return { t, hit };
    }
    throw new Error(`no seed produced a ${type} next to the entry`);
  };

  it('charges a known dead end once, not every time you brush against it', () => {
    const { t, hit } = withNeighbourOfType('dead_end');
    const first = pulse(t, hit);
    expect(first.counter).toBe(1);
    expect(first.pulsesLeft).toBe(t.pulsesLeft - 1);
    // Now that it's read, it's a wall: not clickable, and free if forced.
    expect(canPulse(first, hit)).toBe(false);
    const again = pulse(first, hit);
    expect(again.counter).toBe(first.counter);
    expect(again.pulsesLeft).toBe(first.pulsesLeft);
    expect(again.current).toBe(first.current);
  });

  it('treats a trap as a landmine, not an instant fail', () => {
    const { t, hit } = withNeighbourOfType('trap');
    const after = pulse(t, hit);
    expect(after.counter).toBe(3); // 1 pulse + TRAP_COST
    expect(after.status).toBe('active');
    expect(after.current).toBe(hit); // it fired; you still moved through
  });

  it('never hard-fails — a filled counter burns the run and stops there', () => {
    let t = createTrace({ ...cfg({ tier: 1 }), traceCounterBudget: 2 });
    const first = neighbours(t.entry, t.config.gridSize)[0];
    t = pulse(t, first);
    expect(['active', 'burned', 'won']).toContain(t.status);
  });
});
