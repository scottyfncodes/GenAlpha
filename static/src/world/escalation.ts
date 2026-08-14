/**
 * How far the surveillance rollout itself has advanced, independent of the
 * player's own momentary Heat — the same "PHASE TWO ON TRACK FOR SUMMER"
 * promise Act 1's opening headline makes, actually arriving week by week
 * whether or not the player did anything to earn it. Heat still decides
 * whether any of this is actively hunting the player right now; this only
 * decides how much of it exists in town to do the hunting with, so a
 * careful `clear`-tier walk late in the game passes more of it than the
 * same walk on day one did, even though nothing about the player changed.
 */
export const ESCALATION_DAY_THRESHOLDS = [4, 9, 15] as const;

export type EscalationStage = 0 | 1 | 2 | 3;

export function escalationStage(day: number): EscalationStage {
  let stage: EscalationStage = 0;
  for (const threshold of ESCALATION_DAY_THRESHOLDS) {
    if (day >= threshold) stage = (stage + 1) as EscalationStage;
  }
  return stage;
}
