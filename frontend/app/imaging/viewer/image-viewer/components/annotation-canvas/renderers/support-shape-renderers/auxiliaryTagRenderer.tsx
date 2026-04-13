import type { JSX } from 'react';
import {
  getAuxiliaryTagText,
  usesInlineAuxiliaryTag,
} from '../../../../domain/annotation-metadata';
import { MeasurementData, Point } from '../../../../types';

interface RenderAuxiliaryTagProps {
  measurement: MeasurementData;
  labelPosition: Point;
  displayColor: string;
  fontSize: number;
  hideAllLabels: boolean;
  hiddenMeasurementIds: Set<string>;
}

/**
 * 辅助图形使用内嵌彩色文字 tag，不走白底测量值标签。
 */
export function renderAuxiliaryTag({
  measurement,
  labelPosition,
  displayColor,
  fontSize,
  hideAllLabels,
  hiddenMeasurementIds,
}: RenderAuxiliaryTagProps): JSX.Element | null {
  if (!usesInlineAuxiliaryTag(measurement.type)) {
    return null;
  }

  if (hideAllLabels || hiddenMeasurementIds.has(measurement.id)) {
    return null;
  }

  return (
    <text
      x={labelPosition.x}
      y={labelPosition.y + 5}
      fill={displayColor}
      fontSize={fontSize}
      fontWeight="bold"
      textAnchor="middle"
      style={{ userSelect: 'none', pointerEvents: 'none' }}
    >
      {getAuxiliaryTagText(measurement)}
    </text>
  );
}
