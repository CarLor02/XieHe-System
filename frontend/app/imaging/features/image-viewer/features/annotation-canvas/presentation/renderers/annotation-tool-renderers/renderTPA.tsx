import type { JSX } from 'react';
import type { Point } from '@xiehe/imaging-core/contracts';
import type { SpecialElementRenderContext } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/types';
import {
  getSpecialRenderImagePoints,
  projectSpecialRenderPoint,
  projectSpecialRenderPoints,
  RENDER_SCREEN_LENGTHS,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/annotation-tool-renderers/annotationToolRendererUtils';
import { getTpaGeometry } from '@xiehe/imaging-core/measurements/lateral';
import { getPelvicMeasurementGeometry } from '@xiehe/imaging-core/measurements/lateral';
import { renderPelvicSharedGeometry } from './renderPelvicSharedGeometry';
import { getVertebraCenterGeometry } from '@xiehe/imaging-core/geometry';
import { renderVertebraCenterGeometry } from './renderVertebraCenterGeometry';

/**
 * TPA渲染器：点1、点2、点3-4中点形成夹角
 */
export function renderTPA(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number,
  context?: SpecialElementRenderContext
): JSX.Element | null {
  if (screenPoints.length < 7) return null;

  const imagePoints = getSpecialRenderImagePoints(screenPoints, context);
  const resolvedPelvic =
    context?.resolvedMeasurement?.kind === 'pelvic' &&
    context.resolvedMeasurement.toolId === 'tpa'
      ? context.resolvedMeasurement
      : null;
  const fallbackGeometry = resolvedPelvic ? null : getTpaGeometry(imagePoints);
  const pelvicGeometry =
    resolvedPelvic?.geometry ??
    (fallbackGeometry
      ? getPelvicMeasurementGeometry(fallbackGeometry.pelvicPoints)
      : null);
  const t1ImagePoints = resolvedPelvic?.t1Points ?? imagePoints.slice(0, 4);
  const t1Corners =
    t1ImagePoints.length === 4
      ? ([
          t1ImagePoints[0],
          t1ImagePoints[1],
          t1ImagePoints[2],
          t1ImagePoints[3],
        ] as const)
      : null;
  const t1Center = t1Corners
    ? getVertebraCenterGeometry(t1Corners).center
    : null;
  const pelvicImagePoints =
    resolvedPelvic?.pelvicPoints ?? fallbackGeometry?.pelvicPoints;
  if (!t1Corners || !t1Center || !pelvicGeometry || !pelvicImagePoints) {
    return null;
  }
  const pelvicScreenPoints = projectSpecialRenderPoints(
    [...pelvicImagePoints],
    context
  );
  const center = projectSpecialRenderPoint(t1Center, context);
  const midpoint = projectSpecialRenderPoint(
    pelvicGeometry.sacralMidpoint,
    context
  );
  const vertex = projectSpecialRenderPoint(
    pelvicGeometry.femoralHeadCenter!,
    context
  );
  const sacralLeft = projectSpecialRenderPoint(
    pelvicGeometry.sacralLeft,
    context
  );
  const sacralRight = projectSpecialRenderPoint(
    pelvicGeometry.sacralRight,
    context
  );

  const dx1 = center.x - vertex.x;
  const dy1 = center.y - vertex.y;
  const angle1 = Math.atan2(dy1, dx1) * (180 / Math.PI);
  const dx2 = midpoint.x - vertex.x;
  const dy2 = midpoint.y - vertex.y;
  const angle2 = Math.atan2(dy2, dx2) * (180 / Math.PI);

  const radius = RENDER_SCREEN_LENGTHS.tpaArcRadius;
  const startX = vertex.x + radius * Math.cos((angle1 * Math.PI) / 180);
  const startY = vertex.y + radius * Math.sin((angle1 * Math.PI) / 180);
  const endX = vertex.x + radius * Math.cos((angle2 * Math.PI) / 180);
  const endY = vertex.y + radius * Math.sin((angle2 * Math.PI) / 180);

  let angleDiff = angle2 - angle1;
  if (angleDiff > 180) angleDiff -= 360;
  if (angleDiff < -180) angleDiff += 360;

  const sweepFlag = angleDiff > 0 ? 1 : 0;

  return (
    <>
      {renderPelvicSharedGeometry(
        pelvicScreenPoints,
        pelvicGeometry,
        displayColor,
        context
      )}
      {renderVertebraCenterGeometry({
        corners: t1Corners,
        displayColor,
        projectPoint: point => projectSpecialRenderPoint(point, context),
        opacity: 0.3,
      })}
      <line
        x1={center.x}
        y1={center.y}
        x2={vertex.x}
        y2={vertex.y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={vertex.x}
        y1={vertex.y}
        x2={midpoint.x}
        y2={midpoint.y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={sacralLeft.x}
        y1={sacralLeft.y}
        x2={sacralRight.x}
        y2={sacralRight.y}
        stroke={displayColor}
        strokeWidth="1"
        strokeDasharray="5,5"
        opacity="0.5"
      />
      <path
        d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 ${sweepFlag} ${endX} ${endY}`}
        fill="none"
        stroke={displayColor}
        strokeWidth="1.5"
        opacity="0.8"
      />
    </>
  );
}
