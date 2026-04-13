import { MeasurementData, Point } from '../../../../types';
import { estimateTextHeight, estimateTextWidth } from '../../../../shared/labels';

/**
 * 格式化图表上显示的数值
 * 1. 取绝对值（不显示正负号）
 * 2. 只显示整数（四舍五入）
 * 3. 保留单位
 */
export function formatDisplayValue(value: string): string {
  // 提取数值和单位
  const match = value.match(/^(-?\d+\.?\d*)\s*(.*)$/);
  if (!match) return value;

  const numericValue = parseFloat(match[1]);
  const unit = match[2];

  // 取绝对值并四舍五入到整数
  const displayValue = Math.round(Math.abs(numericValue));

  return `${displayValue}${unit}`;
}

export function renderIndexedPoint(
  point: Point,
  index: number,
  color: string,
  radius: number = 4
) {
  return (
    <g key={`point-${index}`}>
      <circle cx={point.x} cy={point.y} r={radius} fill={color} />
      <text
        x={point.x + 8}
        y={point.y - 8}
        fill={color}
        fontSize="12"
        fontWeight="bold"
      >
        {index + 1}
      </text>
    </g>
  );
}

export function renderMeasurementValueTag(
  measurement: MeasurementData,
  labelPosition: Point,
  fontSize: number = 11,
  color: string = '#10b981'
) {
  // 使用格式化后的值用于图表显示
  const displayValue = formatDisplayValue(measurement.value);
  const text = `${measurement.type}: ${displayValue}`;

  return (
    <text
      x={labelPosition.x}
      y={labelPosition.y}
      fill={color}
      fontSize={fontSize}
      fontWeight="bold"
      dominantBaseline="middle"
      textAnchor="middle"
      stroke="#000000"
      strokeWidth="3"
      paintOrder="stroke"
    >
      {text}
    </text>
  );
}

export const renderDescriptionLabel = renderMeasurementValueTag;
