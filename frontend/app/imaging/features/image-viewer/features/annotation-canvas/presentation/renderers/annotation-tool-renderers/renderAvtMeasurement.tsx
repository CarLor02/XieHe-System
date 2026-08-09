import type { JSX } from 'react';
import type {
  MeasurementData,
  Point,
} from '@xiehe/imaging-core/contracts';
import {
  getAvtGeometry,
  isAvtMetadata,
} from '@xiehe/imaging-core/measurements/ap';

interface RenderAvtMeasurementOptions {
  measurement: MeasurementData;
  displayColor: string;
  imageToScreen: (point: Point) => Point;
}

function renderClosedShape(
  points: Point[],
  displayColor: string
): JSX.Element | null {
  if (points.length !== 4) return null;
  return (
    <polygon
      points={points.map(point => `${point.x},${point.y}`).join(' ')}
      fill="none"
      stroke={displayColor}
      strokeWidth="1"
      strokeDasharray="5,5"
      opacity="0.55"
    />
  );
}

/**
 * schema v2 AVT renderer.
 * 目标与参考线的数据布局由 AVT domain 解析，避免 renderer 依赖固定点下标。
 */
export function renderAvtMeasurement({
  measurement,
  displayColor,
  imageToScreen,
}: RenderAvtMeasurementOptions): JSX.Element | null {
  if (!isAvtMetadata(measurement.avtMetadata)) return null;
  const geometry = getAvtGeometry(measurement);
  if (!geometry) return null;

  const targetPoints = geometry.targetPoints.map(imageToScreen);
  const referencePoints = geometry.referencePoints.map(imageToScreen);
  const targetCenter = imageToScreen(geometry.targetCenter);
  const referenceCenter = imageToScreen(geometry.referenceCenter);
  const measurementReference = imageToScreen({
    x: geometry.referenceCenter.x,
    y: geometry.targetCenter.y,
  });

  const allY = [
    ...geometry.targetPoints.map(point => point.y),
    ...geometry.referencePoints.map(point => point.y),
    geometry.targetCenter.y,
  ];
  const guidePadding = Math.max(
    24,
    (Math.max(...allY) - Math.min(...allY)) * 0.2
  );
  const guideTop = imageToScreen({
    x: geometry.referenceCenter.x,
    y: Math.min(...allY) - guidePadding,
  });
  const guideBottom = imageToScreen({
    x: geometry.referenceCenter.x,
    y: Math.max(...allY) + guidePadding,
  });

  return (
    <>
      {measurement.avtMetadata.target.type === 'vertebra' ? (
        renderClosedShape(targetPoints, displayColor)
      ) : (
        <line
          x1={targetPoints[0].x}
          y1={targetPoints[0].y}
          x2={targetPoints[1].x}
          y2={targetPoints[1].y}
          stroke={displayColor}
          strokeWidth="2"
        />
      )}

      {geometry.referenceLine === 'c7pl' ? (
        renderClosedShape(referencePoints, displayColor)
      ) : (
        <line
          x1={referencePoints[0].x}
          y1={referencePoints[0].y}
          x2={referencePoints[1].x}
          y2={referencePoints[1].y}
          stroke={displayColor}
          strokeWidth="1"
          strokeDasharray="5,5"
          opacity="0.6"
        />
      )}

      <line
        x1={guideTop.x}
        y1={guideTop.y}
        x2={guideBottom.x}
        y2={guideBottom.y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={targetCenter.x}
        y1={targetCenter.y}
        x2={measurementReference.x}
        y2={measurementReference.y}
        stroke={displayColor}
        strokeWidth="2"
      />
      <circle
        cx={targetCenter.x}
        cy={targetCenter.y}
        r="3"
        fill={displayColor}
      />
      <circle
        cx={referenceCenter.x}
        cy={referenceCenter.y}
        r="3"
        fill={displayColor}
      />
    </>
  );
}
