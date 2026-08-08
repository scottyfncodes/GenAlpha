/**
 * The one bit of environment sniffing the state layer needs, in its own module.
 *
 * It used to live in `persistence.ts`, which `defaults.ts` imported for it —
 * while `persistence.ts` imported `SAVE_VERSION` back out of `defaults.ts`.
 * That cycle resolved only because both uses sat inside function bodies, and it
 * blocked `migrate` from using `createNewSave` as a template, which is what it
 * needs to backfill a subtree an old save is missing.
 */

/** OS-level reduced-motion preference, guarded for non-browser test runs. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
