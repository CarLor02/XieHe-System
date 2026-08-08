import { describe, expect, it } from '@jest/globals';

import { hitTestMeasurement } from '@/app/imaging/features/image-viewer/features/annotation-canvas/application/hit-test/hitTestMeasurement';
import { createHemipelvicWidthRatioPoints } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap/hemipelvic-width-ratio';

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
          containerSize: null,
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
          containerSize: null,
        },
      })
    ).toEqual({ kind: 'line', measurementId: 'lr-1', lineIndex: 1 });
  });

  it('accepts the input policy point radius', () => {
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
        screenPoint: { x: -10, y: 0 },
        imageScale: 1,
        imageToScreen: point => point,
        pointRadius: 22,
        context: {
          imageNaturalSize: null,
          imagePosition: { x: 0, y: 0 },
          imageScale: 1,
          containerSize: null,
        },
      })
    ).toEqual({ kind: 'point', measurementId: 'lr-1', pointIndex: 0 });
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
    examType: '正位X光片',
    imageScale: 1,
    imageToScreen: (point: { x: number; y: number }) => point,
    context: {
      imageNaturalSize: null,
      imagePosition: { x: 0, y: 0 },
      imageScale: 1,
      containerSize: null,
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

describe('invalid variable measurement hit testing', () => {
  it('keeps malformed Cobb outside canvas interaction', () => {
    expect(
      hitTestMeasurement({
        measurements: [
          {
            id: 'malformed-cobb',
            type: 'cobb1',
            value: '20.00°',
            points: [
              { x: 10, y: 10 },
              { x: 30, y: 10 },
              { x: 10, y: 40 },
            ],
          },
        ],
        examType: '正位X光片',
        screenPoint: { x: 10, y: 10 },
        imageScale: 1,
        imageToScreen: point => point,
        context: {
          imageNaturalSize: null,
          imagePosition: { x: 0, y: 0 },
          imageScale: 1,
          containerSize: null,
        },
      })
    ).toEqual({ kind: 'none' });
  });
});

describe('bilateral FH effective CFH hit testing', () => {
  const bilateralPi = {
    id: 'pi-bilateral',
    type: 'PI',
    value: '45.00°',
    points: [
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 50, y: 30 },
      { x: 50, y: 40 },
      { x: 10, y: 100 },
      { x: 60, y: 100 },
    ],
    pelvicMetadata: {
      schemaVersion: 2 as const,
      femoralHeadMode: 'bilateral' as const,
    },
  };
  const options = {
    measurements: [bilateralPi],
    imageScale: 1,
    imageToScreen: (point: { x: number; y: number }) => point,
    pointRadius: 8,
    context: {
      imageNaturalSize: null,
      imagePosition: { x: 0, y: 0 },
      imageScale: 1,
      containerSize: null,
    },
  };

  it('returns a dedicated hit for the derived center midpoint', () => {
    expect(
      hitTestMeasurement({
        ...options,
        screenPoint: { x: 30, y: 20 },
      })
    ).toEqual({ kind: 'effective-cfh', measurementId: 'pi-bilateral' });
  });

  it('does not make the solid center line draggable', () => {
    expect(
      hitTestMeasurement({
        ...options,
        screenPoint: { x: 40, y: 25 },
      })
    ).toEqual({ kind: 'none' });
  });

  it('keeps persisted points ahead of the derived handle', () => {
    const overlapping = {
      ...bilateralPi,
      points: bilateralPi.points.map((point, index) =>
        index === 2 ? { x: 10, y: 10 } : point
      ),
    };
    expect(
      hitTestMeasurement({
        ...options,
        measurements: [overlapping],
        screenPoint: { x: 10, y: 10 },
      })
    ).toEqual({
      kind: 'point',
      measurementId: 'pi-bilateral',
      pointIndex: 0,
    });
  });
});
