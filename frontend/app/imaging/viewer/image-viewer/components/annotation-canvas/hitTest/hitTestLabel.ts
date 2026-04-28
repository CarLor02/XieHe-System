import {
  getAuxiliaryTagText,
  getLabelPositionForType,
  hasCustomAuxiliaryTagText,
  isEditableAuxiliaryAnnotationType,
  usesInlineAuxiliaryTag,
} from '../../../domain/annotation-metadata';
import { TEXT_LABEL_CONSTANTS } from '../../../shared/constants';
import { estimateTextHeight, estimateTextWidth } from '../../../shared/labels';
import { MeasurementData, Point } from '../../../types';

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
  const usesAuxiliaryTagText =
    isInlineTag ||
    (isEditableAuxiliaryAnnotationType(measurement.type) &&
      hasCustomAuxiliaryTagText(measurement));
  const labelPosition = imageToScreen(
    getLabelPositionForType(measurement.type, measurement.points, imageScale)
  );
  const textContent = usesAuxiliaryTagText
    ? getAuxiliaryTagText(measurement)
    : `${measurement.type}: ${measurement.value}`;
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
