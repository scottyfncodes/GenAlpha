/**
 * Bystander one-liners — personality through reaction, not conversation.
 * Overworld.tsx fires one of these as a brief toast (the same idiom as its
 * own "spotted"/"caught" lines) when the player does something, when Heat
 * climbs a tier, or when a patrol actually catches them. None of it is
 * attributed to a specific NPC and none of it is a real conversation — it's
 * the town noticing, the way `world/npcs.ts`'s own doc comment says the town
 * itself is meant to: decorative, but not inert.
 *
 * Kept to a short pool per category on purpose — the brief's own guidance:
 * "use reactions sparingly enough that they remain funny." Overworld.tsx
 * also rolls a chance to skip the line entirely before calling this, for
 * the same reason.
 */
export type ReactionCategory = 'mischief' | 'heat_up' | 'caught';

const REACTION_LINES: Record<ReactionCategory, string[]> = {
  mischief: [
    'Someone nearby: “Bro.”',
    'A passerby actually stops to watch.',
    'Someone nearby pulls out their phone.',
    'Someone nearby, not even looking up: “Nice.”',
    'A kid across the street points, then loses interest.',
  ],
  heat_up: [
    'Someone nearby looks up, then walks a little faster.',
    'A passerby crosses the street without being asked to.',
    'Someone nearby stops talking mid-sentence.',
    'Someone nearby suddenly remembers somewhere else to be.',
  ],
  caught: [
    'Someone nearby: “Not again.”',
    'A passerby pretends not to have seen it.',
    'Someone nearby just shakes their head.',
    'Someone nearby: “Every single time.”',
  ],
};

/** Pure and seedable — `rand` defaults to `Math.random` for real play, and
 * tests pass a fixed generator to check the pool rather than the roll. */
export function reactionLine(category: ReactionCategory, rand: () => number = Math.random): string {
  const pool = REACTION_LINES[category];
  return pool[Math.floor(rand() * pool.length)];
}
