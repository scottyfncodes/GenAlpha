import { describe, expect, it } from 'vitest';
import { GARAGE_LOCATION_ID, HOME_LOCATION_ID, LOCATIONS } from './locations';

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
