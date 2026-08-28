import {
  DISTRICTS,
  HOME_LOCATION_ID,
  LOCATIONS,
  MAP_HEIGHT,
  MAP_WIDTH,
  visibleLocations,
  type OverworldLocation,
} from './locations';
import type { Obstacle } from './obstacles';
import type { WallMark } from './marks';
import type { NpcKind } from './npcs';
import type { ThresholdTier } from '../state/schema';
import { mulberry32, seedFrom } from '../systems/rng';
import {
  citySheetReady,
  drawTileAt,
  drawCityTileAt,
  drawSpriteTile,
  ensureSpriteSheetLoading,
  spriteSheetReady,
  TILE,
} from './spritesheet';
import {
  BIN_DUMPSTER,
  BUSH_ORANGE,
  BUSH_TEAL,
  BUS_TILES,
  CAR_TILES,
  CHARACTERS,
  CHARACTER_DRAW_SIZE,
  FENCE_CHAINLINK,
  PATH_KIT,
  POND_TILE,
  ROOF_GREY,
  ROOF_TAN,
  TREE_SMALL_ORANGE,
  TREE_SMALL_TEAL,
  TREE_TALL_ORANGE,
  TREE_TALL_TEAL,
  WALL_ORANGE,
  WALL_RED,
  type Direction,
  type NineSlice,
  type WallKit,
} from './spriteIndex';
import {
  ASPHALT_TILE,
  BARREL_TILE,
  CRATE_TILES,
  CROSSWALK_H,
  CROSSWALK_V,
  GROUND_TILE,
  MARKET_UMBRELLA_GREEN,
  MARKET_UMBRELLA_ORANGE,
  PATROL_VAN_TILES,
  ROOF_INDUSTRIAL,
  SIDEWALK_TILE,
  WALL_INDUSTRIAL,
} from './spriteIndexCity';

/**
 * THE TOWN, DRAWN.
 *
 * Style Guide 07 asks for limited-palette pixel art, small sprites, big skies —
 * "warm and a little melancholy, suburban dusk". This is that, at the fidelity
 * the budget note allows: shapes and light rather than drawn tiles, with the
 * hand-drawn allowance reserved for portraits, unlock scenes, the broadcast and
 * the final image.
 *
 * Three things it is doing on purpose, all of them theme rather than decoration:
 *
 * 1. **It is always dusk.** Not night, which would be sinister, and not day,
 *    which would be cheerful. Dusk is the hour a kid is still out and should
 *    probably be heading back, and the whole of Act 1 is that feeling.
 *
 * 2. **Windows are lit and the streets are empty.** Every house has somebody
 *    in it and the protagonist is outside all of them. Isolation is the
 *    starting wound (pillar 4), and this is the cheapest possible way to say so
 *    without a line of dialogue.
 *
 * 3. **Language B locations warm the ground around them.** Module 07: resistance
 *    places can shift toward the warmer palette as *pocket environments*,
 *    without re-theming the engine. So the town is cool and the places the crew
 *    have made are the only warm light at street level.
 *
 * Everything is drawn on integer coordinates with smoothing off, because
 * half-pixel edges are what makes pixel art look like scaled vector art.
 */

/** Disciplined sets, per the style guide's checklist. Cool town, warm pockets. */
const PALETTE = {
  skyHigh: '#2b3a55',
  skyMid: '#54617f',
  skyLow: '#8f8397',
  sun: '#d99a6c',
  ground: '#3d4759',
  groundAlt: '#434e61',
  road: '#333c4c',
  roadMajor: '#3a4358',
  roadSecondary: '#363f52',
  roadAlley: '#2d3542',
  roadLine: '#6b7488',
  roadLineFaint: 'rgba(107, 116, 136, 0.32)',
  river: '#2a4a5c',
  riverRipple: 'rgba(180, 220, 230, 0.16)',
  // The Old Market/Southside waterfront's own dock — weathered planking
  // and a piling a shade darker, same wood family `bench` already uses.
  dockPlank: '#5a4530',
  dockPlankDark: '#453520',
  dockPiling: '#2e2418',
  boatHull: '#6b5a42',
  boatTrim: '#8fa9c9',
  rail: '#2a2620',
  railTie: 'rgba(180, 170, 150, 0.28)',
  roofA: '#2f3a4d',
  wallA: '#4a5468',
  roofB: '#4a2f2a',
  wallB: '#6d4437',
  windowLit: '#f0c07a',
  windowDark: '#2a3242',
  warmGlow: 'rgba(240, 160, 60, 0.10)',
  hereGlow: 'rgba(236, 226, 208, 0.055)',
  curb: '#272e3a',
  crack: 'rgba(20, 24, 32, 0.35)',
  lampPost: '#232935',
  lampGlow: 'rgba(240, 190, 120, 0.9)',
  lampHalo: 'rgba(240, 190, 120, 0.14)',
  chainLink: 'rgba(180, 190, 200, 0.22)',
  chainPost: '#1c2129',
  tag: 'rgba(230, 64, 42, 0.5)',
  grit: 'rgba(0, 0, 0, 0.18)',
  sprite: '#14110f',
  spriteSkin: '#e8c8a8',
  spriteShirt: '#ece2d0',
  spriteBag: '#8a6b4a',
  spriteBagStrap: '#5c4630',
  capCrown: '#1a1a1c',
  capBrim: '#000000',
  outline: '#20262f',
  patrolBody: '#e6402a',
  patrolCab: '#100e0d',
  patrolLight: '#f0c07a',
  patrolRing: 'rgba(230, 64, 42, 0.22)',
  // A cooler, bluer read than the van's red — on foot, but still SafeTrace,
  // still worth telling apart from an ordinary pedestrian at a glance.
  copUniform: '#2e3a52',
  copCap: '#171d29',
  copRing: 'rgba(58, 110, 176, 0.22)',
  camera: '#3f7fe0',
  cameraDark: '#1f3d73',
  treeTrunk: '#3a2c22',
  treeCanopyDark: '#33513c',
  treeCanopy: '#456b4f',
  bush: '#3c5844',
  rockDark: '#454e5c',
  rockLight: '#5c6577',
  hedgeDark: '#38513e',
  hedge: '#48684f',
  atmBody: '#3c7a4e',
  atmDark: '#1f4029',
  phoneBody: '#8a7a5c',
  phoneDark: '#4a4030',
  panelBody: '#4a5468',
  panelDark: '#232935',
  parkedCarBody: '#5a6270',
  parkedCarGlass: '#7d8ea0',
  binBody: '#333a2c',
  binLid: '#242a1f',
  binRust: 'rgba(150, 96, 46, 0.4)',
  crateBody: '#8a6a44',
  crateEdge: '#6e5334',
  barrelBody: '#9a5a2c',
  // The Works' own per-location yard props (`drawWarehouseYardProps`)
  // — a cable spool, a boxcar, a crane — none of it sprite-sourced, so it needs
  // its own small palette rather than reusing sprite-derived tones.
  spoolBody: '#7a5636',
  spoolLine: '#4a3420',
  boxcarBody: '#7a3a2e',
  boxcarRoof: '#5c2c22',
  boxcarLine: 'rgba(20, 14, 12, 0.4)',
  boxcarRust: 'rgba(150, 96, 46, 0.55)',
  boxcarWheel: '#1c1815',
  craneBody: '#4a4a3e',
  craneCable: 'rgba(20, 20, 16, 0.6)',
  // Fenwick Lot's own market tarp — drab canvas, not a shop's clean awning.
  tarp: '#5a5638',
  tarpDark: '#403d28',
  // Casey's House's own yard props (`drawHouseYardProps`) — a weathered
  // realtor sign and a bare swing frame, both meant to read as slightly
  // sun-bleached rather than freshly painted.
  forSaleSign: '#c9c0a8',
  forSaleText: '#5a5240',
  swingFrame: '#5c6270',
  swingChain: 'rgba(40, 44, 52, 0.7)',
  swingSeat: '#3a4048',
  // The SafeTrace Tower (`drawSafeTraceTower`) — Downtown's own landmark, and
  // the one silhouette in Bellhaven that's deliberately cold and clean
  // rather than warm and hand-built. Panels a shade of clinical off-white/
  // steel-blue no other building in town uses, so it reads as "not one of
  // ours" at a glance before the camera cluster or the mast ever register.
  towerPanel: '#c7d2de',
  towerPanelDark: '#98a6b6',
  towerPanelShadow: '#6b7888',
  towerMast: '#3a4048',
  towerBeacon: '#e6402a',
  towerScreenCalm: '#5b96ff',
  towerScreenAlert: '#e6402a',
  // The Plaza's billboard (`drawBillboard`) — the loudest single
  // object in town on purpose, so its own palette leans bright rather than
  // borrowing the dusk-muted set everything else on this canvas uses.
  billboardFrame: '#232935',
  billboardFace: '#f0e8d8',
  billboardAccent: '#e8b23c',
  billboardCorrection: '#e6402a',
  bgWall: '#3a4150',
  bgRoof: '#2a2f3a',
  bgWindow: 'rgba(240, 192, 122, 0.32)',
  bgWindowDark: 'rgba(42, 50, 66, 0.6)',
  // A house's own pitched roof, a shade warmer than a civic building's flat
  // inset one — this is somebody's home, not an institution.
  pitchRoofA: '#3a4a3d',
  pitchRoofDarkA: '#2c3830',
  pitchRoofB: '#5a3a2c',
  pitchRoofDarkB: '#452c20',
  doorColor: '#2a3242',
  chimney: '#4a4038',
  porchPost: '#2a3242',
  // The library's columns and pediment — the one building in town dressed
  // up to look civic on purpose.
  pillar: '#c7c2ac',
  pillarShade: '#a8a48f',
  pediment: '#8f8a72',
  // The school's flag and its own sign band.
  flagpole: '#4a5468',
  flag: '#c94a3a',
  schoolSign: '#e8dcc0',
  // The plaza — no roof, just paving, a bandstand and a banner strung
  // between posts.
  pavingLight: '#5a6478',
  pavingDark: '#4c5568',
  bandstandRoof: '#c8532e',
  bandstandPost: '#232935',
  // Town Square's clock tower — warm terracotta brick, deliberately nothing
  // like the SafeTrace Tower's cold steel-blue (`towerPanel`) or the
  // Scrapyard's weathered brown (`smokestack`): Bellhaven's three skyline
  // landmarks should read as three different things before a player is
  // close enough to tell which district they're actually standing in.
  clockTower: '#8a5a42',
  clockTowerDark: '#6b4433',
  clockFace: '#e8dcc0',
  bench: '#5a4530',
  banner: '#e8dcc0',
  bannerText: '#c8532e',
  // The Annex's warehouses and Repair Shop's garage — corrugated roofing,
  // a roll-up door, roof vents.
  corrugated: '#3a2620',
  corrugatedLine: 'rgba(20, 12, 8, 0.4)',
  // The Scrapyard's own smokestack — a weathered brick-brown, distinct
  // from the tower's cold steel palette on purpose (two silhouettes should
  // never read as the same landmark from a distance).
  smokestack: '#5c4a3e',
  smokestackDark: '#3e3129',
  rollDoor: '#8a7460',
  rollDoorLine: 'rgba(30, 20, 12, 0.5)',
  vent: '#2a3242',
  // Sal's — an awning, a round sign.
  awningRed: '#c8402a',
  awningWhite: '#e8dcc0',
  signRed: '#c8402a',
  // The Arcade — a marquee sign over the door instead of ordinary windows.
  marqueeBody: '#2a1f38',
  marqueeGlow: '#e84ac9',
  marqueeBulb: '#f0c07a',
  // The ballpark — a field, not a building at all.
  fieldGrass: '#3f5a45',
  fieldGrassAlt: '#38513e',
  dirt: '#6d5438',
  dirtLine: '#e8dcc0',
  bleacher: '#4a5468',
  bleacherDark: '#3a4152',
  floodlight: '#e8dcc0',
  // The Green — a formal lawn rather than a playing field, so a softer,
  // lighter two-tone than the ballpark's own checker.
  // Muted well below a daylight green: Liberty Park is the centre cell of
  // the map and the biggest single colour field on it, so at the old
  // saturation it was the brightest thing in a town whose whole palette is
  // "suburban dusk" and it fought every district around it. Still clearly
  // grass, still clearly the one soft surface in Bellhaven, just lit by
  // the same sky as everything else.
  lawnBase: '#46705c',
  lawnAlt: '#40684f',
  pathFill: '#c9b98a',
  // The Green's own community garden bed — turned soil and a brighter,
  // tended green, distinct from the lawn's own two flat tones so a patch
  // somebody is actively growing something in doesn't read as more grass.
  gardenSoil: '#4a3a2c',
  gardenSoilDark: '#382c20',
  gardenLeaf: '#5a9a54',
  pondWater: '#4fb5a8',
  // The treehouse — reuses the tree palette above for trunk/canopy, adds
  // its own plank platform, rope and ladder.
  plank: '#6d5030',
  plankDark: '#4a3620',
  rope: '#a89468',
  // Ambient life — a small, cheap palette so the town doesn't look empty
  // between the player and the vans.
  dogBody: '#8a6a4a',
  birdBody: '#2a2f3a',
  catEye: '#e8dcc0',
  junctionBody: '#3a3a2a',
  junctionDark: '#1e1e14',
  junctionStripe: '#e0c020',
  // FLACK Phase Two — a colder, higher hue than the ground patrol's red so
  // the two threats never read as the same thing from a glance.
  droneBody: '#4a4f5c',
  droneRotor: '#9aa4b4',
  droneLight: '#e84ac9',
  droneRing: 'rgba(232, 74, 201, 0.18)',
  droneShadow: 'rgba(0, 0, 0, 0.22)',
  // The player's own drone, mid-flight — a cooler body and a cyan light
  // instead of a FLACK unit's warning pink, so the one drone actually under
  // the player's control never reads as one more thing hunting them.
  playerDroneBody: '#2f5d6b',
  playerDroneLight: '#7dd3ff',
  // The surveillance hardware the 3x3 redesign adds beside the cameras: a
  // plate scanner's grey mast and its red read-light, and a security
  // gate's yellow-and-black arm. Both deliberately share the camera's own
  // cold blue for their lens/sensor face, so a player reads the whole
  // network as one system wearing three different bodies.
  scannerMast: '#4a5260',
  scannerHead: '#2a3140',
  scannerLens: '#3f7fe0',
  scannerLight: '#e6402a',
  // A working vehicle's paint, dusk-muted: a dirty off-white box body and
  // a drab municipal green-grey, with a near-black cab under both.
  truckPale: '#b9b3a2',
  truckDrab: '#5d6a63',
  truckCab: '#242a33',
  gateArm: '#c9b23c',
  gateArmDark: '#2a2620',
  gatePost: '#3a4048',
  // A camera's coverage wedge — how far and which way it actually looks,
  // painted on the ground rather than left as a number in a coverage bar.
  cameraCone: 'rgba(63, 127, 224, 0.10)',
  cameraConeEdge: 'rgba(63, 127, 224, 0.20)',
  cameraLive: '#e6402a',
  // A camera somebody else already took down — dead housing, cable
  // hanging, a sticker over the lens.
  // The lens well, near-black so the red inside it is the brightest thing
  // on a 16px housing — the same relationship the title camera's own lens
  // has to its shell.
  cameraLens: '#0d1118',
  cameraDead: '#39404c',
  cameraDeadCable: '#1d222b',
  sticker: '#e8dcc0',
  stickerInk: '#e6402a',
  // City Hall, the Data Centre, MegaMart and the substation — the four
  // silhouettes the nine-district map needed that nothing already here
  // could stand in for.
  civicStone: '#c2bda6',
  civicStoneShade: '#9d9885',
  civicRoof: '#5a5a4c',
  civicDome: '#7d8a6e',
  dataWall: '#4d5765',
  dataWallDark: '#39414d',
  dataVent: '#2a3038',
  dataLight: '#5b96ff',
  dataDish: '#b6c0cc',
  bigBoxWall: '#c8c2b4',
  bigBoxRoof: '#4a5057',
  bigBoxSign: '#d4453a',
  bigBoxSignText: '#f4ede0',
  substationFrame: '#5b6470',
  substationCoil: '#8d97a4',
  substationHazard: '#e0c020',
  substationYard: '#4e5361',
  substationGravel: 'rgba(180, 186, 198, 0.14)',
  // The Gen A mark, sprayed and stuck: the same red the resistance tags
  // already use, plus the pale paper of a photocopied sticker.
  genA: '#e6402a',
  genAFade: 'rgba(230, 64, 42, 0.55)',
} as const;

const px = Math.round;

/** Deterministic per-location noise, so a window doesn't flicker every frame. */
function noise(seed: string): () => number {
  return mulberry32(seedFrom(seed));
}

export function drawTown(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  player: { x: number; y: number },
  facing: { x: number; y: number },
  here: OverworldLocation | null,
  flags: Record<string, unknown>,
  tier: ThresholdTier,
  scale: number,
  playerSize: { w: number; h: number },
  obstacles: Obstacle[],
  sparklingObstacleIds: Set<string>,
  npcs: { x: number; y: number; kind: NpcKind; facing: 1 | -1; id: string }[],
  patrols: { x: number; y: number; radius: number }[],
  cameraNodes: { x: number; y: number; facing: number; dismantlable: boolean; damaged: boolean }[],
  hackNodes: { x: number; y: number; kind: 'atm' | 'phone' | 'building'; hackable: boolean; damaged: boolean }[],
  junctionBoxNodes: { x: number; y: number; tier: 1 | 2 | 3 | 4 | 5; crackable: boolean; damaged: boolean }[],
  drones: { x: number; y: number; radius: number; takeable: boolean }[],
  cops: { x: number; y: number; radius: number }[],
  /** Poles the player has taken apart at least once — see
   * `drawSabotageScar`. Authored positions, not live ones. */
  scars: { x: number; y: number; tagged: boolean }[],
  /** The Gen A marks standing today. Filtered by the caller against the
   * rollout clock, the same way `obstacles` already is — see
   * `world/marks.ts` for why they arrive over the course of the game
   * rather than all at once. */
  marks: WallMark[],
  moving: boolean,
  now: number,
  boardTier: number,
  confinedToHome: boolean,
  /**
   * ADDED for the real-flight drone recon/kamikaze redesign. When true,
   * `player` is the drone's own live position (`Overworld.tsx` redirects
   * movement input there instead of the walker's for the duration of a
   * flight) and the sprite drawn at it is the drone, not the kid — the
   * camera-follow math above this comment reads `player` either way, which
   * is the one line of code that actually makes "the same view, just
   * flying" true.
   */
  renderAsDrone = false,
) {
  ensureSpriteSheetLoading();

  const vw = canvas.clientWidth;
  const vh = canvas.clientHeight;

  ctx.imageSmoothingEnabled = false;

  drawSky(ctx, vw, vh);

  const camX = clamp(player.x - vw / (2 * scale), 0, Math.max(0, MAP_WIDTH - vw / scale));
  const camY = clamp(player.y - vh / (2 * scale), 0, Math.max(0, MAP_HEIGHT - vh / scale));

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(px(-camX), px(-camY));

  drawGround(ctx, camX, camY, vw, vh, scale);
  drawRoads(ctx);
  drawEdgeGeography(ctx);

  const locations = visibleLocations(flags);

  // Warm pockets first, under everything, so the light sits on the street.
  // A camera doesn't get one — it isn't a place the crew built, it's the
  // thing they're building around.
  for (const loc of locations) if (loc.language === 'B' && loc.render !== 'camera') drawGlow(ctx, loc);

  // A handful of lit islands on an otherwise empty street — before the
  // obstacles/buildings so a building in front of one just occludes it.
  for (const p of STREETLIGHT_POINTS) drawStreetlight(ctx, p);

  for (const obstacle of obstacles) {
    drawObstacle(ctx, obstacle, tier, now);
    if (sparklingObstacleIds.has(obstacle.id)) drawSparkle(ctx, obstacle, now);
  }
  for (const loc of locations) drawLocation(ctx, loc, here?.id === loc.id, tier, now);

  // Ambient people and animals — decorative only, drawn after locations so
  // a building still occludes them, and well before the player so nothing
  // ambient can ever render on top of the one figure that matters.
  for (const n of npcs) drawNpc(ctx, n.x, n.y, n.kind, n.facing, n.id, now);

  // The player's own marks first, under everything: a scar is paint on a
  // post, so a camera standing at the same spot has to occlude it.
  for (const scar of scars) drawSabotageScar(ctx, scar);

  // Cameras somebody else already took down, and the mark they left on
  // the way past. Both are paint rather than mechanics — see their own
  // tables above for why neither is a `CameraNode` or an `Obstacle`.
  for (const c of DEAD_CAMERAS) drawDeadCamera(ctx, c);
  for (const m of marks) drawGenAMark(ctx, m);

  // Ordinary cameras, worth taking apart — the same small box the story pole
  // renders as, so it reads as the same kind of object. `dismantlable` is
  // just whether the player is close enough to act on it right now; a camera
  // on cooldown after a dismantle isn't in this list at all.
  for (const c of cameraNodes) drawSabotageCamera(ctx, c, c.dismantlable, c.damaged, now);

  // ATMs and phone lines — a street hack is visible whether or not the
  // player owns the rig to actually crack it, same as a locked door is
  // still a door; the prompt itself is what says no.
  for (const h of hackNodes) drawStreetHack(ctx, h, now);

  // Junction boxes — always visible, on cooldown or not, same "locked door
  // is still a door" rule everything else on this list follows.
  for (const j of junctionBoxNodes) drawJunctionBox(ctx, j, now);

  // Detection rings under the vans, so a van sitting still doesn't visually
  // "arrive" on top of its own danger zone.
  for (const patrol of patrols) drawPatrolRing(ctx, patrol);
  for (const patrol of patrols) drawPatrol(ctx, patrol);

  // Officers on foot — same ring-first ground-level treatment as the vans.
  for (const cop of cops) drawCopRing(ctx, cop);
  for (const cop of cops) drawCop(ctx, cop.x, cop.y);

  // Drone shadows and rings at street level — the same "ring first so the
  // danger zone doesn't visually arrive with the object" rule the vans get.
  for (const drone of drones) drawDroneShadow(ctx, drone.x, drone.y);
  for (const drone of drones) drawDroneRing(ctx, drone);

  if (renderAsDrone) {
    drawDroneShadow(ctx, player.x, player.y);
    drawDrone(ctx, player, now, false, 'player');
  } else {
    drawPlayer(ctx, player, facing, playerSize, moving, now, boardTier);
  }

  // The drone bodies themselves render above the player, not under —
  // they're in the air, not on the street, and the one thing everything
  // else on this canvas keeps to ("player always on top") is about ground
  // traffic, not airspace.
  for (const drone of drones) drawDrone(ctx, drone, now, drone.takeable);

  // The opening's own beat: before the first prompt is ever tapped, the
  // player is inside the house, not standing on it — drawn over the
  // sprite rather than under it, so only whatever's lined up behind an
  // actual window shows through. See `drawHomeInteriorMask`.
  if (confinedToHome) {
    const home = locations.find((l) => l.id === HOME_LOCATION_ID);
    if (home) drawHomeInteriorMask(ctx, home);
  }

  ctx.restore();
}

/**
 * Maze filler: terrain, not architecture — no name, no lit windows, no "you
 * are here" outline, because it isn't a place, it's the town's edges. This
 * used to be drawn as a small unnamed building, which read as a mistake
 * (a house nobody lives in, never lit) rather than as scenery. `kind`
 * dispatches to one of four cheap, flat shapes, matching the sprite budget
 * everything else on this canvas keeps to.
 */
function drawObstacle(ctx: CanvasRenderingContext2D, obstacle: Obstacle, tier: ThresholdTier, now: number) {
  switch (obstacle.kind) {
    case 'tree':
      return drawTree(ctx, obstacle);
    case 'bush':
      return drawBush(ctx, obstacle);
    case 'rock':
      return drawRock(ctx, obstacle);
    case 'hedge':
      return drawHedge(ctx, obstacle);
    case 'fence':
      return drawFence(ctx, obstacle);
    case 'car':
      return drawParkedCar(ctx, obstacle);
    case 'bin':
      return drawBin(ctx, obstacle);
    case 'building':
      return drawDecorativeBuilding(ctx, obstacle);
    case 'crate':
      return drawCrate(ctx, obstacle);
    case 'barrel':
      return drawBarrel(ctx, obstacle);
    case 'tower':
      return drawSafeTraceTower(ctx, obstacle, tier, now);
    case 'billboard':
      return drawBillboard(ctx, obstacle);
    case 'scanner':
      return drawPlateScanner(ctx, obstacle, now);
    case 'gate':
      return drawSecurityGate(ctx, obstacle);
    case 'bench':
      return drawParkBench(ctx, obstacle);
    case 'playground':
      return drawPlayground(ctx, obstacle);
    case 'truck':
      return drawTruck(ctx, obstacle);
    case 'laundry':
      return drawWashingLine(ctx, obstacle);
  }
}

/**
 * A washing line: two posts, a slack line, and a few things pegged to it,
 * seen from above so the garments read as coloured slabs hanging off a
 * string rather than as clothing shapes.
 *
 * The cheapest sentence on this map. Nobody hangs their laundry out in a
 * place they are afraid of, so a street with a line across it is a street
 * that has not been frightened yet — which makes it the one prop that can
 * say what The Blocks is *for* without a word of text, and the one whose
 * absence would say something too.
 */
function drawWashingLine(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const rand = noise(`laundry:${o.id}`);
  const y = o.y + 3;

  ctx.fillStyle = PALETTE.porchPost;
  ctx.fillRect(px(o.x), px(o.y), 2, o.h);
  ctx.fillRect(px(o.x + o.w - 2), px(o.y), 2, o.h);

  // The line itself, sagging in the middle the way a loaded one does.
  ctx.strokeStyle = 'rgba(236, 226, 208, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px(o.x + 1), px(y));
  ctx.quadraticCurveTo(px(o.x + o.w / 2), px(y + 3), px(o.x + o.w - 1), px(y));
  ctx.stroke();

  // Four or five items, each its own faded colour and its own length —
  // a line of identical rectangles reads as bunting, not washing.
  const palette = [PALETTE.sticker, PALETTE.windowLit, PALETTE.lawnBase, PALETTE.parkedCarGlass, PALETTE.bench];
  const count = 4 + Math.floor(rand() * 2);
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const gx = o.x + 3 + t * (o.w - 6);
    // Follows the sag, so nothing floats off the line.
    const gy = y + Math.sin(t * Math.PI) * 3;
    const gw = 4 + Math.floor(rand() * 3);
    const gh = 5 + Math.floor(rand() * 5);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
    ctx.fillRect(px(gx - gw / 2), px(gy), gw, gh);
    ctx.globalAlpha = 1;
  }
}

/**
 * A bench, seen from above: a slatted seat, a back rail behind it, and two
 * legs' worth of shadow. Oriented off the obstacle's own proportions — wide
 * and flat faces the viewer (a bench along a path running left to right),
 * tall and narrow turns side-on — so one prop serves a park path, a bus
 * shelter and a plaza without a direction field to author.
 */
function drawParkBench(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const horizontal = o.w >= o.h;

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(px(o.x), px(o.y + o.h - 1), o.w, 2);

  ctx.fillStyle = PALETTE.bench;
  if (horizontal) {
    ctx.fillRect(px(o.x), px(o.y + o.h * 0.35), o.w, o.h * 0.55);
    ctx.fillStyle = PALETTE.plankDark;
    ctx.fillRect(px(o.x), px(o.y), o.w, o.h * 0.28);
    for (let x = o.x + 3; x < o.x + o.w - 2; x += 5) {
      ctx.fillRect(px(x), px(o.y + o.h * 0.35), 1, o.h * 0.55);
    }
  } else {
    ctx.fillRect(px(o.x + o.w * 0.35), px(o.y), o.w * 0.55, o.h);
    ctx.fillStyle = PALETTE.plankDark;
    ctx.fillRect(px(o.x), px(o.y), o.w * 0.28, o.h);
    for (let y = o.y + 3; y < o.y + o.h - 2; y += 5) {
      ctx.fillRect(px(o.x + o.w * 0.35), px(y), o.w * 0.55, 1);
    }
  }
}

/**
 * The playground: a swing frame, a slide and a roundabout, drawn to fill
 * whatever rect it's given. Liberty Park's own argument for existing —
 * "life, people, irregularity, community" is a design note until somebody
 * has actually built something here for children, and the contrast with
 * the Civic Zone's straight lines is the whole point of the district.
 *
 * Reuses `drawSwingSet`'s frame (Casey's own yard prop) rather than
 * drawing a second one: it is the same object, and a town where the swing
 * set in the park and the swing set behind the empty house are visibly the
 * same swing set is saying something the map can't say twice.
 */
function drawPlayground(ctx: CanvasRenderingContext2D, o: Obstacle) {
  // Wood-chip fall surface, so the equipment sits on a made ground rather
  // than on the street's own paving.
  ctx.fillStyle = PALETTE.plankDark;
  ctx.fillRect(px(o.x), px(o.y), o.w, o.h);
  const chip = noise(`playground:${o.id}`);
  ctx.fillStyle = 'rgba(168, 148, 104, 0.35)';
  for (let i = 0; i < Math.round((o.w * o.h) / 40); i++) {
    ctx.fillRect(px(o.x + 1 + chip() * (o.w - 3)), px(o.y + 1 + chip() * (o.h - 2)), 2, 1);
  }

  const groundY = o.y + o.h - 4;
  drawSwingSet(ctx, o.x + 4, groundY);

  // The slide: a ladder, a platform and a chute running down toward the
  // viewer, which is the one piece of playground equipment that reads
  // instantly from above.
  const slideX = o.x + o.w - 26;
  ctx.strokeStyle = PALETTE.swingFrame;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px(slideX + 16), px(groundY));
  ctx.lineTo(px(slideX + 16), px(groundY - 20));
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(px(slideX + 12), px(groundY - 4 - i * 5));
    ctx.lineTo(px(slideX + 20), px(groundY - 4 - i * 5));
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.swingSeat;
  ctx.fillRect(px(slideX + 10), px(groundY - 23), 12, 4);
  ctx.fillStyle = PALETTE.substationCoil;
  ctx.beginPath();
  ctx.moveTo(px(slideX + 4), px(groundY));
  ctx.lineTo(px(slideX + 10), px(groundY - 20));
  ctx.lineTo(px(slideX + 14), px(groundY - 20));
  ctx.lineTo(px(slideX + 9), px(groundY));
  ctx.closePath();
  ctx.fill();
}

/**
 * A box-body truck — the vehicle a district *works* with rather than
 * commutes in. Longer and taller than `drawParkedCar`'s sprite and drawn
 * procedurally rather than from the sheet, because neither pack has a
 * lorry in it and a scaled-up car reads as a scaled-up car. A cab, a
 * container body with a roof rib, and the shadow that sells the height.
 */
function drawTruck(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const vertical = o.h > o.w;
  const cab = vertical ? o.h * 0.28 : o.w * 0.28;

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(px(o.x - 1), px(o.y + o.h - 1), o.w + 2, 3);

  // Two body colours, both pulled well down into the dusk palette. The
  // first pass used the sticker's own near-white paper and the box read as
  // a blank billboard lying in the road — nothing else on this canvas is
  // that bright, and a parked lorry is the last thing that should be.
  const rand = noise(`truck:${o.id}`);
  const body = rand() > 0.5 ? PALETTE.truckPale : PALETTE.truckDrab;

  if (vertical) {
    ctx.fillStyle = body;
    ctx.fillRect(px(o.x), px(o.y + cab), o.w, o.h - cab);
    ctx.fillStyle = PALETTE.truckCab;
    ctx.fillRect(px(o.x), px(o.y), o.w, cab);
    ctx.fillStyle = PALETTE.parkedCarGlass;
    ctx.fillRect(px(o.x + 2), px(o.y + 2), o.w - 4, cab * 0.45);
    // Roof ribs, and the shadow line where the box meets the cab.
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(px(o.x), px(o.y + cab), o.w, 2);
    for (let y = o.y + cab + 6; y < o.y + o.h - 3; y += 6) ctx.fillRect(px(o.x + 1), px(y), o.w - 2, 1);
    // Wheels, just proud of the body on both flanks.
    ctx.fillStyle = PALETTE.boxcarWheel;
    for (const wy of [o.y + cab + 3, o.y + o.h - 9]) {
      ctx.fillRect(px(o.x - 1), px(wy), 2, 6);
      ctx.fillRect(px(o.x + o.w - 1), px(wy), 2, 6);
    }
  } else {
    ctx.fillStyle = body;
    ctx.fillRect(px(o.x + cab), px(o.y), o.w - cab, o.h);
    ctx.fillStyle = PALETTE.truckCab;
    ctx.fillRect(px(o.x), px(o.y), cab, o.h);
    ctx.fillStyle = PALETTE.parkedCarGlass;
    ctx.fillRect(px(o.x + 2), px(o.y + 2), cab * 0.45, o.h - 4);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(px(o.x + cab), px(o.y), 2, o.h);
    for (let x = o.x + cab + 6; x < o.x + o.w - 3; x += 6) ctx.fillRect(px(x), px(o.y + 1), 1, o.h - 2);
    ctx.fillStyle = PALETTE.boxcarWheel;
    for (const wx of [o.x + cab + 3, o.x + o.w - 9]) {
      ctx.fillRect(px(wx), px(o.y - 1), 6, 2);
      ctx.fillRect(px(wx), px(o.y + o.h - 1), 6, 2);
    }
  }

  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  ctx.strokeRect(px(o.x) - 0.5, px(o.y) - 0.5, o.w + 1, o.h + 1);
}

/**
 * An automatic number-plate scanner: a mast on a small base with a sensor
 * head canted out over the carriageway and a red read-light that blinks on
 * its own slow cycle. Distinct from a camera on purpose — a camera watches
 * a *place* and can be taken apart for parts; a scanner watches a *road*
 * and is scenery, because there is nothing in one a kid with a screwdriver
 * wants. What it is for is the point: the town knows which cars went where,
 * and the player has no move against that except to not be in a car.
 *
 * Drawn from the obstacle's own rect (narrow and tall) rather than a fixed
 * size, so the handful placed on wider verges read as bigger installations.
 */
function drawPlateScanner(ctx: CanvasRenderingContext2D, o: Obstacle, now: number) {
  const cx = o.x + o.w / 2;
  const baseY = o.y + o.h;
  const headW = Math.max(8, o.w + 4);
  const headH = 6;

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(px(cx - o.w / 2 - 1), px(baseY - 1), o.w + 2, 2);

  ctx.fillStyle = PALETTE.scannerMast;
  ctx.fillRect(px(cx - 1.5), px(o.y + headH), 3, o.h - headH);

  ctx.fillStyle = PALETTE.scannerHead;
  ctx.fillRect(px(cx - headW / 2), px(o.y), headW, headH);
  ctx.fillStyle = PALETTE.scannerLens;
  ctx.fillRect(px(cx - headW / 2 + 1), px(o.y + 2), headW - 2, 2);

  // The read-light: a slow, unhurried blink, offset per-obstacle so a
  // street of them doesn't pulse in lockstep. Not an alarm — this is the
  // light a machine shows when it is simply working.
  const phase = noise(`scanner:${o.id}`)() * 3000;
  const on = ((now + phase) % 2600) < 900;
  ctx.fillStyle = on ? PALETTE.scannerLight : PALETTE.gateArmDark;
  ctx.fillRect(px(cx + headW / 2 - 2), px(o.y + 1), 2, 2);
}

/**
 * A security gate — a striped barrier arm on a post, drawn down (which is
 * how every one of them on this map sits). Every gate here has a way past
 * it within a few metres, so this is never a wall: it is the thing that
 * makes the fence gap beside it worth noticing.
 */
function drawSecurityGate(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const armY = o.y + o.h / 2 - 2;

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(px(o.x), px(o.y + o.h - 1), o.w, 2);

  ctx.fillStyle = PALETTE.gatePost;
  ctx.fillRect(px(o.x), px(o.y), 5, o.h);
  ctx.fillRect(px(o.x + o.w - 4), px(o.y + o.h * 0.35), 4, o.h * 0.65);

  ctx.fillStyle = PALETTE.gateArm;
  ctx.fillRect(px(o.x + 4), px(armY), o.w - 6, 4);
  ctx.fillStyle = PALETTE.gateArmDark;
  for (let x = o.x + 7; x < o.x + o.w - 4; x += 10) {
    ctx.fillRect(px(x), px(armY), 5, 4);
  }
}

/**
 * A very slight glimmer over a bush that still has something in it — one
 * soft pixel that brightens and fades on a slow cycle, offset per-obstacle
 * (`noise`) so a whole hedge of them doesn't pulse in lockstep. Deliberately
 * subtle: it's a reason to look twice at a particular bush, not a marker
 * that announces it from across the street.
 */
function drawSparkle(ctx: CanvasRenderingContext2D, o: Obstacle, now: number) {
  const offset = noise(`sparkle:${o.id}`)() * 2000;
  const t = ((now + offset) % 2200) / 2200;
  const twinkle = Math.max(0, Math.sin(t * Math.PI * 2));
  if (twinkle < 0.05) return;
  ctx.globalAlpha = 0.15 + twinkle * 0.4;
  ctx.fillStyle = PALETTE.windowLit;
  ctx.fillRect(px(o.x + o.w * 0.5) - 1, px(o.y + o.h * 0.2) - 1, 2, 2);
  ctx.globalAlpha = 1;
}

/** A two-tile sprite stack (canopy over canopy+trunk) when the sheet's
 * loaded; the old two-disc procedural tree while it isn't. Palette (teal
 * vs. the pack's autumn orange) and height (tall vs. small) are both picked
 * once per obstacle id, purely for variety — a whole street of identical
 * trees reads as tiled wallpaper, a mix doesn't. */
function drawTree(ctx: CanvasRenderingContext2D, o: Obstacle) {
  if (spriteSheetReady()) {
    const cx = o.x + o.w / 2;
    const tall = noise(`tree-height:${o.id}`)() < 0.6;
    const teal = noise(`tree-palette:${o.id}`)() < 0.75;
    const set = tall ? (teal ? TREE_TALL_TEAL : TREE_TALL_ORANGE) : teal ? TREE_SMALL_TEAL : TREE_SMALL_ORANGE;
    const halfH = o.h / 2;
    drawSpriteTile(ctx, set.top, cx, o.y + halfH / 2, o.w, halfH);
    drawSpriteTile(ctx, set.base, cx, o.y + halfH + halfH / 2, o.w, halfH);
    return;
  }

  const cx = o.x + o.w / 2;
  const trunkW = Math.max(4, o.w * 0.14);
  const trunkH = o.h * 0.32;

  ctx.fillStyle = PALETTE.treeTrunk;
  ctx.fillRect(px(cx - trunkW / 2), px(o.y + o.h - trunkH), px(trunkW), px(trunkH));

  const r = o.w / 2;
  const cy = o.y + o.h - trunkH - r * 0.55;
  ctx.fillStyle = PALETTE.treeCanopyDark;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.treeCanopy;
  ctx.beginPath();
  ctx.arc(cx - r * 0.28, cy - r * 0.22, r * 0.68, 0, Math.PI * 2);
  ctx.fill();
}

/** A cluster of overlapping blobs, seeded per-obstacle so it doesn't
 * reshuffle every frame but still varies from one bush to the next. */
function drawBush(ctx: CanvasRenderingContext2D, o: Obstacle) {
  if (spriteSheetReady()) {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    const idx = noise(`bush-palette:${o.id}`)() < 0.7 ? BUSH_TEAL : BUSH_ORANGE;
    drawSpriteTile(ctx, idx, cx, cy, o.w, o.h);
    return;
  }

  const rand = noise(`bush:${o.id}`);
  ctx.fillStyle = PALETTE.bush;
  for (let i = 0; i < 5; i++) {
    const bx = o.x + o.w * (0.18 + 0.64 * rand());
    const by = o.y + o.h * (0.35 + 0.55 * rand());
    const r = Math.min(o.w, o.h) * (0.24 + 0.14 * rand());
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** An irregular polygon rather than a circle — a rock is the one shape here
 * that should not read as a soft blob. */
function drawRock(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const rand = noise(`rock:${o.id}`);
  const cx = o.x + o.w / 2;
  const cy = o.y + o.h * 0.62;
  const spikes = 7;

  ctx.fillStyle = PALETTE.rockDark;
  ctx.beginPath();
  for (let i = 0; i < spikes; i++) {
    const angle = (i / spikes) * Math.PI * 2;
    const r = (Math.min(o.w, o.h) / 2) * (0.7 + 0.3 * rand());
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r * 0.7;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = PALETTE.rockLight;
  ctx.beginPath();
  ctx.arc(cx - o.w * 0.16, cy - o.h * 0.18, Math.min(o.w, o.h) * 0.16, 0, Math.PI * 2);
  ctx.fill();
}

/** A trimmed, flat-topped row — the one obstacle shape that's deliberately
 * architectural in silhouette (a straight edge), since a hedge is planted in
 * a line on purpose. */
function drawHedge(ctx: CanvasRenderingContext2D, o: Obstacle) {
  ctx.fillStyle = PALETTE.hedgeDark;
  ctx.fillRect(o.x, o.y, o.w, o.h);
  ctx.fillStyle = PALETTE.hedge;
  ctx.fillRect(o.x, o.y, o.w, px(o.h * 0.4));

  const rand = noise(`hedge:${o.id}`);
  ctx.fillStyle = PALETTE.hedgeDark;
  for (let i = 0; i < Math.floor(o.w / 12); i++) {
    const dx = o.x + rand() * o.w;
    const dy = o.y + o.h * 0.5 + rand() * o.h * 0.4;
    ctx.fillRect(px(dx), px(dy), 2, 2);
  }
}

/**
 * A background building — the fill-out pass's whole point: an empty block
 * reads as a gap in the town, and a building in it (even a mute one) reads
 * as more town. Deliberately duller and flatter than `drawBuilding`: no
 * colour band, no "you are here" outline, windows a third as bright — a
 * background layer that never competes with an actual, interactive
 * location for the eye. `noise` keyed on the obstacle's own id, same as
 * every other obstacle, so it doesn't reshuffle every frame.
 *
 * Only a dozen of these exist, but a street with two or three in view used
 * to render them as the exact same box — same tint, same flat roofline —
 * which is the literal wallpaper the map redesign brief calls out: filler
 * that reads as "buildings placed on a grid" rather than a town. Wall tone
 * and roof shape now come off the same per-id `rand()` the windows already
 * used, so neighbours on the same street stop matching. The palette stays
 * inside `bgWall`'s own desaturated dusk range on purpose — these still
 * have to lose to an actual location's own detail, not compete with it.
 *
 * The seed folds in `o.w`/`o.h`, not just `o.id`: three of these sit in a
 * row in The Blocks with near-identical ids (`blocks_terrace_s1`..`s3`),
 * and an id-only seed rolled the same palette entry for all three often
 * enough to put the wallpaper right back — id-only hashes of near-identical
 * strings land in the same slice of a small palette more often than chance
 * alone suggests. Every real instance already has a different width or
 * height, so folding both in for free is what actually decorrelates
 * neighbours instead of just widening the palette and hoping.
 */
/**
 * A corrugated storage shed — the same wall/roof fallback tones
 * `drawWarehouse` uses, so this reads as kin to The Works' real warehouses
 * rather than another house. A roll-up door band stands in for a doorway
 * (there isn't one — this is still background, no name, no prompt) and a
 * roof vent breaks up the roofline. Reserved for Southside's own two
 * "stores building" fillers — see the call site's own comment.
 */
function drawDepotShed(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const roofH = 8;
  ctx.fillStyle = PALETTE.wallB;
  ctx.fillRect(o.x, o.y + roofH, o.w, o.h - roofH);
  ctx.fillStyle = PALETTE.corrugated;
  ctx.fillRect(o.x, o.y, o.w, roofH);
  ctx.strokeStyle = PALETTE.corrugatedLine;
  ctx.lineWidth = 1;
  for (let x = o.x + 3; x < o.x + o.w; x += 5) {
    ctx.beginPath();
    ctx.moveTo(px(x), o.y);
    ctx.lineTo(px(x), o.y + roofH);
    ctx.stroke();
  }

  const doorW = o.w * 0.6;
  const doorX = o.x + (o.w - doorW) / 2;
  const doorY = o.y + roofH + 4;
  const doorH = o.h - roofH - 8;
  ctx.fillStyle = PALETTE.rollDoor;
  ctx.fillRect(px(doorX), px(doorY), doorW, doorH);
  ctx.strokeStyle = PALETTE.rollDoorLine;
  ctx.lineWidth = 1;
  for (let y = doorY + 4; y < doorY + doorH; y += 4) {
    ctx.beginPath();
    ctx.moveTo(px(doorX), px(y));
    ctx.lineTo(px(doorX + doorW), px(y));
    ctx.stroke();
  }

  ctx.fillStyle = PALETTE.vent;
  ctx.fillRect(px(o.x + o.w * 0.75), o.y - 3, 5, 4);
}
function drawDecorativeBuilding(ctx: CanvasRenderingContext2D, o: Obstacle) {
  // Southside's own two: "the stores building" the district's doc comment
  // describes, not another anonymous house — the maintenance compound's
  // whole point is that it could plausibly run the surveillance rollout's
  // physical side, and a building that reads as a house undercuts that on
  // sight before a player reads a word of it.
  if (o.id === 'filler_100' || o.id === 'southside_unit_a') return drawDepotShed(ctx, o);

  const rand = noise(`deco:${o.id}:${o.w}:${o.h}`);

  const palette = [
    { wall: PALETTE.bgWall, roof: PALETTE.bgRoof },
    { wall: '#413a48', roof: '#302a37' }, // violet-grey
    { wall: '#3f4538', roof: '#2e3329' }, // olive-grey
    { wall: '#463b34', roof: '#332a25' }, // warm brown-grey
    { wall: '#39424a', roof: '#293138' }, // slate-grey
    { wall: '#40382e', roof: '#2e2820' }, // dark ochre
  ];
  const { wall, roof } = palette[Math.floor(rand() * palette.length)];
  // A pitched roof for anything tall enough to carry one, so the skyline
  // isn't every flat inset roofline in a row — gated on height rather than
  // rolled independently, since a gable on a 34px-tall unit has no wall
  // left under it.
  const gabled = o.h >= 50 && rand() < 0.5;
  const roofH = gabled ? Math.min(16, Math.round(o.h * 0.22)) : 12;

  ctx.fillStyle = wall;
  ctx.fillRect(o.x, o.y + roofH, o.w, o.h - roofH);
  ctx.fillStyle = roof;
  if (gabled) {
    ctx.beginPath();
    ctx.moveTo(o.x, o.y + roofH);
    ctx.lineTo(o.x + o.w / 2, o.y);
    ctx.lineTo(o.x + o.w, o.y + roofH);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(o.x + 3, o.y, o.w - 6, roofH);
  }

  const w = 7;
  const h = 9;
  const gap = 9;
  const top = o.y + roofH + 6;
  const cols = Math.max(1, Math.floor((o.w - gap) / (w + gap)));
  const rows = Math.max(1, Math.floor((o.h - roofH - 14) / (h + gap)));
  const startX = o.x + px((o.w - (cols * (w + gap) - gap)) / 2);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = rand() < 0.22 ? PALETTE.bgWindow : PALETTE.bgWindowDark;
      ctx.fillRect(startX + c * (w + gap), top + r * (h + gap), w, h);
    }
  }
}

/**
 * Downtown's own landmark, and the physical shape of the thing the story
 * keeps naming without ever showing (`content/feed.ts`'s "Groundbreaking
 * held for SafeTrace Regional Data Center", the "SafeTrace Civic Safety"
 * account `content/heist.ts` drains in Act 3). A singular, hand-placed
 * obstacle rather than a location — this is scenery to get your bearings
 * by, not a doorway, so it never competes with an actual interactive
 * building for a tap.
 *
 * Every other building in town is warm, low, and hand-built out of the
 * dusk palette; this is the one silhouette that's cold, tall, and clean —
 * "the closer to the surveillance centre, the more sterile and controlled"
 * per the map redesign brief, made literal in one object rather than a
 * gradient. Heat-reactive on purpose: the belt screen partway up reads calm
 * blue at `clear`/`watched` and switches to an alert red — pulsing at
 * `hunted` — the same tier the HUD's own Heat chip already escalates on, so
 * a player who never looks at the number can still look up and know.
 */
function drawSafeTraceTower(ctx: CanvasRenderingContext2D, o: Obstacle, tier: ThresholdTier, now: number) {
  const baseH = o.h * 0.58;
  const towerW = o.w * 0.62;
  const towerX = o.x + (o.w - towerW) / 2;
  const towerH = o.h - baseH;

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(o.x - 3, o.y + o.h - 2, o.w + 6, 4);

  // The base block — full footprint, the setback the tower proper rises out of.
  ctx.fillStyle = PALETTE.towerPanelDark;
  ctx.fillRect(o.x, o.y + towerH, o.w, baseH);
  ctx.fillStyle = PALETTE.towerPanelShadow;
  ctx.fillRect(o.x, o.y + towerH, o.w * 0.14, baseH); // one shaded edge, so the block reads as a volume, not a flat card

  // The tower proper.
  ctx.fillStyle = PALETTE.towerPanel;
  ctx.fillRect(towerX, o.y, towerW, towerH);
  ctx.fillStyle = PALETTE.towerPanelDark;
  ctx.fillRect(towerX, o.y, towerW * 0.18, towerH);

  // Panel seams — a grid of thin vertical lines, the one texture that says
  // "curtain wall" rather than "flat-filled rectangle" at this scale.
  ctx.strokeStyle = PALETTE.towerPanelShadow;
  ctx.lineWidth = 1;
  for (let x = towerX + 8; x < towerX + towerW; x += 8) {
    ctx.beginPath();
    ctx.moveTo(px(x), o.y + 2);
    ctx.lineTo(px(x), o.y + towerH - 2);
    ctx.stroke();
  }

  // The belt screen — the one Heat-reactive surface on the whole map.
  const alert = tier === 'flagged' || tier === 'hunted';
  const screenY = o.y + towerH * 0.42;
  const screenH = Math.max(4, towerH * 0.08);
  const pulse = tier === 'hunted' ? 0.55 + 0.45 * Math.sin(now / 260) : 1;
  ctx.fillStyle = alert ? PALETTE.towerScreenAlert : PALETTE.towerScreenCalm;
  ctx.globalAlpha = alert ? 0.55 + 0.35 * pulse : 0.5;
  ctx.fillRect(towerX + 2, screenY, towerW - 4, screenH);
  ctx.globalAlpha = 1;

  // The mast and its beacon — the silhouette detail that reads from across
  // the map, long before the panels or the screen resolve at all. Taller
  // than the panels alone would justify on purpose: this is the map's one
  // unmistakable landmark, and a beacon a player can find from the far
  // side of Bellhaven is worth more than a mast proportioned "correctly"
  // to the roofline under it.
  const mastX = towerX + towerW / 2;
  const mastTopY = o.y - 38;
  ctx.strokeStyle = PALETTE.towerMast;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px(mastX), o.y + 4);
  ctx.lineTo(px(mastX), mastTopY);
  ctx.stroke();
  const beaconOn = Math.sin(now / 700) > -0.2;
  if (beaconOn) {
    ctx.fillStyle = PALETTE.towerBeacon;
    ctx.beginPath();
    ctx.arc(px(mastX), mastTopY, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // A small camera cluster flanking the upper tower — SafeTrace watching
  // its own building, which is funnier the longer you look at it.
  for (const side of [-1, 1]) {
    const cx = mastX + side * (towerW / 2 - 4);
    const cy = o.y + towerH * 0.16;
    ctx.fillStyle = PALETTE.cameraDark;
    ctx.beginPath();
    ctx.arc(px(cx), cy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.camera;
    ctx.beginPath();
    ctx.arc(px(cx), cy, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * The Plaza's own landmark — a billboard on stilts, deliberately
 * the loudest single object in town (map redesign brief: "3-4 dominant
 * visual anchors... the district should feel intentionally overwhelming").
 * The joke is the point, and it's the brief's own worked example: a
 * pristine ad with a tiny hand-written correction underneath, discovered
 * rather than announced — there's no dialogue anywhere that explains it.
 */
function drawBillboard(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const faceH = o.h * 0.68;
  const legY = o.y + faceH;
  const legH = o.h - faceH;

  ctx.strokeStyle = PALETTE.billboardFrame;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px(o.x + o.w * 0.18), legY);
  ctx.lineTo(px(o.x + o.w * 0.18), legY + legH);
  ctx.moveTo(px(o.x + o.w * 0.82), legY);
  ctx.lineTo(px(o.x + o.w * 0.82), legY + legH);
  ctx.stroke();

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(o.x + o.w * 0.14, o.y - 2, o.w * 0.72, faceH + 4);
  ctx.fillStyle = PALETTE.billboardFrame;
  ctx.fillRect(o.x, o.y - 4, o.w, 5);
  ctx.fillStyle = PALETTE.billboardFace;
  ctx.fillRect(o.x + 3, o.y + 1, o.w - 6, faceH - 5);

  // The ad itself — a bold accent band standing in for the "ridiculous
  // promotional material" the brief asks for, not literal ad copy at a
  // scale nobody could read anyway.
  ctx.fillStyle = PALETTE.billboardAccent;
  ctx.fillRect(o.x + 8, o.y + 6, o.w - 16, faceH * 0.32);
  ctx.fillStyle = PALETTE.towerScreenCalm;
  ctx.fillRect(o.x + 8, o.y + faceH * 0.5, o.w * 0.4, faceH * 0.18);
  ctx.fillStyle = PALETTE.billboardFrame;
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(o.x + o.w * 0.55, o.y + faceH * 0.5 + i * 5, o.w * 0.32, 2);
  }
  ctx.globalAlpha = 1;

  // The correction — a crooked, hand-written strip low on the face, in the
  // resistance's own red rather than the ad's own palette, so it reads as
  // graffiti on the sign rather than part of the sign.
  const rand = noise(`billboard:${o.id}`);
  ctx.strokeStyle = PALETTE.billboardCorrection;
  ctx.lineWidth = 1.5;
  ctx.save();
  ctx.translate(px(o.x + o.w * 0.5), o.y + faceH * 0.86);
  ctx.rotate(-0.04);
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const sx = -o.w * 0.32 + i * (o.w * 0.24) + rand() * 4;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx + o.w * 0.14, 0);
  }
  ctx.stroke();
  ctx.restore();
}

/** Chain-link, the one obstacle that reads as industrial rather than grown —
 * posts at each end and a diamond lattice between, standing in for the
 * fencing Act 1's Annex Fence ambient text already talks about. The one
 * texture on this canvas that isn't organic on purpose: the Annex is the
 * district that got fenced. */
function drawFence(ctx: CanvasRenderingContext2D, o: Obstacle) {
  if (spriteSheetReady()) {
    drawWallBand(ctx, FENCE_CHAINLINK, o.x, o.y, o.w, o.h);
    return;
  }

  ctx.strokeStyle = PALETTE.chainPost;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px(o.x + 2), px(o.y));
  ctx.lineTo(px(o.x + 2), px(o.y + o.h));
  ctx.moveTo(px(o.x + o.w - 2), px(o.y));
  ctx.lineTo(px(o.x + o.w - 2), px(o.y + o.h));
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.rect(o.x, o.y, o.w, o.h);
  ctx.clip();
  ctx.strokeStyle = PALETTE.chainLink;
  ctx.lineWidth = 1;
  const mesh = 8;
  const diag = o.w + o.h;
  ctx.beginPath();
  for (let d = -o.h; d <= diag; d += mesh) {
    ctx.moveTo(px(o.x + d), px(o.y));
    ctx.lineTo(px(o.x + d + o.h), px(o.y + o.h));
  }
  for (let d = -o.h; d <= diag; d += mesh) {
    ctx.moveTo(px(o.x + d), px(o.y + o.h));
    ctx.lineTo(px(o.x + d + o.h), px(o.y));
  }
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = PALETTE.chainPost;
  ctx.fillRect(px(o.x), px(o.y + o.h - 3), o.w, 3);
}

/** A parked car, kerbside — a flat body and a glass strip, no wheel nubs and
 * no windshield stroke the way `drawBeater` gets: this one isn't going
 * anywhere, and the plainer shape is the tell that it's furniture, not a
 * vehicle either the player or a patrol will ever occupy. */
function drawParkedCar(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const x = px(o.x);
  const y = px(o.y);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x - 1, y + o.h - 1, o.w + 2, 2);

  if (spriteSheetReady()) {
    const idx = CAR_TILES[Math.floor(noise(`car:${o.id}`)() * CAR_TILES.length)];
    drawSpriteTile(ctx, idx, x + o.w / 2, y + o.h / 2, o.w, o.h);
    return;
  }

  ctx.fillStyle = PALETTE.parkedCarBody;
  ctx.fillRect(x, y, o.w, o.h);
  ctx.fillStyle = PALETTE.parkedCarGlass;
  ctx.fillRect(x + o.w * 0.2, y + 2, o.w * 0.6, o.h - 4);

  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, o.w + 1, o.h + 1);
}

/** A dumpster/bin: a dark box, a lid line, and a rust smear — the one piece
 * of furniture that leans into the Annex's own grit rather than every
 * district's, though nothing stops it turning up elsewhere. */
function drawBin(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const x = px(o.x);
  const y = px(o.y);

  if (spriteSheetReady()) {
    drawSpriteTile(ctx, BIN_DUMPSTER, x + o.w / 2, y + o.h / 2, o.w, o.h);
    return;
  }

  ctx.fillStyle = PALETTE.binBody;
  ctx.fillRect(x, y, o.w, o.h);
  ctx.fillStyle = PALETTE.binLid;
  ctx.fillRect(x, y, o.w, px(o.h * 0.3));
  ctx.fillStyle = PALETTE.binRust;
  ctx.fillRect(x + 1, y + o.h - 5, o.w - 2, 4);

  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, o.w + 1, o.h + 1);
}

/** Loose cargo for The Works' own yards — the city pack's
 * industrial debris, picked per-obstacle by id hash the same way
 * `drawParkedCar` varies `CAR_TILES`. Falls back to a plain crate box, since
 * the procedural shape only ever needs to read as "a box", not carry the
 * sprite's own variety. */
function drawCrate(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const x = px(o.x);
  const y = px(o.y);

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x, y + o.h - 2, o.w, 2);

  if (citySheetReady()) {
    const idx = CRATE_TILES[Math.floor(noise(`crate:${o.id}`)() * CRATE_TILES.length)];
    drawCityTileAt(ctx, idx, x, y, o.w);
    return;
  }

  ctx.fillStyle = PALETTE.crateBody;
  ctx.fillRect(x, y, o.w, o.h);
  ctx.strokeStyle = PALETTE.crateEdge;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1.5, y + 1.5, o.w - 3, o.h - 3);

  ctx.strokeStyle = PALETTE.outline;
  ctx.strokeRect(x - 0.5, y - 0.5, o.w + 1, o.h + 1);
}

/** A single rusty barrel — same shape as `drawCrate`, one fixed tile since
 * there's only the one colourway in the sheet. */
function drawBarrel(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const x = px(o.x);
  const y = px(o.y);

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x + o.w / 2, y + o.h - 1, o.w / 2, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  if (citySheetReady()) {
    drawCityTileAt(ctx, BARREL_TILE, x, y, o.w);
    return;
  }

  ctx.fillStyle = PALETTE.barrelBody;
  ctx.beginPath();
  ctx.ellipse(x + o.w / 2, y + o.h / 2, o.w / 2 - 1, o.h / 2 - 1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/**
 * The danger zone, shown rather than hidden — Heat System guardrail 2 says
 * nothing charges Heat without showing it first, and a patrol's radius is
 * exactly that kind of cost. A soft filled disc, not an outline, so it reads
 * as "ground you're visible from" rather than a targeting reticle.
 */
function drawPatrolRing(ctx: CanvasRenderingContext2D, patrol: { x: number; y: number; radius: number }) {
  ctx.fillStyle = PALETTE.patrolRing;
  ctx.beginPath();
  ctx.arc(patrol.x, patrol.y, patrol.radius, 0, Math.PI * 2);
  ctx.fill();
}

/** A SafeTrace van: a body, a darker cab end, two headlights. Small and flat,
 * matching the sprite budget everything else here keeps to. */
/** The SafeTrace van — a real sprite once the city sheet's loaded (a
 * front-facing utility truck, grey rather than any personal car's colour,
 * reading as institutional the same way the old flat `patrolBody` red
 * rectangle was trying to). The old procedural shape stays as the
 * loading-state fallback. */
function drawPatrol(ctx: CanvasRenderingContext2D, patrol: { x: number; y: number }) {
  if (citySheetReady()) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(px(patrol.x - 9), px(patrol.y + 11), 18, 3);
    drawTileBlock(ctx, PATROL_VAN_TILES, patrol.x, patrol.y, drawCityTileAt);
    return;
  }

  const w = 16, h = 10;
  const x = px(patrol.x - w / 2);
  const y = px(patrol.y - h / 2);

  ctx.fillStyle = PALETTE.patrolBody;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PALETTE.patrolCab;
  ctx.fillRect(x + w - 5, y, 5, h);
  ctx.fillStyle = PALETTE.patrolLight;
  ctx.fillRect(x, y + 1, 2, 2);
  ctx.fillRect(x, y + h - 3, 2, 2);

  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
}

function drawCopRing(ctx: CanvasRenderingContext2D, cop: { x: number; y: number; radius: number }) {
  ctx.fillStyle = PALETTE.copRing;
  ctx.beginPath();
  ctx.arc(cop.x, cop.y, cop.radius, 0, Math.PI * 2);
  ctx.fill();
}

/** An officer on foot — a pedestrian's own silhouette (`drawPedestrian`),
 * but in a fixed uniform colour rather than a randomised shirt, and with
 * a cap brim on top: the one detail that reads "official" at this scale
 * without needing a badge nobody could actually see. */
function drawCop(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const cx = px(x);
  const feetY = px(y);
  const bodyW = 7;
  const bodyH = 10;
  const headR = 2.5;

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(cx - 4, feetY, 8, 2);

  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(cx - bodyW / 2 - 1, feetY - bodyH - 1, bodyW + 2, bodyH + 2);
  ctx.fillStyle = PALETTE.copUniform;
  ctx.fillRect(cx - bodyW / 2, feetY - bodyH, bodyW, bodyH);

  ctx.fillStyle = PALETTE.spriteSkin;
  ctx.beginPath();
  ctx.arc(cx, feetY - bodyH - headR, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = PALETTE.copCap;
  ctx.fillRect(cx - headR - 1, feetY - bodyH - headR * 2 - 1, headR * 2 + 2, 2);
}

/** How far above its own ground shadow a drone hovers — just enough that
 * the shadow reads as cast light rather than as the drone's own outline. */
const DRONE_ALTITUDE = 9;

function drawDroneRing(ctx: CanvasRenderingContext2D, drone: { x: number; y: number; radius: number }) {
  ctx.fillStyle = PALETTE.droneRing;
  ctx.beginPath();
  ctx.arc(drone.x, drone.y, drone.radius, 0, Math.PI * 2);
  ctx.fill();
}

/** Cast on the ground, not under the body — the one thing that tells the
 * player it's actually airborne rather than a very square bird. */
function drawDroneShadow(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = PALETTE.droneShadow;
  ctx.beginPath();
  ctx.ellipse(px(x), px(y), 5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * A quadcopter: a small body, four rotor blurs (a soft circle rather than
 * spokes — at this size a spinning blade reads as a smear, not a shape),
 * and a status light that blinks whether or not the player is close enough
 * to act on it. `takeable` adds the same soft-glow "you can act on this"
 * treatment every other point object on the map gets once it's in reach.
 *
 * `variant` swaps the body/light colour only — a FLACK interceptor
 * (`'safetrace'`, the default) and the player's own airframe mid-flight
 * (`'player'`) are the same silhouette, since they're the same kind of
 * object; the colour is the only thing that has to say which one is
 * whose.
 */
function drawDrone(
  ctx: CanvasRenderingContext2D,
  drone: { x: number; y: number },
  now: number,
  takeable: boolean,
  variant: 'safetrace' | 'player' = 'safetrace',
) {
  const cx = px(drone.x);
  const cy = px(drone.y) - DRONE_ALTITUDE;
  const armR = 6;

  if (takeable) drawSoftGlow(ctx, cx, cy, armR + 1, 3, 3);

  ctx.fillStyle = PALETTE.droneRotor;
  for (const [dx, dy] of [
    [-armR, -armR],
    [armR, -armR],
    [-armR, armR],
    [armR, armR],
  ]) {
    ctx.beginPath();
    ctx.arc(cx + dx, cy + dy, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = PALETTE.droneRotor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - armR, cy - armR);
  ctx.lineTo(cx + armR, cy + armR);
  ctx.moveTo(cx + armR, cy - armR);
  ctx.lineTo(cx - armR, cy + armR);
  ctx.stroke();

  ctx.fillStyle = variant === 'player' ? PALETTE.playerDroneBody : PALETTE.droneBody;
  ctx.fillRect(cx - 4, cy - 3, 8, 6);
  ctx.strokeStyle = PALETTE.outline;
  ctx.strokeRect(cx - 4.5, cy - 3.5, 9, 7);

  // A blink, not a steady glow — same on/off read as a camera's own status
  // light elsewhere, so "watching" always looks like the same thing.
  if (Math.floor(now / 500) % 2 === 0) {
    ctx.fillStyle = variant === 'player' ? PALETTE.playerDroneLight : PALETTE.droneLight;
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
  }
}

/**
 * Big skies. A gradient, a low sun band that never quite sets, and nothing
 * else — no clouds, because a moving sky would pull the eye away from a screen
 * whose whole job is to be quiet.
 */
function drawSky(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, vh);
  sky.addColorStop(0, PALETTE.skyHigh);
  sky.addColorStop(0.5, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, vw, vh);

  // The last of the light, flat across the horizon. One band, no glow.
  ctx.fillStyle = PALETTE.sun;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, px(vh * 0.62), vw, 2);
  ctx.globalAlpha = 1;
}

/**
 * Ground, dithered in two tones on a fixed grid. A checker at this scale reads
 * as texture rather than as a pattern, and it is what stops a large flat area
 * looking like a missing asset.
 */
/**
 * Blend two hex colours (`#rrggbb`) by `t` (0 = all `a`, 1 = all `b`).
 * Ground tints below derive from each district's own accent colour instead
 * of a hand-picked hex pair per zone — eight districts would otherwise be
 * eight more PALETTE entries to keep in sync by hand every time the layout
 * changes, and this can't drift the way a parallel hand-authored list could.
 */
function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 0xff, ag = (pa >> 8) & 0xff, ab = pa & 0xff;
  const br = (pb >> 16) & 0xff, bg = (pb >> 8) & 0xff, bb = pb & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b2).toString(16).slice(1)}`;
}

/**
 * A whisper of each district's own accent colour worked into its ground —
 * `DISTRICTS` (world/locations.ts) carries the accent every legend/HUD
 * surface already uses; blending it faintly (12%/18%) into the default
 * ground/groundAlt pair is what makes a neighbourhood read as "its own
 * patch of pavement" without the map looking painted in blocks the way a
 * full-saturation fill would. Computed once at module load, not per frame.
 */
const DISTRICT_GROUND_TINTS = DISTRICTS.map((d) => ({
  ...d,
  base: mixHex(PALETTE.ground, d.color, 0.12),
  alt: mixHex(PALETTE.groundAlt, d.color, 0.18),
}));

/**
 * The ground/road tile grid — the first piece of the map that's a real
 * grid instead of floating-point rects with sprites patched onto them
 * after the fact. `GRID_TILE` matches the sheet's own 16px so cells line
 * up with the sprite pixels exactly; `surfaceGrid()` rasterizes the
 * *existing* `ROAD_SEGMENTS`/`DIAGONAL_ROADS` onto it once, lazily, on
 * first use rather than at module load (those are declared further down
 * this file — a function body can reference a later `const` freely since
 * nothing calls it until well after the whole module has finished
 * evaluating, but an eager top-level initializer here couldn't).
 * Locations, obstacles, and every route/coverage system downstream of
 * them are untouched — this only decides what the ground *looks like*.
 */
const GRID_TILE = TILE;
const GRID_COLS = Math.ceil(MAP_WIDTH / GRID_TILE);
const GRID_ROWS = Math.ceil(MAP_HEIGHT / GRID_TILE);

let surfaceGridCache: (RoadTier | null)[][] | null = null;

function surfaceGrid(): (RoadTier | null)[][] {
  if (surfaceGridCache) return surfaceGridCache;
  const grid: (RoadTier | null)[][] = Array.from({ length: GRID_ROWS }, () => new Array<RoadTier | null>(GRID_COLS).fill(null));

  for (const road of ROAD_SEGMENTS) {
    const c0 = Math.max(0, Math.floor(road.x / GRID_TILE));
    const c1 = Math.min(GRID_COLS - 1, Math.floor((road.x + road.w - 1) / GRID_TILE));
    const r0 = Math.max(0, Math.floor(road.y / GRID_TILE));
    const r1 = Math.min(GRID_ROWS - 1, Math.floor((road.y + road.h - 1) / GRID_TILE));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) grid[r][c] = road.tier;
    }
  }

  // The one rotated segment: an inverse-rotate point test per candidate
  // cell rather than teaching the grid about angles anywhere else.
  for (const { cx, cy, length, angleDeg } of DIAGONAL_ROADS) {
    const half = length / 2;
    const halfW = ROAD_WIDTH.local / 2;
    const rad = (-angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const reach = Math.ceil((half + halfW) / GRID_TILE) + 1;
    const cCenter = Math.floor(cx / GRID_TILE);
    const rCenter = Math.floor(cy / GRID_TILE);
    for (let r = Math.max(0, rCenter - reach); r <= Math.min(GRID_ROWS - 1, rCenter + reach); r++) {
      for (let c = Math.max(0, cCenter - reach); c <= Math.min(GRID_COLS - 1, cCenter + reach); c++) {
        const dx = c * GRID_TILE + GRID_TILE / 2 - cx;
        const dy = r * GRID_TILE + GRID_TILE / 2 - cy;
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        // Tagged 'secondary' — the tier `drawDiagonalRoad` already paints
        // this segment with (`PALETTE.roadSecondary`); there's no separate
        // tier field on a diagonal to read instead.
        if (Math.abs(lx) <= half && Math.abs(ly) <= halfW) grid[r][c] = 'secondary';
      }
    }
  }

  /*
   * A sidewalk apron around every real building's own lot — the ground-
   * plane half of the "the town lacks form" fix (the obstacle-placement
   * pass fixed what surrounds a building; this fixes what a building
   * actually sits on). Reuses the 'path' tier's own paver tile rather than
   * inventing a new one, since a lot apron and a pedestrian path are the
   * same idea — pavement a person, not a car, walks on. Only fills cells
   * that are still open ground (`grid[r][c] === null`): a road always wins
   * over an apron, so a building whose lot happens to touch a street edge
   * doesn't get its own road tile overwritten with a paver one.
   *
   * `render` values that already paint their own ground (`'green'`,
   * `'plaza'`, `'ballpark'`) or that aren't a walk-up building at all
   * (`'camera'`, `'treehouse'`, a platform with no ground-level footprint)
   * are excluded — an apron under a plaza's own paving or a camera post
   * would either be invisible or wrong. `requiresFlag` locations that
   * haven't unlocked yet are skipped too, so a sidewalk patch never shows
   * up in an empty field before the story's put a building there.
   */
  const LOT_APRON_RENDERS = new Set<OverworldLocation['render']>([
    undefined,
    'building',
    'house',
    'school',
    'library',
    'warehouse',
    'garage',
    'pizza',
    'arcade',
    'shop',
    'transit',
  ]);
  for (const loc of LOCATIONS) {
    if (loc.requiresFlag) continue;
    if (!LOT_APRON_RENDERS.has(loc.render)) continue;
    const c0 = Math.max(0, Math.floor((loc.x - GRID_TILE) / GRID_TILE));
    const c1 = Math.min(GRID_COLS - 1, Math.floor((loc.x + loc.w + GRID_TILE - 1) / GRID_TILE));
    const r0 = Math.max(0, Math.floor((loc.y - GRID_TILE) / GRID_TILE));
    const r1 = Math.min(GRID_ROWS - 1, Math.floor((loc.y + loc.h + GRID_TILE - 1) / GRID_TILE));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (grid[r][c] === null) grid[r][c] = 'path';
      }
    }
  }

  surfaceGridCache = grid;
  return grid;
}

/** Every road tier gets plain asphalt underneath — `drawRoads`' own
 * centreline/crack/pedestrian-dot overlays already carry the tier
 * distinction, tuned per tier; this only decides asphalt vs. paver vs.
 * bare ground. `path` gets the paver tile (pedestrian paths were always
 * "gravel, not asphalt" per the road hierarchy's own doc comment). */
function groundTileFor(tier: RoadTier | null): number {
  if (tier === 'path') return SIDEWALK_TILE;
  if (tier) return ASPHALT_TILE;
  return GROUND_TILE;
}

function drawGroundGrid(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number, scale: number) {
  const grid = surfaceGrid();
  const c0 = Math.max(0, Math.floor(camX / GRID_TILE));
  const c1 = Math.min(GRID_COLS - 1, Math.ceil((camX + vw / scale) / GRID_TILE));
  const r0 = Math.max(0, Math.floor(camY / GRID_TILE));
  const r1 = Math.min(GRID_ROWS - 1, Math.ceil((camY + vh / scale) / GRID_TILE));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      drawCityTileAt(ctx, groundTileFor(grid[r][c]), c * GRID_TILE, r * GRID_TILE);
    }
  }

  // Each district's own accent colour, as a wash over the real texture —
  // a radial gradient from the district's own centre rather than a flat
  // fill to its rect's hard edge. A flat-rect wash cuts off instantly at
  // the boundary line, which is exactly the "District A → wall → District B"
  // seam the map redesign brief calls out: architecture, signage and
  // lighting are all supposed to change gradually, and the ground tint —
  // the one ambient signal a walking player picks up constantly, everywhere
  // — was the one place still doing a hard cut. Strongest at the centre
  // (0.16, a touch more present than the old flat 0.12 now that it's not
  // uniform) and fully transparent by the district's own edge, so two
  // neighbouring washes blend into each other across the street between them
  // instead of both stopping dead at their shared line.
  for (const d of DISTRICTS) {
    const cx = d.x + d.w / 2;
    const cy = d.y + d.h / 2;
    const radius = Math.hypot(d.w, d.h) / 2;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, d.color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.16;
    ctx.fillRect(d.x, d.y, d.w, d.h);
  }
  ctx.globalAlpha = 1;
}

function drawGround(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number, scale: number) {
  if (citySheetReady()) {
    drawGroundGrid(ctx, camX, camY, vw, vh, scale);
    return;
  }

  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  ctx.fillStyle = PALETTE.groundAlt;
  for (let y = 0; y < MAP_HEIGHT; y += 8) {
    for (let x = ((y / 8) % 2) * 8; x < MAP_WIDTH; x += 16) {
      ctx.fillRect(x, y, 8, 8);
    }
  }

  for (const d of DISTRICT_GROUND_TINTS) {
    ctx.fillStyle = d.base;
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = d.alt;
    // Same global checker parity (`(y/8)%2`) the default pass above uses,
    // clipped to just this district's own rect, so the pattern's seams
    // stay continuous crossing from one zone's ground into the next
    // rather than visibly resetting at the boundary.
    const startY = Math.floor(d.y / 8) * 8;
    for (let y = startY; y < d.y + d.h; y += 8) {
      const rowStartX = ((y / 8) % 2) * 8;
      const startX = Math.floor((d.x - rowStartX) / 16) * 16 + rowStartX;
      for (let x = startX; x < d.x + d.w; x += 16) {
        if (x + 8 <= d.x || x >= d.x + d.w) continue;
        ctx.fillRect(Math.max(x, d.x), y, Math.min(x + 8, d.x + d.w) - Math.max(x, d.x), 8);
      }
    }
  }
}

/**
 * The road hierarchy the district redesign asked for: a street's width and
 * mood are supposed to tell the player something before they've read a
 * single sign. `tier` is the whole of that:
 *
 * - `major` — the two arterials that cross at the Downtown Crossroads.
 *   Widest, brightest, a hard dashed centreline. Fast, watched, exactly
 *   where a camera cluster and a patrol beat belong.
 * - `secondary` — the two roads bounding the Warehouse/Commercial column.
 *   Real streets, a step down in width and a fainter, sparser centreline.
 * - `local` — the streets inside a district's own blocks. No centreline —
 *   at this width painting one would read as a major road shrunk down
 *   rather than a different kind of street.
 * - `alley` — the shortcuts. Narrow, dark, textured rather than painted
 *   flat, no centreline, and deliberately placed alongside the obstacle
 *   layer's own tree cover so cutting through one is the quiet route in
 *   more than just colour (`systems/pursuit.ts` `underTreeCover`).
 * - `path` — pedestrian paths through Liberty Park, connecting districts
 *   the way a real park cut-through does. Thinnest, dotted, no fill mood
 *   at all — gravel, not asphalt.
 *
 * Every segment is a plain rect; roads carry no collision (Overworld.tsx's
 * collision only ever checks `LOCATIONS`/solid `OBSTACLES`), so a segment
 * spanning the whole map costs nothing extra and a short dead-end costs
 * nothing to leave unconnected. `DIAGONAL_ROADS` below is the one
 * exception — a couple of rotated segments for the "not everything is a
 * rectangle" texture the build note asked for, kept as a short, separate
 * list rather than teaching every consumer of `ROAD_SEGMENTS` about angles
 * it will almost never need.
 */
export type RoadTier = 'major' | 'secondary' | 'local' | 'alley' | 'path';

interface RoadSegment {
  x: number;
  y: number;
  w: number;
  h: number;
  tier: RoadTier;
}

const ROAD_WIDTH: Record<RoadTier, number> = { major: 44, secondary: 32, local: 20, alley: 11, path: 6 };

const ROAD_SEGMENTS: RoadSegment[] = [
  // The two majors — cross at (500,364), the Downtown Crossroads. Together
  // with the secondary pair below they are the seams of the 3x3: nine
  // district cells, every one of them bounded by a real road on at least
  // two sides, which is where the layout brief's "every district has at
  // least two entrances/exits" is actually satisfied. The alleys and paths
  // further down are the third, fourth and fifth ways in.
  { x: 478, y: 0, w: ROAD_WIDTH.major, h: MAP_HEIGHT, tier: 'major' },
  { x: 0, y: 342, w: MAP_WIDTH, h: ROAD_WIDTH.major, tier: 'major' },
  // The two secondaries — bound the Civic/Works/Plaza column and the
  // southern row.
  { x: 1084, y: 0, w: ROAD_WIDTH.secondary, h: MAP_HEIGHT, tier: 'secondary' },
  { x: 0, y: 740, w: MAP_WIDTH, h: ROAD_WIDTH.secondary, tier: 'secondary' },

  // Local streets — one through the middle of each district's own block,
  // splitting it into a north row of frontages and a south row.
  { x: 0, y: 210, w: 440, h: ROAD_WIDTH.local, tier: 'local' }, // 1. The Heights
  { x: 545, y: 180, w: 520, h: ROAD_WIDTH.local, tier: 'local' }, // 2. Main Street
  { x: 1128, y: 180, w: 472, h: ROAD_WIDTH.local, tier: 'local' }, // 3. Civic Zone
  { x: 0, y: 506, w: 440, h: ROAD_WIDTH.local, tier: 'local' }, // 4. Old Market
  { x: 1128, y: 524, w: 472, h: ROAD_WIDTH.local, tier: 'local' }, // 6. The Works
  { x: 0, y: 940, w: 440, h: ROAD_WIDTH.local, tier: 'local' }, // 7. Southside
  { x: 528, y: 920, w: 544, h: ROAD_WIDTH.local, tier: 'local' }, // 8. The Blocks
  { x: 1128, y: 920, w: 472, h: ROAD_WIDTH.local, tier: 'local' }, // 9. The Plaza
  // The Heights' own cul-de-sac — a dead end off the district street
  // above, one of the "occasional dead ends" the brief asked for.
  { x: 380, y: 230, w: ROAD_WIDTH.local, h: 90, tier: 'local' },
  // The Plaza's own lot spine, running north from the strip's frontage to
  // MegaMart's parking apron — the aisle the parking rows in
  // `obstacles.ts` are drawn either side of.
  { x: 1290, y: 790, w: ROAD_WIDTH.local, h: 130, tier: 'local' },

  /*
   * Alleys — the shortcuts, one per built-up district now rather than four
   * for the whole map. See the tier comment above for why these matter more
   * than their width suggests: `systems/pursuit.ts`'s `underTreeCover()`
   * concealment is authored around them, and every one of them is a way
   * between two blocks that no camera in `world/collectibles.ts` is aimed
   * down.
   */
  { x: 348, y: 40, w: ROAD_WIDTH.alley, h: 160, tier: 'alley' }, // 1. rear yards behind Ellen's
  { x: 784, y: 30, w: 20, h: 150, tier: 'alley' }, // 2. School's east side to the Corner Market's yard
  { x: 1336, y: 206, w: 24, h: 136, tier: 'alley' }, // 3. the service cut between Library and Records
  { x: 292, y: 392, w: 26, h: 114, tier: 'alley' }, // 4. Repair Shop <-> Wash & Fold, the strip's own cut-through
  { x: 1308, y: 392, w: 26, h: 300, tier: 'alley' }, // 6. the full-depth back cut through The Works
  { x: 208, y: 822, w: 22, h: 118, tier: 'alley' }, // 7. the depot's own service lane
  { x: 692, y: 784, w: 26, h: 130, tier: 'alley' }, // 8. between Casey's and the Vasquez house
  { x: 854, y: 784, w: 26, h: 130, tier: 'alley' }, // 8. between the Vasquez house and Kestrel Row
  { x: 1398, y: 784, w: 20, h: 138, tier: 'alley' }, // 9. MegaMart's goods-in lane, off the arcade end

  /*
   * Pedestrian paths — Liberty Park's own connective tissue, and the
   * reason the middle cell of the 3x3 is a crossroads rather than an
   * obstacle. Four marked entrances, one on each side, so the park can be
   * entered from every district that touches it.
   */
  { x: 440, y: 560, w: 142, h: ROAD_WIDTH.path, tier: 'path' }, // west entrance, across the major from Old Market
  { x: 686, y: 500, w: 20, h: ROAD_WIDTH.path, tier: 'path' }, // Ballpark to the Green
  { x: 860, y: 386, w: ROAD_WIDTH.path, h: 20, tier: 'path' }, // north entrance, off the major
  { x: 1020, y: 496, w: 110, h: ROAD_WIDTH.path, tier: 'path' }, // east entrance, across the secondary into The Works
  { x: 780, y: 600, w: ROAD_WIDTH.path, h: 140, tier: 'path' }, // the park south, toward The Blocks
];

/**
 * A rotated rect — `ctx.save/translate/rotate/fillRect/restore` rather than
 * hand-authored path data (a plain rect rotated in place is one transform,
 * not a shape worth a bespoke path). The one deliberate exception to "every
 * road is axis-aligned": a diagonal corner-cut is real texture, but not
 * worth teaching the whole road model — and place, obstacle, patrol-route
 * and connectivity code all only ever look at `LOCATIONS`/solid
 * `OBSTACLES`, never at the road layer, so a diagonal here touches nothing
 * downstream.
 */
function drawDiagonalRoad(ctx: CanvasRenderingContext2D, cx: number, cy: number, length: number, angleDeg: number) {
  ctx.save();
  ctx.translate(px(cx), px(cy));
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.fillStyle = PALETTE.roadSecondary;
  ctx.fillRect(-length / 2, -ROAD_WIDTH.local / 2, length, ROAD_WIDTH.local);
  ctx.restore();
}

/** One corner-cut, across Liberty Park's south-west lawn toward the
 * Crossroads — the "10-15% weird geometry" the build note asked for, spent
 * in one place rather than spread thin enough to disappear. */
const DIAGONAL_ROADS: { cx: number; cy: number; length: number; angleDeg: number }[] = [
  { cx: 596, cy: 648, length: 150, angleDeg: -32 },
];

/** Streets, with a broken centre line on `major`/`secondary` tiers only —
 * at `local` width and below a painted centreline reads as a shrunk major
 * road, not a different kind of street. */
function drawRoads(ctx: CanvasRenderingContext2D) {
  // The surface itself is `drawGroundGrid`'s job once the sheet's loaded
  // (`surfaceGrid()` rasterizes these same `ROAD_SEGMENTS`/`DIAGONAL_ROADS`
  // onto the tile grid) — everything below is the overlay that was always
  // layered on top of a flat fill and still is, just on top of asphalt now.
  if (!citySheetReady()) {
    for (const road of ROAD_SEGMENTS) {
      ctx.fillStyle =
        road.tier === 'major' ? PALETTE.roadMajor
        : road.tier === 'secondary' ? PALETTE.roadSecondary
        : road.tier === 'alley' ? PALETTE.roadAlley
        : road.tier === 'path' ? PALETTE.curb
        : PALETTE.road;
      ctx.fillRect(road.x, road.y, road.w, road.h);
    }

    for (const { cx, cy, length, angleDeg } of DIAGONAL_ROADS) drawDiagonalRoad(ctx, cx, cy, length, angleDeg);
  }

  ctx.globalAlpha = 0.5;
  for (const road of ROAD_SEGMENTS) {
    if (road.tier !== 'major' && road.tier !== 'secondary') continue;
    ctx.fillStyle = road.tier === 'major' ? PALETTE.roadLine : PALETTE.roadLineFaint;
    const dash = road.tier === 'major' ? 20 : 32;
    if (road.h > road.w) {
      // vertical segment
      const cx = road.x + road.w / 2 - 1;
      for (let y = road.y + 4; y < road.y + road.h; y += dash) ctx.fillRect(cx, y, 2, 8);
    } else {
      const cy = road.y + road.h / 2 - 1;
      for (let x = road.x + 4; x < road.x + road.w; x += dash) ctx.fillRect(x, cy, 8, 2);
    }
  }
  ctx.globalAlpha = 1;

  /*
   * Alleys, darkened. `drawGroundGrid` blits the same asphalt tile under
   * every road tier, so once the sheet loads an alley and an arterial are
   * the same surface at different widths — and width alone is a weak tell
   * at this zoom for the one tier the route-choice design actually leans
   * on. This is the overlay that puts it back: a shadow wash for the
   * buildings either side, a grit speckle so it reads as unswept rather
   * than merely dim, and no centreline, ever. Deliberately drawn for the
   * sprite path *and* the flat-fill fallback, since the fallback's own
   * `roadAlley` colour is already darker but not by enough.
   */
  for (const road of ROAD_SEGMENTS) {
    if (road.tier !== 'alley') continue;
    ctx.fillStyle = 'rgba(12, 15, 20, 0.34)';
    ctx.fillRect(road.x, road.y, road.w, road.h);
    const rand = noise(`alley:${road.x}:${road.y}`);
    ctx.fillStyle = 'rgba(150, 156, 168, 0.10)';
    const specks = Math.round((road.w * road.h) / 90);
    for (let i = 0; i < specks; i++) {
      ctx.fillRect(px(road.x + rand() * road.w), px(road.y + rand() * road.h), 2, 1);
    }
    // A darker lip where the walls come down on each long side.
    ctx.fillStyle = 'rgba(8, 10, 14, 0.28)';
    if (road.h >= road.w) {
      ctx.fillRect(road.x, road.y, 2, road.h);
      ctx.fillRect(road.x + road.w - 2, road.y, 2, road.h);
    } else {
      ctx.fillRect(road.x, road.y, road.w, 2);
      ctx.fillRect(road.x, road.y + road.h - 2, road.w, 2);
    }
  }

  // Pedestrian paths get a dotted gravel tread instead of a centreline.
  ctx.fillStyle = PALETTE.curb;
  for (const road of ROAD_SEGMENTS) {
    if (road.tier !== 'path') continue;
    if (road.w > road.h) {
      for (let x = road.x + 4; x < road.x + road.w; x += 14) ctx.fillRect(x, road.y + road.h / 2 - 1, 3, 2);
    } else {
      for (let y = road.y + 4; y < road.y + road.h; y += 14) ctx.fillRect(road.x + road.w / 2 - 1, y, 2, 3);
    }
  }

  drawCracks(ctx);
  if (citySheetReady()) drawCrossroadsCrosswalks(ctx);
}

/**
 * Real zebra stripes, hand-placed at the Downtown Crossroads only — the
 * one intersection the story already treats as the town's busiest corner
 * (a camera cluster and a patrol beat both live here). Not a general road-
 * marking system: the other ~20 intersections in town stay exactly as
 * they are, plain asphalt. One short strip on each of the four legs,
 * oriented so the stripes always run parallel to that leg's own road.
 */
function drawCrossroadsCrosswalks(ctx: CanvasRenderingContext2D) {
  const roadX = 478;
  const roadW = ROAD_WIDTH.major;
  const roadY = 342;
  const roadH = ROAD_WIDTH.major;

  const vStripX = roadX + roadW / 2 - (3 * TILE) / 2;
  for (let i = 0; i < 3; i++) {
    drawCityTileAt(ctx, CROSSWALK_V, vStripX + i * TILE, roadY - TILE);
    drawCityTileAt(ctx, CROSSWALK_V, vStripX + i * TILE, roadY + roadH);
  }

  const hStripY = roadY + roadH / 2 - (3 * TILE) / 2;
  for (let i = 0; i < 3; i++) {
    drawCityTileAt(ctx, CROSSWALK_H, roadX - TILE, hStripY + i * TILE);
    drawCityTileAt(ctx, CROSSWALK_H, roadX + roadW, hStripY + i * TILE);
  }
}

/** Hairline cracks in the asphalt — fixed per road segment (seeded on its own
 * coordinates, not per-frame) so a street reads as old rather than new,
 * without ever reshuffling under the player's feet. Cheap grit: a handful of
 * short broken lines, not a texture pass. Only major/secondary roads get
 * them — an alley or a path is already rough by design. */
function drawCracks(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = PALETTE.crack;
  ctx.lineWidth = 1;
  for (const road of ROAD_SEGMENTS) {
    if (road.tier !== 'major' && road.tier !== 'secondary') continue;
    const rand = noise(`crack:${road.x}:${road.y}`);
    const vertical = road.h > road.w;
    for (let i = 0; i < 6; i++) {
      if (vertical) {
        const cy = road.y + rand() * road.h;
        const len = 6 + rand() * 10;
        const branch = (rand() - 0.5) * 10;
        ctx.beginPath();
        ctx.moveTo(px(road.x + 4 + rand() * (road.w - 8)), px(cy));
        ctx.lineTo(px(road.x + 4 + rand() * (road.w - 8) + branch), px(cy + len));
        ctx.stroke();
      } else {
        const cx = road.x + rand() * road.w;
        const len = 6 + rand() * 10;
        const branch = (rand() - 0.5) * 10;
        ctx.beginPath();
        ctx.moveTo(px(cx), px(road.y + 4 + rand() * (road.h - 8)));
        ctx.lineTo(px(cx + len), px(road.y + 4 + rand() * (road.h - 8) + branch));
        ctx.stroke();
      }
    }
  }
}

/**
 * The river along the west/south-west edge and the rail line along the
 * north edge into The Works — the geography that gives the
 * town's own boundary a reason to be there, rather than the map just
 * stopping. Both are pure ground texture: neither carries collision
 * (Overworld.tsx's collision only ever checks `LOCATIONS`/solid
 * `OBSTACLES`), so crossing either is exactly as free as crossing an
 * ordinary street — no bridge or crossing mechanic needed for a feature
 * that was only ever asked to give the edge an identity, not to gate it.
 */
function drawEdgeGeography(ctx: CanvasRenderingContext2D) {
  // The river: Old Market and Southside's own waterfront edge.
  const riverX = 0;
  const riverW = 36;
  const riverY = 392;
  const riverH = MAP_HEIGHT - riverY;
  ctx.fillStyle = PALETTE.river;
  ctx.fillRect(riverX, riverY, riverW, riverH);
  ctx.fillStyle = PALETTE.riverRipple;
  const rand = noise('river');
  for (let y = riverY + 6; y < riverY + riverH; y += 18) {
    const w = 10 + rand() * 14;
    ctx.fillRect(riverX + rand() * (riverW - w), y, w, 2);
  }

  drawWaterfrontPier(ctx);

  /*
   * The rail line: along the north edge, then down the map's own eastern
   * margin to the Rail Spur's latitude in The Works. It used to run down
   * x1128 — which was the old Warehouse District's western flank and is
   * now the Civic Zone's frontage and a secondary road, so on the 3x3 it
   * was a freight line through the middle of City Hall's street. The far
   * edge is where a real one would be, and it still arrives exactly where
   * the district's own dead siding is.
   */
  ctx.fillStyle = PALETTE.rail;
  ctx.fillRect(0, 0, MAP_WIDTH, 18);
  ctx.fillRect(1580, 18, 20, 640);
  ctx.fillStyle = PALETTE.railTie;
  for (let x = 8; x < MAP_WIDTH; x += 16) ctx.fillRect(x, 3, 4, 12);
  for (let y = 26; y < 658; y += 16) ctx.fillRect(1583, y, 14, 4);
}

/**
 * A short pier at the one stretch of riverbank with nothing built against
 * it — the seam between Old Market and Southside, y728–784, where neither
 * district's own frontage reaches the water. Planking out from the bank,
 * two pilings, and a single moored rowboat: enough for "somebody comes
 * down here" without turning open water into a location to manage. Same
 * layer as the river itself — decorative ground texture, no collision.
 */
function drawWaterfrontPier(ctx: CanvasRenderingContext2D) {
  const deckX = 6;
  const deckY = 746;
  const deckW = 30; // stops just short of the bank at x=36
  const deckH = 10;

  ctx.fillStyle = PALETTE.dockPlankDark;
  ctx.fillRect(px(deckX), px(deckY + deckH), deckW + 4, 2);
  ctx.fillStyle = PALETTE.dockPlank;
  ctx.fillRect(px(deckX), px(deckY), deckW, deckH);
  ctx.strokeStyle = PALETTE.dockPlankDark;
  ctx.lineWidth = 1;
  for (let x = deckX + 4; x < deckX + deckW; x += 5) {
    ctx.beginPath();
    ctx.moveTo(px(x), px(deckY));
    ctx.lineTo(px(x), px(deckY + deckH));
    ctx.stroke();
  }

  // Two pilings, standing proud of the deck either side of it.
  ctx.fillStyle = PALETTE.dockPiling;
  ctx.fillRect(px(deckX - 2), px(deckY - 3), 3, deckH + 8);
  ctx.fillRect(px(deckX + deckW - 1), px(deckY - 3), 3, deckH + 8);

  // A single rowboat, moored off the pier's own outer (west) end.
  const boatX = deckX - 2;
  const boatY = deckY + deckH + 10;
  ctx.fillStyle = PALETTE.boatHull;
  ctx.beginPath();
  ctx.moveTo(px(boatX), px(boatY + 4));
  ctx.lineTo(px(boatX + 3), px(boatY));
  ctx.lineTo(px(boatX + 16), px(boatY));
  ctx.lineTo(px(boatX + 19), px(boatY + 4));
  ctx.lineTo(px(boatX + 16), px(boatY + 8));
  ctx.lineTo(px(boatX + 3), px(boatY + 8));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.boatTrim;
  ctx.fillRect(px(boatX + 4), px(boatY + 2), 12, 2);
}

/**
 * Streetlights at a handful of intersections — fixed points, not one per
 * corner, because the point is a lit island on an empty street (Style Guide
 * 07's isolation rule), not municipal coverage. Drawn after roads and glows,
 * before buildings, so a building in front of one simply occludes it, the
 * same depth order everything else on this canvas already uses.
 */
const STREETLIGHT_POINTS: { x: number; y: number; surveilled?: boolean }[] = [
  { x: 500, y: 364 }, // the Downtown Crossroads itself — the brightest corner in town
  { x: 200, y: 240 }, // 1. The Heights, the district street
  { x: 900, y: 210 }, // 2. Main Street, between the market and the square
  { x: 1128, y: 210 }, // 3. Civic Zone, the west approach
  { x: 1480, y: 210 }, // 3. Civic Zone, the Data Centre gate
  { x: 132, y: 536 }, // 4. Old Market, the strip's west end
  { x: 380, y: 536 }, // 4. Old Market, the alley's south mouth
  { x: 1200, y: 554 }, // 6. The Works, Row 1
  { x: 1460, y: 720 }, // 6. The Works, the scrapyard end
  { x: 120, y: 970 }, // 7. Southside, the depot
  { x: 800, y: 950 }, // 8. The Blocks
  { x: 1250, y: 950 }, // 9. The Plaza
  /*
   * Liberty Park's own two, and the one deliberately surveilled lamp on
   * the map. The redesign brief's contrast note: "a peaceful area makes
   * the surrounding dystopian elements more noticeable" — this is that,
   * made as small and easy to miss as a real one would be, on the one
   * lamppost in the park a player might otherwise never look twice at.
   * Placed on open grass rather than at the fountain: everything within a
   * few metres of the fountain gets painted over by `drawGreen`'s own
   * path, hedging and basin, all drawn after streetlights.
   */
  { x: 640, y: 660, surveilled: true },
  { x: 960, y: 646 },
];

function drawStreetlight(ctx: CanvasRenderingContext2D, p: { x: number; y: number; surveilled?: boolean }) {
  const x = px(p.x);
  const topY = px(p.y - 22);

  ctx.fillStyle = PALETTE.lampHalo;
  ctx.beginPath();
  ctx.arc(x, topY, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = PALETTE.lampPost;
  ctx.fillRect(x - 1, topY, 2, 22);
  ctx.fillRect(x - 3, p.y - 2, 6, 2);

  ctx.fillStyle = PALETTE.lampGlow;
  ctx.beginPath();
  ctx.arc(x, topY, 3, 0, Math.PI * 2);
  ctx.fill();

  if (p.surveilled) {
    // A small camera unit on a short bracket, mounted just under the lamp
    // head — the same dark housing/lens colours `drawCamera` uses, at a
    // fraction of the size, so it reads as "also on this post" rather than
    // as a second landmark competing with the lamp itself.
    const armY = topY + 5;
    ctx.strokeStyle = PALETTE.cameraDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, armY);
    ctx.lineTo(x + 6, armY + 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.cameraDark;
    ctx.fillRect(x + 5, armY, 5, 3.5);
    ctx.fillStyle = PALETTE.camera;
    ctx.beginPath();
    ctx.arc(x + 10, armY + 1.7, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * One mark: the A's two legs, its crossbar, and however much of the circle
 * got drawn. Hand-cut rather than stencilled — each stroke is nudged by
 * the mark's own seeded noise so no two are the same shape, which is the
 * whole point of the `claiming` state in `ui/GenAMark.tsx`: it is being
 * claimed in real time by different people who have each seen it once.
 */
function drawGenAMark(ctx: CanvasRenderingContext2D, m: WallMark) {
  const rand = noise(`gena:${m.x}:${m.y}`);
  const r = m.size / 2;
  const cx = m.x;
  const cy = m.y;
  const jitter = () => (rand() - 0.5) * (m.size * 0.14);

  if (m.sticker) {
    // A photocopied sticker: pale paper, slightly askew, its corner lifted.
    ctx.save();
    ctx.translate(px(cx), px(cy));
    ctx.rotate((rand() - 0.5) * 0.4);
    ctx.fillStyle = PALETTE.sticker;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-r - 1, -r - 1, m.size + 2, m.size + 2);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = PALETTE.stickerInk;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -r + 1);
    ctx.lineTo(-r + 1.5, r - 1);
    ctx.moveTo(0, -r + 1);
    ctx.lineTo(r - 1.5, r - 1);
    ctx.moveTo(-r + 0.5, 0.5);
    ctx.lineTo(r - 0.5, 0.5);
    ctx.stroke();
    if (m.closure > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, r - 0.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * m.closure);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  ctx.strokeStyle = m.closure >= 1 ? PALETTE.genA : PALETTE.genAFade;
  ctx.lineWidth = Math.max(1.4, m.size * 0.16);
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(px(cx + jitter()), px(cy - r));
  ctx.lineTo(px(cx - r * 0.82 + jitter()), px(cy + r));
  ctx.moveTo(px(cx + jitter()), px(cy - r));
  ctx.lineTo(px(cx + r * 0.82 + jitter()), px(cy + r));
  // The wide crossbar — the thing that actually reads as an anarchy A
  // rather than a letter A in a circle, per `ui/GenAMark.tsx`'s own note.
  ctx.moveTo(px(cx - r * 1.1), px(cy + r * 0.16 + jitter()));
  ctx.lineTo(px(cx + r * 1.1), px(cy + r * 0.16 + jitter()));
  ctx.stroke();

  if (m.closure > 0) {
    // The circle starts at the top-left and runs clockwise, so an
    // unfinished one always has its gap where somebody got interrupted.
    ctx.beginPath();
    ctx.arc(px(cx), px(cy), r * 1.08, -Math.PI * 0.75, -Math.PI * 0.75 + Math.PI * 2 * Math.min(1, m.closure));
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

/**
 * THE MARK THE PLAYER LEAVES.
 *
 * A sabotaged camera comes back: SafeTrace replaces the housing, the
 * cooldown expires and the lens is live again. Which meant that until now
 * the single most consequential thing a player does to this town left no
 * trace at all a week later — the loop was invisible, and "walk through
 * the place and see what you changed" was a design note with nothing
 * behind it.
 *
 * This is that trace, and it costs no new persistence: `world.collectedNodes`
 * already keeps a node's record *after* its respawn window closes (see
 * `systems/materials.ts` — only a lockdown sweep's `repairNetwork` ever
 * clears one). So the existence of a record, independent of whether the
 * node is currently down, is a permanent "this one got taken apart" flag
 * the save has always been carrying and nothing was reading.
 *
 * Drawn at the node's **authored** position rather than wherever a respawn
 * has since moved it to (`world/relocate.ts`), because the paint is on the
 * pole and the pole doesn't move. A camera that relocated away leaves a
 * bare tagged post behind, which is the clearest possible read: they took
 * the lens off this one.
 *
 * Kept deliberately small and dry — a tag and a sticker, not a mural. The
 * Gen A mark is rare on this map on purpose (`world/marks.ts`), and a player
 * who has worked over twenty poles should end up with a town that looks
 * marked, not a town that looks vandalised.
 */
function drawSabotageScar(ctx: CanvasRenderingContext2D, scar: { x: number; y: number; tagged: boolean }) {
  const baseY = scar.y + 8;
  const rand = noise(`scar:${scar.x}:${scar.y}`);

  // The post itself, still standing.
  ctx.fillStyle = PALETTE.cameraDeadCable;
  ctx.fillRect(px(scar.x - 1), px(baseY), 2, 10);

  // Spray at the foot of it, half on the post and half on the pavement —
  // the angle somebody actually paints at when they are in a hurry.
  ctx.strokeStyle = PALETTE.genAFade;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px(scar.x - 5 + rand() * 2), px(baseY + 9));
  ctx.lineTo(px(scar.x + 5 - rand() * 2), px(baseY + 4));
  ctx.stroke();

  // Every second one carries the mark rather than just paint — see the
  // rarity note above.
  if (scar.tagged) drawGenAMark(ctx, { x: scar.x + 7, y: baseY + 4, size: 8, closure: 0.6 + rand() * 0.4, stage: 0 });
}

/**
 * Cameras somebody already dealt with, standing dark from the first frame
 * of a new game.
 *
 * These are deliberately *not* `CameraNode`s: they carry no loot, no Heat
 * price and no coverage, so they never touch `systems/coverage.ts`'s
 * percentage or the sabotage economy. What they are for is the one thing
 * the reference layout asks for that a mechanic can't say — that taking a
 * camera down is a thing people here already do. A player who has never
 * dismantled anything has still seen three housings with a bag over the
 * lens, and knows what the town looks like after they start.
 *
 * `variant` is who got there first and how much trouble they took over
 * it: a carrier bag and a zip tie, a sticker straight over the glass, or
 * the cable cut and left swinging.
 */
const DEAD_CAMERAS: { x: number; y: number; variant: 'bagged' | 'tagged' | 'cut' }[] = [
  // Old Market — the district whose whole business is not being recorded.
  { x: 268, y: 540, variant: 'bagged' },
  { x: 96, y: 690, variant: 'cut' },
  // The Works, on the Annex fence line beside the gap.
  { x: 1516, y: 620, variant: 'cut' },
  // The Blocks — somebody's neighbour, on a stepladder, on a Sunday.
  { x: 792, y: 908, variant: 'tagged' },
  // Main Street, on the square's east corner: the most public one, and
  // the one that keeps getting replaced.
  { x: 806, y: 314, variant: 'tagged' },
];

/** A dead housing: no cone, no tally light, no revolving lens — and one
 * of three tells for how it died. */
function drawDeadCamera(ctx: CanvasRenderingContext2D, c: { x: number; y: number; variant: 'bagged' | 'tagged' | 'cut' }) {
  const size = 14;
  const x = px(c.x - size / 2);
  const y = px(c.y - size / 2);

  drawCameraPost(ctx, x + size / 2, y + size);

  ctx.globalAlpha = 0.75;
  ctx.fillStyle = PALETTE.cameraDead;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = PALETTE.cameraDeadCable;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, size + 1, size + 1);
  ctx.globalAlpha = 1;

  if (c.variant === 'bagged') {
    ctx.fillStyle = PALETTE.sticker;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 1);
    ctx.lineTo(x + size + 2, y - 1);
    ctx.lineTo(x + size - 1, y + size + 3);
    ctx.lineTo(x + 1, y + size + 3);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = PALETTE.cameraDeadCable;
    ctx.beginPath();
    ctx.moveTo(x, y + size);
    ctx.lineTo(x + size, y + size);
    ctx.stroke();
  } else if (c.variant === 'tagged') {
    ctx.fillStyle = PALETTE.stickerInk;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x + 2, y + 3, size - 4, size - 7);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = PALETTE.tag;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 2, y + size + 1);
    ctx.lineTo(x + size + 3, y - 2);
    ctx.stroke();
  } else {
    // Cut: the housing hangs, and the feed cable is left swinging.
    ctx.strokeStyle = PALETTE.cameraDeadCable;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y);
    ctx.lineTo(x + size / 2 + 4, y - 7);
    ctx.lineTo(x + size / 2 - 2, y - 12);
    ctx.stroke();
  }
}

/** A resistance place, warming the street it stands on. */
function drawGlow(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  ctx.fillStyle = PALETTE.warmGlow;
  for (let ring = 3; ring > 0; ring--) {
    const pad = ring * 14;
    ctx.fillRect(loc.x - pad, loc.y - pad, loc.w + pad * 2, loc.h + pad * 2);
  }
}

/**
 * Every named location, dispatched to a shape that actually reads as the
 * thing it is — a treehouse looks like a platform in a tree, a school reads
 * as a school, per the fill-out note that a town of identical boxes with a
 * different colour band underneath doesn't actually look like anything.
 * `'building'` (missing/unrecognised too, defensively) falls back to the
 * original plain box every location used to render as. The "you're close
 * enough to act on this" tell is a soft glow underneath the shape rather
 * than an outline traced on top of it — one glow shape works for every
 * silhouette instead of needing bespoke tracing per building type, and it
 * reads as "this place is lit up" rather than "this place is selected".
 */
function drawLocation(ctx: CanvasRenderingContext2D, loc: OverworldLocation, isHere: boolean, tier: ThresholdTier, now: number) {
  if (isHere && loc.render !== 'camera') drawHereGlow(ctx, loc);

  switch (loc.render) {
    case 'camera':
      drawCamera(ctx, loc, isHere, now);
      return;
    case 'house':
      drawHouse(ctx, loc, tier);
      break;
    case 'school':
      drawSchool(ctx, loc, tier);
      break;
    case 'library':
      drawLibrary(ctx, loc, tier);
      break;
    case 'plaza':
      drawPlaza(ctx, loc);
      break;
    case 'green':
      drawGreen(ctx, loc, now);
      break;
    case 'warehouse':
      drawWarehouse(ctx, loc);
      break;
    case 'garage':
      drawGarage(ctx, loc);
      break;
    case 'ballpark':
      drawBallpark(ctx, loc);
      break;
    case 'pizza':
      drawPizza(ctx, loc, tier);
      break;
    case 'arcade':
      drawArcade(ctx, loc, tier);
      break;
    case 'treehouse':
      drawTreehouse(ctx, loc, tier);
      break;
    case 'shop':
      drawShop(ctx, loc, tier);
      break;
    case 'transit':
      drawTransit(ctx, loc);
      break;
    case 'civic':
      drawCivic(ctx, loc, tier);
      break;
    case 'datacenter':
      drawDataCenter(ctx, loc, now);
      break;
    case 'bigbox':
      drawBigBox(ctx, loc, tier);
      break;
    case 'substation':
      drawSubstation(ctx, loc, now);
      break;
    default:
      drawBuilding(ctx, loc, tier);
  }
}

/**
 * A soft halo, same layered-rings trick `drawGlow` uses for a resistance
 * place's ambient warmth: several same-alpha circles, largest first, so
 * they stack additively into a glow that's brightest at the centre and
 * falls off softly at the edge. Shared by everything the player can act
 * on — a location, a camera, a street hack node — so "you're close enough"
 * reads the same low-key way everywhere, rather than a location getting a
 * halo and a camera getting a hard-edged ring.
 */
function drawSoftGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, baseR: number, rings: number, step: number) {
  ctx.fillStyle = PALETTE.hereGlow;
  for (let ring = rings; ring > 0; ring--) {
    ctx.beginPath();
    ctx.arc(cx, cy, baseR + ring * step, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * The "tap me" tell for a camera, junction box, or street hack that's
 * actually in reach right now — a single ring breathing in and out rather
 * than `drawSoftGlow`'s fixed static rings, since this one's job changed:
 * it used to just mark "close enough" while the prompt opened on its own,
 * and now it's the only sign the object is waiting on an actual tap
 * (Overworld.tsx no longer opens the action prompt on proximity alone).
 * A glow that visibly pulses reads as "touch this" in a way a static ring
 * never quite did.
 */
function drawPulseGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, baseR: number, now: number) {
  const phase = (Math.sin(now / 420) + 1) / 2; // 0..1, ~1.5s breathing cycle
  const r = baseR + 3 + phase * 4;
  ctx.fillStyle = `rgba(236, 226, 208, ${0.1 + phase * 0.08})`;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The revolving lens on top of an active FLACK camera — the dome stays put,
 * only the little bright lens inside sweeps, the same "shell fixed, gaze
 * moving" language `ui/TitleEye.tsx` uses for the title screen's own camera.
 * Never drawn once a camera's sabotaged (`drawSabotageDamage` takes over
 * instead) — a dead camera's lens has stopped moving, which is the whole
 * point of it being dead.
 */
function drawRevolvingLens(ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number) {
  const r = 3.2;
  ctx.fillStyle = PALETTE.cameraDark;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const angle = (now / 1300) % (Math.PI * 2);
  const lx = cx + Math.cos(angle) * (r - 1.3);
  const ly = cy + Math.sin(angle) * (r - 1.3) * 0.55; // flattened, so it reads as a lens tilting in a dome, not a ball spinning
  ctx.fillStyle = '#bcd9ff';
  ctx.beginPath();
  ctx.arc(lx, ly, 1.1, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Frayed wire and an irregular spark — the tell that whatever this is sits
 * on right now (`onCooldown`) is because the player already took it apart,
 * not because it was never there. Shared by every sabotage-able point
 * object (camera, junction box, street hack) rather than three copies, same
 * "one shape, different paint" reasoning `drawStreetHack` already uses for
 * its own three kinds.
 */
function drawSabotageDamage(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, now: number) {
  // Cut feed cable, hanging.
  ctx.strokeStyle = PALETTE.junctionDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + size * 0.28, y + size);
  ctx.lineTo(x + size * 0.18, y + size + 3);
  ctx.lineTo(x + size * 0.34, y + size + 5);
  ctx.moveTo(x + size * 0.68, y + size);
  ctx.lineTo(x + size * 0.8, y + size + 4);
  ctx.stroke();

  /*
   * Hazard tape across the housing, and the dead status light beside it.
   *
   * A dimmed box with a spark on it was the whole of "you took this apart"
   * before, which is too quiet for the one action in the game that visibly
   * changes the town. Tape is what actually appears on a broken municipal
   * fitting within a day of it breaking — it isn't the player's mark, it's
   * the *council's*, which is the better joke: the town tidies up after
   * them and in doing so flags every place they've been.
   */
  ctx.save();
  ctx.translate(px(x + size / 2), px(y + size / 2));
  ctx.rotate(-0.32);
  ctx.fillStyle = PALETTE.gateArm;
  ctx.fillRect(-size * 0.85, -2.5, size * 1.7, 5);
  ctx.fillStyle = PALETTE.gateArmDark;
  for (let i = -size * 0.85; i < size * 0.85; i += 5) ctx.fillRect(px(i), -2.5, 2.5, 5);
  ctx.restore();

  // The tally light, off — the one detail a live housing has that this
  // deliberately doesn't (see `drawRecordingLight`).
  ctx.fillStyle = PALETTE.cameraDeadCable;
  ctx.fillRect(px(x + size - 4), px(y + 2), 2, 2);

  // Same irregular double-flicker every other "this is live" tell on this
  // canvas uses (the title screen's REC dot, a camera's own status light) —
  // a spark reads as electrical, not decorative, when it stutters like one.
  const t = now % 1700;
  if (t < 80 || (t > 260 && t < 320)) {
    ctx.fillStyle = '#ffe37a';
    ctx.beginPath();
    ctx.arc(x + size * 0.72, y + size * 0.12, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The location-sized version: `drawSoftGlow` scaled to the building's own
 * footprint rather than a small fixed object. */
function drawHereGlow(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  const cx = px(loc.x + loc.w / 2);
  const cy = px(loc.y + loc.h / 2);
  const baseR = Math.max(loc.w, loc.h) / 2;
  drawSoftGlow(ctx, cx, cy, baseR, 3, 5);
}

/**
 * At `flagged` and above, Language A elements get a one-line scanline tear
 * (Style Guide 07: "Language A elements can start subtly glitching at the
 * edges … a shader/filter toggle on existing UI"). Language B never glitches
 * — it was never claiming to be smooth — so this is only ever called for A.
 * Shared by every walled Language A shape; a plaza, a ballpark and a
 * treehouse aren't claiming a corporate-clean surface in the first place, so
 * they don't call it, the same reasoning a camera doesn't get a warm glow.
 */
function drawGlitchTear(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier, roofH: number) {
  if (tier !== 'flagged' && tier !== 'hunted') return;
  const rand = noise(`glitch:${loc.id}:${tier}`);
  const y = px(loc.y + roofH + rand() * (loc.h - roofH - 6));
  ctx.fillStyle = PALETTE.windowLit;
  ctx.globalAlpha = tier === 'hunted' ? 0.35 : 0.18;
  ctx.fillRect(loc.x + px(rand() * 6), y, loc.w - px(rand() * 10), 2);
  ctx.globalAlpha = 1;
}

/**
 * A multi-tile sprite (a vehicle wider or taller than one tile) blitted at
 * native size, centred on `(cx, cy)` — the vehicle/prop equivalent of
 * `drawSpriteTile`'s single-tile centring, for the handful of sprites
 * (the patrol van, the transit bus) that are a fixed 2D block of tiles
 * rather than one. `tiles` is row-major, top to bottom; `blit` picks which
 * sheet, same convention every multi-tile helper on this canvas uses.
 */
function drawTileBlock(ctx: CanvasRenderingContext2D, tiles: number[][], cx: number, cy: number, blit: typeof drawTileAt) {
  const rows = tiles.length;
  const cols = tiles[0].length;
  const startX = cx - (cols * TILE) / 2;
  const startY = cy - (rows * TILE) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      blit(ctx, tiles[r][c], startX + c * TILE, startY + r * TILE);
    }
  }
}

/**
 * A flat rect, tiled with a 9-slice kit (corner/edge/fill) at the sheet's
 * native 16px pitch — a roof slab of any size, clipped to its own rect so a
 * width that isn't a clean multiple of the tile just ends cleanly at the
 * edge rather than stretching the last tile to fit.
 *
 * `blit` defaults to the main sheet (`drawTileAt`) but takes `drawCityTileAt`
 * for the industrial kit — same tiling math, different sheet underneath.
 */
function drawNineSliceRect(
  ctx: CanvasRenderingContext2D,
  slice: NineSlice,
  x: number,
  y: number,
  w: number,
  h: number,
  blit: typeof drawTileAt = drawTileAt,
) {
  const cols = Math.ceil(w / TILE);
  const rows = Math.ceil(h / TILE);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const left = c === 0;
      const right = c === cols - 1;
      const top = r === 0;
      const bottom = r === rows - 1;
      let idx = slice.fill;
      if (top && left) idx = slice.tl;
      else if (top && right) idx = slice.tr;
      else if (bottom && left) idx = slice.bl;
      else if (bottom && right) idx = slice.br;
      else if (top) idx = slice.t;
      else if (bottom) idx = slice.b;
      else if (left) idx = slice.l;
      else if (right) idx = slice.r;
      blit(ctx, idx, x + c * TILE, y + r * TILE);
    }
  }
  ctx.restore();
}

/**
 * A wall band — the cap row (the trimmed seam under the roof) once, then
 * the plain fill row repeated for whatever's left, tiled and clipped the
 * same way `drawNineSliceRect` is.
 *
 * `originX`/`originY` default to `x`/`y` but can be pinned elsewhere —
 * `drawHomeInteriorMask` punches several smaller rects out of the *same*
 * wall (everything except the window cutouts) and needs its brick to line
 * up seamlessly with `drawHouse`'s own wall behind it, which only happens
 * if every rect tiles from one shared grid origin instead of each restarting
 * its own count at its own corner.
 *
 * `blit` defaults to the main sheet (`drawTileAt`) but takes `drawCityTileAt`
 * for the industrial kit — same tiling math, different sheet underneath.
 */
function drawWallBand(
  ctx: CanvasRenderingContext2D,
  kit: WallKit,
  x: number,
  y: number,
  w: number,
  h: number,
  originX: number = x,
  originY: number = y,
  blit: typeof drawTileAt = drawTileAt,
) {
  const startCol = Math.floor((x - originX) / TILE);
  const endCol = Math.ceil((x + w - originX) / TILE);
  const startRow = Math.floor((y - originY) / TILE);
  const endRow = Math.ceil((y + h - originY) / TILE);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let r = startRow; r < endRow; r++) {
    for (let c = startCol; c < endCol; c++) {
      blit(ctx, r === 0 ? kit.cap : kit.fill, originX + c * TILE, originY + r * TILE);
    }
  }
  ctx.restore();
}

/** Grey stone + red brick, or tan stone + orange brick — picked once per
 * location id, the same "small fixed wardrobe" trick everything else this
 * pass varied by id hash. Shared so a location's wall always agrees with
 * itself across separate draw calls (`drawHouse` and its own
 * `drawHomeInteriorMask`, in particular). */
function wallKitFor(id: string): WallKit {
  return noise(`building-palette:${id}`)() < 0.5 ? WALL_RED : WALL_ORANGE;
}

function roofKitFor(id: string): NineSlice {
  return noise(`building-palette:${id}`)() < 0.5 ? ROOF_GREY : ROOF_TAN;
}

/**
 * The sprite-sheet building shell: a tiled roof slab over a tiled brick
 * wall band. Callers still draw their own curb, colour band, windows and
 * signage on top; this only replaces the flat-fill wall/roof rects
 * underneath them.
 */
function drawSpriteBuildingShell(ctx: CanvasRenderingContext2D, loc: OverworldLocation, roofH: number) {
  drawNineSliceRect(ctx, roofKitFor(loc.id), loc.x, loc.y, loc.w, roofH);
  drawWallBand(ctx, wallKitFor(loc.id), loc.x, loc.y + roofH, loc.w, loc.h - roofH);
}

/**
 * A building: body, roof, a row of windows. The roof reads as pitched by being
 * inset — at eight pixels of detail that is enough, and cheaper than an angle
 * that would need anti-aliasing to survive. The fallback shape now — every
 * named location has picked something more specific — kept for whatever a
 * future location doesn't bother picking a render for.
 */
function drawBuilding(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const isB = loc.language === 'B';
  const roofH = 14;

  // A curb: the building sits on ground, not floats on it. A single dark
  // step at the foot of the wall, cheap enough to afford on every building
  // without a texture pass.
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  if (spriteSheetReady() && !isB) {
    // Language B keeps its own warmer, hand-built flat colour — the sheet's
    // brick-and-stone kit reads as Language A's corporate-clean surface
    // (Style Guide 07), the opposite of what a resistance space is meant to
    // say, so this only ever swaps in for the cool, ordinary town.
    drawSpriteBuildingShell(ctx, loc, roofH);
  } else {
    ctx.fillStyle = isB ? PALETTE.wallB : PALETTE.wallA;
    ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);

    ctx.fillStyle = isB ? PALETTE.roofB : PALETTE.roofA;
    ctx.fillRect(loc.x + 4, loc.y, loc.w - 8, roofH);
    ctx.fillRect(loc.x, loc.y + roofH - 4, loc.w, 4);
  }

  // The location's own colour survives as a band at the base — it is how the
  // player has learned to tell these apart since Phase 1.
  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x, loc.y + loc.h - 5, loc.w, 5);

  drawWindows(ctx, loc, isB);

  // A tag, low on the wall, Language B only — the resistance's own places
  // are the hand-cut ones (Style Guide 07), and a mark somebody left is
  // cheaper than it looks: two or three angled strokes, fixed per building.
  if (isB) drawTag(ctx, loc, roofH);
  else drawGlitchTear(ctx, loc, tier, roofH);
}

/**
 * A house's window geometry, computed once so `drawHouse` and
 * `drawHomeInteriorMask` can never drift against each other the way two
 * independent copies of the same maths eventually do. Bigger than a civic
 * building's windows ever get, and bigger again at `home` specifically —
 * the one house whose insides the player actually needs to read while
 * confined to it before the opening's first prompt.
 */
function houseWindowGeometry(loc: OverworldLocation) {
  const roofH = Math.round(loc.h * 0.34);
  const bodyY = loc.y + roofH;
  const bodyH = loc.h - roofH;
  const winSize = loc.id === HOME_LOCATION_ID ? 20 : 14;
  const winY = px(bodyY + bodyH * 0.32);
  const win1X = px(loc.x + loc.w * 0.16);
  const win2X = px(loc.x + loc.w * 0.68);
  return { roofH, bodyY, bodyH, winSize, winY, win1X, win2X };
}

/** A cottage: walls, a proper pitched roof (two triangular faces, not the
 * flat inset band every civic building gets), a chimney, a centred door
 * flanked by two hand-placed windows rather than a generated grid — small
 * enough that the grid math reads as cramped instead of homely. */
function drawHouse(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const roofH = Math.round(loc.h * 0.34);
  const bodyY = loc.y + roofH;
  const bodyH = loc.h - roofH;
  const overhang = 6;
  const apexX = loc.x + loc.w / 2;

  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  // Only the wall texture swaps in — the pitched roof stays hand-drawn.
  // The sheet has no sloped-roof art (every roof in it is a flat slab
  // viewed from directly above), and the two triangular faces are the one
  // thing the doc comment above calls out as deliberately *not* the flat
  // civic-building band, so trading them for a flat sprite roof would
  // erase the exact distinction this shape exists to make.
  if (spriteSheetReady()) {
    drawWallBand(ctx, wallKitFor(loc.id), loc.x, bodyY, loc.w, bodyH);
  } else {
    ctx.fillStyle = PALETTE.wallA;
    ctx.fillRect(loc.x, bodyY, loc.w, bodyH);
  }

  ctx.fillStyle = PALETTE.pitchRoofDarkA;
  ctx.beginPath();
  ctx.moveTo(px(loc.x - overhang), px(bodyY + 2));
  ctx.lineTo(px(apexX), px(loc.y));
  ctx.lineTo(px(loc.x + loc.w + overhang), px(bodyY + 2));
  ctx.closePath();
  ctx.fill();
  // A lighter near-face, offset off the same apex, so the roof reads as two
  // pitched planes instead of one flat card.
  ctx.fillStyle = PALETTE.pitchRoofA;
  ctx.beginPath();
  ctx.moveTo(px(apexX), px(loc.y));
  ctx.lineTo(px(loc.x + loc.w + overhang), px(bodyY + 2));
  ctx.lineTo(px(loc.x + loc.w * 0.58), px(bodyY + 2));
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = PALETTE.chimney;
  ctx.fillRect(px(loc.x + loc.w * 0.74), loc.y - 2, 6, roofH * 0.6 + 2);

  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x, loc.y + loc.h - 5, loc.w, 5);

  const doorW = 10;
  const doorH = 16;
  const porchTop = loc.y + loc.h - doorH - 5;
  const porchW = doorW + 8;
  ctx.fillStyle = PALETTE.porchPost;
  ctx.fillRect(px(apexX - doorW / 2 - 3), porchTop, 2, doorH);
  ctx.fillRect(px(apexX + doorW / 2 + 1), porchTop, 2, doorH);
  ctx.fillStyle = PALETTE.doorColor;
  ctx.fillRect(px(apexX - doorW / 2), porchTop, doorW, doorH);

  /*
   * A small canopy roof over the porch — the one piece of the house that
   * actually breaks the building's own rectangle instead of just changing
   * colour within it. Sits a few px above the posts, a little wider than
   * the doorway they flank, with its own shadow so it reads as something
   * standing proud of the wall rather than a stripe painted on it.
   */
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(px(apexX - porchW / 2), porchTop + 3, porchW, 2);
  ctx.fillStyle = PALETTE.pitchRoofA;
  ctx.fillRect(px(apexX - porchW / 2 - 1), porchTop - 4, porchW + 2, 4);

  const rand = noise(`house:${loc.id}`);
  const win = houseWindowGeometry(loc);
  ctx.fillStyle = rand() < 0.7 ? PALETTE.windowLit : PALETTE.windowDark;
  ctx.fillRect(win.win1X, win.winY, win.winSize, win.winSize);
  ctx.fillStyle = rand() < 0.7 ? PALETTE.windowLit : PALETTE.windowDark;
  ctx.fillRect(win.win2X, win.winY, win.winSize, win.winSize);

  // Kestrel Row only — see `drawFireEscape`'s own doc comment for why it
  // isn't every house on the block.
  if (loc.id === 'blocks_terrace') {
    drawFireEscape(ctx, loc.x + loc.w - 16, bodyY + 2, loc.y + loc.h - 8);
  }

  drawGlitchTear(ctx, loc, tier, roofH);
  drawHouseYardProps(ctx, loc);
}

/**
 * `casey_house` is The Blocks' own story house in a district
 * with real acreage to spare, and its own blurb already describes a scene
 * ("For Sale sign. The swing set is still up.") that never made it past
 * text — the one lone house in that whole district was reading as any
 * other house instead of the specific abandoned one the writing means.
 * Same id-keyed, collision-free approach as `drawWarehouseYardProps`.
 *
 * `nova_house` gets a different kind of flourish for a different reason:
 * The Heights is deliberately the quietest block on the map (home turf, no
 * camera at stage 0), which is right for the story but leaves it with
 * nothing a player would specifically remember about the street itself.
 * A little free library out front is the map-redesign brief's own example
 * of a "weird little neighbourhood landmark" — no narrative weight, no
 * blurb, just a reason to notice this one front yard on the way past.
 */
function drawHouseYardProps(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  if (loc.id === 'casey_house') {
    drawForSaleSign(ctx, loc.x - 14, loc.y + loc.h - 4);
    drawSwingSet(ctx, loc.x + loc.w + 20, loc.y + loc.h - 2);
  } else if (loc.id === 'nova_house') {
    drawLittleLibrary(ctx, loc.x - 16, loc.y + loc.h - 4);
  }
}

/**
 * A little free library: a post, a birdhouse-sized box with a peaked roof,
 * and a shelf of books behind its own glass front. See `drawHouseYardProps`
 * for why Ellen's is the one yard on the block that gets one.
 */
function drawLittleLibrary(ctx: CanvasRenderingContext2D, x: number, groundY: number) {
  const postH = 22;
  const boxW = 14;
  const boxH = 16;
  const boxY = groundY - postH - boxH;

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(px(x), px(groundY + 1), 5, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = PALETTE.porchPost;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px(x), px(groundY));
  ctx.lineTo(px(x), px(boxY + boxH));
  ctx.stroke();

  ctx.fillStyle = PALETTE.plank;
  ctx.fillRect(px(x - boxW / 2), px(boxY), boxW, boxH);
  ctx.fillStyle = PALETTE.pitchRoofB;
  ctx.beginPath();
  ctx.moveTo(px(x - boxW / 2 - 2), px(boxY));
  ctx.lineTo(px(x), px(boxY - 6));
  ctx.lineTo(px(x + boxW / 2 + 2), px(boxY));
  ctx.closePath();
  ctx.fill();

  // The glass front, and a row of tiny book spines behind it — the detail
  // that makes it a library and not just a nesting box.
  ctx.fillStyle = PALETTE.windowDark;
  ctx.fillRect(px(x - boxW / 2 + 2), px(boxY + 3), boxW - 4, boxH - 6);
  const spineColors = [PALETTE.bandstandRoof, PALETTE.towerScreenCalm, PALETTE.forSaleSign, PALETTE.gardenLeaf];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = spineColors[i % spineColors.length];
    ctx.fillRect(px(x - boxW / 2 + 3 + i * 2.5), px(boxY + 4), 2, boxH - 8);
  }
}

/**
 * An exterior fire escape: two rails and a handful of switchback landings,
 * bolted to a wall rather than free-standing. This is texture, not a new
 * way to move — the overworld has no vertical collision plane, so it reads
 * as "somebody has a way up that isn't the front door" rather than
 * offering one. Reserved for the two buildings whose own writing already
 * implies somebody uses one: the Data Centre's roof chillers ("loud enough
 * to hear from the street") and Kestrel Row's six stacked front doors,
 * rather than stuck on every tall silhouette in town for its own sake.
 */
function drawFireEscape(ctx: CanvasRenderingContext2D, x: number, topY: number, bottomY: number) {
  const levels = 3;
  const landingW = 12;
  const stepH = (bottomY - topY) / levels;

  ctx.strokeStyle = PALETTE.towerMast;
  ctx.lineWidth = 1;
  for (let i = 0; i <= levels; i++) {
    const y = topY + i * stepH;
    // The landing rail itself.
    ctx.beginPath();
    ctx.moveTo(px(x), px(y));
    ctx.lineTo(px(x + landingW), px(y));
    ctx.stroke();
    // A short railing post at its outer corner.
    ctx.beginPath();
    ctx.moveTo(px(x + landingW), px(y));
    ctx.lineTo(px(x + landingW), px(y - 3));
    ctx.stroke();
    if (i < levels) {
      // The diagonal flight down to the next landing, alternating which
      // corner it starts from so it reads as a switchback, not a ladder.
      const fromRight = i % 2 === 0;
      ctx.beginPath();
      ctx.moveTo(px(x + (fromRight ? landingW : 0)), px(y));
      ctx.lineTo(px(x + (fromRight ? 0 : landingW)), px(y + stepH));
      ctx.stroke();
    }
  }
}

/** A post-and-panel yard sign — two thin legs and a rectangle, small enough
 * to read as signage rather than a second structure. */
function drawForSaleSign(ctx: CanvasRenderingContext2D, x: number, groundY: number) {
  const signW = 20;
  const signH = 12;
  const postH = 10;

  ctx.strokeStyle = PALETTE.porchPost;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px(x + 4), px(groundY));
  ctx.lineTo(px(x + 4), px(groundY - postH));
  ctx.moveTo(px(x + signW - 4), px(groundY));
  ctx.lineTo(px(x + signW - 4), px(groundY - postH));
  ctx.stroke();

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(px(x), px(groundY - postH - signH + 2), signW, signH);
  ctx.fillStyle = PALETTE.forSaleSign;
  ctx.fillRect(px(x - 1), px(groundY - postH - signH), signW, signH);
  // Two scribbled lines standing in for the sign's own text — legible as
  // "something is written here" without needing real type at this scale.
  ctx.strokeStyle = PALETTE.forSaleText;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px(x + 3), px(groundY - postH - signH * 0.62));
  ctx.lineTo(px(x + signW - 4), px(groundY - postH - signH * 0.62));
  ctx.moveTo(px(x + 5), px(groundY - postH - signH * 0.3));
  ctx.lineTo(px(x + signW - 7), px(groundY - postH - signH * 0.3));
  ctx.stroke();
}

/** A swing set — an A-frame at each end, a crossbar, two hanging seats.
 * Static, no one on it, per "the swing set is still up" — a detail that's
 * doing the work of a family who isn't there any more. */
function drawSwingSet(ctx: CanvasRenderingContext2D, x: number, groundY: number) {
  const w = 34;
  const barY = groundY - 22;

  ctx.strokeStyle = PALETTE.swingFrame;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // Left A-frame.
  ctx.moveTo(px(x - 4), px(groundY));
  ctx.lineTo(px(x + 5), px(barY));
  ctx.lineTo(px(x + 14), px(groundY));
  // Right A-frame.
  ctx.moveTo(px(x + w - 14), px(groundY));
  ctx.lineTo(px(x + w - 5), px(barY));
  ctx.lineTo(px(x + w + 4), px(groundY));
  // Crossbar.
  ctx.moveTo(px(x + 5), px(barY));
  ctx.lineTo(px(x + w - 5), px(barY));
  ctx.stroke();

  ctx.strokeStyle = PALETTE.swingChain;
  ctx.lineWidth = 1;
  for (const seatX of [x + w * 0.32, x + w * 0.68]) {
    ctx.beginPath();
    ctx.moveTo(px(seatX - 3), px(barY));
    ctx.lineTo(px(seatX - 2), px(groundY - 5));
    ctx.moveTo(px(seatX + 3), px(barY));
    ctx.lineTo(px(seatX + 2), px(groundY - 5));
    ctx.stroke();
    ctx.fillStyle = PALETTE.swingSeat;
    ctx.fillRect(px(seatX - 4), px(groundY - 6), 8, 2);
  }
}

/**
 * Redrawn over the player rather than under them: the wall, in five pieces
 * that trace around the two window cutouts `drawHouse` already put there,
 * so the only place the sprite (drawn just before this) still shows through
 * is exactly where a window already was. Same geometry `drawHouse` computes
 * — this has to match it exactly or the "windows" stop lining up with the
 * ones already painted underneath.
 */
function drawHomeInteriorMask(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  const { bodyY, winY, winSize, win1X, win2X } = houseWindowGeometry(loc);
  const bodyBottom = loc.y + loc.h;

  // Same sprite-or-flat branch `drawHouse` took on its own wall — the two
  // never disagree within a frame (`spriteSheetReady` only ever flips once,
  // on load), but if this drew flat while the wall itself was sprite tile,
  // every non-window inch of the house would show a mismatched colour patch
  // the moment the game opens confined to it.
  if (spriteSheetReady()) {
    const kit = wallKitFor(loc.id);
    const origin: [number, number] = [loc.x, bodyY];
    drawWallBand(ctx, kit, loc.x, bodyY, loc.w, winY - bodyY, ...origin); // above the windows
    drawWallBand(ctx, kit, loc.x, winY + winSize, loc.w, bodyBottom - (winY + winSize), ...origin); // below
    drawWallBand(ctx, kit, loc.x, winY, win1X - loc.x, winSize, ...origin); // left of window 1
    drawWallBand(ctx, kit, win1X + winSize, winY, win2X - (win1X + winSize), winSize, ...origin); // between
    drawWallBand(ctx, kit, win2X + winSize, winY, loc.x + loc.w - (win2X + winSize), winSize, ...origin); // right of window 2
    return;
  }

  ctx.fillStyle = PALETTE.wallA;
  ctx.fillRect(loc.x, bodyY, loc.w, winY - bodyY); // above the windows
  ctx.fillRect(loc.x, winY + winSize, loc.w, bodyBottom - (winY + winSize)); // below
  ctx.fillRect(loc.x, winY, win1X - loc.x, winSize); // left of window 1
  ctx.fillRect(win1X + winSize, winY, win2X - (win1X + winSize), winSize); // between
  ctx.fillRect(win2X + winSize, winY, loc.x + loc.w - (win2X + winSize), winSize); // right of window 2
}

/** The school: the plain flat-roofed civic box, plus the two things that
 * actually say "school" — a pediment band over the entrance, steps, and a
 * flagpole taller than the roofline at one corner. */
function drawSchool(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const roofH = 14;
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  if (spriteSheetReady()) {
    drawSpriteBuildingShell(ctx, loc, roofH);
  } else {
    ctx.fillStyle = PALETTE.wallA;
    ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
    ctx.fillStyle = PALETTE.roofA;
    ctx.fillRect(loc.x + 4, loc.y, loc.w - 8, roofH);
    ctx.fillRect(loc.x, loc.y + roofH - 4, loc.w, 4);
  }

  const doorW = loc.w * 0.16;

  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x, loc.y + loc.h - 5, loc.w, 5);

  drawWindows(ctx, loc, false);

  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(px(loc.x + loc.w / 2 - doorW / 2), loc.y + loc.h - 3, doorW, 3);

  /*
   * An entrance portico — a flat canopy on two support posts standing
   * proud of the wall, replacing the old sign band that just sat flush
   * against it. Drawn last so it occludes the window grid behind it, the
   * same "projecting feature drawn over everything else" trick the house's
   * porch canopy uses.
   */
  const porticoW = doorW + 12;
  const porticoX = loc.x + loc.w / 2 - porticoW / 2;
  const porticoY = loc.y + roofH;
  const porticoDepth = 5;
  const postBottom = loc.y + loc.h - 8;
  ctx.fillStyle = PALETTE.pillar;
  ctx.fillRect(px(porticoX + 1), porticoY + porticoDepth, 2, postBottom - (porticoY + porticoDepth));
  ctx.fillRect(px(porticoX + porticoW - 3), porticoY + porticoDepth, 2, postBottom - (porticoY + porticoDepth));
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(px(porticoX - 1), porticoY + porticoDepth, porticoW + 2, 2);
  ctx.fillStyle = PALETTE.schoolSign;
  ctx.fillRect(px(porticoX), porticoY, porticoW, porticoDepth);

  const poleX = loc.x + loc.w - 10;
  ctx.fillStyle = PALETTE.flagpole;
  ctx.fillRect(px(poleX), loc.y - 16, 2, 16 + roofH);
  ctx.fillStyle = PALETTE.flag;
  ctx.fillRect(px(poleX + 2), loc.y - 14, 8, 6);

  drawGlitchTear(ctx, loc, tier, roofH);
}

/** The library: columns and a triangular pediment instead of a flat inset
 * roof — the one building in town dressed up to look civic on purpose,
 * which is exactly what the blurb's "public records" gravity calls for. */
function drawLibrary(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const roofH = 16;
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  // No separate roof rect to sprite — the pediment triangle below covers
  // everything above the wall, same as it always has.
  if (spriteSheetReady()) {
    drawWallBand(ctx, wallKitFor(loc.id), loc.x, loc.y + roofH, loc.w, loc.h - roofH);
  } else {
    ctx.fillStyle = PALETTE.wallA;
    ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
  }

  ctx.fillStyle = PALETTE.pediment;
  ctx.beginPath();
  ctx.moveTo(px(loc.x), px(loc.y + roofH));
  ctx.lineTo(px(loc.x + loc.w / 2), px(loc.y));
  ctx.lineTo(px(loc.x + loc.w), px(loc.y + roofH));
  ctx.closePath();
  ctx.fill();

  const cols = Math.max(3, Math.floor(loc.w / 28));
  const colW = 5;
  ctx.fillStyle = PALETTE.pillar;
  for (let i = 0; i < cols; i++) {
    const cx = loc.x + ((i + 0.5) * loc.w) / cols;
    ctx.fillRect(px(cx - colW / 2), loc.y + roofH, colW, loc.h - roofH - 4);
  }
  ctx.fillStyle = PALETTE.pillarShade;
  for (let i = 0; i < cols; i++) {
    const cx = loc.x + ((i + 0.5) * loc.w) / cols;
    ctx.fillRect(px(cx - colW / 2), loc.y + loc.h - 6, colW, 2);
  }

  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x, loc.y + loc.h - 4, loc.w, 4);

  drawGlitchTear(ctx, loc, tier, roofH);
}

/** Town Square: paving, not a wall — this is ground the town built around,
 * not a building. A bandstand at the centre (the ambient text's own
 * "cameras on the bandstand" line), a banner strung between posts, benches
 * — and, at the four corners, the town's own dead-centre park: this is
 * both halves of "city hall and park in the middle of town" at once, the
 * civic authority (the banner, the bandstand) and the green space people
 * actually use, in the one spot on the map every district borders. */
function drawPlaza(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  if (spriteSheetReady()) {
    drawNineSliceRect(ctx, roofKitFor(loc.id), loc.x, loc.y, loc.w, loc.h);
  } else {
    ctx.fillStyle = PALETTE.pavingDark;
    ctx.fillRect(loc.x, loc.y, loc.w, loc.h);
    ctx.fillStyle = PALETTE.pavingLight;
    for (let y = loc.y; y < loc.y + loc.h; y += 10) {
      for (let x = loc.x + (((y - loc.y) / 10) % 2) * 10; x < loc.x + loc.w; x += 20) {
        ctx.fillRect(x, y, 10, 10);
      }
    }
  }

  for (const [cx, cy] of [
    [loc.x + 14, loc.y + 14],
    [loc.x + loc.w - 14, loc.y + 14],
    [loc.x + 14, loc.y + loc.h - 14],
    [loc.x + loc.w - 14, loc.y + loc.h - 14],
  ]) {
    drawTree(ctx, { id: `plaza:${loc.id}:${cx}:${cy}`, x: cx - 10, y: cy - 20, w: 20, h: 40, kind: 'tree' });
  }

  // A couple of market stalls — a single umbrella tile is shorthand enough
  // to read as one, no cart body needed. "City hall and the park people
  // actually use" wants a square that looks occupied, not just landscaped.
  if (spriteSheetReady()) {
    drawCityTileAt(ctx, MARKET_UMBRELLA_GREEN, px(loc.x + loc.w * 0.25 - TILE / 2), px(loc.y + loc.h * 0.65 - TILE / 2));
    drawCityTileAt(ctx, MARKET_UMBRELLA_ORANGE, px(loc.x + loc.w * 0.75 - TILE / 2), px(loc.y + loc.h * 0.65 - TILE / 2));
  }

  const bx = loc.x + loc.w / 2;

  // The clock tower — Main Street's own skyline landmark, standing where
  // the bandstand used to. Downtown had no answer to the SafeTrace Tower
  // or the Scrapyard's smokestack: every other district a player can name
  // from across the map by its own silhouette, and this was the one gap.
  // Warm brick rather than either of those two, and short enough that the
  // Tower still reads as the tallest thing in Bellhaven — this is
  // Downtown's landmark, not a rival to the Civic Zone's.
  const towerBaseY = loc.y + loc.h * 0.46;
  const towerW = 20;
  const towerH = 58;
  const capH = 9;
  const towerTopY = towerBaseY - towerH;

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(px(bx), px(towerBaseY + 2), towerW / 2 + 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = PALETTE.clockTower;
  ctx.fillRect(px(bx - towerW / 2), px(towerTopY), towerW, towerH);
  ctx.fillStyle = PALETTE.clockTowerDark;
  ctx.fillRect(px(bx - towerW / 2), px(towerTopY), towerW * 0.28, towerH);

  ctx.fillStyle = PALETTE.clockTowerDark;
  ctx.beginPath();
  ctx.moveTo(px(bx - towerW / 2 - 3), px(towerTopY));
  ctx.lineTo(px(bx), px(towerTopY - capH));
  ctx.lineTo(px(bx + towerW / 2 + 3), px(towerTopY));
  ctx.closePath();
  ctx.fill();

  // The clock face, high on the shaft — a pale disc with two hands fixed
  // at ten past six, the one clock in Bellhaven that always agrees with
  // itself.
  const clockY = towerTopY + 16;
  ctx.fillStyle = PALETTE.clockFace;
  ctx.beginPath();
  ctx.arc(px(bx), px(clockY), 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.clockTowerDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px(bx), px(clockY));
  ctx.lineTo(px(bx), px(clockY - 4));
  ctx.moveTo(px(bx), px(clockY));
  ctx.lineTo(px(bx + 3), px(clockY));
  ctx.stroke();

  ctx.strokeStyle = PALETTE.bandstandPost;
  ctx.lineWidth = 2;
  const py = loc.y + loc.h - 20;
  ctx.beginPath();
  ctx.moveTo(loc.x + 8, py);
  ctx.lineTo(loc.x + loc.w - 8, py);
  ctx.stroke();
  ctx.fillStyle = PALETTE.banner;
  ctx.fillRect(px(loc.x + loc.w * 0.28), py, loc.w * 0.44, 10);
  ctx.fillStyle = PALETTE.bannerText;
  ctx.fillRect(px(loc.x + loc.w * 0.3), py + 3, loc.w * 0.4, 3);

  ctx.fillStyle = PALETTE.bench;
  ctx.fillRect(loc.x + 10, loc.y + loc.h - 12, 16, 4);
  ctx.fillRect(loc.x + loc.w - 26, loc.y + loc.h - 12, 16, 4);
}

/** A four-post, pointed-roof gazebo — the same post-and-roof shape
 * `drawPlaza`'s bandstand uses, pulled out to its own function because The
 * Green's version is a real focal point (bigger, its own name in the
 * design) rather than a detail buried in a civic plaza. `groundY` is where
 * the posts meet the path, not the sprite's own center. */
function drawGazebo(ctx: CanvasRenderingContext2D, cx: number, groundY: number) {
  const w = 40;
  const postH = 24;
  const roofH = 12;

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(px(cx), px(groundY + 2), w / 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = PALETTE.bandstandPost;
  ctx.fillRect(px(cx - w / 2 + 2), px(groundY - postH), 3, postH);
  ctx.fillRect(px(cx + w / 2 - 5), px(groundY - postH), 3, postH);
  ctx.fillRect(px(cx - 3), px(groundY - postH), 3, postH);
  ctx.fillRect(px(cx + 2), px(groundY - postH), 3, postH * 0.4);

  ctx.fillStyle = PALETTE.bandstandRoof;
  ctx.beginPath();
  ctx.moveTo(px(cx - w / 2 - 3), px(groundY - postH));
  ctx.lineTo(px(cx), px(groundY - postH - roofH));
  ctx.lineTo(px(cx + w / 2 + 3), px(groundY - postH));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.bandstandPost;
  ctx.fillRect(px(cx - 1), px(groundY - postH - roofH - 3), 2, 4);
}

/** A rectangular hedge border — four `drawHedge` strips (the same procedural
 * shape ordinary `'hedge'` obstacles already use, called directly rather
 * than added to `OBSTACLES`) framing open lawn, so The Green's two garden
 * panels read as planted rather than just mown. Purely decorative, same as
 * `drawPlaza`'s inline corner trees: not a collision rect, nothing here
 * needs `check-connectivity.mjs`. */
function drawHedgeBorder(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: string) {
  const t = 8;
  drawHedge(ctx, { id: `${seed}:n`, x, y, w, h: t, kind: 'hedge' });
  drawHedge(ctx, { id: `${seed}:s`, x, y: y + h - t, w, h: t, kind: 'hedge' });
  drawHedge(ctx, { id: `${seed}:w`, x, y: y + t, w: t, h: h - t * 2, kind: 'hedge' });
  drawHedge(ctx, { id: `${seed}:e`, x: x + w - t, y: y + t, w: t, h: h - t * 2, kind: 'hedge' });
}

/**
 * The Green's own community garden bed — three or four raised rows in
 * turned soil, a low wood frame, and every other row already growing.
 * Liberty Park's less-obvious point of interest: nothing marks it, no
 * blurb explains it, it's just proof somebody comes back to the same
 * patch of ground on purpose, which a park that's only a fountain and a
 * lawn can't say on its own. Purely decorative, same as `drawHedgeBorder`.
 */
function drawGardenBed(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = PALETTE.plankDark;
  ctx.fillRect(px(x - 2), px(y - 2), w + 4, h + 4);
  ctx.fillStyle = PALETTE.gardenSoilDark;
  ctx.fillRect(px(x), px(y), w, h);

  const rows = Math.max(2, Math.floor(h / 10));
  const rowH = h / rows;
  for (let r = 0; r < rows; r++) {
    const ry = y + r * rowH + 1;
    ctx.fillStyle = PALETTE.gardenSoil;
    ctx.fillRect(px(x + 1), px(ry), w - 2, rowH - 2);
    if (r % 2 === 0) {
      ctx.fillStyle = PALETTE.gardenLeaf;
      for (let gx = x + 3; gx < x + w - 3; gx += 6) {
        ctx.fillRect(px(gx), px(ry + rowH * 0.25), 3, 3);
      }
    }
  }
}

/**
 * The fountain. A stone kerb, water in the basin, a two-tier head, and a
 * plume that rises and falls on a slow cycle — the one thing on this map
 * that moves because it is pleasant rather than because it is watching
 * something. Falls back to the sheet's own pond tile for the water when
 * the sprites are loaded, so the basin matches every other water surface
 * in town; the stonework and the head are drawn either way.
 */
function drawFountain(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, seed: string, now: number) {
  const r = size / 2;

  ctx.fillStyle = PALETTE.pavingDark;
  ctx.beginPath();
  ctx.ellipse(px(cx), px(cy), r + 4, r * 0.72 + 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.pillar;
  ctx.beginPath();
  ctx.ellipse(px(cx), px(cy), r + 2, r * 0.72 + 2, 0, 0, Math.PI * 2);
  ctx.fill();

  if (spriteSheetReady()) {
    drawSpriteTile(ctx, POND_TILE, cx, cy, size, size * 0.78);
  } else {
    ctx.fillStyle = PALETTE.pondWater;
    ctx.beginPath();
    ctx.ellipse(px(cx), px(cy), r, r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // The head: a plinth, a lower bowl, an upper bowl, and the plume.
  ctx.fillStyle = PALETTE.pillarShade;
  ctx.fillRect(px(cx - 3), px(cy - r * 0.5), 6, r * 0.6);
  ctx.fillStyle = PALETTE.pillar;
  ctx.beginPath();
  ctx.ellipse(px(cx), px(cy - r * 0.5), r * 0.5, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(px(cx - 2), px(cy - r * 1.0), 4, r * 0.5);
  ctx.beginPath();
  ctx.ellipse(px(cx), px(cy - r * 1.0), r * 0.28, r * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Water. Two arcs off the upper bowl and a plume above it, all keyed to
  // one slow shared cycle so the whole thing breathes rather than ticks.
  const t = ((now + noise(`fountain:${seed}`)() * 1000) % 2400) / 2400;
  const lift = 3 + Math.sin(t * Math.PI * 2) * 2;
  ctx.strokeStyle = PALETTE.riverRipple;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px(cx), px(cy - r * 1.05 - lift));
  ctx.lineTo(px(cx), px(cy - r * 1.05));
  ctx.stroke();
  ctx.strokeStyle = PALETTE.pondWater;
  ctx.lineWidth = 1;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(px(cx), px(cy - r * 1.02));
    ctx.quadraticCurveTo(px(cx + dir * r * 0.4), px(cy - r * 0.9 - lift), px(cx + dir * r * 0.55), px(cy - r * 0.45));
    ctx.stroke();
  }
}

/**
 * COMMUNITY NOT SURVEILLANCE, strung between two posts across the park
 * path. Three words on two lines, drawn at a size a 16px-tile town can
 * actually carry: the canvas has no font stack of its own (the game keeps
 * its type in the DOM), so this is the one place worth spending a real
 * `fillText` call — a banner nobody can read is just a rectangle, and the
 * whole reason the council keeps asking for it to come down is that people
 * can read it.
 */
function drawCommonsBanner(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number) {
  const w = x1 - x0;

  ctx.fillStyle = PALETTE.bandstandPost;
  ctx.fillRect(px(x0), px(y), 2, 30);
  ctx.fillRect(px(x1), px(y), 2, 30);

  // A slack line between the posts, and the cloth hanging off it.
  ctx.strokeStyle = PALETTE.bandstandPost;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px(x0), px(y + 2));
  ctx.quadraticCurveTo(px(x0 + w / 2), px(y + 6), px(x1), px(y + 2));
  ctx.stroke();

  ctx.fillStyle = PALETTE.banner;
  ctx.fillRect(px(x0), px(y + 4), w, 18);
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  ctx.fillRect(px(x0), px(y + 20), w, 2);

  ctx.save();
  ctx.fillStyle = PALETTE.bannerText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '7px monospace';
  ctx.fillText('COMMUNITY', px(x0 + w / 2), px(y + 10));
  ctx.fillText('NOT SURVEILLANCE', px(x0 + w / 2), px(y + 18));
  ctx.restore();
}

/**
 * THE GREEN, and the fountain at the exact middle of the map.
 *
 * Liberty Park is the centre cell of the 3x3 and this is the centre of
 * Liberty Park, so the fountain sits at the Green's own true centre rather
 * than off on one side of a single path — the one point a player can
 * orient the whole town by. Four paths run out from it to all four edges
 * of the rect, matching the park's four outside entrances (`ROAD_SEGMENTS`'s
 * path tier), so the cross a player stands on in here is the same cross
 * the roads outside are already making. That cross also cuts the lawn into
 * four quarters, and rather than repeat one hedge-bordered panel four
 * times, each quarter gets its own reason to exist:
 *
 *  - NW, the formal quarter: hedge-bordered lawn, the gazebo on its own
 *    western arm — the first landmark reached from the Old Market entrance.
 *  - NE, deliberately bare. Liberty Park is the one block the surveillance
 *    gradient falls away toward (`locations.ts`'s own district note), and
 *    the corner facing the Civic Zone is the one place that should be
 *    *visible* rather than just written down — no hedge, no canopy,
 *    nothing between a player standing here and the SafeTrace Tower two
 *    blocks away.
 *  - SW, the hidden corner: bushes and a rock the mower goes around, and a
 *    bench about the business of not being seen from the path.
 *  - SE, the less-obvious point of interest: a community garden bed
 *    nothing marks and no blurb explains — just proof somebody comes back.
 *
 * The banner is the one piece of lettering on this canvas that isn't a
 * shape standing in for type, and it earns that: it is the only sentence
 * anybody in Bellhaven has said out loud in public, and the council has
 * asked twice to have it taken down (see the location's own blurb). It is
 * drawn, never spoken — no scene explains it, the same rule the Gen A mark
 * is held to.
 */
function drawGreen(ctx: CanvasRenderingContext2D, loc: OverworldLocation, now: number) {
  ctx.fillStyle = PALETTE.lawnBase;
  ctx.fillRect(loc.x, loc.y, loc.w, loc.h);
  ctx.fillStyle = PALETTE.lawnAlt;
  for (let y = loc.y; y < loc.y + loc.h; y += 14) {
    for (let x = loc.x + (((y - loc.y) / 14) % 2) * 14; x < loc.x + loc.w; x += 28) {
      ctx.fillRect(x, y, 14, 14);
    }
  }

  const cx = loc.x + loc.w / 2;
  const cy = loc.y + loc.h / 2;
  const pathW = 16;

  if (spriteSheetReady()) {
    drawNineSliceRect(ctx, PATH_KIT, loc.x, cy - pathW / 2, loc.w, pathW);
    drawNineSliceRect(ctx, PATH_KIT, cx - pathW / 2, loc.y, pathW, loc.h);
  } else {
    ctx.fillStyle = PALETTE.pathFill;
    ctx.fillRect(loc.x, cy - pathW / 2, loc.w, pathW);
    ctx.fillRect(cx - pathW / 2, loc.y, pathW, loc.h);
  }

  // Four quadrants, symmetric around the cross — margin from the Green's
  // own edge, gap from the path, wide enough to leave the fountain's own
  // plaza room to breathe at the centre.
  const margin = 10;
  const gap = 22;
  const qW = cx - pathW / 2 - gap - (loc.x + margin);
  const qH = cy - pathW / 2 - gap - (loc.y + margin);
  const nwX = loc.x + margin;
  const nwY = loc.y + margin;
  const neX = cx + pathW / 2 + gap;
  const neY = loc.y + margin;
  const swX = loc.x + margin;
  const swY = cy + pathW / 2 + gap;
  const seX = cx + pathW / 2 + gap;
  const seY = cy + pathW / 2 + gap;

  drawHedgeBorder(ctx, nwX, nwY, qW, qH, `${loc.id}:nw`);

  // The open sightline: a worn-ground tint rather than more lawn, so the
  // one quarter with nothing planted in it still reads as a place, not a
  // rendering gap.
  ctx.fillStyle = PALETTE.pathFill;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(px(neX), px(neY), qW, qH);
  ctx.globalAlpha = 1;

  const swRand = noise(`${loc.id}:sw`);
  for (let i = 0; i < 5; i++) {
    const bx = swX + swRand() * (qW - 16);
    const by = swY + swRand() * (qH - 24);
    drawBush(ctx, { id: `${loc.id}:sw:bush:${i}`, x: bx, y: by, w: 16, h: 24, kind: 'bush' });
  }
  drawRock(ctx, { id: `${loc.id}:sw:rock`, x: swX + qW * 0.6, y: swY + qH * 0.1, w: 22, h: 18, kind: 'rock' });
  drawParkBench(ctx, { id: `${loc.id}:sw:bench`, x: swX + qW * 0.12, y: swY + qH * 0.5, w: 8, h: 22, kind: 'bench' });

  drawGardenBed(ctx, seX + qW * 0.12, seY + qH * 0.2, qW * 0.76, qH * 0.6);

  drawGazebo(ctx, loc.x + loc.w * 0.12, cy);

  const fountainSize = Math.min(loc.w, loc.h) * 0.24;
  drawFountain(ctx, cx, cy, fountainSize, loc.id, now);

  // A ring of benches facing the water — the plaza's own obvious point of
  // interest, the one nobody has to be told is there.
  const kerb = fountainSize / 2 + 8;
  drawParkBench(ctx, { id: `${loc.id}:ring:n`, x: cx - 11, y: cy - kerb - 9, w: 22, h: 8, kind: 'bench' });
  drawParkBench(ctx, { id: `${loc.id}:ring:s`, x: cx - 11, y: cy + kerb + 1, w: 22, h: 8, kind: 'bench' });

  drawCommonsBanner(ctx, loc.x + loc.w * 0.16, loc.x + loc.w * 0.4, cy - 34);

  // Canopy everywhere but the open north-east quarter: the three outer
  // corners, and a pair flanking the north path's own mouth.
  for (const [tx, ty] of [
    [loc.x + 14, loc.y + 14],
    [loc.x + 14, loc.y + loc.h - 14],
    [loc.x + loc.w - 14, loc.y + loc.h - 14],
    [cx - 20, loc.y + 14],
  ]) {
    drawTree(ctx, { id: `green:${loc.id}:${tx}:${ty}`, x: tx - 10, y: ty - 20, w: 20, h: 40, kind: 'tree' });
  }
}

/** The Annex's warehouses: corrugated roofing (ridge lines, roof vents) and
 * a roll-up door taking up most of the front wall — the industrial building
 * every generic box in the Annex used to stand in for, whichever of the
 * three (deja_jobsite, fenwick_lot, annex_fence) is asking for it. */
function drawWarehouse(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  const roofH = 10;
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  // The Roguelike City Pack's grey concrete, not the RPG Urban Pack's brick
  // — this one reads as industrial/utilitarian rather than corporate-clean,
  // so unlike `drawBuilding`'s Language A/B split it's fair game regardless
  // of which language a given warehouse location is coded.
  if (citySheetReady()) {
    drawNineSliceRect(ctx, ROOF_INDUSTRIAL, loc.x, loc.y, loc.w, roofH, drawCityTileAt);
    drawWallBand(ctx, WALL_INDUSTRIAL, loc.x, loc.y + roofH, loc.w, loc.h - roofH, loc.x, loc.y + roofH, drawCityTileAt);
  } else {
    ctx.fillStyle = PALETTE.wallB;
    ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
    ctx.fillStyle = PALETTE.corrugated;
    ctx.fillRect(loc.x, loc.y, loc.w, roofH);
  }

  // The ridge lines still draw over either the flat colour or the sprite
  // slab — a ribbed-roof detail neither one has on its own.
  ctx.strokeStyle = PALETTE.corrugatedLine;
  ctx.lineWidth = 1;
  for (let x = loc.x + 4; x < loc.x + loc.w; x += 6) {
    ctx.beginPath();
    ctx.moveTo(px(x), loc.y);
    ctx.lineTo(px(x), loc.y + roofH);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.vent;
  ctx.fillRect(px(loc.x + loc.w * 0.25), loc.y - 3, 5, 4);
  ctx.fillRect(px(loc.x + loc.w * 0.65), loc.y - 3, 5, 4);

  /*
   * A SERVICE DOOR at the building's own back corner, and a dock apron in
   * front of the roll door.
   *
   * The route design asks that important buildings have an obvious way in
   * *and* a less obvious one, and until now every warehouse in The Works
   * had exactly one opening: a roll door the width of half its frontage,
   * facing the street. A player could be told there was a back way in and
   * see nothing on the building to back that up. This is the tell — a
   * single person-width steel door, no canopy, no sign, tucked against the
   * upper corner away from the roll door, with the step and the wall lamp
   * that mark a door somebody actually uses.
   *
   * It alternates corners per location id so a row of yards doesn't read
   * as one building repeated, and it's drawn *before* the roll door so a
   * narrow building's two openings can never fight over the same pixels.
   */
  const serviceLeft = noise(`service:${loc.id}`)() > 0.5;
  const svcW = 9;
  const svcX = serviceLeft ? loc.x + 5 : loc.x + loc.w - svcW - 5;
  const svcY = loc.y + roofH + 3;
  ctx.fillStyle = PALETTE.vent;
  ctx.fillRect(px(svcX), px(svcY), svcW, 13);
  ctx.fillStyle = PALETTE.rollDoorLine;
  ctx.fillRect(px(svcX + (serviceLeft ? svcW - 3 : 1)), px(svcY + 6), 2, 2); // the handle
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(px(svcX - 1), px(svcY + 13), svcW + 2, 2); // the step
  // A bulkhead lamp over it, lit — somebody comes and goes through here.
  ctx.fillStyle = PALETTE.windowLit;
  ctx.fillRect(px(svcX + svcW / 2 - 1), px(svcY - 2), 3, 2);
  ctx.fillStyle = 'rgba(240, 192, 122, 0.14)';
  ctx.beginPath();
  ctx.arc(px(svcX + svcW / 2), px(svcY - 1), 9, 0, Math.PI * 2);
  ctx.fill();

  const doorW = loc.w * 0.5;
  const doorH = loc.h - roofH - 10;
  const doorX = loc.x + loc.w / 2 - doorW / 2;
  // The dock apron: a concrete lip the width of the roll door, standing
  // proud of the wall, with the two bumpers a truck actually backs onto.
  ctx.fillStyle = PALETTE.pavingDark;
  ctx.fillRect(px(doorX - 3), px(loc.y + loc.h - 2), doorW + 6, 7);
  ctx.fillStyle = PALETTE.gateArmDark;
  ctx.fillRect(px(doorX + 2), px(loc.y + loc.h + 2), 6, 3);
  ctx.fillRect(px(doorX + doorW - 8), px(loc.y + loc.h + 2), 6, 3);
  ctx.fillStyle = PALETTE.rollDoor;
  ctx.fillRect(px(doorX), loc.y + roofH + 4, doorW, doorH);
  ctx.strokeStyle = PALETTE.rollDoorLine;
  for (let y = loc.y + roofH + 8; y < loc.y + roofH + 4 + doorH; y += 5) {
    ctx.beginPath();
    ctx.moveTo(px(doorX), y);
    ctx.lineTo(px(doorX + doorW), y);
    ctx.stroke();
  }

  /*
   * A loading-dock canopy over the roll door — a flat strip on angled
   * brackets, projecting past the door the way a real dock awning has to
   * keep rain off whatever's being loaded. The industrial counterpart to
   * the shop's own awning overhang.
   */
  const dockOverhang = 5;
  const dockDepth = 4;
  const dockY = loc.y + roofH;
  ctx.fillStyle = PALETTE.corrugated;
  ctx.fillRect(px(doorX - dockOverhang), dockY, doorW + dockOverhang * 2, dockDepth);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(px(doorX - dockOverhang), dockY + dockDepth, doorW + dockOverhang * 2, 2);
  ctx.strokeStyle = PALETTE.corrugatedLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px(doorX - dockOverhang + 2), dockY + dockDepth);
  ctx.lineTo(px(doorX + 3), dockY + dockDepth + 6);
  ctx.moveTo(px(doorX + doorW + dockOverhang - 2), dockY + dockDepth);
  ctx.lineTo(px(doorX + doorW - 3), dockY + dockDepth + 6);
  ctx.stroke();

  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x, loc.y + loc.h - 5, loc.w, 5);

  drawTag(ctx, loc, roofH);
  drawWarehouseYardProps(ctx, loc);
}

/**
 * Five industrial locations share `drawWarehouse`'s shell (same
 * roll door, same corrugated roof) because they're the same *kind* of
 * building — but each one's own blurb already describes a completely
 * different yard (cable spools, three bins, a fence with a gap, a dead rail
 * siding, a stacked-car scrapyard), and none of that ever reached the
 * canvas. This is what makes five warehouses read as five different places
 * instead of one shape repeated five times — a couple of id-keyed props in
 * the yard, drawn with the same primitives the Obstacle system already
 * uses (`drawFence`, `drawBin`, `drawCrate`, `drawBarrel`) but as pure
 * decoration, never registered in `OBSTACLES`, so there's no collision or
 * connectivity-graph risk to re-check.
 */
function drawWarehouseYardProps(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  const yardY = loc.y + loc.h + 4;

  switch (loc.id) {
    case 'deja_jobsite': {
      // "Spools of cable" — two cable reels, concentric rings on their side,
      // stacked near the gate rather than centred, the way real cable drums
      // get dumped and left rather than arranged.
      drawCableSpool(ctx, loc.x + 14, yardY + 10, 12);
      drawCableSpool(ctx, loc.x + 32, yardY + 14, 9);
      break;
    }
    case 'fenwick_lot': {
      // "Three bins" — literally three, lined up along the front wall.
      const binW = 12;
      const binH = 14;
      for (let i = 0; i < 3; i++) {
        drawBin(ctx, { id: `${loc.id}-bin-${i}`, x: loc.x + 10 + i * (binW + 6), y: yardY, w: binW, h: binH, kind: 'bin' });
      }
      // The table the market's own trust ambience keeps describing
      // ("busier... a second chair and a flask") and that nothing on the
      // canvas had ever drawn. The market screen is a menu; this is the
      // one place the economy has a body.
      drawMarketStall(ctx, loc.x + loc.w * 0.5, yardY + 4, 42);
      break;
    }
    case 'annex_fence': {
      // "A fence with a gap somebody keeps re-opening" — two chain-link runs
      // with a deliberate break between them, not one continuous line.
      const fenceH = 20;
      const gap = 14;
      const run = (loc.w - gap) / 2;
      drawFence(ctx, { id: `${loc.id}-fence-l`, x: loc.x, y: yardY, w: run, h: fenceH, kind: 'fence' });
      drawFence(ctx, { id: `${loc.id}-fence-r`, x: loc.x + run + gap, y: yardY, w: run, h: fenceH, kind: 'fence' });
      break;
    }
    case 'rail_spur': {
      drawBoxcar(ctx, loc.x + loc.w / 2, yardY + 14, Math.min(loc.w - 20, 96));
      break;
    }
    case 'scrapyard': {
      // "Stacked cars, a crane" — two crate-shaped hulks offset to read as a
      // stack rather than a row, plus a simple crane silhouette in the corner.
      drawCrate(ctx, { id: `${loc.id}-stack-a`, x: loc.x + 8, y: yardY, w: 20, h: 14, kind: 'crate' });
      drawCrate(ctx, { id: `${loc.id}-stack-b`, x: loc.x + 12, y: yardY - 9, w: 16, h: 11, kind: 'crate' });
      drawBarrel(ctx, { id: `${loc.id}-barrel`, x: loc.x + 36, y: yardY + 2, w: 10, h: 10, kind: 'barrel' });
      drawCrane(ctx, loc.x + loc.w - 30, loc.y + loc.h);
      drawSmokestack(ctx, loc.x + 24, loc.y + 10, 80);
      break;
    }
  }
}

/**
 * Fenwick Lot's own market table — a lean-to tarp on one pole over a
 * folding table, two stools underneath. The black market has always been a
 * full-screen menu (`Market.tsx`), which means the economy has never had a
 * body in the world it's supposed to be part of; this is that body, drawn
 * where the lot's own trust ambience already says it stands. Improvised on
 * purpose — a single pole and an angled tarp, not the park's own gazebo —
 * because this table was never meant to be found.
 */
function drawMarketStall(ctx: CanvasRenderingContext2D, x: number, groundY: number, w: number) {
  const poleH = 18;
  const tableH = 7;

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(px(x), px(groundY + tableH - 1), w, 2);

  ctx.strokeStyle = PALETTE.craneBody;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px(x + w - 3), px(groundY));
  ctx.lineTo(px(x + w - 3), px(groundY - poleH));
  ctx.stroke();

  // The tarp: a lean-to plane from the one pole down to the ground on the
  // open side, not a symmetric awning — this is one pole holding up
  // whatever was on hand, not a structure somebody built to last.
  ctx.fillStyle = PALETTE.tarp;
  ctx.beginPath();
  ctx.moveTo(px(x - 2), px(groundY - 3));
  ctx.lineTo(px(x + w - 3), px(groundY - poleH));
  ctx.lineTo(px(x + w + 3), px(groundY - poleH));
  ctx.lineTo(px(x + 6), px(groundY - 5));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.tarpDark;
  ctx.beginPath();
  ctx.moveTo(px(x + w - 3), px(groundY - poleH));
  ctx.lineTo(px(x + w + 3), px(groundY - poleH));
  ctx.lineTo(px(x + w - 8), px(groundY - poleH * 0.6));
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = PALETTE.bench;
  ctx.fillRect(px(x + 2), px(groundY - tableH), w - 10, tableH);
  ctx.fillStyle = PALETTE.plankDark;
  ctx.fillRect(px(x + 4), px(groundY + 1), 6, 4);
  ctx.fillRect(px(x + w - 20), px(groundY + 1), 6, 4);
}

/**
 * The Scrapyard's own smokestack — The Works' competing skyline landmark
 * against the Civic Zone's SafeTrace Tower, on the same "recognise where
 * you are before you read a label" principle applied to the map's own
 * silhouette: from zoomed out, Bellhaven now has two tall things, on
 * opposite sides of town, and neither one is a building with a paint job.
 * Drawn well clear of the crane (this file's own `scrapyard` case, below),
 * which already claims the building's south-east corner — this one rises
 * from the north-west instead, taller than the crane by a wide margin.
 * No animation (nothing here reads `now`); the two static puffs are enough
 * to say "lit" without needing a per-frame drift.
 */
function drawSmokestack(ctx: CanvasRenderingContext2D, cx: number, baseY: number, h: number) {
  const w = 16;
  const capW = w + 6;

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(px(cx), px(baseY + 2), capW / 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = PALETTE.smokestack;
  ctx.fillRect(px(cx - w / 2), px(baseY - h), w, h);
  ctx.fillStyle = PALETTE.smokestackDark;
  ctx.fillRect(px(cx - w / 2), px(baseY - h), w * 0.3, h);

  ctx.strokeStyle = PALETTE.smokestackDark;
  ctx.lineWidth = 1;
  for (let y = baseY - h + 10; y < baseY - 6; y += 14) {
    ctx.beginPath();
    ctx.moveTo(px(cx - w / 2), px(y));
    ctx.lineTo(px(cx + w / 2), px(y));
    ctx.stroke();
  }

  ctx.fillStyle = PALETTE.smokestackDark;
  ctx.fillRect(px(cx - capW / 2), px(baseY - h - 4), capW, 5);

  ctx.fillStyle = 'rgba(200, 200, 196, 0.22)';
  ctx.beginPath();
  ctx.ellipse(px(cx + 4), px(baseY - h - 16), 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(px(cx + 10), px(baseY - h - 28), 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A cable reel on its side — two concentric rings and a hub, the shape a
 * spent spool of cable actually makes lying flat in a yard. */
function drawCableSpool(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(px(cx), px(cy + r - 1), r, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = PALETTE.spoolBody;
  ctx.beginPath();
  ctx.arc(px(cx), px(cy), r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.spoolLine;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px(cx), px(cy), r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px(cx), px(cy), r * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.spoolLine;
  ctx.beginPath();
  ctx.arc(px(cx), px(cy), r * 0.14, 0, Math.PI * 2);
  ctx.fill();
}

/** One rusted boxcar on a short dead siding — two rail lines with ties
 * running under it, so it reads as parked on a spur rather than floating
 * in the yard. The Rail Spur's own one-boxcar landmark, per its blurb. */
function drawBoxcar(ctx: CanvasRenderingContext2D, cx: number, topY: number, w: number) {
  const h = 20;
  const x = cx - w / 2;
  const railY1 = topY + h + 3;
  const railY2 = topY + h + 7;

  ctx.strokeStyle = PALETTE.rail;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px(x - 10), px(railY1));
  ctx.lineTo(px(x + w + 10), px(railY1));
  ctx.moveTo(px(x - 10), px(railY2));
  ctx.lineTo(px(x + w + 10), px(railY2));
  ctx.stroke();
  ctx.strokeStyle = PALETTE.railTie;
  ctx.lineWidth = 1;
  for (let tx = x - 10; tx <= x + w + 10; tx += 6) {
    ctx.beginPath();
    ctx.moveTo(px(tx), px(railY1 - 1));
    ctx.lineTo(px(tx), px(railY2 + 1));
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(px(x), px(topY + h - 1), w, 2);

  ctx.fillStyle = PALETTE.boxcarBody;
  ctx.fillRect(px(x), px(topY), w, h);
  ctx.fillStyle = PALETTE.boxcarRoof;
  ctx.fillRect(px(x - 1), px(topY - 2), w + 2, 3);
  ctx.strokeStyle = PALETTE.boxcarLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px(x + w * 0.42), px(topY + 2));
  ctx.lineTo(px(x + w * 0.42), px(topY + h - 2));
  ctx.moveTo(px(x + w * 0.58), px(topY + 2));
  ctx.lineTo(px(x + w * 0.58), px(topY + h - 2));
  ctx.stroke();
  ctx.fillStyle = PALETTE.boxcarRust;
  ctx.fillRect(px(x + w * 0.12), px(topY + h * 0.55), w * 0.14, h * 0.4);
  ctx.fillRect(px(x + w * 0.78), px(topY + h * 0.3), w * 0.1, h * 0.3);

  ctx.fillStyle = PALETTE.boxcarWheel;
  ctx.beginPath();
  ctx.arc(px(x + w * 0.18), px(topY + h), 3, 0, Math.PI * 2);
  ctx.arc(px(x + w * 0.82), px(topY + h), 3, 0, Math.PI * 2);
  ctx.fill();
}

/** A gantry crane, drawn as a mast and a boom rather than anything that
 * moves — "hasn't moved in a year" per the Scrapyard's own blurb, so it's a
 * silhouette, not a piece of machinery mid-lift. */
function drawCrane(ctx: CanvasRenderingContext2D, x: number, groundY: number) {
  const mastH = 46;
  const boomLen = 34;
  const topY = groundY - mastH;

  ctx.strokeStyle = PALETTE.craneBody;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px(x), px(groundY));
  ctx.lineTo(px(x), px(topY));
  ctx.lineTo(px(x - boomLen), px(topY + 6));
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px(x + 5), px(groundY));
  ctx.lineTo(px(x + 3), px(topY + 8));
  ctx.stroke();

  ctx.strokeStyle = PALETTE.craneCable;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px(x - boomLen + 4), px(topY + 8));
  ctx.lineTo(px(x - boomLen + 4), px(topY + 22));
  ctx.stroke();
  ctx.fillStyle = PALETTE.craneBody;
  ctx.fillRect(px(x - boomLen), px(topY + 22), 8, 5);
}

/** The Repair Shop: a smaller warehouse — one roll-up door instead of a
 * building-wide one, and a hand-lettered sign panel where the rest of the
 * front wall would be. */
function drawGarage(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  const roofH = 10;
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  if (citySheetReady()) {
    drawNineSliceRect(ctx, ROOF_INDUSTRIAL, loc.x + 3, loc.y, loc.w - 6, roofH, drawCityTileAt);
    drawWallBand(ctx, WALL_INDUSTRIAL, loc.x, loc.y + roofH, loc.w, loc.h - roofH, loc.x, loc.y + roofH, drawCityTileAt);
  } else {
    ctx.fillStyle = PALETTE.wallB;
    ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
    ctx.fillStyle = PALETTE.corrugated;
    ctx.fillRect(loc.x + 3, loc.y, loc.w - 6, roofH);
  }

  const doorW = loc.w * 0.42;
  const doorH = loc.h - roofH - 8;
  const doorX = loc.x + 8;
  ctx.fillStyle = PALETTE.rollDoor;
  ctx.fillRect(doorX, loc.y + roofH + 4, doorW, doorH);
  ctx.strokeStyle = PALETTE.rollDoorLine;
  ctx.lineWidth = 1;
  for (let y = loc.y + roofH + 8; y < loc.y + roofH + 4 + doorH; y += 5) {
    ctx.beginPath();
    ctx.moveTo(doorX, y);
    ctx.lineTo(doorX + doorW, y);
    ctx.stroke();
  }

  // The same small loading-dock canopy `drawWarehouse` gets, scaled to the
  // garage's one door instead of a building-wide one.
  const dockOverhang = 4;
  const dockDepth = 3;
  const dockY = loc.y + roofH;
  ctx.fillStyle = PALETTE.corrugated;
  ctx.fillRect(px(doorX - dockOverhang), dockY, doorW + dockOverhang * 2, dockDepth);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(px(doorX - dockOverhang), dockY + dockDepth, doorW + dockOverhang * 2, 2);
  ctx.strokeStyle = PALETTE.corrugatedLine;
  ctx.beginPath();
  ctx.moveTo(px(doorX - dockOverhang + 2), dockY + dockDepth);
  ctx.lineTo(px(doorX + 2), dockY + dockDepth + 5);
  ctx.moveTo(px(doorX + doorW + dockOverhang - 2), dockY + dockDepth);
  ctx.lineTo(px(doorX + doorW - 2), dockY + dockDepth + 5);
  ctx.stroke();

  ctx.fillStyle = PALETTE.schoolSign;
  ctx.fillRect(px(loc.x + loc.w - 34), loc.y + roofH + 6, 26, 10);

  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x, loc.y + loc.h - 5, loc.w, 5);

  drawTag(ctx, loc, roofH);
  if (loc.id === 'repair_shop') drawWestEndPosterWall(ctx, loc);
}

/** The Ballpark: a field, not a building — grass, a dirt diamond, a
 * bleacher row and two floodlight poles. No wall to glitch or tag; this
 * isn't claiming a corporate-clean surface any more than a camera is. */
function drawBallpark(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  ctx.fillStyle = PALETTE.fieldGrass;
  ctx.fillRect(loc.x, loc.y, loc.w, loc.h);
  ctx.fillStyle = PALETTE.fieldGrassAlt;
  for (let y = loc.y; y < loc.y + loc.h; y += 12) {
    for (let x = loc.x + (((y - loc.y) / 12) % 2) * 12; x < loc.x + loc.w; x += 24) {
      ctx.fillRect(x, y, 12, 12);
    }
  }

  const cx = loc.x + loc.w * 0.42;
  const cy = loc.y + loc.h * 0.6;
  const r = Math.min(loc.w, loc.h) * 0.3;
  ctx.fillStyle = PALETTE.dirt;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.dirtLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx - r, cy);
  ctx.stroke();

  ctx.fillStyle = PALETTE.bleacherDark;
  ctx.fillRect(loc.x, loc.y, loc.w, 10);
  ctx.fillStyle = PALETTE.bleacher;
  ctx.fillRect(loc.x, loc.y, loc.w, 4);

  ctx.fillStyle = PALETTE.bleacherDark;
  ctx.fillRect(px(loc.x + 6), loc.y - 20, 2, 30);
  ctx.fillRect(px(loc.x + loc.w - 8), loc.y - 20, 2, 30);
  ctx.fillStyle = PALETTE.floodlight;
  ctx.fillRect(px(loc.x + 2), loc.y - 22, 10, 4);
  ctx.fillRect(px(loc.x + loc.w - 12), loc.y - 22, 10, 4);
}

/** Sal's: a striped awning over the entrance and a round sign above the
 * roofline — the two tells of a corner pizza place, on an otherwise
 * ordinary Language A box. */
function drawPizza(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const roofH = 10;
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  if (spriteSheetReady()) {
    drawSpriteBuildingShell(ctx, loc, roofH);
  } else {
    ctx.fillStyle = PALETTE.wallA;
    ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
    ctx.fillStyle = PALETTE.roofA;
    ctx.fillRect(loc.x + 3, loc.y, loc.w - 6, roofH);
  }

  // A real overhang rather than a stripe painted flush on the wall — the
  // same projecting-awning grammar `drawShop` uses, kept here in Sal's own
  // red-and-white stripe instead of a solid colour band.
  const awnOverhang = 4;
  const awnW = loc.w * 0.6 + awnOverhang * 2;
  const awnX = loc.x + loc.w / 2 - awnW / 2;
  const stripes = 6;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(px(awnX), loc.y + roofH + 6, awnW, 2);
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? PALETTE.awningRed : PALETTE.awningWhite;
    ctx.fillRect(px(awnX + (i * awnW) / stripes), loc.y + roofH, awnW / stripes, 6);
  }
  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(px(awnX), loc.y + roofH, 2, 8);
  ctx.fillRect(px(awnX + awnW - 2), loc.y + roofH, 2, 8);

  drawWindows(ctx, loc, false);

  ctx.fillStyle = PALETTE.signRed;
  ctx.beginPath();
  ctx.arc(px(loc.x + loc.w * 0.78), loc.y - 4, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x, loc.y + loc.h - 5, loc.w, 5);

  drawGlitchTear(ctx, loc, tier, roofH);
}

/** The Arcade: a glowing marquee sign over the door doing the work a row of
 * windows does everywhere else, and the windows that remain stay dark —
 * screens inside, not daylight, which is most of the appeal. */
function drawArcade(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const roofH = 10;
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  if (spriteSheetReady()) {
    drawSpriteBuildingShell(ctx, loc, roofH);
  } else {
    ctx.fillStyle = PALETTE.wallA;
    ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
    ctx.fillStyle = PALETTE.roofA;
    ctx.fillRect(loc.x + 3, loc.y, loc.w - 6, roofH);
  }

  // The marquee now overhangs the wall on both sides and drops a shadow
  // and angled support cables, instead of sitting flush against the
  // facade — the same projecting-canopy grammar as the shop awning and the
  // dock canopy, applied to a theatre-style sign instead of a roof.
  const mOverhang = 4;
  const mW = loc.w * 0.8 + mOverhang * 2;
  const mX = loc.x + loc.w / 2 - mW / 2;
  const mBottom = loc.y + roofH + 12;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(px(mX), mBottom, mW, 2);
  ctx.fillStyle = PALETTE.marqueeBody;
  ctx.fillRect(px(mX), loc.y + roofH + 2, mW, 10);
  ctx.fillStyle = PALETTE.marqueeGlow;
  ctx.fillRect(px(mX + 3), loc.y + roofH + 4, mW - 6, 4);
  const rand = noise(`arcade:${loc.id}`);
  const bulbs = Math.floor(mW / 6);
  for (let i = 0; i < bulbs; i++) {
    ctx.fillStyle = rand() < 0.8 ? PALETTE.marqueeBulb : PALETTE.bgWindowDark;
    ctx.fillRect(px(mX + i * 6 + 1), loc.y + roofH + 1, 2, 2);
  }
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px(mX + 2), mBottom);
  ctx.lineTo(px(mX + 2 + mOverhang), mBottom + 6);
  ctx.moveTo(px(mX + mW - 2), mBottom);
  ctx.lineTo(px(mX + mW - 2 - mOverhang), mBottom + 6);
  ctx.stroke();

  ctx.fillStyle = PALETTE.windowDark;
  ctx.fillRect(px(loc.x + 6), loc.y + roofH + 16, loc.w - 12, loc.h - roofH - 22);

  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x, loc.y + loc.h - 5, loc.w, 5);

  drawGlitchTear(ctx, loc, tier, roofH);
}

/**
 * The Treehouse — the flagship of the fill-out pass: a trunk and a canopy
 * (the same two-disc trick `drawTree` uses for the obstacle version), a
 * platform nested inside it with plank seams, a lit window standing in for
 * the blurb's beach-towel roof corner, and a rope ladder down to the
 * ground. Nothing here is a building with a different paint job.
 */
function drawTreehouse(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const cx = loc.x + loc.w / 2;
  const groundY = loc.y + loc.h;

  const trunkW = Math.max(6, loc.w * 0.12);
  ctx.fillStyle = PALETTE.treeTrunk;
  ctx.fillRect(px(cx - trunkW / 2), loc.y, trunkW, loc.h);

  const r = loc.w * 0.55;
  const canopyCy = loc.y + loc.h * 0.28;
  ctx.fillStyle = PALETTE.treeCanopyDark;
  ctx.beginPath();
  ctx.arc(cx, canopyCy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.treeCanopy;
  ctx.beginPath();
  ctx.arc(cx - r * 0.25, canopyCy - r * 0.2, r * 0.7, 0, Math.PI * 2);
  ctx.fill();

  const platW = loc.w * 0.7;
  const platH = loc.h * 0.3;
  const platY = loc.y + loc.h * 0.42;
  ctx.fillStyle = PALETTE.plankDark;
  ctx.fillRect(px(cx - platW / 2), platY, platW, platH);
  ctx.fillStyle = PALETTE.plank;
  ctx.fillRect(px(cx - platW / 2), platY, platW, 4);
  ctx.strokeStyle = PALETTE.plankDark;
  ctx.lineWidth = 1;
  for (let x = cx - platW / 2 + 6; x < cx + platW / 2; x += 8) {
    ctx.beginPath();
    ctx.moveTo(px(x), platY + 4);
    ctx.lineTo(px(x), platY + platH);
    ctx.stroke();
  }

  // The beach towel doing the job of a roof, read as a lit corner square —
  // the blurb's own line, drawn rather than described.
  ctx.fillStyle = PALETTE.windowLit;
  ctx.fillRect(px(cx + platW / 2 - 12), platY + 6, 8, 8);

  ctx.strokeStyle = PALETTE.rope;
  ctx.lineWidth = 1;
  const ladderX = cx - platW / 2 + 6;
  ctx.beginPath();
  ctx.moveTo(px(ladderX - 3), platY + platH);
  ctx.lineTo(px(ladderX - 3), groundY);
  ctx.moveTo(px(ladderX + 3), platY + platH);
  ctx.lineTo(px(ladderX + 3), groundY);
  for (let y = platY + platH + 4; y < groundY; y += 6) {
    ctx.moveTo(px(ladderX - 3), y);
    ctx.lineTo(px(ladderX + 3), y);
  }
  ctx.stroke();

  drawGlitchTear(ctx, loc, tier, 0);
}

/**
 * A small storefront — general enough for a laundromat, a convenience
 * store, a pharmacy or the safehouse's own corner unit without a bespoke
 * shape each, the district redesign's own new render type. A solid awning
 * in the location's own `color` rather than Sal's specific red-and-white
 * stripe (`drawPizza`) is what keeps four different shops reading as four
 * different shops sharing one silhouette, not four repaints of a pizzeria.
 */
function drawShop(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const roofH = 8;
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 2, loc.y + loc.h - 1, loc.w + 4, 3);

  if (spriteSheetReady()) {
    drawSpriteBuildingShell(ctx, loc, roofH);
  } else {
    ctx.fillStyle = PALETTE.wallA;
    ctx.fillRect(loc.x, loc.y + roofH, loc.w, loc.h - roofH);
    ctx.fillStyle = PALETTE.roofA;
    ctx.fillRect(loc.x + 2, loc.y, loc.w - 4, roofH);
  }

  /*
   * The awning — a flat band in the shop's own colour, not a stripe
   * pattern, so the render type stays legible as "generic shop" rather
   * than "pizza place in a different colour". Now a real overhang rather
   * than a stripe painted on the flat wall: it projects a few px past
   * both edges of the building and drops a shadow on the pavement below
   * it, so the silhouette actually breaks instead of every shop reading
   * as the same rectangle with a different paint job — the ground-plane
   * pass gave every building a real lot; this gives it a real edge.
   */
  const awningOverhang = 4;
  const awningDepth = 6;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(loc.x - awningOverhang, loc.y + roofH + awningDepth, loc.w + awningOverhang * 2, 2);
  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(px(loc.x - awningOverhang), loc.y + roofH, 2, awningDepth + 2);
  ctx.fillRect(px(loc.x + loc.w + awningOverhang - 2), loc.y + roofH, 2, awningDepth + 2);
  ctx.fillStyle = loc.color;
  ctx.fillRect(loc.x - awningOverhang, loc.y + roofH, loc.w + awningOverhang * 2, awningDepth);

  if (loc.id === 'laundromat') {
    // "A dryer running with nothing in it" — round portholes instead of
    // `drawWindows`' generic square grid, since a laundromat's whole visual
    // signature is the row of machine doors, not its wall. `drawShop` is
    // deliberately one shared shell for four different storefronts (the
    // doc comment above); this is the one place a shop gets to look like
    // the specific thing its own blurb describes instead of "a shop".
    drawLaundryPortholes(ctx, loc);
  } else {
    drawWindows(ctx, loc, false);
  }

  // A signboard over the door, plain — the name is what the blurb already
  // carries, this is just "a shop sign is here" at a glance.
  ctx.fillStyle = PALETTE.windowLit;
  ctx.fillRect(px(loc.x + loc.w * 0.32), loc.y + roofH + 8, loc.w * 0.36, 5);

  drawGlitchTear(ctx, loc, tier, roofH);
}

/** A row of front-loading machine doors — mostly dark, one lit and
 * mid-cycle (a soft double-ring rather than a flat disc, standing in for a
 * tumbling load), per the Wash & Fold's own "a dryer running with nothing
 * in it" line. Seeded per-id like `drawWindows`, so it's fixed rather than
 * flickering machine to machine every frame. */
function drawLaundryPortholes(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  const rand = noise(`laundry:${loc.id}`);
  const r = 6;
  const gap = 6;
  const count = Math.max(2, Math.floor((loc.w - gap) / (r * 2 + gap)));
  const cy = loc.y + loc.h - 16;
  const startX = loc.x + (loc.w - (count * (r * 2 + gap) - gap)) / 2 + r;
  const runningIndex = Math.floor(rand() * count);

  for (let i = 0; i < count; i++) {
    const cx = startX + i * (r * 2 + gap);
    const running = i === runningIndex;
    ctx.fillStyle = PALETTE.doorColor;
    ctx.beginPath();
    ctx.arc(px(cx), cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = running ? PALETTE.windowLit : PALETTE.rollDoorLine;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px(cx), cy, r - 1.5, 0, Math.PI * 2);
    ctx.stroke();
    if (running) {
      ctx.beginPath();
      ctx.arc(px(cx), cy, r - 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/**
 * The Bus Depot: an open-air platform and shelter, not a building — the one
 * district-redesign location deliberately drawn with no walls at all, so
 * "people passing through, nobody stays" reads in the silhouette itself
 * before a single line of ambient text says so.
 */
function drawTransit(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  const postW = 4;
  const canopyH = 10;
  const postH = loc.h - canopyH - 6;

  // The platform slab.
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x, loc.y + loc.h - 6, loc.w, 6);

  // Two support posts holding up a flat canopy roof — open underneath.
  ctx.fillStyle = PALETTE.lampPost;
  ctx.fillRect(px(loc.x + loc.w * 0.12), loc.y + canopyH, postW, postH);
  ctx.fillRect(px(loc.x + loc.w * 0.88 - postW), loc.y + canopyH, postW, postH);

  ctx.fillStyle = PALETTE.roofA;
  ctx.fillRect(loc.x, loc.y, loc.w, canopyH);
  ctx.fillStyle = PALETTE.wallA;
  ctx.fillRect(loc.x, loc.y + canopyH - 2, loc.w, 2);

  // A bench, under the canopy — the "somebody who isn't waiting for a bus"
  // the blurb describes.
  ctx.fillStyle = PALETTE.plank;
  ctx.fillRect(px(loc.x + loc.w * 0.3), loc.y + canopyH + postH - 10, loc.w * 0.4, 4);

  // A lit route sign, the one warm point in an otherwise unlit shelter.
  ctx.fillStyle = PALETTE.windowLit;
  ctx.fillRect(px(loc.x + loc.w * 0.5 - 5), loc.y + canopyH + 3, 10, 6);

  // A bus, actually stopped at the depot — one parked under its own end of
  // the canopy, the same "this place is used" cue a parked car gives any
  // ordinary street. Bellhaven's whole point about this stop is that
  // service is thin, not that it's abandoned; a bus that's just arrived
  // says that better than an empty platform does.
  if (spriteSheetReady()) {
    const busX = loc.x + loc.w * 0.82;
    const busY = loc.y + loc.h - 30;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(px(busX - 17), loc.y + loc.h - 8, 34, 4);
    drawTileBlock(ctx, BUS_TILES, busX, busY, drawTileAt);
  }
}

/**
 * CITY HALL. The Library is already the town's one columned building, so
 * this had to be grander without being the same trick twice: a wider stone
 * frontage with a stepped entrance block projecting from it, a short
 * cupola on the ridge, and a colonnade that runs the *whole* width rather
 * than the Library's evenly spaced three or four. Municipal stone rather
 * than brick — the only building in Bellhaven that doesn't share a wall
 * kit with a house.
 */
function drawCivic(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  const roofH = 12;
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 3, loc.y + loc.h - 1, loc.w + 6, 4);

  ctx.fillStyle = PALETTE.civicRoof;
  ctx.fillRect(px(loc.x), px(loc.y), loc.w, roofH);
  ctx.fillStyle = PALETTE.civicStone;
  ctx.fillRect(px(loc.x), px(loc.y + roofH), loc.w, loc.h - roofH);
  ctx.fillStyle = PALETTE.civicStoneShade;
  ctx.fillRect(px(loc.x), px(loc.y + loc.h - 10), loc.w, 4);

  /*
   * The colonnade, full width — slim shafts rather than the Library's four
   * fat ones, which is the whole difference in read between "a building
   * that keeps books" and "a building that keeps decisions".
   *
   * The gaps between the shafts are painted in *first*, dark, so the
   * colonnade reads as a row of columns standing in front of a shaded
   * loggia. Drawing pale shafts straight onto the pale stone (which is
   * what this did at first) left the whole frontage as one cream block
   * with the columns invisible from more than a few tiles away — the
   * loudest thing in the Civic Zone rendering as a blank rectangle.
   */
  const bodyTop = loc.y + roofH;
  const bodyH = loc.h - roofH;
  const rand = noise(`civic:${loc.id}`);

  // A single course of tall windows in the upper stone, the way a chamber
  // floor actually glazes: two-thirds of them lit, none of them full
  // height. This is the half that keeps the building warm — a colonnade
  // over a dark loggia with nothing above it reads as a ruin.
  const winY = bodyTop + 6;
  const winH = Math.max(6, bodyH * 0.28);
  const winCount = Math.max(4, Math.floor(loc.w / 26));
  for (let i = 0; i < winCount; i++) {
    const wx = loc.x + ((i + 0.5) * loc.w) / winCount;
    ctx.fillStyle = rand() > 0.34 ? PALETTE.windowLit : PALETTE.windowDark;
    ctx.fillRect(px(wx - 4), px(winY), 8, winH);
    ctx.fillStyle = PALETTE.civicStoneShade;
    ctx.fillRect(px(wx - 5), px(winY + winH), 10, 2);
  }

  /*
   * The colonnade, full width, along the lower half of the frontage — a
   * portico is a band across the front of a building, not a screen over
   * the whole of it, and the gaps between the shafts are painted in first,
   * dark, so the row reads as columns standing in front of a shaded
   * loggia. Drawing pale shafts straight onto the pale stone (which is
   * what this did at first) left the whole frontage as one cream block
   * with the columns invisible from more than a few tiles away.
   */
  const colTop = bodyTop + bodyH * 0.46;
  const colH = loc.y + loc.h - 12 - colTop;
  ctx.fillStyle = PALETTE.windowDark;
  ctx.fillRect(px(loc.x + 3), px(colTop), loc.w - 6, colH);
  const cols = Math.max(8, Math.floor(loc.w / 16));
  ctx.fillStyle = PALETTE.pillar;
  for (let i = 0; i < cols; i++) {
    const cx = loc.x + ((i + 0.5) * loc.w) / cols;
    ctx.fillRect(px(cx - 3), px(colTop), 6, colH);
  }
  ctx.fillStyle = PALETTE.civicStoneShade;
  ctx.fillRect(px(loc.x), px(colTop - 3), loc.w, 3);
  ctx.fillStyle = PALETTE.pillarShade;
  ctx.fillRect(px(loc.x), px(colTop + colH), loc.w, 3);

  // The projecting entrance block and its steps.
  const entW = Math.max(40, loc.w * 0.3);
  const entX = loc.x + loc.w / 2 - entW / 2;
  ctx.fillStyle = PALETTE.pediment;
  ctx.beginPath();
  ctx.moveTo(px(entX - 6), px(loc.y + roofH));
  ctx.lineTo(px(loc.x + loc.w / 2), px(loc.y - 4));
  ctx.lineTo(px(entX + entW + 6), px(loc.y + roofH));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.civicStone;
  ctx.fillRect(px(entX), px(loc.y + roofH), entW, loc.h - roofH - 6);
  ctx.fillStyle = PALETTE.windowLit;
  ctx.fillRect(px(loc.x + loc.w / 2 - 12), px(loc.y + roofH + 8), 24, 10);
  ctx.fillStyle = PALETTE.doorColor;
  ctx.fillRect(px(loc.x + loc.w / 2 - 7), px(loc.y + loc.h - 22), 14, 16);
  ctx.fillStyle = PALETTE.civicStoneShade;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(px(entX - i * 3), px(loc.y + loc.h - 6 + i * 2), entW + i * 6, 2);
  }

  // The cupola — small, off the ridge's centre by nothing, and the one
  // vertical this building gets. A dome would read as a state capitol; a
  // squat lantern reads as a town that once had money.
  const cupX = loc.x + loc.w / 2;
  ctx.fillStyle = PALETTE.civicDome;
  ctx.fillRect(px(cupX - 7), px(loc.y - 16), 14, 12);
  ctx.beginPath();
  ctx.moveTo(px(cupX - 9), px(loc.y - 16));
  ctx.lineTo(px(cupX), px(loc.y - 24));
  ctx.lineTo(px(cupX + 9), px(loc.y - 16));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.windowLit;
  ctx.fillRect(px(cupX - 3), px(loc.y - 13), 6, 5);

  drawGlitchTear(ctx, loc, tier, roofH);
}

/**
 * THE DATA CENTRE. Everything else on this canvas is warm and lit from
 * inside because somebody is in it (`draw.ts`'s opening note: windows lit,
 * streets empty). This building has no windows at all, which is the whole
 * point of drawing it: it is the one place in Bellhaven where the light
 * comes *out* of the machinery rather than out of a life.
 *
 * A blank slab, a louvre band where a window course would be, roof
 * chillers, a dish array, and a single cold status light that never blinks
 * out of step because nothing here is waiting for anybody.
 */
function drawDataCenter(ctx: CanvasRenderingContext2D, loc: OverworldLocation, now: number) {
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 3, loc.y + loc.h - 1, loc.w + 6, 4);

  const roofH = 12;
  ctx.fillStyle = PALETTE.dataWallDark;
  ctx.fillRect(px(loc.x), px(loc.y), loc.w, roofH);
  ctx.fillStyle = PALETTE.dataWall;
  ctx.fillRect(px(loc.x), px(loc.y + roofH), loc.w, loc.h - roofH);

  // Precast panel joints, evenly spaced — a blank wall still has to read
  // as built rather than as a fill colour.
  ctx.fillStyle = PALETTE.dataWallDark;
  for (let x = loc.x + 18; x < loc.x + loc.w - 4; x += 18) ctx.fillRect(px(x), px(loc.y + roofH), 1, loc.h - roofH);

  // The louvre band, where every other building on this map has windows.
  const louvreY = loc.y + loc.h * 0.45;
  ctx.fillStyle = PALETTE.dataVent;
  ctx.fillRect(px(loc.x + 8), px(louvreY), loc.w - 16, 10);
  ctx.fillStyle = PALETTE.dataWallDark;
  for (let y = louvreY + 2; y < louvreY + 10; y += 3) ctx.fillRect(px(loc.x + 9), px(y), loc.w - 18, 1);

  // Roof chillers — three boxes and their shadow, the noise the blurb
  // says you can hear from the street.
  for (let i = 0; i < 3; i++) {
    const bx = loc.x + 14 + i * ((loc.w - 34) / 3);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(px(bx + 1), px(loc.y + 3), 20, 9);
    ctx.fillStyle = PALETTE.dataVent;
    ctx.fillRect(px(bx), px(loc.y + 1), 20, 9);
    ctx.fillStyle = PALETTE.dataDish;
    ctx.fillRect(px(bx + 2), px(loc.y + 3), 16, 2);
  }

  // A dish array on the east end, angled off the roofline.
  const dishX = loc.x + loc.w - 14;
  ctx.strokeStyle = PALETTE.towerMast;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px(dishX), px(loc.y + 6));
  ctx.lineTo(px(dishX), px(loc.y - 14));
  ctx.stroke();
  ctx.fillStyle = PALETTE.dataDish;
  ctx.beginPath();
  ctx.ellipse(px(dishX + 3), px(loc.y - 13), 7, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // The doorway plate — a unit number and nothing else, per the blurb.
  ctx.fillStyle = PALETTE.dataVent;
  ctx.fillRect(px(loc.x + loc.w / 2 - 9), px(loc.y + loc.h - 20), 18, 18);
  ctx.fillStyle = PALETTE.dataDish;
  ctx.fillRect(px(loc.x + loc.w / 2 + 12), px(loc.y + loc.h - 16), 8, 4);

  // One cold status light, breathing on a long cycle. Blue rather than
  // the resistance red or the patrol's warning red: this is not warning
  // anybody about anything, it is simply on.
  const pulse = 0.55 + 0.45 * Math.sin((now % 4200) / 4200 * Math.PI * 2);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.dataLight;
  ctx.fillRect(px(loc.x + 6), px(loc.y + loc.h - 12), 3, 3);
  ctx.fillRect(px(loc.x + loc.w - 9), px(loc.y + loc.h - 12), 3, 3);
  ctx.globalAlpha = 1;

  // The way up to the roof chillers the blurb already says are up there —
  // on the west wall, clear of the dish array and the door plate.
  drawFireEscape(ctx, loc.x + 4, loc.y + roofH + 4, loc.y + loc.h - 6);
}

/**
 * MEGAMART. A big box is mostly roof and sign, which is exactly what makes
 * it read at this scale: a wide low slab, a full-width sign band in a red
 * nothing else in town wears, an entrance canopy with the doors under it,
 * and a rooftop plant deck. The Plaza's anchor, and the reason the
 * district's parking rows have anywhere to point at.
 */
function drawBigBox(ctx: CanvasRenderingContext2D, loc: OverworldLocation, tier: ThresholdTier) {
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(loc.x - 3, loc.y + loc.h - 1, loc.w + 6, 4);

  const roofH = 16;
  ctx.fillStyle = PALETTE.bigBoxRoof;
  ctx.fillRect(px(loc.x), px(loc.y), loc.w, roofH);
  ctx.fillStyle = PALETTE.bigBoxWall;
  ctx.fillRect(px(loc.x), px(loc.y + roofH), loc.w, loc.h - roofH);

  // Rooftop plant — four units in a row, the visual shorthand for a
  // building whose roof is bigger than its frontage.
  ctx.fillStyle = PALETTE.dataVent;
  for (let i = 0; i < 4; i++) ctx.fillRect(px(loc.x + 10 + i * ((loc.w - 24) / 4)), px(loc.y + 3), 14, 8);

  // The sign band, full width, and the paler bar standing in for the
  // wordmark. Deliberately unlettered — every other sign in this game is
  // a shape rather than type, and MEGAMART reading as a colour and a
  // proportion is truer to the pixel budget than four-pixel letters.
  const signY = loc.y + roofH + 6;
  ctx.fillStyle = PALETTE.bigBoxSign;
  ctx.fillRect(px(loc.x + 8), px(signY), loc.w - 16, 14);
  ctx.fillStyle = PALETTE.bigBoxSignText;
  ctx.fillRect(px(loc.x + 16), px(signY + 4), loc.w - 32, 6);

  /*
   * The glazed frontage: a shallow band of window low on the wall, not a
   * full-height curtain wall. The first pass ran lit glass from the sign
   * down to the pavement and the result read as a barcode — a big box is
   * mostly *blank* wall with a strip of glass at the bottom, and getting
   * that proportion right is the whole difference between this and a
   * warehouse with a sign on it.
   */
  const glassH = 14;
  const glassY = loc.y + loc.h - glassH - 8;
  ctx.fillStyle = PALETTE.windowDark;
  ctx.fillRect(px(loc.x + 10), px(glassY), loc.w - 20, glassH);
  ctx.fillStyle = PALETTE.windowLit;
  ctx.fillRect(px(loc.x + 12), px(glassY + 2), loc.w - 24, glassH - 4);
  ctx.fillStyle = PALETTE.bigBoxRoof;
  for (let x = loc.x + 22; x < loc.x + loc.w - 12; x += 20) ctx.fillRect(px(x), px(glassY), 2, glassH);

  // The entrance: two dark door leaves centred in the glass, under a
  // canopy that projects past the wall the way every other shopfront in
  // town does (`drawShop`'s own awning trick).
  /*
   * THE SCREEN ABOVE THE DOOR. MegaMart's own blurb has always said it
   * "plays the safety-grant advert on a loop with the sound off", and
   * there was nothing on the building to back that up — the same gap the
   * Works' back doors had.
   *
   * It matters more than a detail: this district's surveillance is
   * *commercial*, not municipal, and the point the map is making is that
   * the player cannot tell the difference from the pavement. A retailer's
   * advertising screen and the council's safety campaign are the same
   * hardware showing the same message, and this is where those two things
   * are visibly one thing.
   */
  const scrW = loc.w * 0.26;
  const scrX = loc.x + loc.w / 2 - scrW / 2;
  const scrY = signY + 17;
  ctx.fillStyle = PALETTE.billboardFrame;
  ctx.fillRect(px(scrX - 2), px(scrY - 2), scrW + 4, 14);
  // Cycling between the advert's two frames on a slow, silent loop.
  const advert = Math.floor(Date.now() / 3200) % 2 === 0;
  ctx.fillStyle = advert ? PALETTE.dataLight : PALETTE.bigBoxSign;
  ctx.fillRect(px(scrX), px(scrY), scrW, 10);
  ctx.fillStyle = 'rgba(244, 237, 224, 0.75)';
  ctx.fillRect(px(scrX + 3), px(scrY + 2), scrW - 6, 2);
  ctx.fillRect(px(scrX + 3), px(scrY + 6), scrW * (advert ? 0.5 : 0.7), 2);

  const canW = loc.w * 0.3;
  const canX = loc.x + loc.w / 2 - canW / 2;
  ctx.fillStyle = PALETTE.windowDark;
  ctx.fillRect(px(canX + 4), px(glassY + 1), canW - 8, glassH - 2);
  ctx.fillStyle = PALETTE.bigBoxSignText;
  ctx.fillRect(px(loc.x + loc.w / 2 - 1), px(glassY + 1), 2, glassH - 2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(px(canX - 2), px(loc.y + loc.h - 5), canW + 4, 3);
  ctx.fillStyle = PALETTE.bigBoxSign;
  ctx.fillRect(px(canX), px(loc.y + loc.h - 9), canW, 6);

  drawGlitchTear(ctx, loc, tier, roofH);
}

/**
 * SUBSTATION 9. Not a building — a fenced yard with transformers in it,
 * which is why it gets its own shape rather than another warehouse box:
 * the thing that makes an electrical compound legible from above is the
 * gantry frame and the coil stacks, not a roof. Southside's half of the
 * "transit *and* infrastructure" brief, and the reason the district's own
 * Tier 5 junction box is somewhere the fiction agrees with.
 */
function drawSubstation(ctx: CanvasRenderingContext2D, loc: OverworldLocation, now: number) {
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(px(loc.x), px(loc.y), loc.w, loc.h);
  // A compacted-gravel yard rather than the map's own base ground: this is
  // a surface somebody laid, and reading it as bare earth made the whole
  // compound look like a hole in the street rather than a hardstanding.
  ctx.fillStyle = PALETTE.substationYard;
  ctx.fillRect(px(loc.x + 3), px(loc.y + 3), loc.w - 6, loc.h - 6);
  const grit = noise(`subyard:${loc.id}`);
  ctx.fillStyle = PALETTE.substationGravel;
  for (let i = 0; i < 90; i++) {
    ctx.fillRect(px(loc.x + 4 + grit() * (loc.w - 9)), px(loc.y + 4 + grit() * (loc.h - 9)), 2, 1);
  }

  // The gantry: two horizontal bus rails on uprights, the silhouette that
  // says "high voltage" before any hazard triangle does.
  ctx.strokeStyle = PALETTE.substationFrame;
  ctx.lineWidth = 3;
  for (const gy of [loc.y + loc.h * 0.28, loc.y + loc.h * 0.5]) {
    ctx.beginPath();
    ctx.moveTo(px(loc.x + 8), px(gy));
    ctx.lineTo(px(loc.x + loc.w - 8), px(gy));
    ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const ux = loc.x + 14 + i * ((loc.w - 28) / 3);
    ctx.beginPath();
    ctx.moveTo(px(ux), px(loc.y + 10));
    ctx.lineTo(px(ux), px(loc.y + loc.h * 0.58));
    ctx.stroke();
  }

  // Three transformer cans along the south half, each with its cooling
  // fins and a porcelain bushing on top.
  for (let i = 0; i < 3; i++) {
    const bx = loc.x + 16 + i * ((loc.w - 40) / 3);
    const by = loc.y + loc.h * 0.6;
    ctx.fillStyle = PALETTE.substationFrame;
    ctx.fillRect(px(bx), px(by), 26, 22);
    ctx.fillStyle = PALETTE.substationCoil;
    for (let f = 0; f < 4; f++) ctx.fillRect(px(bx + 3 + f * 6), px(by + 3), 3, 16);
    ctx.fillStyle = PALETTE.substationCoil;
    ctx.fillRect(px(bx + 11), px(by - 5), 4, 5);
  }

  // The hazard plate on the gate side, faded to the point of being a
  // suggestion — the blurb's line, drawn.
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = PALETTE.substationHazard;
  ctx.beginPath();
  ctx.moveTo(px(loc.x + loc.w - 18), px(loc.y + loc.h - 20));
  ctx.lineTo(px(loc.x + loc.w - 10), px(loc.y + loc.h - 6));
  ctx.lineTo(px(loc.x + loc.w - 26), px(loc.y + loc.h - 6));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // A slow flicker on one insulator — the hum you feel in your teeth,
  // given something to look at.
  const t = ((now + noise(`sub:${loc.id}`)() * 2000) % 3000) / 3000;
  if (t < 0.06) {
    ctx.fillStyle = PALETTE.windowLit;
    ctx.fillRect(px(loc.x + loc.w * 0.5), px(loc.y + loc.h * 0.28 - 3), 3, 3);
  }
}

/**
 * A camera: a fixed 2x2-tile blue box on its post, nothing more — per the
 * build note, a camera is a post with a lens on it, not a building with a
 * different paint job. Drawn at a fixed size centred in the location's own
 * (larger) rect, so the interaction radius and collision footprint —
 * unchanged, still the full rect — stay generous even though the thing the
 * player actually sees is small.
 */
function drawCamera(ctx: CanvasRenderingContext2D, loc: OverworldLocation, isHere: boolean, now: number) {
  const size = 16; // two of drawGround's 8px tiles, on each side
  const x = px(loc.x + loc.w / 2 - size / 2);
  const y = px(loc.y + loc.h / 2 - size / 2);

  if (isHere) drawSoftGlow(ctx, x + size / 2, y + size / 2, size / 2, 3, 4);

  drawCameraPost(ctx, x + size / 2, y + size);
  ctx.fillStyle = PALETTE.camera;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = PALETTE.cameraDark;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, size + 1, size + 1);
  drawCameraDetail(ctx, x, y, size);
  drawRevolvingLens(ctx, x + size / 2, y - 3, now);
}

/** The pole a camera box actually sits on — per the build note, "a post
 * with a lens on it", which the box alone never quite read as without
 * something under it to be posted on. A short conduit stub bridges the two
 * so the wiring reads as running down the pole, not floating between them. */
function drawCameraPost(ctx: CanvasRenderingContext2D, cx: number, boxBottomY: number) {
  const postH = 9;
  ctx.fillStyle = PALETTE.cameraDark;
  ctx.fillRect(px(cx - 1), boxBottomY - 2, 2, postH);
  ctx.fillRect(px(cx - 3), boxBottomY + postH - 3, 6, 2); // base flare
  ctx.strokeStyle = PALETTE.cameraDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px(cx + 1), boxBottomY - 1);
  ctx.lineTo(px(cx + 3), boxBottomY + 2);
  ctx.stroke();
}

/** Panel seam and corner rivets — the same "this is a manufactured object,
 * not a flat sprite" texture `drawCameraPost` gives the pole, applied to
 * the housing itself. Kept to single pixels at this scale (a 16px box has
 * no room for more) so it reads as detail rather than clutter. */
function drawCameraDetail(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  /*
   * A HOOD AND A RED LENS — the two cues that make this the same object as
   * the one on the title screen.
   *
   * The title camera (`ui/TitleEye.tsx`) is a dark hooded shell with a red
   * eye in it; this was a flat blue box with a seam line and four corner
   * rivets. Both were fine on their own and together they read as two
   * different games. The fix is not to redraw either at the other's scale
   * — it is to carry the two silhouette cues that survive being 16 pixels
   * wide: the visor projecting over the lens, and the fact that the thing
   * looking at you is red.
   *
   * The blue body stays. It is how a player finds a camera at a glance
   * against a dusk palette, and no amount of family resemblance is worth
   * trading that for.
   */
  const hoodH = Math.max(2, Math.round(size * 0.22));

  // The visor, overhanging a pixel each side the way the title's does.
  ctx.fillStyle = PALETTE.cameraDark;
  ctx.fillRect(px(x - 1), px(y), size + 2, hoodH);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.fillRect(px(x - 1), px(y + hoodH), size + 2, 1);

  // The lens: a dark well under the hood with a red centre and a single
  // pale glint, which is the title camera's own stack at 1/8 the size.
  const cx = x + size / 2;
  const cy = y + hoodH + (size - hoodH) * 0.45;
  const lensR = Math.max(2.5, (size - hoodH) * 0.34);
  ctx.fillStyle = PALETTE.cameraLens;
  ctx.beginPath();
  ctx.arc(px(cx), px(cy), lensR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.cameraLive;
  ctx.beginPath();
  ctx.arc(px(cx), px(cy), Math.max(1, lensR * 0.5), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.sticker;
  ctx.fillRect(px(cx - lensR * 0.55), px(cy - lensR * 0.55), 1, 1);

  // The mounting seam along the bottom, where the housing meets its arm.
  ctx.fillStyle = PALETTE.cameraDark;
  ctx.fillRect(px(x + 2), px(y + size - 2), size - 4, 1);
}

/**
 * An ordinary camera, worth taking apart — the same fixed 2x2-tile blue box
 * as `drawCamera` above, because it is the same kind of object; the only
 * difference is this one sits on a bare point rather than centred in a named
 * location's rect, so the two take slightly different inputs and it wasn't
 * worth forcing one shape to fit both. A slow pulse instead of a static ring
 * marks "close enough, tap it" now that the prompt itself no longer opens on
 * proximity alone (Overworld.tsx) — the object has to actually read as
 * something worth touching, not just circled.
 */
/**
 * The coverage wedge a live camera actually paints on the ground: a short
 * cone in the direction the housing points, drawn under everything at
 * street level. The coverage bar in the HUD has always been able to say
 * "38% of the town" and never been able to say *which* 38% — this is that,
 * as a shape the player can walk around instead of a number they have to
 * take on trust. Deliberately short (a fraction of the node's real
 * `coverageRadius`, which is a scoring number rather than a sight line)
 * and very faint, so nine of them on one block reads as pressure rather
 * than as a light show.
 */
function drawCameraCone(ctx: CanvasRenderingContext2D, cx: number, cy: number, facingDeg: number) {
  const reach = 56;
  const half = (30 * Math.PI) / 180;
  const a = (facingDeg * Math.PI) / 180;

  ctx.beginPath();
  ctx.moveTo(px(cx), px(cy));
  ctx.arc(px(cx), px(cy), reach, a - half, a + half);
  ctx.closePath();
  ctx.fillStyle = PALETTE.cameraCone;
  ctx.fill();
  ctx.strokeStyle = PALETTE.cameraConeEdge;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawSabotageCamera(
  ctx: CanvasRenderingContext2D,
  node: { x: number; y: number; facing: number },
  dismantlable: boolean,
  damaged: boolean,
  now: number,
) {
  const size = 16;
  const x = px(node.x - size / 2);
  const y = px(node.y - size / 2);

  // A dark camera casts no cone. That is the whole feedback loop for a
  // dismantle: the shape on the ground goes away and comes back when
  // SafeTrace does.
  if (!damaged) drawCameraCone(ctx, node.x, node.y, node.facing);

  if (dismantlable) drawPulseGlow(ctx, x + size / 2, y + size / 2, size / 2, now);

  drawCameraPost(ctx, x + size / 2, y + size);
  ctx.globalAlpha = damaged ? 0.6 : 1;
  ctx.fillStyle = damaged ? PALETTE.cameraDead : PALETTE.camera;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = PALETTE.cameraDark;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, size + 1, size + 1);
  if (!damaged) drawCameraDetail(ctx, x, y, size);
  ctx.globalAlpha = 1;

  if (damaged) {
    drawSabotageDamage(ctx, x, y, size, now);
  } else {
    drawRevolvingLens(ctx, x + size / 2, y - 3, now);
    drawRecordingLight(ctx, x + size - 4, y + 2, now);
  }
}

/**
 * The red tally light on a live housing — the single detail that makes a
 * camera read as *recording* rather than as a blue box on a post, and the
 * one the reference layout asks for by name. On a slow, per-node offset
 * blink so a cluster doesn't strobe in unison.
 */
function drawRecordingLight(ctx: CanvasRenderingContext2D, x: number, y: number, now: number) {
  const on = (now % 1800) < 1100;
  ctx.globalAlpha = on ? 1 : 0.35;
  ctx.fillStyle = PALETTE.cameraLive;
  ctx.fillRect(px(x), px(y), 2, 2);
  ctx.globalAlpha = 1;
}

/**
 * A street hack — cash-register green for an ATM, sun-bleached tan for a
 * payphone, so the two read apart at a glance the same way a camera's blue
 * reads apart from either. Same footprint and the same pulsing "close
 * enough to act on it" tell as `drawSabotageCamera`, because it's the same
 * kind of object wearing different paint.
 */
function drawStreetHack(
  ctx: CanvasRenderingContext2D,
  node: { x: number; y: number; kind: 'atm' | 'phone' | 'building'; hackable: boolean; damaged: boolean },
  now: number,
) {
  const size = 14;
  const x = px(node.x - size / 2);
  const y = px(node.y - size / 2);
  const body =
    node.kind === 'atm' ? PALETTE.atmBody : node.kind === 'building' ? PALETTE.panelBody : PALETTE.phoneBody;
  const dark =
    node.kind === 'atm' ? PALETTE.atmDark : node.kind === 'building' ? PALETTE.panelDark : PALETTE.phoneDark;

  if (node.hackable) drawPulseGlow(ctx, x + size / 2, y + size / 2, size / 2, now);

  ctx.globalAlpha = node.damaged ? 0.6 : 1;
  ctx.fillStyle = body;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, size + 1, size + 1);

  // A small pale slot/screen so the kinds also read apart at a distance, not
  // just by hue — a card slot low and wide, a keypad centred and square, a
  // building panel a 2x2 grid of tiny lights (the one kind that isn't a
  // machine bolted to the street, it's a way into the wall itself).
  ctx.fillStyle = PALETTE.windowLit;
  if (node.kind === 'atm') ctx.fillRect(x + 2, y + size - 5, size - 4, 2);
  else if (node.kind === 'phone') ctx.fillRect(x + size / 2 - 2, y + 3, 4, 4);
  else {
    ctx.fillRect(x + 3, y + 3, 3, 3);
    ctx.fillRect(x + size - 6, y + 3, 3, 3);
    ctx.fillRect(x + 3, y + size - 6, 3, 3);
    ctx.fillRect(x + size - 6, y + size - 6, 3, 3);
  }
  ctx.globalAlpha = 1;

  if (node.damaged) drawSabotageDamage(ctx, x, y, size, now);
}

/**
 * A junction box: a squat olive-drab utility cabinet with a hazard-stripe
 * lid, the one point object on this map that isn't trying to blend in —
 * it's supposed to read as "there's something worth prying open in here"
 * from across the street. `tier` darkens the stripe toward the higher
 * tiers, a cheap tell that the box behind it is worth more before the
 * player's even close enough to read the prompt.
 */
function drawJunctionBox(
  ctx: CanvasRenderingContext2D,
  node: { x: number; y: number; tier: 1 | 2 | 3 | 4 | 5; crackable: boolean; damaged: boolean },
  now: number,
) {
  const size = 14;
  const x = px(node.x - size / 2);
  const y = px(node.y - size / 2);

  if (node.crackable) drawPulseGlow(ctx, x + size / 2, y + size / 2, size / 2, now);

  ctx.globalAlpha = node.damaged ? 0.6 : 1;
  ctx.fillStyle = PALETTE.junctionBody;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = PALETTE.junctionDark;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, size + 1, size + 1);

  // A hazard-stripe lid, higher tiers a shade darker/duller — worn from more
  // hands trying to get into it. Skipped once cracked open — a box mid-
  // cooldown reads as pried open, not just dimmer, so the stripe's gone
  // until it's fixed.
  if (!node.damaged) {
    ctx.fillStyle = PALETTE.junctionStripe;
    ctx.globalAlpha = 1 - (node.tier - 1) * 0.12;
    ctx.fillRect(x + 2, y + 2, size - 4, 3);
  }
  ctx.globalAlpha = node.damaged ? 0.6 : 1;

  // A centre seam, like a hinged double-door cabinet, plus a rivet at each
  // corner and a couple of grille slats above the handle — the same
  // "manufactured object, not a flat sprite" texture the camera post gets,
  // scaled to a squat 14px cabinet instead of a slim housing.
  ctx.strokeStyle = PALETTE.junctionDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + size / 2, y + 6);
  ctx.lineTo(x + size / 2, y + size - 2);
  ctx.stroke();
  for (let gy = y + size - 6; gy < y + size - 2; gy += 2) {
    ctx.beginPath();
    ctx.moveTo(x + 2, gy);
    ctx.lineTo(x + size - 2, gy);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.junctionDark;
  ctx.globalAlpha = (node.damaged ? 0.6 : 1) * 0.7;
  for (const [bx, by] of [
    [x + 1.5, y + 1.5],
    [x + size - 2.5, y + 1.5],
    [x + 1.5, y + size - 2.5],
    [x + size - 2.5, y + size - 2.5],
  ]) {
    ctx.fillRect(px(bx), px(by), 1, 1);
  }

  ctx.globalAlpha = node.damaged ? 0.6 : 1;
  ctx.fillStyle = PALETTE.junctionDark;
  ctx.fillRect(x + size / 2 - 1, y + size - 6, 2, 4);
  ctx.globalAlpha = 1;

  if (node.damaged) drawSabotageDamage(ctx, x, y, size, now);
}

/**
 * Lit windows. Roughly two in three, fixed per building so the town doesn't
 * blink — everybody is in, and the protagonist is out here.
 */
function drawWindows(ctx: CanvasRenderingContext2D, loc: OverworldLocation, isB: boolean) {
  const rand = noise(`windows:${loc.id}`);
  const w = 8;
  const h = 10;
  const gap = 10;
  const top = loc.y + 22;
  const cols = Math.max(1, Math.floor((loc.w - gap) / (w + gap)));
  const rows = Math.max(1, Math.floor((loc.h - 34) / (h + gap)));
  const startX = loc.x + px((loc.w - (cols * (w + gap) - gap)) / 2);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = rand() < (isB ? 0.45 : 0.66);
      ctx.fillStyle = lit ? PALETTE.windowLit : PALETTE.windowDark;
      ctx.fillRect(startX + c * (w + gap), top + r * (h + gap), w, h);
    }
  }
}

/** A tag on the wall, low enough to be reached by hand — two or three angled
 * strokes in the same red the resistance's own signage already uses, fixed
 * per building so it reads as something somebody actually left rather than a
 * texture. Deliberately crude: this is a spray mark, not a mural. */
function drawTag(ctx: CanvasRenderingContext2D, loc: OverworldLocation, roofH: number) {
  const rand = noise(`tag:${loc.id}`);
  const baseY = loc.y + loc.h - 9;
  const strokes = 2 + Math.floor(rand() * 2);
  ctx.strokeStyle = PALETTE.tag;
  ctx.lineWidth = 2;
  for (let i = 0; i < strokes; i++) {
    const sx = loc.x + 6 + rand() * Math.max(1, loc.w - 20);
    const sy = baseY - rand() * 6;
    const len = 6 + rand() * 8;
    const slant = (rand() - 0.5) * 6;
    ctx.beginPath();
    ctx.moveTo(px(sx), px(Math.max(loc.y + roofH + 2, sy)));
    ctx.lineTo(px(sx + slant), px(sy + len));
    ctx.stroke();
  }
}

/**
 * Old Market's own signature — "a photocopied punk flyer became an actual
 * neighbourhood" per the map redesign brief. `drawTag`'s spray strokes
 * already read as resistance markings everywhere in town; this is the
 * richer, West-End-specific layer the brief asks for: an actual board of
 * overlapping posters, standing beside the building rather than fighting
 * `drawGarage`'s own door and sign panel for wall space. Newest on top,
 * each one rotated its own small amount, so the stack reads as accumulated
 * over time rather than placed once — graffiti covering older graffiti,
 * an official notice crossed out rather than removed, the Gen A mark as
 * one hand-cut tag among several rather than a stamped logo. Nothing here
 * is a new interactive location or a collision obstacle — it's drawn as
 * part of `repair_shop`'s own render call, so there's no connectivity or
 * overlap risk to re-check the way a new `Obstacle` entry would carry.
 */
function drawWestEndPosterWall(ctx: CanvasRenderingContext2D, loc: OverworldLocation) {
  const boardX = loc.x - 22;
  const boardTop = loc.y + loc.h - 46;
  const rand = noise(`posterwall:${loc.id}`);

  // The board itself — two thin posts and a backing panel, standing in for
  // whatever a real neighbourhood staples flyers to (a utility board, a
  // fence panel) rather than the building's own wall.
  ctx.strokeStyle = PALETTE.porchPost;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px(boardX + 2), loc.y + loc.h);
  ctx.lineTo(px(boardX + 2), boardTop);
  ctx.moveTo(px(boardX + 16), loc.y + loc.h);
  ctx.lineTo(px(boardX + 16), boardTop);
  ctx.stroke();

  const posters: { dx: number; dy: number; w: number; h: number; rot: number; fill: string }[] = [
    { dx: 0, dy: 6, w: 15, h: 20, rot: -0.12, fill: PALETTE.forSaleSign },
    { dx: 3, dy: 0, w: 13, h: 17, rot: 0.08, fill: '#cdb896' },
    { dx: -1, dy: 10, w: 12, h: 15, rot: -0.05, fill: PALETTE.billboardFace },
  ];
  for (const p of posters) {
    ctx.save();
    ctx.translate(px(boardX + 9 + p.dx), boardTop + p.dy);
    ctx.rotate(p.rot);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(-p.w / 2 + 1, 1, p.w, p.h);
    ctx.fillStyle = p.fill;
    ctx.fillRect(-p.w / 2, 0, p.w, p.h);
    ctx.restore();
  }

  // One poster, crossed out — an official notice the neighbourhood already
  // answered, not removed, just struck through. Drawn over the back-most
  // poster specifically, in the resistance's own red rather than a generic
  // mark, so it reads as "we saw this" rather than plain vandalism.
  const back = posters[1];
  ctx.save();
  ctx.translate(px(boardX + 9 + back.dx), boardTop + back.dy);
  ctx.rotate(back.rot);
  ctx.strokeStyle = PALETTE.billboardCorrection;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-back.w / 2 + 1, -back.h / 2 + 2);
  ctx.lineTo(back.w / 2 - 1, back.h / 2 - 2);
  ctx.stroke();
  ctx.restore();

  // One hand-cut circled-A, small, on the front-most poster — evidence of
  // the movement rather than its logo: a wobbly ring built from a handful
  // of short strokes instead of a true arc, exactly the "unfinished,
  // gap at the top-left" read `GenAMark`'s own `claiming` state uses,
  // approximated here in flat canvas strokes since this is a texture on a
  // wall, not the UI mark itself.
  const front = posters[0];
  ctx.save();
  ctx.translate(px(boardX + 9 + front.dx), boardTop + front.dy + 3);
  ctx.rotate(front.rot + 0.03);
  ctx.strokeStyle = PALETTE.billboardCorrection;
  ctx.lineWidth = 1.2;
  const r = 4.2;
  const gapStart = -0.35; // radians — where the ring's own gap opens, top-left
  ctx.beginPath();
  for (let a = gapStart + 0.5; a < Math.PI * 2 + gapStart; a += 0.5) {
    const jx = (rand() - 0.5) * 0.6;
    const jy = (rand() - 0.5) * 0.6;
    const px1 = Math.cos(a) * r + jx;
    const py1 = Math.sin(a) * r + jy;
    if (a === gapStart + 0.5) ctx.moveTo(px1, py1);
    else ctx.lineTo(px1, py1);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-2, 3);
  ctx.lineTo(0, -3.4);
  ctx.lineTo(2, 3);
  ctx.moveTo(-1, 0.6);
  ctx.lineTo(1, 0.6);
  ctx.stroke();
  ctx.restore();
}

/**
 * Under the player's feet once a board's actually owned — walking (tier 0)
 * draws nothing here at all. Tiers 1–3 are wheels-on-ground: a deck plank
 * that gets a cleaner tone each tier, wheel nubs at the corners. Tiers 4–5
 * are the hover tiers: the deck lifts off a visible gap above the ground
 * with its own soft glow underneath, brighter and closer to the terminal
 * green the whole hacking side of the game already uses for "this is the
 * good tech" at tier 5 — the Hoverboard and the Cyberdeck read as the same
 * kind of object on purpose.
 */
function drawBoard(ctx: CanvasRenderingContext2D, cx: number, feetY: number, tier: number, now: number) {
  const w = 14;
  if (tier <= 0) return;

  if (tier <= 3) {
    const deck = [PALETTE.plank, '#8a6b42', PALETTE.parkedCarBody][tier - 1];
    const h = 4;
    const y = px(feetY - 1);
    ctx.fillStyle = deck;
    ctx.fillRect(px(cx - w / 2), y, w, h);
    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(px(cx - w / 2 + 1), y + h, 2, 2);
    ctx.fillRect(px(cx + w / 2 - 3), y + h, 2, 2);
    return;
  }

  const hover5 = tier >= 5;
  const gap = hover5 ? 5 : 3;
  const glowColor = hover5 ? PALETTE.marqueeGlow : PALETTE.camera;
  const bodyColor = hover5 ? '#e8f8ee' : '#dce8f4';
  const bob = Math.sin(now / 220) * 0.8; // a slight float, not a bounce
  const y = px(feetY - gap + bob);

  ctx.fillStyle = glowColor;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.ellipse(cx, feetY + 1, w / 2 + 1, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = bodyColor;
  ctx.fillRect(px(cx - w / 2), y, w, 3);
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(px(cx - w / 2) - 0.5, y - 0.5, w + 1, 4);
}

/**
 * A limb: an outline stroke, then a thinner fill stroke on top, same
 * two-pass trick every filled shape on this canvas uses for its outline —
 * just applied to a line instead of a rect, since a stick figure's arms and
 * legs are lines, not bars.
 */
function limb(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px(x1), px(y1));
  ctx.lineTo(px(x2), px(y2));
  ctx.stroke();

  ctx.strokeStyle = PALETTE.spriteShirt;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px(x1), px(y1));
  ctx.lineTo(px(x2), px(y2));
  ctx.stroke();
}

/** A small fixed wardrobe so ambient pedestrians don't all wear the same
 * shirt — picked once per npc id, never reshuffled. */
const NPC_SHIRTS = ['#7a8a9c', '#9c7a6a', '#6a9c7e', '#c2a15c', '#8a6a9c', '#5c8fae'];

/** Same idea as `NPC_SHIRTS` — a small fixed set of coats so the town's
 * cats don't all read as one cat copy-pasted around. */
const CAT_COATS = ['#4a4038', '#8a7460', '#2a2620', '#a89468'];

/**
 * Ambient life, dispatched by kind — cheap on purpose, the same sprite
 * budget every obstacle on this canvas keeps to. None of these are the
 * player: no cap, no backpack, no board, so the protagonist never gets lost
 * in a crowd of themselves.
 */
function drawNpc(ctx: CanvasRenderingContext2D, x: number, y: number, kind: NpcKind, facing: 1 | -1, id: string, now: number) {
  switch (kind) {
    case 'person':
      return drawPedestrian(ctx, x, y, id, facing, now);
    case 'dog':
      return drawDog(ctx, x, y);
    case 'cat':
      return drawCat(ctx, x, y, facing, id);
    case 'bird':
      return drawBird(ctx, x, y, facing);
  }
}

/** Which of the pack's 6 character skins a given id wears — the same "small
 * fixed wardrobe, picked once, never reshuffled" trick the old `NPC_SHIRTS`
 * used, just indexing a skin instead of a color. */
function characterSkinFor(id: string): number {
  return Math.floor(noise(`skin:${id}`)() * CHARACTERS.length);
}

/** A 3-frame walk cycle when moving, held on the middle (most neutral)
 * frame when standing still — same two-beat cadence `drawPlayer`'s old
 * `stride` used, just indexing a frame instead of flipping a sign. */
function walkFrame(now: number, moving: boolean): 0 | 1 | 2 {
  if (!moving) return 1;
  return (Math.floor(now / 150) % 3) as 0 | 1 | 2;
}

/** A plain townsperson, drawn from the sprite sheet once it's loaded — the
 * old torso-and-head block otherwise. Ambient pedestrians only ever face
 * left or right (`Npc.direction`/`wanderPos` don't track a vertical axis),
 * so this always reads off the `left`/`right` columns, walking in place at
 * a fixed animation rate rather than syncing to true movement speed —
 * plenty for something this small and this far from the camera's focus. */
function drawPedestrian(ctx: CanvasRenderingContext2D, x: number, y: number, id: string, facing: 1 | -1, now: number) {
  if (spriteSheetReady()) {
    const character = CHARACTERS[characterSkinFor(id)];
    const frames = facing < 0 ? character.left : character.right;
    const offset = noise(`walk-phase:${id}`)() * 900;
    const frame = frames[Math.floor(((now + offset) / 260) % 3)];
    drawSpriteTile(ctx, frame, px(x), px(y) - CHARACTER_DRAW_SIZE.h / 2, CHARACTER_DRAW_SIZE.w, CHARACTER_DRAW_SIZE.h);
    return;
  }

  const cx = px(x);
  const feetY = px(y);
  const bodyW = 6;
  const bodyH = 9;
  const headR = 2.5;
  const shirt = NPC_SHIRTS[Math.floor(noise(`shirt:${id}`)() * NPC_SHIRTS.length)];

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(cx - 4, feetY, 8, 2);

  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(cx - bodyW / 2 - 1, feetY - bodyH - 1, bodyW + 2, bodyH + 2);
  ctx.fillStyle = shirt;
  ctx.fillRect(cx - bodyW / 2, feetY - bodyH, bodyW, bodyH);

  ctx.fillStyle = PALETTE.spriteSkin;
  ctx.beginPath();
  ctx.arc(cx, feetY - bodyH - headR, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** A dog, low to the ground — a body block, a head-end bump, and four short
 * stub legs so it reads as an animal rather than a rock. */
function drawDog(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const cx = px(x);
  const cy = px(y);

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(cx - 5, cy + 3, 10, 2);

  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(cx - 6, cy - 3, 12, 7);
  ctx.fillStyle = PALETTE.dogBody;
  ctx.fillRect(cx - 5, cy - 2, 10, 5);
  ctx.fillRect(cx - 6, cy - 4, 4, 3);

  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(cx - 5, cy + 2, 2, 3);
  ctx.fillRect(cx + 3, cy + 2, 2, 3);
}

/** A cat — smaller and slighter than the dog, with a tail held up rather
 * than trailing low, and two pointed ear-tips instead of a floppy one,
 * so the two read as different animals rather than the same block at
 * different sizes. `coat` varies per npc id the same way a pedestrian's
 * shirt does. */
function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, facing: 1 | -1, id: string) {
  const cx = px(x);
  const cy = px(y);
  const coat = CAT_COATS[Math.floor(noise(`coat:${id}`)() * CAT_COATS.length)];

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(cx - 4, cy + 2, 8, 2);

  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(cx - 5, cy - 2, 9, 5);
  ctx.fillRect(cx + 3 * facing, cy - 4, 3, 3);
  ctx.fillStyle = coat;
  ctx.fillRect(cx - 4, cy - 1, 7, 3);
  ctx.fillRect(cx + 3 * facing, cy - 3, 3, 2);

  ctx.fillStyle = PALETTE.outline;
  ctx.fillRect(cx + 3 * facing, cy - 5, 1, 1);
  ctx.fillRect(cx + 5 * facing, cy - 5, 1, 1);

  // Held up, not trailing — the tail is the one thing at this scale that
  // reads "cat" before anything else does.
  ctx.fillStyle = coat;
  ctx.fillRect(cx - 6 * facing, cy - 5, 2, 4);
}

/** A bird overhead — a body dash and two wing flicks angled off whichever
 * way it's travelling, no more detail than that reads at this size. */
function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, facing: 1 | -1) {
  const cx = px(x);
  const cy = px(y);

  ctx.fillStyle = PALETTE.birdBody;
  ctx.fillRect(cx - 2, cy - 1, 4, 2);
  ctx.fillRect(cx - 5 * facing, cy - 2, 3, 1);
  ctx.fillRect(cx + 2 * facing, cy - 2, 3, 1);
}

/** The last-nonzero `{x,y}` facing vector (`Overworld.tsx` never lets it
 * settle back to zero) collapsed to one of the sprite sheet's 4 columns.
 * Diagonal movement sets both axes at once; horizontal wins the tie, purely
 * an arbitrary but consistent choice. */
function facingDirection(facing: { x: number; y: number }): Direction {
  if (Math.abs(facing.x) >= Math.abs(facing.y)) return facing.x < 0 ? 'left' : 'right';
  return facing.y < 0 ? 'up' : 'down';
}

/**
 * The protagonist. A real character sprite once the sheet's loaded, walking
 * a 3-frame cycle in whichever of the 4 sheet directions `facing` resolves
 * to; the old hand-drawn stick figure while it isn't. The board and its
 * shadow are drawn either way — Style Guide 07's build, not the sheet's.
 */
function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: { x: number; y: number },
  facing: { x: number; y: number },
  size: { w: number; h: number },
  moving: boolean,
  now: number,
  boardTier: number,
) {
  const cx = px(player.x);
  const feetY = px(player.y);

  // A flat shadow, so the figure stands on the street instead of floating on it.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(cx - size.w / 2 - 1, feetY, size.w + 2, 2);

  drawBoard(ctx, cx, feetY, boardTier, now);

  // Riding, not walking — a board tier means the feet are planted on a
  // deck, not stepping, so the leg animation holds the same neutral frame
  // standing still uses regardless of how fast the board itself is moving.
  const onBoard = boardTier > 0;

  if (spriteSheetReady()) {
    const direction = facingDirection(facing);
    const frame = CHARACTERS[0][direction][walkFrame(now, moving && !onBoard)];
    drawSpriteTile(ctx, frame, cx, feetY - CHARACTER_DRAW_SIZE.h / 2, CHARACTER_DRAW_SIZE.w, CHARACTER_DRAW_SIZE.h);
    return;
  }

  const headR = 3;
  const headCy = feetY - size.h + headR;
  const neckY = headCy + headR;
  const hipY = feetY - 6;

  const stride = moving && !onBoard ? (Math.floor(now / 220) % 2 === 0 ? 1 : -1) : 0;

  // A backpack behind the spine — chunkier than a bare "holdover" bag on
  // purpose, with its own strap line, since a skater's backpack is half the
  // silhouette. Still drawn under the limbs so it reads as worn, not glued on.
  ctx.fillStyle = PALETTE.spriteBag;
  ctx.fillRect(cx - 3, neckY, 6, hipY - neckY + 2);
  ctx.fillStyle = PALETTE.spriteBagStrap;
  ctx.fillRect(cx - 3, neckY, 6, 1);
  ctx.fillRect(cx - 1, neckY + 1, 1, hipY - neckY);

  limb(ctx, cx, hipY, cx - 3 - stride, feetY);
  limb(ctx, cx, hipY, cx + 3 + stride, feetY);
  limb(ctx, cx, neckY, cx, hipY);
  limb(ctx, cx, neckY, cx - 3 + stride, neckY + 6);
  limb(ctx, cx, neckY, cx + 3 - stride, neckY + 6);

  ctx.fillStyle = PALETTE.spriteSkin;
  ctx.beginPath();
  ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  ctx.stroke();

  // A cap, worn backwards — the crown covers just the top of the head, the
  // way a real cap sits, leaving the face visible underneath instead of
  // reading as a solid helmet. The brim sits on whichever side is actually
  // the *back* of the head (opposite the direction they're facing), not the
  // front. Facing away from the camera puts the back of the head — brim
  // included — toward the viewer, same as the old hair logic's "you see the
  // back of it" rule.
  ctx.fillStyle = PALETTE.capCrown;
  ctx.beginPath();
  ctx.arc(cx, headCy, headR + 0.5, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = PALETTE.capBrim;
  if (facing.x !== 0) {
    ctx.fillRect(facing.x > 0 ? cx - headR - 2 : cx + headR, headCy - 2, 2, 2);
  } else if (facing.y < 0) {
    ctx.fillRect(cx - 1, headCy + headR - 2, 2, 2);
  } else {
    ctx.fillRect(cx - 1, headCy - headR - 1, 2, 1);
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
