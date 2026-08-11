import { describe, expect, it } from 'vitest';

import type { MeasurementData } from '../../../shared/domain/contracts';
import {
  canDragWholeMeasurement,
  constrainDraggedMeasurementPoint,
  planWholeMeasurementDrag,
} from './measurement-drag-plan';

function measurement(
  type: string,
  points: MeasurementData['points']
): MeasurementData {
  return { id: type, type, points, value: '' };
}

describe('measurement drag plans', () => {
  it('keeps auxiliary and TTS trunk lines constrained without flattening the sacrum', () => {
    expect(
      constrainDraggedMeasurementPoint({
        measurement: measurement('aux-horizontal-line', [
          { x: 0, y: 4 },
          { x: 8, y: 4 },
        ]),
        pointIndex: 0,
        requestedPoint: { x: 2, y: 9 },
      })
    ).toEqual({ x: 2, y: 4 });

    const tts = measurement('tts', [
      { x: 0, y: 2 },
      { x: 8, y: 2 },
      { x: 1, y: 10 },
      { x: 7, y: 12 },
    ]);
    expect(
      constrainDraggedMeasurementPoint({
        measurement: tts,
        pointIndex: 2,
        requestedPoint: { x: 3, y: 20 },
      })
    ).toEqual({ x: 3, y: 20 });
  });

  it('moves only the manual TTS trunk line vertically', () => {
    const tts = measurement('tts', [
      { x: 1, y: 2 },
      { x: 5, y: 2 },
      { x: 0, y: 10 },
      { x: 8, y: 12 },
    ]);
    expect(planWholeMeasurementDrag(tts, { x: 99, y: 7 })).toEqual([
      { x: 1, y: 7 },
      { x: 5, y: 7 },
      { x: 0, y: 10 },
      { x: 8, y: 12 },
    ]);
    expect(canDragWholeMeasurement(tts, true)).toBe(true);
    expect(canDragWholeMeasurement(measurement('avt', tts.points), false)).toBe(
      false
    );
  });

  it('translates ordinary measurements around their bounding-box center', () => {
    expect(
      planWholeMeasurementDrag(
        measurement('rectangle', [
          { x: 0, y: 0 },
          { x: 4, y: 2 },
        ]),
        { x: 10, y: 10 }
      )
    ).toEqual([
      { x: 8, y: 9 },
      { x: 12, y: 11 },
    ]);
  });
});
