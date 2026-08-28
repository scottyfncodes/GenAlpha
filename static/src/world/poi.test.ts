import { describe, expect, it } from 'vitest';
import { createNewSave } from '../state/defaults';
import { poisFor } from './poi';

describe('GPS tier 3’s POI layer — audit item #6', () => {
  it('shows nothing below tier 3', () => {
    const save = createNewSave('Wren');
    expect(poisFor(save)).toEqual([]);
  });

  it('shows junction, signal and anomaly markers once GPS reaches tier 3', () => {
    const save = createNewSave('Wren');
    const geared = {
      ...save,
      economy: {
        ...save.economy,
        inventory: [
          ...save.economy.inventory,
          { itemId: 'gps_1', quantity: 1, acquiredVia: 'found' as const },
          { itemId: 'gps_2', quantity: 1, acquiredVia: 'found' as const },
          { itemId: 'gps_3', quantity: 1, acquiredVia: 'found' as const },
        ],
      },
    };
    const pois = poisFor(geared);
    expect(pois.length).toBeGreaterThan(0);
    const labels = new Set(pois.map((p) => p.label));
    expect(labels).toEqual(new Set(['JUNCTION', 'SIGNAL', 'ANOMALY']));
  });

  it('never shows content, only a label and a position', () => {
    const save = createNewSave('Wren');
    const geared = {
      ...save,
      economy: {
        ...save.economy,
        inventory: [
          ...save.economy.inventory,
          { itemId: 'gps_1', quantity: 1, acquiredVia: 'found' as const },
          { itemId: 'gps_2', quantity: 1, acquiredVia: 'found' as const },
          { itemId: 'gps_3', quantity: 1, acquiredVia: 'found' as const },
        ],
      },
    };
    for (const poi of poisFor(geared)) {
      expect(Object.keys(poi).sort()).toEqual(['label', 'x', 'y']);
    }
  });
});
