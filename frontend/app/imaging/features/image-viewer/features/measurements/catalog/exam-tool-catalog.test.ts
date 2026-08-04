import { expect, it } from '@jest/globals';

import { getToolsForExamType } from './exam-tool-catalog';

it.each(['左侧曲位', '右侧曲位'])('exposes only Cobb for %s', examType => {
  expect(getToolsForExamType(examType).map(tool => tool.id)).toEqual(['cobb']);
});
