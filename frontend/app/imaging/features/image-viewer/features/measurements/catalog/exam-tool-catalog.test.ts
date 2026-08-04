import { expect, it } from '@jest/globals';

import { getToolsForExamType } from './exam-tool-catalog';
import { getAuxiliaryTools } from '@/app/imaging/features/image-viewer/features/measurements/catalog/auxiliary';

it.each(['左侧曲位', '右侧曲位'])(
  'exposes Cobb and all auxiliary tools for %s',
  examType => {
    expect(getToolsForExamType(examType).map(tool => tool.id)).toEqual([
      'cobb',
      ...getAuxiliaryTools().map(tool => tool.id),
    ]);
  }
);
