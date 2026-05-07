import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';

const DIRECTLY_EDITABLE_ANNOTATION_IDS = new Set([
  'circle',
  'ellipse',
  'rectangle',
  'arrow',
  'polygon',
  'aux-length',
  'aux-angle',
  'aux-horizontal-line',
  'aux-vertical-line',
]);

/**
 * Only auxiliary drawings are directly editable on the canvas.
 * Medical measurements are projections derived from keypoints and should not
 * move independently from their keypoint anchors.
 */
export function isDirectlyEditableAnnotation(type: string): boolean {
  return DIRECTLY_EDITABLE_ANNOTATION_IDS.has(getAnnotationTypeId(type));
}
