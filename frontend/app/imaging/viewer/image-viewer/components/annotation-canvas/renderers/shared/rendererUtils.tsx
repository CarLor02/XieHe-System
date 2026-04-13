import { MeasurementData, Point } from '../../../../types';
import { estimateTextHeight, estimateTextWidth } from '../../../../shared/labels';

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
  fontSize: number = 14
) {
  const text = `${measurement.type}: ${measurement.value}`;
  const width = estimateTextWidth(text, fontSize);
  const height = estimateTextHeight(fontSize, 0);

  return (
    <g>
      <rect
        x={labelPosition.x - width / 2}
        y={labelPosition.y - height / 2}
        width={width}
        height={height}
        rx={6}
        fill="rgba(17, 24, 39, 0.88)"
      />
      <text
        x={labelPosition.x}
        y={labelPosition.y}
        fill="#fff"
        fontSize={fontSize}
        dominantBaseline="middle"
        textAnchor="middle"
      >
        {text}
      </text>
    </g>
  );
}

export const renderDescriptionLabel = renderMeasurementValueTag;
