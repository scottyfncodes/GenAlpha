/**
 * Overworld content lives in data, never in components — this is what makes
 * Acts 2/3 addable without refactoring. Rendering is `draw.ts`'s procedural
 * shape library (a house is drawn as a house, not a colour swatch); this file
 * only ever carries where things are and what they say.
 *
 * The town is organised into `DISTRICTS` (below) — nine of them, one per
 * cell of an exact 3x3 grid, per the build note that a player should be
 * able to glance at the map and think "I'm in The Works", not "I'm on
 * another collection of grey squares". Every location still stands on its
 * own; `district` is what lets the town read as a place with
 * neighbourhoods rather than a loose bag of doors.
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
  /** The one-word purpose printed under the name on the map key — what the
   * block is *for*, as distinct from what it's called. Nine districts on a
   * 3x3 need this: "Old Market" and "The Plaza" are both commerce until the
   * subtitle says one is the strip and the other is a retail park. */
  sub: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Placeholder fill, same role as a location's own `color`. */
  color: string;
  mood: string;
}

/*
 * A true 3x3, nine districts, one per block — the map redesign's own grid.
 * The two arterial pairs (`draw.ts`'s `ROAD_SEGMENTS`) are the seams: the
 * major cross at x478/y342 and the secondary pair at x1084/y740 cut the
 * 1600x1100 town into nine cells, and every cell now carries exactly one
 * district with its own purpose rather than one of them (the old Warehouse
 * District) swallowing a whole column and leaving eight.
 *
 * Reading order is the grid's own, left to right and top to bottom:
 *
 *   1 The Heights   2 Main Street    3 Civic Zone
 *   4 Old Market    5 Liberty Park   6 The Works
 *   7 Southside     8 The Blocks     9 The Plaza
 *
 * Surveillance density is authored to climb toward the Civic Zone (see
 * `world/collectibles.ts`'s camera table and `world/obstacles.ts`'s
 * scanners and security gates) — a player walking north-east should feel
 * watched before they've read a single sign. Liberty Park is the deliberate
 * inverse and sits dead centre so every other district is one block from
 * it: the quiet the rest of the map is measured against.
 *
 * The river runs the west/south edge and the rail line crosses the north
 * edge into The Works — both are decorative ground texture (`draw.ts`'s
 * `drawEdgeGeography`), not collision, so crossing either one is exactly as
 * free as crossing an ordinary street.
 */
export const DISTRICTS: District[] = [
  {
    id: 'the_heights',
    label: 'The Heights',
    sub: 'Residential',
    x: 0, y: 0, w: 472, h: 336,
    color: '#7fa3c9',
    mood: 'Quiet streets. Backyards and alleys cut every corner shorter than the road does. Home is here, and so is everyone who would notice you gone.',
  },
  {
    id: 'main_street',
    label: 'Main Street',
    sub: 'Downtown',
    x: 528, y: 0, w: 544, h: 336,
    color: '#b89a5a',
    mood: 'Shops, a square, and the only stretch of pavement in town where standing still doesn’t look like loitering.',
  },
  {
    id: 'civic_zone',
    label: 'Civic Zone',
    sub: 'Government District',
    // The one district whose accent is deliberately cold rather than warm —
    // the ground tint (`draw.ts`'s `DISTRICT_GROUND_TINTS`) is the signal a
    // walking player picks up before they've looked up at a single camera.
    x: 1128, y: 0, w: 472, h: 336,
    color: '#8fa6bd',
    mood: 'City Hall, the records office, and a data centre with no sign on it. More lenses per street than the rest of town put together.',
  },
  {
    id: 'old_market',
    label: 'Old Market',
    sub: 'The Strip',
    x: 0, y: 392, w: 472, h: 336,
    color: '#9b7fc9',
    mood: 'Pawn, laundry, a diner that never closes, and a lot out back where the prices aren’t on anything.',
  },
  {
    id: 'liberty_park',
    label: 'Liberty Park',
    sub: 'The Commons',
    x: 528, y: 392, w: 544, h: 336,
    color: '#6fa06a',
    mood: 'A fountain, a banner nobody has taken down yet, and the only ground in Bellhaven that belongs to everybody.',
  },
  {
    id: 'the_works',
    label: 'The Works',
    sub: 'Industrial District',
    x: 1128, y: 392, w: 472, h: 336,
    color: '#e0672f',
    mood: 'Loading docks, fenced lots, and a fence line the story keeps warning is watched. Every building here has a back way in.',
  },
  {
    id: 'southside',
    label: 'Southside',
    sub: 'Transit / Services',
    x: 0, y: 784, w: 472, h: 316,
    color: '#5b8fc9',
    mood: 'Buses, substations, and people who are only ever passing through. Nobody here is memorable on purpose.',
  },
  {
    id: 'the_blocks',
    label: 'The Blocks',
    sub: 'Working Class Housing',
    x: 528, y: 784, w: 544, h: 316,
    // Was the same hex as The Heights — the two ends of town read as one
    // district split in half by the map instead of two neighbourhoods,
    // since the ground tint is the only per-district signal a player picks
    // up ambiently while walking. A warmer, dustier rose rather than
    // another blue keeps it out of every other district's family too.
    color: '#c98a7f',
    mood: 'Terraces, front steps, and somebody’s laundry out. The people the whole thing is actually for.',
  },
  {
    id: 'the_plaza',
    label: 'The Plaza',
    sub: 'Commercial Plaza',
    x: 1128, y: 784, w: 472, h: 316,
    color: '#c46a8f',
    mood: 'A big box, a billboard, and a parking lot with better camera coverage than the school. Easy to blend into a crowd that’s already there to shop.',
  },
];

/**
 * Which district a point is in — and, on the roads between them, which one
 * it belongs to.
 *
 * The nine blocks are separated by 56px seams where the arterials run,
 * which adds up to just over 15% of the map. A pure containment test calls
 * all of that "nowhere", and a player walking south out of The Heights
 * would cross the major road, arrive in Old Market and never be told,
 * because the transition the nameplate watches for went
 * Heights → nowhere → Old Market and the middle step cleared the card
 * before the last one could show it. Found by actually walking it rather
 * than by reading the code.
 *
 * So containment is the fast, exact path, and everything else falls back
 * to the nearest block's centre. That is also just true of a real town:
 * the road between two neighbourhoods is not a third place, it is the edge
 * of whichever one you are closer to, and the name changes somewhere
 * around the middle of the carriageway.
 */
export function districtAt(x: number, y: number): District | null {
  const inside = DISTRICTS.find((d) => x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h);
  if (inside) return inside;

  let nearest: District | null = null;
  let best = Infinity;
  for (const d of DISTRICTS) {
    const dist = Math.hypot(d.x + d.w / 2 - x, d.y + d.h / 2 - y);
    if (dist < best) {
      best = dist;
      nearest = d;
    }
  }
  return nearest;
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
   *
   * `'civic'`, `'datacenter'`, `'bigbox'` and `'substation'` are the 3x3
   * redesign's own four: the Civic Zone and The Plaza are new districts
   * whose whole identity is architectural, and drawing City Hall as another
   * `'building'` box or the SafeTrace data centre as another `'warehouse'`
   * would have left both blocks reading as the districts they replaced.
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
    | 'green'
    | 'civic'
    | 'datacenter'
    | 'bigbox'
    | 'substation';
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
 * 1600x1100, unchanged by the nine-district redesign and deliberately so —
 * the brief for that pass was to rebuild every block *inside* the existing
 * footprint, not to grow the town again. What changed is the density: the
 * same canvas now carries nine districts instead of eight, thirty-five
 * named locations instead of twenty-one, and a road hierarchy whose two
 * arterial pairs cut it into an exact 3x3.
 *
 * `drawGround`/`drawRoads` and the movement clamp in Overworld.tsx all read
 * these constants rather than a hardcoded size, so the map dimensions stay
 * one decision in one place.
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
  // 1. THE HEIGHTS — home turf. Every early beat plays here, and it is
  // the one block on the map with no camera pointed at its own street.
  // ---------------------------------------------------------------- //
  {
    id: HOME_LOCATION_ID,
    label: 'Home',
    language: 'A',
    district: 'the_heights',
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
    district: 'the_heights',
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
    district: 'the_heights',
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
  // 2. MAIN STREET — the town's shopfront. The square, the school, two
  // storefronts and the safehouse unit, all facing the same pavement.
  // The two arterials cross at its south-west corner: the Downtown
  // Crossroads (draw.ts's MAJOR_ROADS).
  // ---------------------------------------------------------------- //
  {
    id: 'school',
    label: 'School',
    language: 'A',
    district: 'main_street',
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
    /*
     * New for the 3x3 redesign. Main Street's brief is "shops, services,
     * meet NPCs" and the block had exactly one storefront in it (the
     * safehouse unit, which doesn't exist until Act 2 opens it) — the
     * district was reading as a civic quad with a plaza, not a high
     * street. A grocer and a café are the two shops a small town's main
     * street always actually has.
     */
    id: 'corner_market',
    label: 'Corner Market',
    language: 'A',
    district: 'main_street',
    render: 'shop',
    x: 820, y: 44, w: 112, h: 80,
    color: '#c3ccd8',
    blurb: 'Crates of fruit out front, a bell on the door, and a handwritten sign apologising for the price of eggs.',
    ambient: {
      watched: 'The owner is restocking and says hello to you by name, which he does to everybody.',
      flagged: 'A tip-line card is taped to the till, face out. He hasn’t looked at it once.',
      hunted: 'He turns the sign to CLOSED as you reach the door, then holds it open anyway.',
    },
  },
  {
    id: 'main_st_cafe',
    label: 'The Cup',
    language: 'A',
    district: 'main_street',
    render: 'shop',
    x: 966, y: 44, w: 94, h: 74,
    color: '#d99a6c',
    blurb: 'Four tables, one of them always taken by the same two men who never order a second thing.',
    canLieLow: true,
    trustAmbient: [
      { above: 62, text: 'Somebody has pinned a hand-drawn map of the town to the corkboard by the counter. The cameras are marked on it.' },
    ],
    ambient: {
      watched: 'The radio behind the counter is on the local station. Nobody is listening to it.',
      flagged: 'The corner table is empty for once, and the chairs are pushed in wrong.',
      hunted: 'The window seat has been given to somebody in a SafeTrace jacket who is not drinking anything.',
    },
  },
  {
    id: 'town_square',
    label: 'Town Square',
    language: 'A',
    district: 'main_street',
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
    district: 'main_street',
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
  // 3. CIVIC ZONE — the government block, and the most watched ground in
  // Bellhaven by a wide margin (see the camera table's own stage-0
  // cluster and the scanner/gate rows in world/obstacles.ts). Two of the
  // four buildings here are new; the Library moved one block east out of
  // Main Street, because "public records, if you know the filing codes"
  // was always a description of a civic building standing in the wrong
  // district.
  // ---------------------------------------------------------------- //
  {
    id: 'city_hall',
    label: 'City Hall',
    language: 'A',
    district: 'civic_zone',
    render: 'civic',
    x: 1145, y: 40, w: 190, h: 128,
    color: '#c7c2ac',
    blurb: 'Six steps, four columns, and a noticeboard by the door where the safety grant is pinned up next to a lost cat.',
    trustAmbient: [
      { above: 62, text: 'Three people are waiting outside the council chamber with the same photocopied page in their hands.' },
    ],
    ambient: {
      watched: 'The council agenda in the case by the door has one item on it and the item is a number.',
      flagged: 'The doors are badge-only after four now. The sign explaining this is newer than the lock.',
      hunted: 'Two officers on the steps who are not going in and not going anywhere else either.',
    },
  },
  {
    /*
     * The SafeTrace data centre — the antagonist as a building, standing
     * where the story has always implied it stood. No sign, no windows,
     * and the only roofline in town the sky doesn't warm (see draw.ts's
     * `drawDataCenter`): the Civic Zone's own answer to what the safety
     * grant actually bought.
     */
    id: 'data_center',
    label: 'Data Centre',
    language: 'B',
    district: 'civic_zone',
    render: 'datacenter',
    x: 1400, y: 36, w: 180, h: 124,
    color: '#5b6a7d',
    blurb: 'No name on it, no windows in it, and a chiller on the roof loud enough to hear from the street. The plate by the door says the unit number and nothing else.',
    ambient: {
      watched: 'The car park is full and you have never once seen anybody walk out to a car.',
      flagged: 'The gate arm is down in the middle of the day, and the guard hut has somebody in it.',
      hunted: 'Every light on the fence line is on, and none of them are pointed inward.',
    },
  },
  {
    id: 'town_library',
    label: 'Library',
    language: 'A',
    district: 'civic_zone',
    render: 'library',
    x: 1150, y: 228, w: 168, h: 100,
    color: '#9db4d0',
    blurb: 'Two terminals. One works. Public records, if you know the filing codes.',
    ambient: {
      flagged: 'The librarian asks for a card number now. She’s apologetic about it. It’s new.',
      hunted: 'The public terminal is “down for maintenance”, and has been all week.',
    },
  },
  {
    id: 'records_office',
    label: 'Records Office',
    language: 'A',
    district: 'civic_zone',
    render: 'building',
    x: 1380, y: 228, w: 190, h: 100,
    color: '#8fa6bd',
    blurb: 'Planning applications, incident notices, and a counter with a bell on it that nobody answers before the third ring.',
    ambient: {
      watched: 'The window lists the request fee. It has been crossed out and rewritten upward twice.',
      flagged: 'A new form to fill in before the old form. Both of them ask for the same address.',
      hunted: 'The public request desk is closed. The sign gives an email address that bounces.',
    },
  },

  // ---------------------------------------------------------------- //
  // 4. OLD MARKET — the strip. Pawn, laundry, a repair bench and a diner
  // along the north side, and behind them the lot the whole black market
  // runs out of. `fenwick_lot` moved here from the old Warehouse
  // District: the story has always called it "the lot behind the Fenwick
  // Street shops" (content/act1.ts, content/market.ts) and there were no
  // shops in front of it anywhere on the old map.
  // ---------------------------------------------------------------- //
  {
    id: 'pawn_shop',
    label: 'Pawn & Loan',
    language: 'B',
    district: 'old_market',
    render: 'shop',
    x: 24, y: 404, w: 96, h: 76,
    color: '#9b7fc9',
    blurb: 'Guitars in the window with the price tags turned around, and a man behind the glass who can tell what a thing is worth without picking it up.',
    ambient: {
      watched: 'Three phones in the case that are all the same model and all the same scratch.',
      flagged: 'A police notice in the window about serial numbers, hung so the glare covers most of it.',
      hunted: 'The buzzer is on the door now. He looks at you a long moment before pressing it.',
    },
  },
  {
    id: 'repair_shop',
    label: 'Repair Shop',
    language: 'B',
    district: 'old_market',
    render: 'garage',
    x: 148, y: 400, w: 126, h: 92,
    color: '#d8843a',
    blurb: 'Phones in a shoebox, a soldering iron, a handwritten sign: WE FIX IT OR IT’S FREE.',
    ambient: {
      watched: 'Milo doesn’t look up. He’s got a board open and forty small screws in a jar lid.',
      flagged: 'The shop’s shut at four. The sign says FAMILY THING and the light’s on in the back.',
    },
  },
  {
    /*
     * The gap between this and the Repair Shop is the shortcut the whole
     * route-choice pass exists for: narrower than the street, no camera
     * on it, and obstacles.ts lines it with the tree cover that makes
     * underTreeCover() concealment real rather than cosmetic.
     */
    id: 'laundromat',
    label: 'Wash & Fold',
    language: 'A',
    district: 'old_market',
    render: 'shop',
    x: 336, y: 404, w: 92, h: 70,
    color: '#c3ccd8',
    blurb: 'Fluorescent hum, a dryer running with nothing in it, and a door in the back nobody official has ever used.',
    canLieLow: true,
    ambient: {
      watched: 'The same three machines run all day. Nobody who owns this place seems to mind.',
      flagged: 'A new sign: CASH ONLY, hand-lettered, taped over the card reader.',
      hunted: 'The back door’s propped with a folding chair. That wasn’t there this morning.',
    },
  },
  {
    id: 'fenwick_lot',
    label: 'Fenwick Lot',
    language: 'B',
    district: 'old_market',
    render: 'warehouse',
    x: 24, y: 568, w: 168, h: 100,
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
    id: 'diner',
    label: 'The Anchor Diner',
    language: 'A',
    district: 'old_market',
    render: 'shop',
    x: 236, y: 566, w: 108, h: 80,
    color: '#d99a6c',
    blurb: 'Open all night because closing was never worth the argument. Booths by the window, and one at the back with no window at all.',
    canLieLow: true,
    ambient: {
      watched: 'The waitress fills a cup you didn’t ask for and leaves the pot on the table.',
      flagged: 'The back booth has been given to somebody else, and the somebody else is facing the door.',
      hunted: 'The neon in the window is off. The kitchen light isn’t.',
    },
  },

  // ---------------------------------------------------------------- //
  // 5. LIBERTY PARK — the commons, dead centre of the 3x3 so every other
  // district is one block from it. The fountain in The Green is the map's
  // own visual centre and the COMMUNITY NOT SURVEILLANCE banner is strung
  // across the path beside it (draw.ts's `drawGreen`).
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
    district: 'liberty_park',
    render: 'ballpark',
    x: 540, y: 424, w: 146, h: 120,
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
     * Walkable, same as Town Square: open ground the town was built
     * around, not a building with a paint job. Re-centred for the 3x3 so
     * the fountain lands near the middle of the whole map rather than off
     * in the district's east corner — the reference layout's own note that
     * the park's centrepiece should be the thing you orient by.
     */
    id: 'park_green',
    label: 'The Green',
    language: 'A',
    district: 'liberty_park',
    render: 'green',
    x: 706, y: 400, w: 314, h: 200,
    color: '#6fa06a',
    walkable: true,
    blurb: 'Open grass, a fountain running on the town’s money, and a banner across the path that the council has asked twice to have taken down.',
    trustAmbient: [
      { above: 62, text: 'There are more people on the grass than there is reason for. Somebody has brought a folding table.' },
    ],
    ambient: {
      watched: 'A jogger runs the same loop twice, which usually just means they like the loop.',
      flagged: 'The path lights come on earlier than sunset now.',
      hunted: 'A patrol van parked at the edge of the grass, engine running, going nowhere.',
    },
  },
  {
    /*
     * A plank floor and three walls, which is a place nobody official put
     * a camera on, because nobody official knows it's there. Same Lie Low
     * mechanic as Sal's and the Arcade, just older and smaller and yours
     * since you were nine.
     */
    id: 'treehouse',
    label: 'The Treehouse',
    language: 'A',
    district: 'liberty_park',
    render: 'treehouse',
    x: 890, y: 638, w: 80, h: 64,
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
  // 6. THE WORKS — the industrial block, and the only district where
  // every building has a service entrance the front door doesn't know
  // about. The old Warehouse District's whole east column compressed into
  // its own cell of the 3x3, which is what freed the Civic Zone above it.
  // ---------------------------------------------------------------- //
  {
    id: 'deja_jobsite',
    label: 'Utility Yard',
    language: 'B',
    district: 'the_works',
    render: 'warehouse',
    x: 1148, y: 400, w: 140, h: 110,
    color: '#f0a03c',
    blurb: 'Spools of cable, a locked gate that isn’t locked, and a light left on over the shed.',
    ambient: {
      watched: 'A new sign on the gate. AUTHORISED PERSONNEL, laminated, still curling.',
      flagged: 'Deja’s mother’s truck isn’t here. Somebody else’s is.',
      hunted: 'The gate is chained now. Deja meets you on the road instead, walking.',
    },
  },
  {
    id: 'annex_fence',
    label: 'Annex Fence',
    language: 'B',
    district: 'the_works',
    render: 'warehouse',
    x: 1342, y: 400, w: 170, h: 112,
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
    district: 'the_works',
    render: 'camera',
    x: 1528, y: 414, w: 64, h: 64,
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
     * A spur line, not the main rail (draw.ts's edge geography runs that
     * further north) — a dead siding nobody's used since the last car it
     * served got scrapped.
     */
    id: 'rail_spur',
    label: 'Rail Spur',
    language: 'B',
    district: 'the_works',
    render: 'warehouse',
    x: 1148, y: 578, w: 140, h: 96,
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
    district: 'the_works',
    render: 'warehouse',
    x: 1342, y: 578, w: 178, h: 112,
    color: '#c8532e',
    blurb: 'Stacked cars, a crane that hasn’t moved in a year, and more of everything the salvage economy wants than one kid could ever carry off.',
    ambient: {
      watched: 'The crane operator’s trailer has a light on. Nobody’s ever seen who works it.',
      flagged: 'A new padlock on the gate, the kind that isn’t for keeping scrap in.',
      hunted: 'The dogs are out. There have never been dogs before.',
    },
  },

  // ---------------------------------------------------------------- //
  // 7. SOUTHSIDE — transit and services. Functional, not story-dense:
  // buses, benches, a substation humming behind a fence, and people who
  // are only ever passing through.
  // ---------------------------------------------------------------- //
  {
    id: 'bus_depot',
    label: 'Bus Depot',
    language: 'A',
    district: 'southside',
    render: 'transit',
    x: 40, y: 826, w: 160, h: 108,
    color: '#5b8fc9',
    blurb: 'Three bays, two working clocks that disagree by six minutes, and a bench that’s always got somebody on it who isn’t waiting for a bus.',
    canLieLow: true,
    ambient: {
      watched: 'Nobody here clocks a face twice. That’s most of the point of a depot.',
      flagged: 'A driver takes a long look at you before pulling out. Says nothing.',
      hunted: 'The night routes got cut “for maintenance”. The buses still run. Just not the stops that matter.',
    },
  },
  {
    /*
     * New for the 3x3. Southside's brief is transit *and* infrastructure,
     * and the district had a bus depot and nothing else — which left the
     * whole "util systems" half of its identity as a line in a design doc.
     * The substation is also where this district's own Tier 5 junction box
     * and building-panel street hack now live, so the fiction and the
     * gameplay agree about what's behind that fence.
     */
    id: 'substation',
    label: 'Substation 9',
    language: 'B',
    district: 'southside',
    render: 'substation',
    x: 254, y: 818, w: 150, h: 104,
    color: '#6b7888',
    blurb: 'Transformers behind a fence, a hum you feel in your teeth, and a hazard sign faded to the point of being a suggestion.',
    ambient: {
      watched: 'The hum drops half a tone and comes back. Nothing else about the street changes.',
      flagged: 'A second padlock on the gate, newer than the fence it’s holding shut.',
      hunted: 'Somebody has cut the weeds back from the whole fence line. That is not maintenance.',
    },
  },

  // ---------------------------------------------------------------- //
  // 8. THE BLOCKS — working-class housing, the people the whole thing is
  // actually for. Casey's is still the block's story building; the two
  // beside it are the neighbours the Robin Hood arc has always been
  // written about and never had anywhere to live.
  // ---------------------------------------------------------------- //
  {
    id: 'casey_house',
    label: 'Casey',
    language: 'A',
    district: 'the_blocks',
    render: 'house',
    x: 566, y: 812, w: 118, h: 94,
    color: '#c3ccd8',
    blurb: 'For Sale sign. The swing set is still up. The mail is still coming.',
    ambient: {
      flagged: 'The mailbox is empty now. Somebody cleared it. Nobody moved in.',
      hunted: 'The sign is gone and the grass has been cut. It looks like nobody ever lived here.',
    },
  },
  {
    /*
     * The family Home's own trust ambience has always named — "the
     * Vasquez family's letter, the one that said the debt was settled" —
     * given an actual address, so a player who read that line has
     * somewhere to walk to and read the other half of it.
     */
    id: 'vasquez_house',
    label: 'The Vasquez House',
    language: 'A',
    district: 'the_blocks',
    render: 'house',
    x: 726, y: 812, w: 120, h: 94,
    color: '#b7c7dd',
    blurb: 'Two cars in a one-car drive, a basketball hoop with no net, and a porch light that stays on for whoever is still out.',
    trustAmbient: [
      { above: 62, text: 'Mrs. Vasquez is on the porch with the letter in her hand, reading it again. She has read it a lot of times.' },
    ],
    ambient: {
      watched: 'Somebody’s doing homework at the front window with the TV on behind them.',
      flagged: 'A collections notice taped to the door, in the plastic sleeve they use so the rain doesn’t take it off.',
      hunted: 'The porch light is off and the drive is empty. Both cars.',
    },
  },
  {
    id: 'blocks_terrace',
    label: 'Kestrel Row',
    language: 'A',
    district: 'the_blocks',
    render: 'house',
    x: 888, y: 812, w: 144, h: 94,
    color: '#c98a7f',
    blurb: 'Six front doors in a row, six different colours, and one shared step that everybody sweeps and nobody owns.',
    trustAmbient: [
      { above: 62, text: 'Two of the doors are propped open onto the same step and the conversation is going between them.' },
    ],
    ambient: {
      watched: 'A radio out of an upstairs window, and somebody telling it to be quiet without much conviction.',
      flagged: 'A council notice on every second door. Same notice, same date.',
      hunted: 'Every curtain on the row is shut at six in the evening.',
    },
  },

  // ---------------------------------------------------------------- //
  // 9. THE PLAZA — a retail park with better camera coverage than the
  // school. Safe havens in the middle of it: the whole point is you're
  // not hiding, you're getting a slice, doing a load of laundry, playing
  // one more round.
  // ---------------------------------------------------------------- //
  {
    id: 'mega_mart',
    label: 'MegaMart',
    language: 'A',
    district: 'the_plaza',
    render: 'bigbox',
    x: 1412, y: 806, w: 170, h: 106,
    color: '#d4453a',
    blurb: 'A red sign the size of a house, twenty-two lanes with four of them open, and a greeter who has been told to remember faces.',
    ambient: {
      watched: 'The screen above the door plays the safety-grant advert on a loop with the sound off.',
      flagged: 'A loss-prevention officer walks the length of the front and back again while you decide.',
      hunted: 'The doors don’t open for you. Somebody inside is watching to see what you do about that.',
    },
  },
  {
    id: 'pizza_place',
    label: 'Sal’s Pizza',
    language: 'A',
    district: 'the_plaza',
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
    district: 'the_plaza',
    render: 'arcade',
    x: 1296, y: 830, w: 98, h: 74,
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
    district: 'the_plaza',
    render: 'shop',
    x: 1170, y: 962, w: 108, h: 78,
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
    district: 'the_plaza',
    render: 'shop',
    x: 1316, y: 962, w: 108, h: 78,
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
