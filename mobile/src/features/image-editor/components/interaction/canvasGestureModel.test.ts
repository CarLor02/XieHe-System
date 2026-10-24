import { describe, expect, it } from 'vitest';
import {
  calculatePinchViewport,
  constrainDraggedMeasurementPoint,
  getMeasurementPointDragConstraint,
  imageToScreen,
} from '@xiehe/imaging-core/canvas';
import {
  emptyMailbox,
  enqueueMove,
  pinchViewport,
  previewPoint,
  takeMove,
  viewportMatrix,
} from './canvasGestureModel';

describe('native canvas frame transport', () => {
  it('keeps only the newest coordinate and never queues a second calculation while JS is busy', () => {
    let mailbox = emptyMailbox();
    for (let x = 0; x < 100; x++)
      mailbox = enqueueMove(mailbox, {
        x,
        y: 10,
        translationX: x,
        translationY: 0,
      });
    const frame = takeMove(mailbox)!;
    expect(frame.latest?.x).toBe(99);
    expect(enqueueMove(frame, frame.latest!)).toBe(frame);
    expect(takeMove(frame)).toBeNull();
    mailbox = enqueueMove(frame, {
      x: 150,
      y: 10,
      translationX: 150,
      translationY: 0,
    });
    expect(takeMove(mailbox)).toBeNull();
    const next = takeMove({ ...mailbox, inFlight: false })!;
    expect(next.latest?.x).toBe(150);
    expect(takeMove({ ...next, inFlight: false })).toBeNull();
    expect(takeMove(emptyMailbox())).toBeNull();
  });

  it.each([0.01, 0.75, 1, 2.3, 20])(
    'matches the shared pinch geometry at scale %s',
    scale => {
      const start = { imageScale: 1.75, imagePosition: { x: 35, y: -42 } };
      const focal = { x: 123, y: 245 },
        current = { x: 147, y: 252 },
        center = { x: 200, y: 400 };
      const actual = pinchViewport(start, focal, current, scale, center);
      const expected = calculatePinchViewport(
        { ...start, midpoint: focal, containerCenter: center, distance: 1 },
        { x: current.x - scale / 2, y: current.y },
        { x: current.x + scale / 2, y: current.y },
        0.5,
        8
      );
      expect(actual.imageScale).toBeCloseTo(expected.imageScale, 9);
      expect(actual.imagePosition.x).toBeCloseTo(expected.imagePosition.x, 9);
      expect(actual.imagePosition.y).toBeCloseTo(expected.imagePosition.y, 9);
    }
  );

  it('keeps image and SVG coordinates aligned when changing the rendered viewport', () => {
    const size = {
      imageNaturalSize: { width: 1200, height: 2400 },
      containerSize: { width: 420, height: 680 },
    };
    const current = { imageScale: 3.4, imagePosition: { x: -85, y: 120 } };
    for (const rendered of [
      { imageScale: 1, imagePosition: { x: 0, y: 0 } },
      { imageScale: 2.1, imagePosition: { x: 75, y: -15 } },
    ]) {
      const matrix = viewportMatrix(current, rendered, { x: 210, y: 340 });
      for (const point of [
        { x: 0, y: 0 },
        { x: 1034, y: 2158 },
        { x: 600, y: 1200 },
      ]) {
        const before = imageToScreen(point, { ...size, ...rendered });
        const after = imageToScreen(point, { ...size, ...current });
        expect(before.x * matrix[0] + matrix[4]).toBeCloseTo(after.x, 9);
        expect(before.y * matrix[3] + matrix[5]).toBeCloseTo(after.y, 9);
      }
    }
  });

  it.each(['aux-horizontal-line', 'aux-vertical-line', 'tts', 'aux-length'])(
    'keeps the grab offset and shared %s constraint in the UI preview',
    type => {
      const measurement = {
        id: 'a',
        type,
        value: '',
        points: [
          { x: 10, y: 15 },
          { x: 80, y: 15 },
        ],
      };
      const requestedPoint = { x: 50, y: 100 };
      const plan = {
        kind: 'annotation' as const,
        selection: {
          kind: 'point' as const,
          measurementId: 'a',
          pointIndex: 0,
        },
        offset: { x: 2, y: 3 },
        origin: { x: 30, y: 50 },
        pixelsPerUnit: 0.5,
        fixed: getMeasurementPointDragConstraint(measurement, 0),
      };
      const sample = { x: 56, y: 101.5, translationX: 5, translationY: 4 };
      expect(previewPoint(plan, sample)).toEqual(
        constrainDraggedMeasurementPoint({
          measurement,
          pointIndex: 0,
          requestedPoint,
        })
      );
    }
  );
});
