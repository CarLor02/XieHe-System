import type { Point } from '@xiehe/imaging-core/contracts';
import { buildMeasurementDrawing } from '@xiehe/imaging-core/canvas';
import type { SpecialElementRenderContext } from '../types';
import { renderDrawingPrimitives } from '../renderDrawingPrimitives';

export function renderSingleHorizontalLine(
  screenPoints: Point[],
  displayColor: string,
  _imageScale?: number,
  context?: SpecialElementRenderContext
) {
  const drawing = buildMeasurementDrawing(
    'single-horizontal-line',
    context?.imagePoints ?? screenPoints,
    {
      project: context?.imageToScreen,
      calculationContext: context?.calculationContext,
      resolvedMeasurement: context?.resolvedMeasurement,
      renderPelvicSharedGeometry: context?.renderPelvicSharedGeometry,
      effectiveCfhInteractionState: context?.effectiveCfhInteractionState,
    }
  );
  return drawing.length ? renderDrawingPrimitives(drawing, displayColor) : null;
}
