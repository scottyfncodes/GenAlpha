/**
 * Overworld content lives in data, never in components — this is what makes
 * Acts 2/3 addable without refactoring. Placeholder rectangles for Phase 1;
 * swap `sprite` in when the limited-palette pixel art pass happens.
 */
import type { ThresholdTier } from '../state/schema';

export type VisualLanguage = 'A' | 'B';

export interface OverworldLocation {
  id: string;
  label: string;
  /** Which visual language this pocket of the map belongs to (Style Guide 07). */
  language: VisualLanguage;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Placeholder fill until art exists. */
  color: string;
  /** Shown when the player stands on the location and interacts. */
  blurb: string;
  /**
   * Ambient text that changes with Heat. Cheap reactivity: the town gets more
   * careful around you without a single new asset (Heat System guardrail 4).
   */
  ambient?: Partial<Record<ThresholdTier, string>>;
  /**
   * The location runs the black market once the player knows about it. A flag
   * rather than a boolean so the location stays data — the overworld checks
   * it, and Act 2 can open a second table somewhere else with no code change.
   */
  marketFlag?: string;
  /**
   * Somewhere the protagonist can actually stop. Module 02's "lie low" is a
   * player action that costs a day, and it needs a place rather than a menu —
   * lying low is a thing you do somewhere.
   */
  canLieLow?: boolean;
  /**
   * The one place blueprints and builds actually live. `Salvage` (the
   * phone's Files app) still sells salvage for SHDW from anywhere — parts
   * are parts — but the Build screen only ever opens from this location's
   * own card, the same way the market table only opens from `marketFlag`.
   * There's exactly one location with this set (the Garage); a flag rather
   * than an id check so nothing has to import `GARAGE_LOCATION_ID` just to
   * ask "am I looking at the build screen's own location right now."
   */
  garage?: boolean;
  /**
   * Location isn't on the map until this flag is set. The safehouse doesn't
   * exist as a place until the crew makes it one — showing it early would be a
   * quest marker for a scene that hasn't happened, which the Story Bible's
   * no-markers rule rules out.
   */
  requiresFlag?: string;
  /**
   * Ambient text keyed on `world.townTrust` rather than Heat: the bands the
   * Robin Hood mechanic moves. Module 03 asks for this to be mostly ambient
   * rather than a cutscene every time, so it lives here with the rest of the
   * town's background chatter and is never announced.
   */
  trustAmbient?: { above: number; text: string }[];
  /**
   * How this location is drawn. `'building'` (the default) is the plain
   * flat-roofed box every location used to render as; every other value is a
   * shape that actually reads as the thing it is — a treehouse looks like a
   * platform in a tree, a school reads as a school, per the note that a town
   * of identical boxes with different colour bands underneath doesn't
   * actually look like anything. `'camera'` is a small fixed-size box
   * instead of scaling to fill the location's own rect — a camera isn't a
   * building with a different paint job, it's a post with a lens on it.
   */
  render?:
    | 'building'
    | 'camera'
    | 'house'
    | 'school'
    | 'library'
    | 'plaza'
    | 'warehouse'
    | 'garage'
    | 'ballpark'
    | 'pizza'
    | 'arcade'
    | 'treehouse';
  /**
   * Every location blocks movement by default, the way a building's own
   * walls would (Overworld.tsx's collision). Set true for the handful that
   * aren't actually a structure — Town Square is paving the town got built
   * around, not four walls, so there's nothing stopping a player from
   * cutting straight across the plaza the way there would be for an actual
   * building. `locationAt`'s own interact-range check is unaffected either
   * way — this only ever changes whether the player can stand inside the
   * rect, not whether the location itself is reachable.
   */
  walkable?: boolean;
}

/*
 * Expanded from 960x640. Both `drawGround`/`drawRoads` and the movement
 * clamp in Overworld.tsx already read these constants rather than a
 * hardcoded size, so the new strip east and south of the old edge fills in
 * with the same ground and the same repeating road grid automatically —
 * nothing needed drawing by hand for it to be walkable. The old edge sat
 * mid-block for `ballpark` (y 560-680 against a 640-tall map, an existing
 * 40px overflow this also happens to clear), which is the other reason 640
 * wasn't just left alone.
 */
export const MAP_WIDTH = 1280;
export const MAP_HEIGHT = 800;

/** Named rather than a magic string — `GameContext.tsx`'s automatic Heat
 * relief on arrival checks this specific location and nothing else. */
export const HOME_LOCATION_ID = 'home';

/** Named rather than read off `garage: true` everywhere — `Overworld.tsx`'s
 * front-door spawn point and the two places outside `locations.ts` that
 * need this specific id rather than just "wherever the garage flag is"
 * both read this constant. */
export const GARAGE_LOCATION_ID = 'garage';

export const LOCATIONS: OverworldLocation[] = [
  {
    id: HOME_LOCATION_ID,
    label: 'Home',
    language: 'A',
    render: 'house',
    x: 32, y: 184, w: 128, h: 96,
    color: '#8fa9c9',
    blurb: 'Kitchen light on, TV murmuring. Nobody asks where you were.',
    canLieLow: true,
    trustAmbient: [
      {
        above: 62,
        text: 'Mom is on the phone about the Vasquez family’s letter, the one that said the debt was settled. Nobody can work out by who.',
      },
    ],
    ambient: {
      watched: 'Mom’s on the phone in the other room. She stops talking when you come in.',
      flagged: 'The porch light is on, which it never is. Somebody put it on for you.',
      hunted: 'There’s a car parked across the street that has been there since Sunday.',
    },
  },
  {
    /*
     * Tucked south of the house, past the hedge, close enough to read as
     * part of the same lot rather than a separate stop across town. This
     * is the one place `garage: true` — see that flag's own doc comment —
     * so Build only ever opens from standing right here.
     */
    id: GARAGE_LOCATION_ID,
    label: 'The Garage',
    language: 'A',
    render: 'garage',
    x: 102, y: 284, w: 58, h: 50,
    color: '#7c8a9c',
    blurb: 'Pegboard, a workbench nobody else uses, and every blueprint you’ve ever cracked a junction box open for.',
    garage: true,
    ambient: {
      watched: 'The bulb over the bench flickers when the fridge kicks on next door. Same as always.',
      flagged: 'You checked the roll door twice before you came out here. It was already locked both times.',
      hunted: 'You keep the radio off in here now. Easier to hear the street.',
    },
  },
  {
    id: 'school',
    label: 'School',
    language: 'A',
    render: 'school',
    x: 512, y: 32, w: 208, h: 128,
    color: '#a8bcd4',
    blurb: 'Third row, second seat. Empty since Tuesday.',
    ambient: {
      watched: 'Two kids stop talking as you pass, then start again, quieter.',
      flagged: 'Your name gets read out for attendance twice, like somebody wanted to be sure.',
      hunted: 'There’s a new sign-in sheet at the office. Only one name has to use it.',
    },
  },
  {
    id: 'town_library',
    label: 'Library',
    language: 'A',
    render: 'library',
    x: 672, y: 184, w: 144, h: 112,
    color: '#9db4d0',
    blurb: 'Two terminals. One works. Public records, if you know the filing codes.',
    ambient: {
      flagged: 'The librarian asks for a card number now. She’s apologetic about it. It’s new.',
      hunted: 'The public terminal is “down for maintenance”, and has been all week.',
    },
  },
  {
    id: 'nova_house',
    label: 'Ellen',
    language: 'A',
    render: 'house',
    x: 192, y: 184, w: 128, h: 104,
    color: '#b7c7dd',
    blurb: 'Ring light in the front window. It’s always on, even when nobody’s home.',
    ambient: {
      watched: 'Ellen waves from the window mid-take, and doesn’t stop the take.',
      flagged: 'The curtains are shut. That’s never happened before.',
    },
  },
  {
    id: 'casey_house',
    label: 'Casey',
    language: 'A',
    render: 'house',
    x: 32, y: 344, w: 120, h: 96,
    color: '#c3ccd8',
    blurb: 'For Sale sign. The swing set is still up. The mail is still coming.',
    ambient: {
      flagged: 'The mailbox is empty now. Somebody cleared it. Nobody moved in.',
      hunted: 'The sign is gone and the grass has been cut. It looks like nobody ever lived here.',
    },
  },
  {
    id: 'town_square',
    label: 'Town Square',
    language: 'A',
    render: 'plaza',
    x: 520, y: 344, w: 176, h: 120,
    color: '#9fb6cf',
    walkable: true,
    blurb: 'A council banner about the safety grant. Everyone in the photo is smiling.',
    trustAmbient: [
      {
        above: 62,
        text: 'The shutter on the corner unit is up for the first time since winter. Somebody is painting the inside of it.',
      },
    ],
    ambient: {
      watched: 'Somebody at the bus shelter is telling somebody else that kids have been messing with things.',
      flagged: 'The banner’s been reprinted with a tip line on the bottom.',
      hunted: 'There are two more cameras on the bandstand than there were last week.',
    },
  },
  /*
   * Phase 4 locations. Every mentor is met in Language A — school, the square,
   * the street — and trusted in Language B. The palette shift across a mentor
   * mission is the style guide doing structural work: the pocket-environments
   * warm up exactly as the protagonist stops being alone in them.
   */
  {
    /*
     * The Annex splits into two readable halves now (draw.ts's DISTRICTS):
     * Tech Row up top (this and Fenwick Lot — commerce, repair, the market
     * table), Industrial below (this used to sit here; see repair_shop's
     * own comment for why the two swapped spots). Nothing about deja_jobsite
     * is geography-locked in the story — no scene or line of dialogue
     * places it relative to Fenwick or the Repair Shop by direction — so
     * the swap is paint, not a story fix.
     */
    id: 'deja_jobsite',
    label: 'Utility Yard',
    language: 'B',
    render: 'warehouse',
    x: 840, y: 344, w: 136, h: 100,
    color: '#f0a03c',
    blurb: 'Spools of cable, a locked gate that isn’t locked, and a light left on over the shed.',
    ambient: {
      watched: 'A new sign on the gate. AUTHORISED PERSONNEL, laminated, still curling.',
      flagged: 'Deja’s mother’s truck isn’t here. Somebody else’s is.',
      hunted: 'The gate is chained now. Deja meets you on the road instead, walking.',
    },
  },
  {
    id: 'fenwick_lot',
    label: 'Fenwick Lot',
    language: 'B',
    render: 'warehouse',
    x: 1020, y: 184, w: 120, h: 92,
    color: '#e6402a',
    blurb: 'Loading bays, three bins, and the one place in town with a signal and no camera.',
    marketFlag: 'market_access',
    trustAmbient: [
      { above: 62, text: 'The table is busier than it was. Somebody has brought a second chair and a flask.' },
    ],
    ambient: {
      watched: 'Somebody has taped cardboard over the bakery’s back-door camera. Badly. On purpose.',
      flagged: 'The lot’s been swept. Not cleaned — swept, like someone was looking for something.',
      hunted: 'There’s a camera on the bakery now, brand new, pointed at the bins.',
    },
  },
  {
    /*
     * Moved up to Tech Row, alongside Fenwick Lot, out of the Industrial
     * half where it used to sit with deja_jobsite and the Annex Fence — a
     * phone-repair shop reads as commerce/tech, not warehouse infrastructure,
     * so the two swapped spots (deja_jobsite took this one) rather than
     * the district staying a single undifferentiated block.
     */
    id: 'repair_shop',
    label: 'Repair Shop',
    language: 'B',
    render: 'garage',
    x: 840, y: 184, w: 128, h: 92,
    color: '#d8843a',
    blurb: 'Phones in a shoebox, a soldering iron, a handwritten sign: WE FIX IT OR IT’S FREE.',
    ambient: {
      watched: 'Milo doesn’t look up. He’s got a board open and forty small screws in a jar lid.',
      flagged: 'The shop’s shut at four. The sign says FAMILY THING and the light’s on in the back.',
    },
  },
  {
    id: 'annex_fence',
    label: 'Annex Fence',
    language: 'B',
    render: 'warehouse',
    x: 1020, y: 344, w: 156, h: 108,
    color: '#c8532e',
    blurb: 'A building with no name on it and a fence with a gap somebody keeps re-opening.',
    ambient: {
      watched: 'The gap’s been zip-tied shut. The zip tie has already been cut and put back.',
      flagged: 'Two vans tonight instead of one. Nobody gets out of either.',
      hunted: 'Floodlights, all the way down the fence line. It’s the brightest place in Bellhaven.',
    },
  },
  {
    /*
     * Added for Act 3. It is the hijack venue and it is the last image of the
     * game — the same bleachers, the same screen, months apart, with nobody
     * watching either time. That rhyme is the ending, so the two scenes have to
     * share a location rather than being two places that sound alike.
     */
    id: 'ballpark',
    label: 'Ballpark',
    language: 'A',
    render: 'ballpark',
    x: 344, y: 504, w: 190, h: 120,
    color: '#7fa8c9',
    blurb: 'Chain-link, a scoreboard with one dead segment, and a big screen nobody looks at.',
    canLieLow: true,
    ambient: {
      flagged: 'There’s a new camera on the scoreboard gantry, pointing at the bleachers rather than the field.',
      hunted: 'Two people in the top row who did not come to watch a baseball game.',
    },
    trustAmbient: [
      { above: 62, text: 'The concession stand is open again. Somebody’s daughter is running it and has no idea what she’s doing.' },
    ],
  },
  {
    id: 'camera_pole_5th',
    label: 'FLACK Camera Housing',
    language: 'B',
    render: 'camera',
    x: 900, y: 504, w: 72, h: 72,
    color: '#e6402a',
    blurb: 'FLACK stamped on the housing in letters too small to read from the ground. Two cables where the diagram shows one. Someone painted over something here.',
    ambient: {
      watched: 'The grey paint has been touched up again. Neatly, this time.',
      flagged: 'There’s a second housing on the pole now, higher up, pointing down the street.',
      hunted: 'A van idles at the end of the block with its lights off.',
    },
  },
  /*
   * Safe havens. `canLieLow` was already a per-location flag with nowhere to
   * live but Home and the safehouse — a kid ducking a van full of TraceBook
   * jackets doesn't only have those two doors. Same mechanic, same cost,
   * just somewhere ordinary and public to use it, which is the actual point:
   * you're not hiding, you're getting a slice.
   */
  {
    id: 'pizza_place',
    label: 'Sal’s Pizza',
    language: 'A',
    render: 'pizza',
    x: 744, y: 32, w: 88, h: 68,
    color: '#d99a6c',
    blurb: 'Fluorescent lights, a jukebox nobody’s fed in years, and a guy behind the counter who stopped asking questions a long time ago.',
    canLieLow: true,
    ambient: {
      watched: 'The guy behind the counter slides you a slice you didn’t order and doesn’t mention it again.',
      flagged: 'Two TraceBook jackets at the corner table, not eating, just sitting.',
      hunted: 'The OPEN sign is off but the door isn’t locked. That’s on purpose.',
    },
  },
  {
    id: 'arcade',
    label: 'The Arcade',
    language: 'A',
    render: 'arcade',
    x: 200, y: 504, w: 88, h: 68,
    color: '#8fa9c9',
    blurb: 'Cabinets older than you are, a change machine that eats quarters, and a hum loud enough to think under.',
    canLieLow: true,
    ambient: {
      watched: 'Nobody in here looks up when the door goes. That’s most of the appeal.',
      flagged: 'The owner’s turned the machine facing the window around, so the screens don’t show from the street.',
      hunted: 'The lights are half off. Somebody left the back door propped for you without saying so.',
    },
  },
  {
    /*
     * In the strip the map expansion opened up — a plank floor and three
     * walls, which is a place nobody official put a camera on, because
     * nobody official knows it's there. Same Lie Low mechanic as Sal's and
     * the Arcade, just older and smaller and yours since you were nine.
     */
    id: 'treehouse',
    label: 'The Treehouse',
    language: 'A',
    render: 'treehouse',
    x: 1160, y: 40, w: 80, h: 64,
    color: '#8a9b6e',
    blurb: 'A plank floor, a rope ladder nobody’s cut down, and a beach towel doing the job of a roof in one corner.',
    canLieLow: true,
    ambient: {
      watched: 'Somebody left half a candy bar up here. It’s not new enough to be yours.',
      flagged: 'From up here you can actually see which streets still have a light on this late.',
      hunted: 'Nobody looks up. That was always the whole design.',
    },
  },
];

/**
 * Locations that exist for this player right now. Most always do; the
 * safehouse doesn't until the crew makes it one, and drawing it before then
 * would be a quest marker for a scene that hasn't happened.
 */
export function visibleLocations(flags: Record<string, unknown>): OverworldLocation[] {
  return LOCATIONS.filter((l) => !l.requiresFlag || Boolean(flags[l.requiresFlag]));
}

/**
 * Buildings are now solid (see Overworld's collision), so the player's centre
 * point stops just outside a building's exact rectangle rather than ever
 * standing inside one. Padding the check outward keeps "you're at this
 * location" true right where collision leaves you — home is still an
 * exception in practice, since the player spawns dead centre in whichever
 * location they last stood in and collision only engages once they've left.
 */
const INTERACT_PAD = 10;

export function locationAt(
  x: number,
  y: number,
  flags: Record<string, unknown> = {},
): OverworldLocation | null {
  return (
    visibleLocations(flags).find(
      (l) =>
        x >= l.x - INTERACT_PAD &&
        x <= l.x + l.w + INTERACT_PAD &&
        y >= l.y - INTERACT_PAD &&
        y <= l.y + l.h + INTERACT_PAD,
    ) ?? null
  );
}
