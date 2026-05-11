import type { JSX } from 'react';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';
import type { SpecialElementRenderContext } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import { renderSVA } from '@/app/imaging/features/image-viewer/features/annotation-canvas/renderers/annotation-tool-renderers/renderSVA';

/**
 * AVT/TS渲染器：两条垂直线
 */
export function renderVerticalLines(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number,
  context?: SpecialElementRenderContext
): JSX.Element | null {
  return renderSVA(screenPoints, displayColor, imageScale, context);
}
