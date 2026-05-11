import type { JSX } from 'react';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';
import type { SpecialElementRenderContext } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  buildAngleArc,
  getSpecialRenderImagePoints,
  getPelvicArcRadius,
  getPelvicMeasurementGeometry,
  pickClosestRayAngle,
  projectSpecialRenderPoint,
  RENDER_IMAGE_LENGTHS,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers/annotationToolRendererUtils';

/**
 * PI（骨盆入射角）渲染器：骶骨中点、股骨头中点、中垂线
 */
export function renderPI(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number,
  context?: SpecialElementRenderContext
): JSX.Element | null {
  const imagePoints = getSpecialRenderImagePoints(screenPoints, context);
  const geometry = getPelvicMeasurementGeometry(imagePoints);
  if (!geometry) return null;

  const normalLength = RENDER_IMAGE_LENGTHS.pelvicNormalLength;
  const normalStartImage = {
    x: geometry.sacralMidpoint.x - geometry.sacralNormal.x * normalLength,
    y: geometry.sacralMidpoint.y - geometry.sacralNormal.y * normalLength,
  };
  const normalEndImage = {
    x: geometry.sacralMidpoint.x + geometry.sacralNormal.x * normalLength,
    y: geometry.sacralMidpoint.y + geometry.sacralNormal.y * normalLength,
  };
  const sacralLeft = projectSpecialRenderPoint(geometry.sacralLeft, context);
  const sacralRight = projectSpecialRenderPoint(geometry.sacralRight, context);
  const sacralMidpoint = projectSpecialRenderPoint(
    geometry.sacralMidpoint,
    context
  );
  const normalStart = projectSpecialRenderPoint(normalStartImage, context);
  const normalEnd = projectSpecialRenderPoint(normalEndImage, context);
  const femoralHeadCenter = geometry.femoralHeadCenter
    ? projectSpecialRenderPoint(geometry.femoralHeadCenter, context)
    : null;
  const showArc = !!geometry.femoralHeadCenter;
  let path: string | null = null;

  if (femoralHeadCenter) {
    const femoralRayX = femoralHeadCenter.x - sacralMidpoint.x;
    const femoralRayY = femoralHeadCenter.y - sacralMidpoint.y;
    const femoralAngle = Math.atan2(femoralRayY, femoralRayX) * (180 / Math.PI);
    const normalAngle = pickClosestRayAngle(femoralAngle, [
      Math.atan2(normalEnd.y - sacralMidpoint.y, normalEnd.x - sacralMidpoint.x) *
        (180 / Math.PI),
      Math.atan2(
        normalStart.y - sacralMidpoint.y,
        normalStart.x - sacralMidpoint.x
      ) *
        (180 / Math.PI),
    ]);
    const femoralDistance = Math.sqrt(
      femoralRayX * femoralRayX + femoralRayY * femoralRayY
    );
    const normalDistance = Math.sqrt(
      Math.pow(normalEnd.x - sacralMidpoint.x, 2) +
        Math.pow(normalEnd.y - sacralMidpoint.y, 2)
    );
    const radius = getPelvicArcRadius(
      femoralDistance,
      normalDistance,
      'outer'
    );

    path = buildAngleArc(sacralMidpoint, normalAngle, femoralAngle, radius);
  }

  return (
    <>
      <line
        x1={sacralLeft.x}
        y1={sacralLeft.y}
        x2={sacralRight.x}
        y2={sacralRight.y}
        stroke={displayColor}
        strokeWidth="2"
      />
      <line
        x1={normalStart.x}
        y1={normalStart.y}
        x2={normalEnd.x}
        y2={normalEnd.y}
        stroke={displayColor}
        strokeWidth="2"
      />
      <circle
        cx={sacralMidpoint.x}
        cy={sacralMidpoint.y}
        r="3"
        fill={displayColor}
      />
      {femoralHeadCenter && (
        <line
          x1={femoralHeadCenter.x}
          y1={femoralHeadCenter.y}
          x2={sacralMidpoint.x}
          y2={sacralMidpoint.y}
          stroke={displayColor}
          strokeWidth="2"
        />
      )}
      {showArc && path && (
        <path
          d={path}
          fill="none"
          stroke={displayColor}
          strokeWidth="1.5"
          opacity="0.8"
        />
      )}
    </>
  );
}
