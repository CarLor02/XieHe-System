import { expect, it } from 'vitest';
import { imageToScreen, drawingBoundsPoints } from '@xiehe/imaging-core/canvas';
import type { MeasurementData } from '@xiehe/imaging-core/contracts';
import { measurementGeometry } from './measurementGeometry';
import { geometryBounds } from './annotationLayers';

const context = {
  imageNaturalSize: { width: 1000, height: 2000 },
  containerSize: { width: 400, height: 800 },
  imageScale: 1,
  imagePosition: { x: 0, y: 0 },
};

it('renders AVT disc metadata and its finite reference instead of interpreting four points as two generic lines', () => {
  const measurement: MeasurementData = {
    id: 'avt',
    type: 'avt',
    value: '',
    points: [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 500, y: 600 },
      { x: 400, y: 600 },
    ],
    avtMetadata: {
      schemaVersion: 2,
      target: { type: 'disc', upperVertebra: 'T12', lowerVertebra: 'L1' },
      referenceLine: 'csvl',
    },
  };
  const drawing = measurementGeometry(measurement, context);
  const lines = drawing.filter(p => p.kind === 'line');
  expect(lines).toHaveLength(4);
  expect(lines[2]).toMatchObject({
    start: imageToScreen({ x: 450, y: 0 }, context),
    end: imageToScreen({ x: 450, y: 700 }, context),
  });
  expect(lines[3]).toMatchObject({
    start: imageToScreen({ x: 150, y: 100 }, context),
    end: imageToScreen({ x: 450, y: 100 }, context),
  });
});

it('keeps angle arcs inside the dynamic SVG bounds at mobile scale', () => {
  const measurement = {
    id: 'tilt',
    type: 't1-tilt',
    value: '',
    points: [
      { x: 350, y: 450 },
      { x: 450, y: 460 },
    ],
  };
  const bounds = geometryBounds(
    { measurements: [measurement], keypoints: [], calibration: [] },
    context,
    false,
    null
  )!;
  const geometry = measurementGeometry(measurement, context);
  expect(geometry.some(p => p.kind === 'arc')).toBe(true);
  for (const point of drawingBoundsPoints(geometry)) {
    expect(point.x).toBeGreaterThanOrEqual(bounds.x);
    expect(point.x).toBeLessThanOrEqual(bounds.x + bounds.width);
    expect(point.y).toBeGreaterThanOrEqual(bounds.y);
    expect(point.y).toBeLessThanOrEqual(bounds.y + bounds.height);
  }
});

it('interprets ellipse control points as center and half axes, matching hit testing and Web', () => {
  const drawing = measurementGeometry(
    {
      id: 'ellipse',
      type: 'ellipse',
      value: '',
      points: [
        { x: 500, y: 1000 },
        { x: 700, y: 1100 },
      ],
    },
    context
  );
  expect(drawing).toEqual([
    {
      kind: 'ellipse',
      center: imageToScreen({ x: 500, y: 1000 }, context),
      rx: 80,
      ry: 40,
    },
  ]);
});

it('draws bilateral femoral geometry once while preserving each measurement angle', () => {
  const measurement: MeasurementData = {
    id: 'pt',
    type: 'pt',
    value: '',
    pelvicMetadata: { schemaVersion: 2, femoralHeadMode: 'bilateral' },
    points: [
      { x: 300, y: 800 },
      { x: 350, y: 800 },
      { x: 500, y: 800 },
      { x: 550, y: 800 },
      { x: 350, y: 500 },
      { x: 450, y: 550 },
    ],
  };
  const owner = measurementGeometry(measurement, context, {
    renderPelvicSharedGeometry: true,
  });
  const sibling = measurementGeometry(measurement, context, {
    renderPelvicSharedGeometry: false,
  });
  expect(owner.filter(p => p.kind === 'circle')).toHaveLength(3);
  expect(sibling.filter(p => p.kind === 'circle')).toHaveLength(0);
  expect(sibling.filter(p => p.kind === 'arc')).toHaveLength(1);
});
