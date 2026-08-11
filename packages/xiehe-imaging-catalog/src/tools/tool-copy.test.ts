import {
  AP_MEASUREMENT_TOOL_IDS,
  AUXILIARY_TOOL_IDS,
  GENERIC_MEASUREMENT_TOOL_IDS,
  LATERAL_MEASUREMENT_TOOL_IDS,
} from '@xiehe/imaging-core/measurements';
import { describe, expect, it } from 'vitest';

import { getLocalizedToolCopy } from './tool-copy';

describe('shared imaging tool copy', () => {
  it('covers every toolbar tool capability', () => {
    const ids = [
      ...AP_MEASUREMENT_TOOL_IDS,
      ...LATERAL_MEASUREMENT_TOOL_IDS,
      ...GENERIC_MEASUREMENT_TOOL_IDS,
      ...AUXILIARY_TOOL_IDS,
    ];
    expect(ids.filter(id => !getLocalizedToolCopy(id))).toEqual([]);
  });

  it('resolves numbered AP and lateral Cobb copy without adding catalog rows', () => {
    expect(getLocalizedToolCopy('Cobb12')?.name).toBe('Cobb12');
    expect(getLocalizedToolCopy('lateral-cobb3')?.description).toBe(
      'Cobb角3测量'
    );
  });
});
