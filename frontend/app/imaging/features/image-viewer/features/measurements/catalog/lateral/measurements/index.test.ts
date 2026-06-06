import { describe, expect, it, jest } from '@jest/globals';

jest.mock(
  '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers',
  () => ({
    renderTwoLines: jest.fn(() => null),
  })
);

describe('lateral measurement catalog', () => {
  it('exposes a generic manual Cobb tool for lateral annotation', () => {
    const {
      CL_CONFIG,
      LATERAL_COBB_CONFIG,
      getLateralMeasurementTools,
      isLateralMeasurementTool,
      isLateralRestorableMeasurementTool,
    } =
      jest.requireActual<
        typeof import('@/app/imaging/features/image-viewer/features/measurements/catalog/lateral/measurements')
      >(
        '@/app/imaging/features/image-viewer/features/measurements/catalog/lateral/measurements'
      );
    const tools = getLateralMeasurementTools();
    const cobbTool = tools.find(tool => tool.id === 'lateral-cobb');

    expect(cobbTool).toEqual(
      expect.objectContaining({
        id: 'lateral-cobb',
        name: 'Cobb',
        icon: 'medical-cobb',
        description: '任意两节段Cobb角测量',
        pointsNeeded: 4,
      })
    );
    expect(LATERAL_COBB_CONFIG.calculateResults).toBe(
      CL_CONFIG.calculateResults
    );
    expect(LATERAL_COBB_CONFIG.rightSideLabel).toBe(true);
    expect(
      LATERAL_COBB_CONFIG.getLabelPosition?.(
        [
          { x: 10, y: 20 },
          { x: 30, y: 20 },
          { x: 10, y: 80 },
          { x: 30, y: 80 },
        ],
        1
      )
    ).toEqual({ x: 10, y: 20 });
    expect(isLateralMeasurementTool('lateral-cobb')).toBe(true);
    expect(isLateralRestorableMeasurementTool('lateral-cobb')).toBe(false);
  });
});
