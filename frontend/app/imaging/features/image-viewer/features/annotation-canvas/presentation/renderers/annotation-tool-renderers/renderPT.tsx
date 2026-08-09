import type { JSX } from 'react';
import type { Point } from '@xiehe/imaging-core/contracts';
import type { SpecialElementRenderContext } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/types';
import {
  buildAngleArc,
  getSpecialRenderImagePoints,
  getPelvicArcRadius,
  getPelvicMeasurementGeometry,
  pickClosestRayAngle,
  projectSpecialRenderPoint,
  RENDER_IMAGE_LENGTHS,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/annotation-tool-renderers/annotationToolRendererUtils';
import { renderPelvicSharedGeometry } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/annotation-tool-renderers/renderPelvicSharedGeometry';

/**
 * PT（骨盆倾斜角）渲染器：CFH、骶骨中点、过CFH垂直参考线
 */
export function renderPT(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number,
  context?: SpecialElementRenderContext
): JSX.Element | null {
  const imagePoints = getSpecialRenderImagePoints(screenPoints, context);
  const resolvedPelvic =
    context?.resolvedMeasurement?.kind === 'pelvic'
      ? context.resolvedMeasurement
      : null;
  const geometry =
    resolvedPelvic?.geometry ?? getPelvicMeasurementGeometry(imagePoints);
  if (!geometry) return null;
  const pelvicScreenPoints = resolvedPelvic
    ? resolvedPelvic.pelvicPoints.map(project =>
        projectSpecialRenderPoint(project, context)
      )
    : screenPoints;

  const verticalLength = RENDER_IMAGE_LENGTHS.pelvicVerticalHalfLength;
  let path: string | null = null;
  const sacralMidpoint = projectSpecialRenderPoint(
    geometry.sacralMidpoint,
    context
  );
  const femoralHeadCenter = geometry.femoralHeadCenter
    ? projectSpecialRenderPoint(geometry.femoralHeadCenter, context)
    : null;
  const verticalStart =
    geometry.femoralHeadCenter &&
    projectSpecialRenderPoint(
      {
        x: geometry.femoralHeadCenter.x,
        y: geometry.femoralHeadCenter.y - verticalLength,
      },
      context
    );
  const verticalEnd =
    geometry.femoralHeadCenter &&
    projectSpecialRenderPoint(
      {
        x: geometry.femoralHeadCenter.x,
        y: geometry.femoralHeadCenter.y + verticalLength,
      },
      context
    );

  if (femoralHeadCenter && verticalEnd) {
    const connectionRayX = sacralMidpoint.x - femoralHeadCenter.x;
    const connectionRayY = sacralMidpoint.y - femoralHeadCenter.y;
    const connectionAngle =
      Math.atan2(connectionRayY, connectionRayX) * (180 / Math.PI);
    const verticalAngle = pickClosestRayAngle(connectionAngle, [-90, 90]);
    const connectionDistance = Math.sqrt(
      connectionRayX * connectionRayX + connectionRayY * connectionRayY
    );
    const radius = getPelvicArcRadius(
      connectionDistance,
      Math.abs(verticalEnd.y - femoralHeadCenter.y),
      'inner'
    );

    path = buildAngleArc(
      femoralHeadCenter,
      verticalAngle,
      connectionAngle,
      radius
    );
  }

  return (
    <>
      {renderPelvicSharedGeometry(
        pelvicScreenPoints,
        geometry,
        displayColor,
        context
      )}
      {femoralHeadCenter && verticalStart && verticalEnd && (
        <>
          <line
            x1={verticalStart.x}
            y1={verticalStart.y}
            x2={verticalEnd.x}
            y2={verticalEnd.y}
            stroke="#00ff00"
            strokeWidth="1"
            strokeDasharray="5,5"
            opacity="0.7"
          />
          <line
            x1={femoralHeadCenter.x}
            y1={femoralHeadCenter.y}
            x2={sacralMidpoint.x}
            y2={sacralMidpoint.y}
            stroke={displayColor}
            strokeWidth="2"
            strokeDasharray="3,3"
          />
        </>
      )}
      {path && (
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
