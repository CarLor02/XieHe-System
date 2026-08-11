import { describe, expect, it } from 'vitest';

import { buildMeasurementRows, serializeTabularRows } from './tabular-export';

describe('tabular export', () => {
  it('builds measurement rows and escapes CSV cells', () => {
    const rows = buildMeasurementRows(
      { id: 1, original_filename: 'spine.png', patient_id: 2 },
      [
        {
          id: 'm1',
          type: 'cobb1',
          value: '20°',
          description: '主弯,胸椎',
          points: [],
        },
      ]
    );
    const result = serializeTabularRows(rows, 'csv', 'measurement-parameters');
    expect(result.content).toContain('"主弯,胸椎"');
    expect(result.prependBom).toBe(true);
  });
});
