import { mulberry32 } from './rng';

/**
 * "Trace" — the one hacking mechanic (module 04). Reading a system, not
 * brute-forcing it: every pulse reveals one node's type and, on safe ground,
 * how many traps sit next to it. Play is deduction from partial information.
 *
 * This file is pure logic — no React, no styling, no Heat writes. It takes a
 * config and returns state. Every hacking mission in the game is a different
 * config object fed to this same code; there are no per-mission code paths.
 */

export type NodeType = 'safe' | 'dead_end' | 'trap';
export type TraceStatus = 'active' | 'won' | 'burned' | 'backed_out';
export type DecoyDensity = 'low' | 'medium' | 'high';

export interface TraceNode {
  index: number;
  x: number;
  y: number;
  type: NodeType;
  revealed: boolean;
  /** Traps in the four neighbours. Only meaningful once revealed and safe. */
  adjacentTraps: number;
  spent: boolean;
}

export interface TraceConfig {
  missionId: string;
  gridSize: number;
  /**
   * The tier's unmodified Trace Counter budget. `traceCounterBudget` is this
   * minus Heat and hardening. Both travel together so the meter can render a
   * visibly shorter bar rather than silently changing a denominator —
   * "a small, legible nudge, not an invisible stat change" (module 02).
   */
  baseCounterBudget: number;
  decoyDensity: DecoyDensity;
  traceCounterBudget: number;
  pulses: number;
  seed: number;
  /** Tier 4: traps stacked, each costs more. */
  extraTrapPenalty: boolean;
  /**
   * Villain-owned systems reveal less per pulse — better security design,
   * expressed as config rather than a separate rule set (module 04).
   */
  revealAdjacentCounts: boolean;
  /** Node indices already known from a backed-out earlier attempt. */
  bankedIntel?: number[];
}

export interface TraceState {
  config: TraceConfig;
  nodes: TraceNode[];
  entry: number;
  target: number;
  current: number;
  counter: number;
  pulsesLeft: number;
  status: TraceStatus;
  /** Nodes worth carrying to a retry if the player backs out. */
  intel: number[];
  lastEvent: string | null;
}

const DENSITY: Record<DecoyDensity, { trap: number; dead: number }> = {
  low: { trap: 0.1, dead: 0.14 },
  medium: { trap: 0.16, dead: 0.2 },
  high: { trap: 0.24, dead: 0.24 },
};

export const TRAP_COST = 2;
export const TRAP_COST_STACKED = 4;

export function neighbours(index: number, size: number): number[] {
  const x = index % size;
  const y = Math.floor(index / size);
  const out: number[] = [];
  if (x > 0) out.push(index - 1);
  if (x < size - 1) out.push(index + 1);
  if (y > 0) out.push(index - size);
  if (y < size - 1) out.push(index + size);
  return out;
}

export function createTrace(config: TraceConfig): TraceState {
  const size = config.gridSize;
  const rng = mulberry32(config.seed);
  const total = size * size;
  const entry = (size - 1) * size; // bottom-left
  const target = size - 1; // top-right

  // Carve one guaranteed route first, so every generated grid is solvable.
  const path = new Set<number>([entry]);
  let cx = 0;
  let cy = size - 1;
  while (cx !== size - 1 || cy !== 0) {
    const goRight = cx < size - 1 && (cy === 0 || rng() < 0.5);
    if (goRight) cx += 1;
    else cy -= 1;
    path.add(cy * size + cx);
  }

  const d = DENSITY[config.decoyDensity];
  const nodes: TraceNode[] = Array.from({ length: total }, (_, index) => {
    let type: NodeType = 'safe';
    if (!path.has(index)) {
      const r = rng();
      if (r < d.trap) type = 'trap';
      else if (r < d.trap + d.dead) type = 'dead_end';
    }
    return {
      index,
      x: index % size,
      y: Math.floor(index / size),
      type,
      revealed: false,
      adjacentTraps: 0,
      spent: false,
    };
  });

  for (const node of nodes) {
    node.adjacentTraps = neighbours(node.index, size).filter((n) => nodes[n].type === 'trap').length;
  }

  nodes[entry].revealed = true;
  nodes[target].revealed = true; // you always know where you're headed
  for (const i of config.bankedIntel ?? []) if (nodes[i]) nodes[i].revealed = true;

  return {
    config,
    nodes,
    entry,
    target,
    current: entry,
    counter: 0,
    pulsesLeft: config.pulses,
    status: 'active',
    intel: [entry, target, ...(config.bankedIntel ?? [])],
    lastEvent: null,
  };
}

export function canPulse(state: TraceState, index: number): boolean {
  if (state.status !== 'active') return false;
  if (!neighbours(state.current, state.config.gridSize).includes(index)) return false;
  // A known dead end is a wall. Leave it lit, but don't let it be clicked.
  const node = state.nodes[index];
  return !(node.revealed && node.type === 'dead_end' && !node.spent);
}

/** One pulse: reveal a neighbour, pay the counter, move if the ground holds. */
export function pulse(state: TraceState, index: number): TraceState {
  if (!canPulse(state, index)) return state;

  const nodes = state.nodes.map((n) => ({ ...n }));
  const node = nodes[index];

  // Ground you've already read costs nothing to touch again. That includes
  // known dead ends: re-reading a wall you already know about is not a mistake
  // the game should charge you a pulse for, it just doesn't move you.
  if (node.revealed) {
    const blocked = node.type === 'dead_end' && !node.spent;
    return {
      ...state,
      nodes,
      current: blocked ? state.current : index,
      lastEvent: blocked ? 'dead_end' : null,
      status: !blocked && index === state.target ? 'won' : state.status,
    };
  }

  let cost = 1;
  let event = 'clean';
  node.revealed = true;

  if (node.type === 'trap') {
    cost += state.config.extraTrapPenalty ? TRAP_COST_STACKED : TRAP_COST;
    node.spent = true; // landmine logic — it fires once, then it's just a node
    event = 'trap';
  } else if (node.type === 'dead_end') {
    event = 'dead_end';
  }

  const counter = state.counter + cost;
  const pulsesLeft = state.pulsesLeft - 1;
  const moved = node.type !== 'dead_end';
  const current = moved ? index : state.current;
  const intel = state.intel.includes(index) ? state.intel : [...state.intel, index];

  let status: TraceStatus = 'active';
  if (current === state.target && moved) status = 'won';
  else if (counter >= state.config.traceCounterBudget || pulsesLeft <= 0) status = 'burned';

  return { ...state, nodes, counter, pulsesLeft, current, status, intel, lastEvent: event };
}

/** Back out mid-trace: soft fail, keeps what was learned for the retry. */
export function backOut(state: TraceState): TraceState {
  return { ...state, status: 'backed_out' };
}

/** Whether a node should render its trap count (villain skins withhold it). */
export function showsCount(state: TraceState, node: TraceNode): boolean {
  return state.config.revealAdjacentCounts && node.revealed && node.type !== 'trap';
}
