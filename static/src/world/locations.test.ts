import { describe, expect, it } from 'vitest';
import {
  DISTRICTS,
  GARAGE_LOCATION_ID,
  HOME_LOCATION_ID,
  LOCATIONS,
  MAP_HEIGHT,
  MAP_WIDTH,
  districtAt,
} from './locations';

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

describe('LOCATIONS', () => {
  it('gives every location a distinct id', () => {
    const ids = LOCATIONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has exactly one garage — the only place Build ever opens from', () => {
    const garages = LOCATIONS.filter((l) => l.garage);
    expect(garages).toHaveLength(1);
    expect(garages[0].id).toBe(GARAGE_LOCATION_ID);
  });

  it('places the garage clear of every other location’s own rect', () => {
    const garage = LOCATIONS.find((l) => l.id === GARAGE_LOCATION_ID)!;
    for (const other of LOCATIONS) {
      if (other.id === garage.id) continue;
      expect(overlaps(garage, other), `garage overlaps ${other.id}`).toBe(false);
    }
  });

  it('keeps the garage close to home, not scattered across town', () => {
    const home = LOCATIONS.find((l) => l.id === HOME_LOCATION_ID)!;
    const garage = LOCATIONS.find((l) => l.id === GARAGE_LOCATION_ID)!;
    const dx = Math.abs(garage.x + garage.w / 2 - (home.x + home.w / 2));
    const dy = Math.abs(garage.y + garage.h / 2 - (home.y + home.h / 2));
    expect(Math.hypot(dx, dy)).toBeLessThan(150);
  });
});

/**
 * The seams between the nine blocks are 56px wide and add up to just over
 * 15% of the map. A containment-only `districtAt` called all of it
 * "nowhere", which meant the overworld's district nameplate silently never
 * fired on a crossing: the transition went Heights → nowhere → Old Market
 * and the middle step cleared the card before the last could show it.
 * Caught by walking the map in a browser, not by reading the code — hence
 * a test, so it stays caught.
 */
describe('districtAt', () => {
  it('names a district for every point on the map, roads included', () => {
    for (let y = 0; y <= MAP_HEIGHT; y += 8) {
      for (let x = 0; x <= MAP_WIDTH; x += 8) {
        expect(districtAt(x, y), `(${x},${y}) belongs to nowhere`).not.toBeNull();
      }
    }
  });

  it('still answers containment exactly, wherever a block actually covers', () => {
    for (const d of DISTRICTS) {
      const cx = d.x + d.w / 2;
      const cy = d.y + d.h / 2;
      expect(districtAt(cx, cy)?.id, `${d.id}'s own centre`).toBe(d.id);
      expect(districtAt(d.x + 1, d.y + 1)?.id, `${d.id}'s own corner`).toBe(d.id);
    }
  });

  it('hands the seam to the block on the near side of it', () => {
    const heights = DISTRICTS.find((d) => d.id === 'the_heights')!;
    const oldMarket = DISTRICTS.find((d) => d.id === 'old_market')!;
    // The 56px band between The Heights (ends y336) and Old Market
    // (starts y392): the name should change around the middle of it.
    expect(districtAt(200, 344)?.id).toBe(heights.id);
    expect(districtAt(200, 384)?.id).toBe(oldMarket.id);
  });
});
