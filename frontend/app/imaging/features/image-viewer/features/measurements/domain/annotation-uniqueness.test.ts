import { expect, it } from '@jest/globals';

import {
  filterUniqueAnnotationDuplicates,
  isUniqueAnnotationTool,
} from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-uniqueness';
import type { MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';

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
