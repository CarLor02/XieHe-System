import { expect, it } from 'vitest';

import {
  filterUniqueAnnotationDuplicates,
  isUniqueAnnotationTool,
} from './uniqueness';
import type { MeasurementData } from '../../contracts';

it('treats AVT as globally non-unique', () => {
  const measurements: MeasurementData[] = [
    {
      id: 'ap-keypoint-avt-t4',
      type: 'avt',
      value: '10.00mm',
      points: [],
      apexVertebra: 'T4',
    },
    {
      id: 'ap-keypoint-avt-t8',
      type: 'avt',
      value: '15.00mm',
      points: [],
      apexVertebra: 'T8',
    },
  ];

  expect(isUniqueAnnotationTool('avt')).toBe(false);
  expect(filterUniqueAnnotationDuplicates(measurements)).toEqual(measurements);
});
