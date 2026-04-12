import { getLabelPositionForType } from '../../../domain/annotation-metadata';
import { TEXT_LABEL_CONSTANTS } from '../../../shared/constants';
import { estimateTextHeight, estimateTextWidth } from '../../../shared/labels';
import { Measurement, Point } from '../../../types';

interface HitTestLabelOptions {
  measurement: Measurement;
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
  const labelPosition = imageToScreen(
    getLabelPositionForType(measurement.type, measurement.points, imageScale)
  );
  const textContent = `${measurement.type}: ${measurement.value}`;
  const textWidth = estimateTextWidth(
    textContent,
    TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE
  );
  const textHeight = estimateTextHeight(TEXT_LABEL_CONSTANTS.DEFAULT_FONT_SIZE);
  const textTop = labelPosition.y - textHeight / 2;
  const textBottom = labelPosition.y + textHeight / 2;

  return (
    screenPoint.x >= labelPosition.x - textWidth / 2 &&
    screenPoint.x <= labelPosition.x + textWidth / 2 &&
    screenPoint.y >= textTop &&
    screenPoint.y <= textBottom
  );
}

