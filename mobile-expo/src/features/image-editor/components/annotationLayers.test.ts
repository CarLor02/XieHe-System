import { describe, expect, it } from 'vitest';
import { imageToScreen } from '@xiehe/imaging-core/canvas';
import {
  AnnotationSource,
  type MeasurementData,
} from '@xiehe/imaging-core/contracts';
import type { AnnotationEditorSnapshot } from '@xiehe/imaging-core/editor';
import {
  createEmptyBindings,
  createManualPointRef,
} from '@xiehe/imaging-core/bindings';
import { dragAnnotation } from '../application/dragAnnotation';
import {
  emptyLayer,
  geometryBounds,
  partitionAnnotations,
  sameLayer,
} from './annotationLayers';
import { projectControlPoint } from './interaction/canvasGestureModel';

const context = {
  imageNaturalSize: { width: 1000, height: 2000 },
  containerSize: { width: 400, height: 800 },
  imageScale: 1,
  imagePosition: { x: 0, y: 0 },
};
function measurement(id: string): MeasurementData {
  return {
    id,
    type: 'aux-length',
    value: '50mm',
    points: [
      { x: 100, y: 200 },
      { x: 300, y: 200 },
    ],
  };
}
function snapshot(measurements: MeasurementData[]): AnnotationEditorSnapshot {
  return {
    measurements,
    keypoints: [],
    vertebraeLayer: [],
    cfhAnnotation: null,
    pointBindings: createEmptyBindings(),
    aiMeasurementIds: [],
    standardDistance: 100,
    standardDistanceValue: '100',
    standardDistancePoints: [
      { x: 0, y: 1800 },
      { x: 200, y: 1800 },
    ],
  };
}

describe('annotation drawing layers', () => {
  it('moves manually linked geometry into the dynamic layer while keeping unrelated drawing references stable', () => {
    const [a, b, c] = ['a', 'b', 'c'].map(measurement);
    const before = snapshot([a, b, c]);
    before.pointBindings.syncGroups = [
      {
        id: 'shared',
        name: '共享点',
        color: '#FFF',
        source: 'manual',
        members: [createManualPointRef(a, 0)!, createManualPointRef(b, 0)!],
      },
    ];
    const selection = {
      kind: 'point' as const,
      measurementId: 'a',
      pointIndex: 0,
    };
    const moved = dragAnnotation(
      before,
      selection,
      { x: 130, y: 260 },
      {
        ...context,
        standardDistance: 100,
        standardDistancePoints: before.standardDistancePoints,
      }
    );
    const layers = partitionAnnotations(moved, before, selection);
    expect(layers.dynamic.measurements.map(item => item.id)).toEqual([
      'a',
      'b',
    ]);
    expect(layers.static.measurements).toEqual([c]);
    expect(layers.static.measurements[0]).toBe(c);
    const movedAgain = dragAnnotation(
      before,
      selection,
      { x: 180, y: 270 },
      {
        ...context,
        standardDistance: 100,
        standardDistancePoints: before.standardDistancePoints,
      }
    );
    expect(
      sameLayer(
        layers.static,
        partitionAnnotations(movedAgain, before, selection).static
      )
    ).toBe(true);
    expect(before.measurements[0].points[0]).toEqual({ x: 100, y: 200 });
  });

  it('tracks global keypoint dependents and removes the dynamic layer on commit or cancellation', () => {
    const ca = { ...measurement('ca'), type: 'ca', keypointSynced: true };
    const before = snapshot([ca, measurement('unrelated')]);
    before.keypoints = ['CL', 'CR'].map((id, index) => ({
      id,
      point: ca.points[index],
      source: AnnotationSource.AI,
      confidence: 1,
    }));
    const selection = { kind: 'keypoint' as const, keypointId: 'CL' };
    const moved = dragAnnotation(
      before,
      selection,
      { x: 140, y: 250 },
      {
        ...context,
        examType: '正位X光片',
        standardDistance: 100,
        standardDistancePoints: before.standardDistancePoints,
      }
    );
    const layers = partitionAnnotations(moved, before, selection);
    expect(layers.dynamic.measurements.map(item => item.id)).toEqual(['ca']);
    expect(layers.dynamic.keypoints.map(item => item.id)).toEqual(['CL']);
    expect(layers.static.keypoints[0]).toBe(before.keypoints[1]);
    expect(partitionAnnotations(moved, null, selection).dynamic).toBe(
      emptyLayer
    );
    expect(
      partitionAnnotations(before, null, selection).static.measurements
    ).toBe(before.measurements);
    const removed = partitionAnnotations(
      { ...moved, measurements: [] },
      before,
      selection
    );
    expect(removed.static.measurements).toEqual([]);
    expect(removed.dynamic.measurements).toEqual([]);
  });

  it('isolates calibration changes and keeps the rendering partition complete', () => {
    const before = snapshot([measurement('a')]);
    const moved = {
      ...before,
      standardDistancePoints: [
        { x: 10, y: 1900 },
        before.standardDistancePoints[1],
      ],
    };
    const layers = partitionAnnotations(moved, before, {
      kind: 'calibration',
      pointIndex: 0,
    });
    expect(layers.static.calibration).toEqual([]);
    expect(layers.dynamic.calibration).toBe(moved.standardDistancePoints);
    expect([
      ...layers.static.measurements,
      ...layers.dynamic.measurements,
    ]).toEqual(moved.measurements);
  });

  it('bounds a dynamic line to a small, stable tile and covers circles and off-screen clipping', () => {
    const layer = { ...emptyLayer, measurements: [measurement('a')] };
    const bounds = geometryBounds(layer, context, false, null)!;
    expect(bounds.width * bounds.height).toBeLessThan((400 * 800) / 8);
    expect(
      geometryBounds(
        {
          ...layer,
          measurements: [
            {
              ...layer.measurements[0],
              points: [
                { x: 102, y: 200 },
                { x: 300, y: 200 },
              ],
            },
          ],
        },
        context,
        false,
        null
      )
    ).toEqual(bounds);
    const circle = {
      ...measurement('circle'),
      type: 'circle',
      points: [
        { x: 500, y: 1000 },
        { x: 700, y: 1000 },
      ],
    };
    const circleBounds = geometryBounds(
      { ...emptyLayer, measurements: [circle] },
      context,
      false,
      null
    )!;
    expect(circleBounds.x).toBeLessThanOrEqual(120);
    expect(circleBounds.x + circleBounds.width).toBeGreaterThanOrEqual(280);
    expect(circleBounds.y).toBeLessThanOrEqual(320);
    expect(circleBounds.y + circleBounds.height).toBeGreaterThanOrEqual(480);
    expect(
      geometryBounds(
        layer,
        { ...context, imagePosition: { x: -5000, y: 0 } },
        false,
        null
      )
    ).toBeNull();
  });

  it.each([0.5, 1, 2, 8])(
    'aligns native control points with the domain projection at zoom %s',
    imageScale => {
      const viewport = { imageScale, imagePosition: { x: -30, y: 75 } };
      const origin = imageToScreen({ x: 0, y: 0 }, context),
        unit = imageToScreen({ x: 1, y: 0 }, context).x - origin.x;
      for (const point of [
        { x: 150, y: 450 },
        { x: -40, y: 2500 },
      ]) {
        const actual = projectControlPoint(point, origin, unit, viewport, {
          x: 200,
          y: 400,
        });
        const expected = imageToScreen(point, { ...context, ...viewport });
        expect(actual.x).toBeCloseTo(expected.x, 8);
        expect(actual.y).toBeCloseTo(expected.y, 8);
      }
    }
  );
});
