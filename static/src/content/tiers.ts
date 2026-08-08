/**
 * The two difficulty tables, module 04's and module 05's, in one file.
 *
 * `ALERTNESS_BUDGET` used to live in `content/sabotage.ts`, which was fine
 * until a second file wanted both it and a place in the mission registry: the
 * heist's physical intercept needs the tier table, and the registry needs the
 * heist's config, and those two imports are a cycle. The tables aren't
 * sabotage content or heist content, they're the modules' own numbers, so they
 * get their own module — same shape of fix as `state/env.ts`.
 */

/** Module 05's Alertness budgets. Tier 4 is tight but not tighter than 3. */
export const ALERTNESS_BUDGET: Record<1 | 2 | 3 | 4, number> = {
  1: 10,
  2: 8,
  3: 6,
  4: 6,
};
