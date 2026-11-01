import { memo } from 'react';
import { Circle, G } from 'react-native-svg';
import {
  imageToScreen,
  type TransformContext,
  type DrawingContext,
} from '@xiehe/imaging-core/canvas';
import {
  getColorForType,
  getInteractivePointsCount,
} from '@xiehe/imaging-catalog/annotations';
import type { MeasurementData } from '@xiehe/imaging-core/contracts';
import { measurementGeometry } from './measurementGeometry';
import { DrawingPrimitives } from './DrawingPrimitives';

export const MeasurementDrawing = memo(function MeasurementDrawing({
  measurement,
  context,
  selected,
  drawingContext,
}: {
  measurement: MeasurementData;
  context: TransformContext;
  selected: boolean;
  drawingContext?: DrawingContext;
}) {
  const color = selected ? '#FBBF24' : getColorForType(measurement.type);
  const geometry = measurementGeometry(measurement, context, drawingContext);
  const interactive =
    getInteractivePointsCount(measurement.type) ?? measurement.points.length;
  return (
    <G>
      <DrawingPrimitives primitives={geometry} color={color} />
      {!selected &&
        measurement.points.slice(0, interactive).map((point, index) => {
          const p = imageToScreen(point, context);
          return (
            <Circle
              key={index}
              cx={p.x}
              cy={p.y}
              r={3}
              fill="#111827"
              stroke={color}
              strokeWidth={1.5}
            />
          );
        })}
    </G>
  );
});
