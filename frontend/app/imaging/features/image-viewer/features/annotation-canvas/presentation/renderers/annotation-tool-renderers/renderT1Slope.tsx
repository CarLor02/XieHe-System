import type { JSX } from 'react';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';
import type { SpecialElementRenderContext } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/types';
import { renderT1Tilt } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/annotation-tool-renderers/renderT1Tilt';

/**
 * T1 Slope 渲染器（侧位）：椎体线 + 水平参考线 + 角度弧线
 */
export function renderT1Slope(
  screenPoints: Point[],
  displayColor: string,
  imageScale: number,
  context?: SpecialElementRenderContext
): JSX.Element | null {
  return renderT1Tilt(screenPoints, displayColor, imageScale, context);
}
