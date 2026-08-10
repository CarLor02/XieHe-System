import { describe, expect, it } from 'vitest';

import {
  AUXILIARY_TOOL_IDS,
  getToolCapabilitiesForExamType,
  getToolCapability,
  getToolIdsForExamType,
  isAuxiliaryAnnotationTool,
  isAuxiliaryInteractionTool,
  isAuxiliaryToolbarTool,
} from './tool-capability-catalog';

describe('tool capability catalog', () => {
  it('returns ordered AP, lateral and bending tool catalogs', () => {
    expect(getToolIdsForExamType('正位X光片').slice(0, 3)).toEqual([
      't1-tilt',
      'cobb',
      'ca',
    ]);
    expect(getToolIdsForExamType('侧位X光片')).toContain('lateral-cobb');
    expect(getToolIdsForExamType('左侧曲位')).toEqual([
      'cobb',
      ...AUXILIARY_TOOL_IDS,
    ]);
  });

  it('keeps toolbar grouping separate from annotation category', () => {
    expect(isAuxiliaryToolbarTool('aux-angle')).toBe(true);
    expect(isAuxiliaryAnnotationTool('aux-angle')).toBe(false);
    expect(isAuxiliaryToolbarTool('circle')).toBe(true);
    expect(isAuxiliaryAnnotationTool('circle')).toBe(true);
    expect(isAuxiliaryToolbarTool('vertebra-center')).toBe(false);
    expect(isAuxiliaryInteractionTool('vertebra-center')).toBe(true);
  });

  it('describes dynamic and fixed point collection without presentation data', () => {
    expect(getToolCapability('circle')).toMatchObject({
      pointsNeeded: 0,
      pointCollection: 'dynamic',
    });
    expect(getToolCapability('tpa')).toMatchObject({
      pointsNeeded: 7,
      pointCollection: 'fixed',
    });
    expect(getToolCapabilitiesForExamType('未知检查')).toHaveLength(12);
    expect(getToolCapability('circle')).not.toHaveProperty('icon');
    expect(getToolCapability('circle')).not.toHaveProperty('rendererId');
  });
});
