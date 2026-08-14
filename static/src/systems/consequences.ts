import type { SaveState, ThresholdTier } from '../state/schema';
import { applyHeat, decayTo } from './heat';
import { addCash, tickMarket } from './market';
import { tickSafehouses } from './safehouse';
import { HOME_LOCATION_ID } from '../world/locations';

/**
 * What happens when a patrol actually catches you, rather than just clocking
 * you from a distance (the small ambient Heat tick `patrols.ts` already
 * charges on every sighting). This only fires inside the ten-second window a
 * Heat tier crossing opens — Overworld.tsx's alert window — so it stays rare
 * and legible: you see the bar flash, you know what's at stake, and either
 * you get clear or you don't.
 *
 * GUARDRAIL, same one heat.ts states outright: there is no hard fail state
 * from Heat, and nothing here is an exception to that. Every consequence is
 * a cost — cash, more Heat, and for the worst two, a day taken whether the
 * player wanted to spend it or not — never a run-ending screen.
 */
export interface Consequence {
  id: 'shakedown' | 'call_parents' | 'arrested' | 'skull_cracked';
  /** Shown the moment it fires — this is the whole scene, not a screen. */
  label: string;
  cashDelta: number;
  heatDelta: number;
  /** Advances `world.day`, same as Lie Low — a real cost, not a reset. */
  daysLost: number;
  /** Days of reduced movement speed after `daysLost` has passed, via
   * `player.flags['hurt_until_day']` — read by Overworld.tsx, nowhere else. */
  hurtDays: number;
}

const HUNTED_CATCH_FLAG = 'hunted_catch_count';
/** Read by Overworld.tsx's speed calculation. Exported so the two files
 * can't drift on the flag's name. */
export const HURT_UNTIL_DAY_FLAG = 'hurt_until_day';

const SHAKEDOWN: Consequence = {
  id: 'shakedown',
  label: 'A couple of older kids corner you for pizza money. You hand it over.',
  cashDelta: -20,
  heatDelta: 2,
  daysLost: 0,
  hurtDays: 0,
};

const CALL_PARENTS: Consequence = {
  id: 'call_parents',
  label: 'A TraceBook officer walks you to a payphone and stands there while you call home.',
  cashDelta: 0,
  heatDelta: 5,
  daysLost: 0,
  hurtDays: 0,
};

const ARRESTED: Consequence = {
  id: 'arrested',
  label: 'Picked up. A night in a plastic chair before anyone comes to get you.',
  cashDelta: -40,
  heatDelta: 8,
  daysLost: 1,
  hurtDays: 0,
};

/** Reserved for a second catch at `hunted` — the escalation past "arrested"
 * that doesn't need a fifth Heat tier to exist. */
const SKULL_CRACKED: Consequence = {
  id: 'skull_cracked',
  label: 'It goes further this time. You wake up at home with a headache and no memory of getting there.',
  cashDelta: -80,
  heatDelta: 12,
  daysLost: 1,
  hurtDays: 1,
};

/**
 * Which consequence a catch right now would trigger, or null at `clear` —
 * there are no patrols to be caught by that low. Pure, so the toast the
 * player sees is computed off the same read `applyCatch` uses to apply it,
 * never a second guess at what just happened.
 */
export function consequenceFor(save: SaveState, tier: ThresholdTier): Consequence | null {
  if (tier === 'watched') return SHAKEDOWN;
  if (tier === 'flagged') return CALL_PARENTS;
  if (tier === 'hunted') return save.player.flags[HUNTED_CATCH_FLAG] ? SKULL_CRACKED : ARRESTED;
  return null;
}

export function applyCatch(save: SaveState, tier: ThresholdTier): SaveState {
  const consequence = consequenceFor(save, tier);
  if (!consequence) return save;

  let s = addCash(save, consequence.cashDelta);
  s = {
    ...s,
    heat: applyHeat(s.heat, {
      eventId: `caught_${consequence.id}`,
      delta: consequence.heatDelta,
      logToHistory: true,
    }),
  };

  if (tier === 'hunted') {
    s = { ...s, player: { ...s.player, flags: { ...s.player.flags, [HUNTED_CATCH_FLAG]: true } } };
  }

  // Whatever caught you delivers you home — every consequence above already
  // implies it (a payphone call, a night in a chair, waking up with a
  // headache); this just makes it true of the map too, not only the text.
  s = { ...s, player: { ...s.player, currentLocation: HOME_LOCATION_ID } };

  if (consequence.daysLost > 0) {
    const day = s.world.day + consequence.daysLost;
    s = tickSafehouses(tickMarket({ ...s, world: { ...s.world, day }, heat: decayTo(s.heat, day) }));
    if (consequence.hurtDays > 0) {
      s = {
        ...s,
        player: {
          ...s.player,
          flags: { ...s.player.flags, [HURT_UNTIL_DAY_FLAG]: day + consequence.hurtDays },
        },
      };
    }
  }

  return s;
}
