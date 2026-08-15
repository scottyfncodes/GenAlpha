/**
 * TS mirror of save-schema.json (v0.5.0) — the canonical state shape.
 *
 * RULE (from the master build prompt): every module reads and writes through
 * this shape only. If a system needs state that isn't here, STOP and flag it —
 * do not invent a parallel state object. Open gaps are listed in SCHEMA-NOTES.md.
 */

export type MissionStatus = 'available' | 'in_progress' | 'complete' | 'failed';
export type ThresholdTier = 'clear' | 'watched' | 'flagged' | 'hunted';
export type AcquiredVia = 'purchase' | 'mission_reward' | 'theft' | 'found' | 'crafted';
export type ItemCategory = 'gear' | 'safehouse' | 'intel' | 'material';
export type SecurityTier = 'low' | 'medium' | 'high';
export type TextSpeed = 'slow' | 'normal' | 'fast';

export interface MetaState {
  saveVersion: string;
  createdAt: string;
  lastPlayedAt: string;
  playtimeSeconds: number;
}

/** Freeform story flags, keyed by event id. Branching state lives here. */
export type StoryFlags = Record<string, boolean | string | number>;

export interface PlayerState {
  name: string;
  /**
   * ADDED in 0.6.0. The player's own hacking handle, generated at game
   * start (`systems/names.ts` `randomHandle`) — what every kid character
   * (and the player's own narration) calls the player in dialogue, mirroring
   * the "only adults use a kid's real name" rule the game already applies to
   * every other kid. Adult-voiced lines still use `name`. Every kid keeps
   * their own real name; the player is the only one with a handle. A save
   * migrated from before this field existed falls back to `name` itself
   * (see `state/defaults.ts`), which is exactly the old behaviour: no handle
   * ever chosen, so kids called you by your name too.
   */
  handle: string;
  currentChapter: string;
  currentLocation: string;
  flags: StoryFlags;
}

export interface HeatEvent {
  eventId: string;
  delta: number;
  timestamp: string;
}

export interface HeatState {
  current: number;
  threshold_tier: ThresholdTier;
  /**
   * CHANGED in 0.3.0 (was `lastDecayAt`, an ISO timestamp). Decay is measured
   * in in-fiction days, so a closed tab never decays Heat.
   */
  lastDecayDay: number;
  history: HeatEvent[];
}

export interface SkillTiered {
  unlocked: boolean;
  tier: number;
}

export interface SkillsState {
  sabotage: SkillTiered & { mentor: 'deja' };
  hacking: SkillTiered & { mentor: 'files' };
  aiToolAccess: { unlocked: boolean; mentor: 'milo'; trustedMode: boolean };
  resistanceIntel: { unlocked: boolean; mentor: 'bishop'; compromised: boolean };
}

export interface Relationship {
  trust: number;
  metAt: string;
}

export type RelationshipsState = Record<string, Relationship>;

export interface CryptoHolding {
  asset: string;
  amount: number;
}

export interface InventoryEntry {
  itemId: string;
  quantity: number;
  acquiredVia: AcquiredVia;
}

/**
 * ADDED in 0.5.0 (SCHEMA-NOTES gap 4). `activeEvents` was `string[]`, which
 * could record that an event was running but never that it had finished — so
 * a crackdown raised gear prices permanently.
 *
 * The multiplier table stays in content (`src/content/economy.ts`); only the
 * instance lives here. `scope` is on the instance rather than looked up from
 * the table because one definition can fire against different categories
 * depending on what triggered it, and because the ticker copy has to stay
 * readable from a save file alone.
 */
export interface MarketEventInstance {
  eventId: string;
  startedOnDay: number;
  /** Exclusive — the event is gone on this day, measured against `world.day`. */
  expiresOnDay: number;
  scope:
    | { kind: 'category'; category: ItemCategory }
    | { kind: 'item'; itemId: string }
    | { kind: 'all' };
}

export interface MarketState {
  /**
   * Derived, and cached here the way `heat.threshold_tier` is: `priceOf()` is
   * the only thing that computes a price, and this is the snapshot it wrote
   * last. Nothing should read this to make a decision — read `priceOf`.
   */
  prices: Record<string, number>;
  activeEvents: MarketEventInstance[];
}

/**
 * ADDED in 0.5.0 (SCHEMA-NOTES gap 3). Villain wallets existed only once
 * drained, but the recon phase's entire output is *discovering* one and a
 * failed heist hardens it — both of which happen before any drain. Balance and
 * security tier start from content and are copied in on discovery, because
 * they change afterwards and the content object must not.
 */
export interface VillainWallet {
  walletId: string;
  balance: number;
  securityTier: SecurityTier;
  discovered: boolean;
  /** Recon clue ids gathered. Which methods are open is derived from these. */
  clues: string[];
}

/**
 * ADDED in 0.5.0 (SCHEMA-NOTES gap 6). `clean_sim` is spec'd as lasting "for
 * that session"; there is no session in this schema and there shouldn't be, so
 * it lasts until the next in-fiction day, which `world.day` makes expressible.
 */
export interface ActiveConsumable {
  itemId: string;
  /** Exclusive, same convention as a market event. */
  expiresOnDay: number;
}

export interface DrainedWallet {
  walletId: string;
  amountDrained: number;
  redistributed: number;
  timestamp: string;
}

export interface EconomyState {
  cashOnHand: number;
  cryptoWallets: CryptoHolding[];
  inventory: InventoryEntry[];
  marketState: MarketState;
  /** Known targets and their live state. The log below is history, not state. */
  villainWallets: VillainWallet[];
  villainWalletsDrained: DrainedWallet[];
  activeConsumables: ActiveConsumable[];
}

/**
 * ADDED in 0.2.0 (see SCHEMA-NOTES gap 2). Mission-level persistence: retry
 * cooldowns, target hardening after a failed run, banked partial progress, and
 * the four-beat mentor template's current beat. Story flags stay for genuine
 * one-off branching; this holds the structured, repeatable stuff.
 */
export interface MissionRecord {
  status: MissionStatus;
  /**
   * Mentor missions only: the four-beat template's cursor (see
   * systems/mentors.ts). 1-4 are the template's beats, higher numbers are
   * branch beats, and MENTOR_DONE (0) means finished — a value no scene gates
   * on, so a completed mission can't collide with a branch.
   */
  beat?: number;
  attempts: number;
  /** Raised by a failed run — target is alerted, harder on retry. */
  hardened: number;
  /** world.day the mission becomes attemptable again. */
  cooldownUntilDay?: number;
  /** Trace: node indices already revealed, banked from a backed-out run. */
  bankedIntel?: number[];
  /**
   * ADDED in 0.3.0. A hacking trace was run against this target first, which
   * unlocks the hidden casing detail on the sabotage side (module 05, Tier 4).
   * Lives here rather than as a `prepped:<id>` story flag — this is structured,
   * per-mission state, which is exactly what story flags are bad at.
   */
  prepped?: boolean;
}

export type MissionsState = Record<string, MissionRecord>;

export interface Safehouse {
  id: string;
  burned: boolean;
  upgrades: string[];
  /**
   * ADDED in 0.6.0. When it was burned, so it can come back on its own — a
   * burned safehouse recovers after a few days rather than being lost, because
   * nothing in this game is permanently taken away from the player. Measured
   * against `world.day` like every other clock here.
   */
  burnedOnDay?: number;
}

/** A collectible node the player has picked clean, and when it's due back. */
export interface CollectedNode {
  nodeId: string;
  collectedOnDay: number;
  /**
   * ADDED in 0.7.0 for tiered camera sabotage. A camera's respawn depends on
   * *which* action took it down (a quick tamper is back in a day; an
   * overload takes over a week) rather than being fixed per node, so the
   * chosen action's own timer is stamped here instead of re-derived from the
   * static node definition. Optional and absent for anything else that uses
   * this same log (hidden bush pickups, and any camera hit before this
   * existed) — those fall back to their node's own fixed `respawnDays`.
   */
  respawnDays?: number;
  /**
   * Whether this node has already been confirmed relocated — see
   * `world/relocate.ts`. A sabotaged camera/junction box/street hack stays
   * put (visibly damaged) through its whole cooldown, and only actually
   * moves to a new spot once that cooldown's up *and* the old spot has
   * scrolled off screen at least once; this flag is what makes that a
   * one-way transition rather than something that flickers back on every
   * time the player happens to walk back past the original location.
   * Absent/false for anything not yet past that point, or for a node type
   * this log tracks that never relocates (a hidden bush).
   */
  relocated?: boolean;
}

export interface WorldState {
  townTrust: number;
  safehouses: Safehouse[];
  /**
   * ADDED in 0.2.0 (see SCHEMA-NOTES gap 1). The single in-fiction clock.
   * Heat decay, mission cooldowns and (in Phase 5) market event expiry all read
   * this instead of wall-clock time.
   */
  day: number;
  /**
   * Overworld collectible nodes already picked, keyed by node id rather than
   * removed from a list — a node is a place, not an object, so it comes back
   * on its own schedule (`world/collectibles.ts`) instead of being gone for
   * good the way a inventory item would be.
   */
  collectedNodes: CollectedNode[];
  /**
   * ADDED in 0.7.0. SafeTrace's side of the board — see `systems/coverage.ts`.
   * The coverage percentage itself is deliberately *not* stored: it's derived
   * from the day, the cooldown log and `sweeps`, so there is no way for a
   * stored number to disagree with the cameras actually standing on the map.
   * Only the two facts that can't be re-derived live here.
   */
  surveillance: SurveillanceState;
}

export interface SurveillanceState {
  /**
   * How many lockdown sweeps the town has already run. Permanent, and
   * permanently makes every camera see further (`SWEEP_HARDENING_PER_SWEEP`)
   * — the ratchet that stops a sweep from being something a player can just
   * absorb repeatedly at no lasting cost.
   */
  sweeps: number;
  /**
   * Whether coverage topping out would fire a sweep right now. Cleared when
   * one fires, set again only once coverage has been pushed back below
   * `COVERAGE_SWEEP_REARM_BELOW`. Without this latch the trigger would
   * re-fire on every action taken while pinned at 100%.
   */
  armed: boolean;
  /** The day the last sweep ended, for callbacks and the notice's own copy.
   * 0 means it has never happened. */
  lastSweepDay: number;
}

export interface SettingsState {
  textSpeed: TextSpeed;
  audioMuted: boolean;
  /**
   * ADDED in 0.2.0 (see SCHEMA-NOTES gap 5). In-game control over the glitch
   * effect's flicker and palette invert, defaulted from the OS setting but
   * changeable by a player who can't change the OS setting.
   */
  reducedFlicker: boolean;
}

export interface SaveState {
  meta: MetaState;
  player: PlayerState;
  heat: HeatState;
  skills: SkillsState;
  relationships: RelationshipsState;
  economy: EconomyState;
  missions: MissionsState;
  world: WorldState;
  settings: SettingsState;
}
