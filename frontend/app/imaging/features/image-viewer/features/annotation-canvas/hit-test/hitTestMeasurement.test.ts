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

describe('manual TTS measurement hit testing', () => {
  const measurement = {
    id: 'manual-tts',
    type: 'tts',
    value: '-9.00mm',
    points: [
      { x: 10, y: 20 },
      { x: 30, y: 20 },
      { x: 40, y: 100 },
      { x: 60, y: 100 },
    ],
  };
  const options = {
    measurements: [measurement],
    imageScale: 1,
    imageToScreen: (point: { x: number; y: number }) => point,
    context: {
      imageNaturalSize: null,
      imagePosition: { x: 0, y: 0 },
      imageScale: 1,
    },
  };

  it('prioritizes a trunk endpoint over the horizontal line body', () => {
    expect(
      hitTestMeasurement({
        ...options,
        screenPoint: { x: 10, y: 20 },
      })
    ).toEqual({
      kind: 'point',
      measurementId: 'manual-tts',
      pointIndex: 0,
    });
  });

  it('selects the manual trunk line body as a whole measurement', () => {
    expect(
      hitTestMeasurement({
        ...options,
        screenPoint: { x: 20, y: 20 },
      })
    ).toEqual({ kind: 'whole', measurementId: 'manual-tts' });
  });

  it('does not make the inherited sacral line draggable', () => {
    expect(
      hitTestMeasurement({
        ...options,
        screenPoint: { x: 50, y: 100 },
      })
    ).toEqual({ kind: 'none' });
  });

  it('does not expose a keypoint-derived TTS trunk as a manual line', () => {
    expect(
      hitTestMeasurement({
        ...options,
        measurements: [
          {
            ...measurement,
            id: 'ap-keypoint-tts',
            upperVertebra: 'T5',
            lowerVertebra: 'T12',
            keypointSynced: true,
          },
        ],
        screenPoint: { x: 20, y: 20 },
      })
    ).toEqual({ kind: 'none' });
  });
});
