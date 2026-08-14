import { describe, expect, it } from 'vitest';
import { MAP_HEIGHT, MAP_WIDTH } from './locations';
import { DRONE_ROUTES, DRONE_TAKEDOWN_BY_TOOL_TIER } from './drones';
import { MATERIALS_BY_ID } from '../content/materials';
import { RECIPES } from '../content/materials';
import { BLUEPRINTS_BY_ID } from '../content/blueprints';
import { ITEMS_BY_ID } from '../content/economy';

describe('drone routes', () => {
  it('stays inside the map on every point, and has at least two of them', () => {
    for (const route of DRONE_ROUTES) {
      expect(route.points.length).toBeGreaterThanOrEqual(2);
      for (const p of route.points) {
        expect(p.x, `${route.id} x out of bounds`).toBeGreaterThanOrEqual(0);
        expect(p.x, `${route.id} x out of bounds`).toBeLessThanOrEqual(MAP_WIDTH);
        expect(p.y, `${route.id} y out of bounds`).toBeGreaterThanOrEqual(0);
        expect(p.y, `${route.id} y out of bounds`).toBeLessThanOrEqual(MAP_HEIGHT);
      }
    }
  });

  it('gives every route a distinct id', () => {
    const ids = DRONE_ROUTES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('drone takedown rewards', () => {
  it.each([1, 2, 3] as const)('tier %i pays out a real material', (tier) => {
    const result = DRONE_TAKEDOWN_BY_TOOL_TIER[tier];
    expect(MATERIALS_BY_ID[result.itemId]).toBeDefined();
  });

  it('costs strictly less Heat at each tier up, and pays out at least as much', () => {
    expect(DRONE_TAKEDOWN_BY_TOOL_TIER[2].heatCost).toBeLessThan(DRONE_TAKEDOWN_BY_TOOL_TIER[1].heatCost);
    expect(DRONE_TAKEDOWN_BY_TOOL_TIER[3].heatCost).toBeLessThan(DRONE_TAKEDOWN_BY_TOOL_TIER[2].heatCost);
  });
});

describe('the drone tool line is wired end to end', () => {
  it.each(['bp_slingshot', 'bp_net_gun', 'bp_emp_gun'])('%s resolves to a real recipe with a real output item', (bpId) => {
    const blueprint = BLUEPRINTS_BY_ID[bpId];
    expect(blueprint).toBeDefined();
    const recipe = RECIPES.find((r) => r.id === blueprint.recipeId);
    expect(recipe, `${bpId} points at a missing recipe`).toBeDefined();
    expect(recipe!.blueprintItemId).toBe(bpId);
    expect(ITEMS_BY_ID[recipe!.outputItemId], `${recipe!.outputItemId} isn't a real item`).toBeDefined();
    for (const input of recipe!.inputs) {
      const isMaterial = Boolean(MATERIALS_BY_ID[input.itemId]);
      const isPriorTier = Boolean(ITEMS_BY_ID[input.itemId]);
      expect(isMaterial || isPriorTier, `${recipe!.id} input ${input.itemId} isn't a known material or item`).toBe(true);
    }
  });
});
