import {
  getAuxiliaryMeasurementValueTagName,
  getAuxiliaryTagText,
  getDisplayName,
  getLabelPositionForType,
  hasCustomAuxiliaryTagText,
  isEditableAuxiliaryAnnotationType,
  usesAuxiliaryMeasurementValueTag,
  usesInlineAuxiliaryTag,
} from '@/app/imaging/features/image-viewer/features/measurements/domain/annotation-metadata';
import { TEXT_LABEL_CONSTANTS } from '@/app/imaging/features/image-viewer/shared/constants';
import { estimateTextHeight, estimateTextWidth } from '@/app/imaging/features/image-viewer/shared/labels';
import { MeasurementData, Point } from '@/app/imaging/features/image-viewer/shared/types';

interface HitTestLabelOptions {
  measurement: MeasurementData;
  screenPoint: Point;
  imageScale: number;
  imageToScreen: (point: Point) => Point;
}

export function hitTestMeasurementLabel({
  measurement,
  screenPoint,
  imageScale,
  imageToScreen,
}: HitTestLabelOptions) {
  const isInlineTag = usesInlineAuxiliaryTag(measurement.type);
  const usesAuxiliaryValueTag = usesAuxiliaryMeasurementValueTag(
    measurement.type
  );
  const usesAuxiliaryTagText =
    !usesAuxiliaryValueTag &&
    (isInlineTag ||
      (isEditableAuxiliaryAnnotationType(measurement.type) &&
        hasCustomAuxiliaryTagText(measurement)));
  const labelPosition = imageToScreen(
    getLabelPositionForType(measurement.type, measurement.points, imageScale)
  );
  const valueTagName = usesAuxiliaryValueTag
    ? getAuxiliaryMeasurementValueTagName(measurement)
    : getDisplayName(measurement.type);
  const textContent = usesAuxiliaryTagText
    ? getAuxiliaryTagText(measurement)
    : `${valueTagName}: ${measurement.value}`;
  const textWidth = estimateTextWidth(
    textContent,
    TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE,
    usesAuxiliaryTagText ? 0 : TEXT_LABEL_CONSTANTS.PADDING
  );
  const textHeight = estimateTextHeight(
    TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE,
    usesAuxiliaryTagText ? 0 : TEXT_LABEL_CONSTANTS.PADDING
  );
  const textTop = labelPosition.y - textHeight / 2;
  const textBottom = labelPosition.y + textHeight / 2;

  return (
    screenPoint.x >= labelPosition.x - textWidth / 2 &&
    screenPoint.x <= labelPosition.x + textWidth / 2 &&
    screenPoint.y >= textTop &&
    screenPoint.y <= textBottom
  );
}
