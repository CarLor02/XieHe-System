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
    const cobbTool = tools.find(tool => tool.id === 'cobb');

    expect(cobbTool).toEqual(
      expect.objectContaining({
        id: 'cobb',
        name: 'Cobb',
        icon: 'medical-cobb',
        description: '任意两节段Cobb角测量',
        pointsNeeded: 4,
      })
    );
    expect(isLateralMeasurementTool('cobb')).toBe(true);
    expect(isLateralRestorableMeasurementTool('cobb')).toBe(false);
  });
});
