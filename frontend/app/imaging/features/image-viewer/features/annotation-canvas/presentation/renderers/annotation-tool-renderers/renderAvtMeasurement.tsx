import type { MeasurementData, Point } from '@xiehe/imaging-core/contracts';
import { buildAvtDrawing } from '@xiehe/imaging-core/canvas';
import { isAvtMetadata } from '@xiehe/imaging-core/measurements/ap';
import { renderDrawingPrimitives } from '../renderDrawingPrimitives';

export function renderAvtMeasurement({
  measurement,
  displayColor,
  imageToScreen,
}: {
  measurement: MeasurementData;
  displayColor: string;
  imageToScreen: (point: Point) => Point;
}) {
  if (!isAvtMetadata(measurement.avtMetadata)) return null;
  return renderDrawingPrimitives(
    buildAvtDrawing(measurement, { project: imageToScreen }),
    displayColor
  );
}
