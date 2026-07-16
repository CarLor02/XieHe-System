import { describe, expect, it } from '@jest/globals';

import { hitTestMeasurement } from '@/app/imaging/features/image-viewer/features/annotation-canvas/hit-test/hitTestMeasurement';
import { createHemipelvicWidthRatioPoints } from '@/app/imaging/features/image-viewer/features/measurements/domain/hemipelvic-width-ratio';

const points = createHemipelvicWidthRatioPoints([
  { x: 10, y: 0 },
  { x: 30, y: 0 },
  { x: 50, y: 0 },
  { x: 70, y: 0 },
]);

describe('L/R measurement hit testing', () => {
  it('prioritizes an interactive point over its line', () => {
    expect(
      hitTestMeasurement({
        measurements: [
          {
            id: 'lr-1',
            type: 'hemipelvic-width-ratio',
            value: '1.00',
            points,
          },
        ],
        screenPoint: { x: 10, y: 0 },
        imageScale: 1,
        imageToScreen: point => point,
        context: {
          imageNaturalSize: null,
          imagePosition: { x: 0, y: 0 },
          imageScale: 1,
        },
      })
    ).toEqual({ kind: 'point', measurementId: 'lr-1', pointIndex: 0 });
  });

  it('returns the source line index when the line body is hit', () => {
    expect(
      hitTestMeasurement({
        measurements: [
          {
            id: 'lr-1',
            type: 'hemipelvic-width-ratio',
            value: '1.00',
            points,
          },
        ],
        screenPoint: { x: 30, y: 20 },
        imageScale: 1,
        imageToScreen: point => point,
        context: {
          imageNaturalSize: null,
          imagePosition: { x: 0, y: 0 },
          imageScale: 1,
        },
      })
    ).toEqual({ kind: 'line', measurementId: 'lr-1', lineIndex: 1 });
  });
});
