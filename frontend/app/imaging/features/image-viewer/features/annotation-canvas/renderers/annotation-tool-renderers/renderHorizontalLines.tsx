import type { JSX } from 'react';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';
import { RENDER_SCREEN_LENGTHS } from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers/annotationToolRendererUtils';

/**
 * LLD 双下肢不等长渲染器：两条水平线
 */
export function renderHorizontalLines(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number
): JSX.Element | null {
  if (screenPoints.length < 2) return null;

  const width = RENDER_SCREEN_LENGTHS.horizontalGuideWidth;

  return (
    <>
      <line
        x1={screenPoints[0].x - width / 2}
        y1={screenPoints[0].y}
        x2={screenPoints[0].x + width / 2}
        y2={screenPoints[0].y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
      <line
        x1={screenPoints[1].x - width / 2}
        y1={screenPoints[1].y}
        x2={screenPoints[1].x + width / 2}
        y2={screenPoints[1].y}
        stroke={displayColor}
        strokeWidth="2"
        strokeDasharray="3,3"
      />
    </>
  );
}
