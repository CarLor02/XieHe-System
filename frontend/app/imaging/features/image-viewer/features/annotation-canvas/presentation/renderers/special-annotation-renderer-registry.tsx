import type { JSX } from 'react';

import { getAnnotationConfig } from '@xiehe/imaging-catalog/annotations';
import type { AnnotationRendererId } from '@xiehe/imaging-catalog/annotations';
import {
  renderC7Offset,
  renderHemipelvicWidthRatio,
  renderHorizontalLines,
  renderPI,
  renderPT,
  renderSacralWithPerpendicular,
  renderSingleHorizontalLine,
  renderSingleLineWithHorizontal,
  renderSingleVerticalLine,
  renderSS,
  renderSVA,
  renderT1Slope,
  renderT1Tilt,
  renderTPA,
  renderTTS,
  renderTwoLines,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/annotation-tool-renderers';
import type {
  AnnotationRenderer,
  AnnotationRendererRequest,
} from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/types';

function adaptPositionalRenderer(
  renderer: (
    screenPoints: AnnotationRendererRequest['screenPoints'],
    displayColor: string,
    imageScale: number,
    context: AnnotationRendererRequest['context']
  ) => JSX.Element | null
): AnnotationRenderer {
  return ({ screenPoints, displayColor, imageScale, context }) =>
    renderer(screenPoints, displayColor, imageScale, context);
}

/**
 * Canvas presentation owns every JSX implementation.
 *
 * `satisfies Record` makes a newly added renderer ID fail type-check until its
 * visual adapter is registered, while measurement catalog remains React-free.
 */
export const SPECIAL_ANNOTATION_RENDERERS = {
  'c7-offset': adaptPositionalRenderer(renderC7Offset),
  'hemipelvic-width-ratio': adaptPositionalRenderer(renderHemipelvicWidthRatio),
  'horizontal-lines': adaptPositionalRenderer(renderHorizontalLines),
  pi: adaptPositionalRenderer(renderPI),
  pt: adaptPositionalRenderer(renderPT),
  'sacral-with-perpendicular': adaptPositionalRenderer(
    renderSacralWithPerpendicular
  ),
  'single-horizontal-line': adaptPositionalRenderer(renderSingleHorizontalLine),
  'single-line-with-horizontal': adaptPositionalRenderer(
    renderSingleLineWithHorizontal
  ),
  'single-vertical-line': adaptPositionalRenderer(renderSingleVerticalLine),
  ss: adaptPositionalRenderer(renderSS),
  sva: adaptPositionalRenderer(renderSVA),
  't1-slope': adaptPositionalRenderer(renderT1Slope),
  't1-tilt': adaptPositionalRenderer(renderT1Tilt),
  tpa: adaptPositionalRenderer(renderTPA),
  tts: adaptPositionalRenderer(renderTTS),
  'two-lines': adaptPositionalRenderer(renderTwoLines),
} satisfies Record<AnnotationRendererId, AnnotationRenderer>;

export function renderSpecialAnnotationElements(
  type: string,
  request: AnnotationRendererRequest
): JSX.Element | null {
  const rendererId = getAnnotationConfig(type)?.rendererId;
  if (!rendererId) return null;

  return SPECIAL_ANNOTATION_RENDERERS[rendererId](request);
}
