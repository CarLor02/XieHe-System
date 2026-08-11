import { expect, it } from '@jest/globals';

import { getToolsForExamType } from './exam-tool-catalog';
import { getAuxiliaryTools } from '@xiehe/imaging-catalog/annotations';
import {
  getToolCapabilitiesForExamType,
  getToolIdsForExamType,
} from '@xiehe/imaging-core/measurements';
import { getAnnotationConfig } from '@xiehe/imaging-catalog/annotations';

it.each(['左侧曲位', '右侧曲位'])(
  'exposes Cobb and all auxiliary tools for %s',
  examType => {
    expect(getToolsForExamType(examType).map(tool => tool.id)).toEqual([
      'cobb',
      ...getAuxiliaryTools().map(tool => tool.id),
    ]);
  }
);

it.each(['正位X光片', '侧位X光片', '左侧曲位', '未知检查'])(
  'composes the %s presentation catalog from core capabilities',
  examType => {
    expect(getToolsForExamType(examType).map(tool => tool.id)).toEqual(
      getToolIdsForExamType(examType)
    );

    getToolCapabilitiesForExamType(examType).forEach(capability => {
      const config = getAnnotationConfig(capability.id);
      expect(config).toBeDefined();
      expect(config?.pointsNeeded).toBe(capability.pointsNeeded);
      expect(config?.category).toBe(capability.annotationCategory);
    });
  }
);
