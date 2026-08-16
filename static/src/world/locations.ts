/**
 * Overworld content lives in data, never in components — this is what makes
 * Acts 2/3 addable without refactoring. Rendering is `draw.ts`'s procedural
 * shape library (a house is drawn as a house, not a colour swatch); this file
 * only ever carries where things are and what they say.
 *
 * The town is organised into `DISTRICTS` (below) — Bellhaven redesigned
 * around districts rather than a scatter of same-weight buildings, per the
 * build note that a player should be able to glance at the map and think
 * "I'm in the Warehouse District", not "I'm on another collection of grey
 * squares". Every location still stands on its own; `district` is what lets
 * the town read as a place with neighbourhoods rather than a loose bag of
 * doors.
 */
import type { ThresholdTier } from '../state/schema';
import { SAFEHOUSE_FLAG } from '../content/safehouse';

export type VisualLanguage = 'A' | 'B';

/**
 * A neighbourhood, not a mechanic — nothing gates on `district` today, it's
 * purely what makes the town legible at a glance and what a future minimap
 * or HUD readout (`districtAt`, below) has to say. Each carries a `mood`
 * string used nowhere yet except as the one-line pitch for what playing in
 * that district should feel like; keeping it here rather than only in a
 * design doc means the fiction and the layout can't drift apart.
 */
export interface District {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Placeholder fill, same role as a location's own `color`. */
  color: string;
  mood: string;
}

/*
 * Six rows and three columns, minus the seams the two arterial roads run
 * through (`draw.ts`'s `MAJOR_ROADS`/`SECONDARY_ROADS`) — a 3x3 grid with
 * the Warehouse District spanning the full east column for real industrial
 * depth, and Riverside Park sitting centrally as connective tissue between
 * every other district rather than tucked in a corner. The river runs the
 * west/south edge, the rail line crosses the north edge into the Warehouse
 * District and down to the Transit Hub — both are decorative ground texture
 * (`draw.ts`'s `drawEdgeGeography`), not collision, so crossing either one
 * is exactly as free as crossing an ordinary street.
 */
export const DISTRICTS: District[] = [
  {
    id: 'residential_north',
    label: 'Residential North',
    x: 0, y: 0, w: 472, h: 336,
    color: '#7fa3c9',
    mood: 'Quiet streets. Backyards and alleys cut every corner shorter than the road does.',
  },
  {
    id: 'downtown',
    label: 'Downtown',
    x: 528, y: 0, w: 544, h: 336,
    color: '#b89a5a',
    mood: 'Busy. Lots of people, lots of cameras, lots of reasons to take the fast route anyway.',
  },
  {
    id: 'warehouse',
    label: 'Warehouse District',
    x: 1128, y: 0, w: 472, h: 728,
    color: '#e0672f',
    mood: 'Loading docks, fenced lots, a fence line the story keeps warning is watched.',
  },
  {
    id: 'west_end',
    label: 'West End',
    x: 0, y: 392, w: 472, h: 336,
    color: '#9b7fc9',
    mood: 'Older homes, smaller shops, and every back route into downtown nobody official uses.',
  },
  {
    id: 'riverside_park',
    label: 'Riverside Park',
    x: 528, y: 392, w: 544, h: 336,
    color: '#6fa06a',
    mood: 'Open during the day, fewer eyes at night. Every path here connects two other districts.',
  },
  {
    id: 'transit_hub',
    label: 'Transit Hub',
    x: 0, y: 784, w: 472, h: 316,
    color: '#5b8fc9',
    mood: 'Buses, benches, people who are only ever passing through. Nobody here is memorable on purpose.',
  },
  {
    id: 'south_residential',
    label: 'South Residential',
    x: 528, y: 784, w: 544, h: 316,
    color: '#7fa3c9',
    mood: 'Family homes, quieter than the north side, and closer to the edge of everything.',
  },
  {
    id: 'commercial_strip',
    label: 'Commercial Strip',
    x: 1128, y: 784, w: 472, h: 316,
    color: '#c46a8f',
    mood: 'Storefronts and parking lots. Easy to blend into a crowd that’s already there to shop.',
  },
];

export function districtAt(x: number, y: number): District | null {
  return DISTRICTS.find((d) => x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) ?? null;
}

export interface OverworldLocation {
  id: string;
  label: string;
  /** Which visual language this pocket of the map belongs to (Style Guide 07). */
  language: VisualLanguage;
  /** Which neighbourhood this stands in — see `DISTRICTS`. Cosmetic/legibility
   * only; nothing in the game gates on it. */
  district?: string;
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
   * `'shop'`/`'transit'` are the district redesign's own additions — a small
   * storefront silhouette general enough to cover a laundromat, a
   * convenience store or a pharmacy without a bespoke shape each, and a
   * platform-and-shelter silhouette for the one bus depot in town.
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
    | 'treehouse'
    | 'shop'
    | 'transit'
    | 'green';
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
 * Grown from 1280x800 to 1600x1100 for the district redesign — eight
 * neighbourhoods with real depth (the Warehouse District alone is taller
 * than the old map was wide) need more room than the old flat grid had, and
 * a bigger town is a more honest way to fit them than cramming eight
 * districts into the old footprint and losing the density the reference
 * pass called for. `drawGround`/`drawRoads` and the movement clamp in
 * Overworld.tsx all read these constants rather than a hardcoded size, so
 * nothing needed hand-adjusting for the new edge to be walkable.
 */
export const MAP_WIDTH = 1600;
export const MAP_HEIGHT = 1100;

/** Named rather than a magic string — `GameContext.tsx`'s automatic Heat
 * relief on arrival checks this specific location and nothing else. */
export const HOME_LOCATION_ID = 'home';

/** Named rather than read off `garage: true` everywhere — `Overworld.tsx`'s
 * front-door spawn point and the two places outside `locations.ts` that
 * need this specific id rather than just "wherever the garage flag is"
 * both read this constant. */
export const GARAGE_LOCATION_ID = 'garage';

export const LOCATIONS: OverworldLocation[] = [
  // ---------------------------------------------------------------- //
  // Residential North — home turf. Every early beat plays here.
  // ---------------------------------------------------------------- //
  {
    id: HOME_LOCATION_ID,
    label: 'Home',
    language: 'A',
    district: 'residential_north',
    render: 'house',
    x: 40, y: 40, w: 130, h: 96,
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
    district: 'residential_north',
    render: 'garage',
    x: 120, y: 150, w: 58, h: 50,
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
    id: 'nova_house',
    label: 'Ellen',
    language: 'A',
    district: 'residential_north',
    render: 'house',
    x: 220, y: 40, w: 128, h: 100,
    color: '#b7c7dd',
    blurb: 'Ring light in the front window. It’s always on, even when nobody’s home.',
    ambient: {
      watched: 'Ellen waves from the window mid-take, and doesn’t stop the take.',
      flagged: 'The curtains are shut. That’s never happened before.',
    },
  },

  // ---------------------------------------------------------------- //
  // Downtown — the civic core. Busy, watched, and where the two major
  // arterials cross (draw.ts's MAJOR_ROADS) — the Downtown Crossroads.
  // ---------------------------------------------------------------- //
  {
    id: 'school',
    label: 'School',
    language: 'A',
    district: 'downtown',
    render: 'school',
    x: 560, y: 40, w: 208, h: 124,
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
    district: 'downtown',
    render: 'library',
    x: 820, y: 40, w: 148, h: 108,
    color: '#9db4d0',
    blurb: 'Two terminals. One works. Public records, if you know the filing codes.',
    ambient: {
      flagged: 'The librarian asks for a card number now. She’s apologetic about it. It’s new.',
      hunted: 'The public terminal is “down for maintenance”, and has been all week.',
    },
  },
  {
    id: 'town_square',
    label: 'Town Square',
    language: 'A',
    district: 'downtown',
    render: 'plaza',
    x: 610, y: 210, w: 170, h: 100,
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
  {
    /*
     * The location `SAFEHOUSE_ID`/`SAFEHOUSE_FLAG` (content/safehouse.ts)
     * have always pointed at — the scene and the decay/blocked logic
     * (systems/safehouse.ts) existed already, but nothing had ever actually
     * placed the unit on the map. Positioned a short walk from Town Square
     * on purpose: the safehouse scene's own doc comment calls it "the
     * boarded unit on Marlow Street that the Robin Hood ambience mentions",
     * and that ambience is Town Square's own `trustAmbient` line above — the
     * two have to be close enough that a player who read one recognises the
     * other, not opposite ends of town.
     */
    id: 'marlow_unit',
    label: 'Marlow Street',
    language: 'B',
    district: 'downtown',
    render: 'shop',
    x: 870, y: 210, w: 90, h: 66,
    color: '#d8843a',
    blurb: 'The shutter’s up, the radio’s on, and the paint still smells fresh. Nobody who lives here officially exists.',
    canLieLow: true,
    requiresFlag: SAFEHOUSE_FLAG,
    ambient: {
      watched: 'The radio’s tuned to a station that plays nothing but weather. Nobody’s touched the dial in weeks.',
      flagged: 'The shutter’s down during daylight now. It never used to be.',
      hunted: 'Somebody left the porch light off on purpose. You notice because it usually isn’t.',
    },
  },

  // ---------------------------------------------------------------- //
  // Warehouse District — the whole east column. Loading docks, fenced
  // lots, the fence line the story keeps warning is watched.
  // ---------------------------------------------------------------- //
  {
    /*
     * The Annex splits into two readable halves (draw.ts's DISTRICTS
     * palette): Tech Row up top with Fenwick Lot — commerce, repair, the
     * market table — Industrial below it. Nothing about deja_jobsite is
     * geography-locked in the story, so relocating the whole district for
     * the redesign is paint, not a story fix.
     */
    id: 'deja_jobsite',
    label: 'Utility Yard',
    language: 'B',
    district: 'warehouse',
    render: 'warehouse',
    x: 1170, y: 60, w: 150, h: 108,
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
    district: 'warehouse',
    render: 'warehouse',
    x: 1360, y: 60, w: 160, h: 96,
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
    id: 'annex_fence',
    label: 'Annex Fence',
    language: 'B',
    district: 'warehouse',
    render: 'warehouse',
    x: 1170, y: 410, w: 170, h: 116,
    color: '#c8532e',
    blurb: 'A building with no name on it and a fence with a gap somebody keeps re-opening.',
    ambient: {
      watched: 'The gap’s been zip-tied shut. The zip tie has already been cut and put back.',
      flagged: 'Two vans tonight instead of one. Nobody gets out of either.',
      hunted: 'Floodlights, all the way down the fence line. It’s the brightest place in Bellhaven.',
    },
  },
  {
    id: 'camera_pole_5th',
    label: 'FLACK Camera Housing',
    language: 'B',
    district: 'warehouse',
    render: 'camera',
    x: 1400, y: 430, w: 76, h: 76,
    color: '#e6402a',
    blurb: 'FLACK stamped on the housing in letters too small to read from the ground. Two cables where the diagram shows one. Someone painted over something here.',
    ambient: {
      watched: 'The grey paint has been touched up again. Neatly, this time.',
      flagged: 'There’s a second housing on the pole now, higher up, pointing down the street.',
      hunted: 'A van idles at the end of the block with its lights off.',
    },
  },
  {
    /*
     * New for the redesign — the Warehouse District's own south half needed
     * more than two more stops to read as a real second district rather
     * than a bigger version of Fenwick Lot. A spur line, not the main rail
     * (draw.ts's edge geography runs that further west) — a dead siding
     * nobody's used since the last car it served got scrapped.
     */
    id: 'rail_spur',
    label: 'Rail Spur',
    language: 'B',
    district: 'warehouse',
    render: 'warehouse',
    x: 1170, y: 570, w: 140, h: 90,
    color: '#d8843a',
    blurb: 'A dead siding, one rusted boxcar, and a padlock somebody left open on purpose or forgot on purpose. Same difference from out here.',
    ambient: {
      watched: 'The boxcar door is open a hand’s width more than it was.',
      flagged: 'Somebody’s chained the boxcar shut properly this time.',
      hunted: 'A generator running behind the boxcar that wasn’t there yesterday.',
    },
  },
  {
    id: 'scrapyard',
    label: 'Scrapyard',
    language: 'B',
    district: 'warehouse',
    render: 'warehouse',
    x: 1360, y: 570, w: 170, h: 110,
    color: '#c8532e',
    blurb: 'Stacked cars, a crane that hasn’t moved in a year, and more of everything the salvage economy wants than one kid could ever carry off.',
    ambient: {
      watched: 'The crane operator’s trailer has a light on. Nobody’s ever seen who works it.',
      flagged: 'A new padlock on the gate, the kind that isn’t for keeping scrap in.',
      hunted: 'The dogs are out. There have never been dogs before.',
    },
  },

  // ---------------------------------------------------------------- //
  // Riverside Park — centrally placed on purpose: every other district
  // is one district away from here, not two.
  // ---------------------------------------------------------------- //
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
    district: 'riverside_park',
    render: 'ballpark',
    x: 560, y: 460, w: 190, h: 120,
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
    /*
     * New for the redesign — the park needed an identity beyond "the
     * ballpark's front lawn". Walkable, same as Town Square: open ground
     * the town was built around, not a building with a paint job.
     *
     * Grown for the landscaping pass (own `render: 'green'`, no longer
     * sharing `drawPlaza` with Town Square) — a real formal garden needs
     * more than 150x110 to fit a pond, a gazebo, and two symmetric hedged
     * lawns without everything overlapping. Kept clear of both `ballpark`
     * (ends x:750) and `treehouse` (starts y:600) with a real gap on each
     * side, checked against scripts/check-connectivity.mjs after the resize.
     */
    id: 'park_green',
    label: 'The Green',
    language: 'A',
    district: 'riverside_park',
    render: 'green',
    x: 770, y: 400, w: 280, h: 180,
    color: '#6fa06a',
    walkable: true,
    blurb: 'Open grass, a gravel path cutting the long way across it anyway, and a bench nobody ever sits on alone.',
    ambient: {
      watched: 'A jogger runs the same loop twice, which usually just means they like the loop.',
      flagged: 'The path lights come on earlier than sunset now.',
      hunted: 'A patrol van parked at the edge of the grass, engine running, going nowhere.',
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
    district: 'riverside_park',
    render: 'treehouse',
    x: 900, y: 600, w: 80, h: 64,
    color: '#8a9b6e',
    blurb: 'A plank floor, a rope ladder nobody’s cut down, and a beach towel doing the job of a roof in one corner.',
    canLieLow: true,
    ambient: {
      watched: 'Somebody left half a candy bar up here. It’s not new enough to be yours.',
      flagged: 'From up here you can actually see which streets still have a light on this late.',
      hunted: 'Nobody looks up. That was always the whole design.',
    },
  },

  // ---------------------------------------------------------------- //
  // West End — older homes, smaller shops. Milo's shop reads as
  // commerce/repair, not warehouse infrastructure, so it lives here
  // rather than with the rest of the Annex.
  // ---------------------------------------------------------------- //
  {
    id: 'repair_shop',
    label: 'Repair Shop',
    language: 'B',
    district: 'west_end',
    render: 'garage',
    x: 40, y: 430, w: 126, h: 90,
    color: '#d8843a',
    blurb: 'Phones in a shoebox, a soldering iron, a handwritten sign: WE FIX IT OR IT’S FREE.',
    ambient: {
      watched: 'Milo doesn’t look up. He’s got a board open and forty small screws in a jar lid.',
      flagged: 'The shop’s shut at four. The sign says FAMILY THING and the light’s on in the back.',
    },
  },
  {
    /*
     * New for the redesign, and not just texture — the gap between this and
     * the Repair Shop is the shortcut the whole route-choice pass exists
     * for: narrower than the street, no camera on it, obstacles.ts lines it
     * with the tree cover that makes underTreeCover() concealment real
     * rather than cosmetic.
     */
    id: 'laundromat',
    label: 'Wash & Fold',
    language: 'A',
    district: 'west_end',
    render: 'shop',
    x: 220, y: 430, w: 90, h: 68,
    color: '#c3ccd8',
    blurb: 'Fluorescent hum, a dryer running with nothing in it, and a door in the back nobody official has ever used.',
    canLieLow: true,
    ambient: {
      watched: 'The same three machines run all day. Nobody who owns this place seems to mind.',
      flagged: 'A new sign: CASH ONLY, hand-lettered, taped over the card reader.',
      hunted: 'The back door’s propped with a folding chair. That wasn’t there this morning.',
    },
  },

  // ---------------------------------------------------------------- //
  // Transit Hub — new district. Functional, not story-dense: buses,
  // benches, people who are only ever passing through.
  // ---------------------------------------------------------------- //
  {
    id: 'bus_depot',
    label: 'Bus Depot',
    language: 'A',
    district: 'transit_hub',
    render: 'transit',
    x: 40, y: 830, w: 160, h: 108,
    color: '#5b8fc9',
    blurb: 'Three bays, two working clocks that disagree by six minutes, and a bench that’s always got somebody on it who isn’t waiting for a bus.',
    canLieLow: true,
    ambient: {
      watched: 'Nobody here clocks a face twice. That’s most of the point of a depot.',
      flagged: 'A driver takes a long look at you before pulling out. Says nothing.',
      hunted: 'The night routes got cut “for maintenance”. The buses still run. Just not the stops that matter.',
    },
  },

  // ---------------------------------------------------------------- //
  // South Residential — quieter than the north side, closer to the edge.
  // ---------------------------------------------------------------- //
  {
    id: 'casey_house',
    label: 'Casey',
    language: 'A',
    district: 'south_residential',
    render: 'house',
    x: 570, y: 830, w: 118, h: 94,
    color: '#c3ccd8',
    blurb: 'For Sale sign. The swing set is still up. The mail is still coming.',
    ambient: {
      flagged: 'The mailbox is empty now. Somebody cleared it. Nobody moved in.',
      hunted: 'The sign is gone and the grass has been cut. It looks like nobody ever lived here.',
    },
  },

  // ---------------------------------------------------------------- //
  // Commercial Strip — storefronts and parking lots. Safe havens: the
  // whole point is you're not hiding, you're getting a slice, doing a
  // load of laundry, playing one more round.
  // ---------------------------------------------------------------- //
  {
    id: 'pizza_place',
    label: 'Sal’s Pizza',
    language: 'A',
    district: 'commercial_strip',
    render: 'pizza',
    x: 1170, y: 830, w: 98, h: 74,
    color: '#d99a6c',
    blurb: 'Fluorescent lights, a jukebox nobody’s fed in years, and a guy behind the counter who stopped asking questions a long time ago.',
    canLieLow: true,
    ambient: {
      watched: 'The guy behind the counter slides you a slice you didn’t order and doesn’t mention it again.',
      flagged: 'Two SafeTrace jackets at the corner table, not eating, just sitting.',
      hunted: 'The OPEN sign is off but the door isn’t locked. That’s on purpose.',
    },
  },
  {
    id: 'arcade',
    label: 'The Arcade',
    language: 'A',
    district: 'commercial_strip',
    render: 'arcade',
    x: 1300, y: 830, w: 98, h: 74,
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
    id: 'convenience_store',
    label: 'Convenience Store',
    language: 'A',
    district: 'commercial_strip',
    render: 'shop',
    x: 1170, y: 960, w: 108, h: 78,
    color: '#d99a6c',
    blurb: 'A bell over the door, a slushie machine that’s been broken since spring, and a clerk who watches the parking lot more than the register.',
    ambient: {
      watched: 'The clerk rings you up without looking up from the small TV behind the counter.',
      flagged: 'A laminated flyer taped to the register. SEE SOMETHING. It’s new.',
      hunted: 'The camera over the door is pointed at the street now, not the till.',
    },
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    language: 'A',
    district: 'commercial_strip',
    render: 'shop',
    x: 1320, y: 960, w: 108, h: 78,
    color: '#c3ccd8',
    blurb: 'A pharmacist who knows everyone’s name and half their business, a rack of expired sunglasses, and a back room door that’s never quite shut.',
    ambient: {
      watched: 'The pharmacist asks after your mom without looking up.',
      flagged: 'A new sign: NO LOITERING, taped a little crooked, like it went up in a hurry.',
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
