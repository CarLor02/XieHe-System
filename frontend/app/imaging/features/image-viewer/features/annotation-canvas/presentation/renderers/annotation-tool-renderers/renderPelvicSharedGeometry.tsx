import type { JSX } from 'react';

import type { SpecialElementRenderContext } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/types';
import { circleRenderer } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/support-shape-renderers/circleRenderer';
import type { PelvicMeasurementGeometry } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

import { projectSpecialRenderPoint } from './annotationToolRendererUtils';

export function renderPelvicSharedGeometry(
  screenPoints: Point[],
  geometry: PelvicMeasurementGeometry,
  displayColor: string,
  context?: SpecialElementRenderContext
): JSX.Element | null {
  if (
    !context?.renderPelvicSharedGeometry ||
    geometry.mode !== 'bilateral' ||
    geometry.femoralHeadCircles.length !== 2 ||
    !geometry.femoralHeadCenter
  ) {
    return null;
  }

  const firstCenter = projectSpecialRenderPoint(
    geometry.femoralHeadCircles[0].center,
    context
  );
  const secondCenter = projectSpecialRenderPoint(
    geometry.femoralHeadCircles[1].center,
    context
  );
  const effectiveCfh = projectSpecialRenderPoint(
    geometry.femoralHeadCenter,
    context
  );
  const interactionState = context.effectiveCfhInteractionState ?? 'idle';
  const handleColor =
    interactionState === 'selected'
      ? '#ef4444'
      : interactionState === 'hovered'
        ? '#fbbf24'
        : displayColor;
  const handleRadius =
    interactionState === 'selected'
      ? 6
      : interactionState === 'hovered'
        ? 7
        : 4;

  return (
    <>
      {circleRenderer(screenPoints.slice(0, 2), displayColor, {
        strokeWidth: 2,
        opacity: 0.9,
      })}
      {circleRenderer(screenPoints.slice(2, 4), displayColor, {
        strokeWidth: 2,
        opacity: 0.9,
      })}
      <line
        x1={firstCenter.x}
        y1={firstCenter.y}
        x2={secondCenter.x}
        y2={secondCenter.y}
        stroke={displayColor}
        strokeWidth="2"
      />
      <circle
        cx={effectiveCfh.x}
        cy={effectiveCfh.y}
        r={handleRadius}
        fill={handleColor}
        stroke="#ffffff"
        strokeWidth={interactionState === 'idle' ? 1 : 2}
      />
      <text
        x={effectiveCfh.x + 8}
        y={effectiveCfh.y - 8}
        fill={handleColor}
        fontSize="12"
        fontWeight="bold"
        stroke="#000000"
        strokeWidth="0.5"
        paintOrder="stroke"
      >
        CFH
      </text>
    </>
  );
}
