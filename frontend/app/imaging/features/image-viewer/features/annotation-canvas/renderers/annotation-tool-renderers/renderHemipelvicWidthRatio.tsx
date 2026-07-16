import type { JSX } from 'react';

import type { Point } from '@/app/imaging/features/image-viewer/shared/types';
import {
  calculateActualDistance,
  type SpecialElementRenderContext,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config-utils';
import { calculateHemipelvicWidthRatioGeometry } from '@/app/imaging/features/image-viewer/features/measurements/domain/hemipelvic-width-ratio';

function renderDistanceMarker(
  key: string,
  label: string,
  firstLineX: number,
  secondLineX: number,
  y: number,
  displayColor: string,
  value: number
) {
  const textX = (firstLineX + secondLineX) / 2;

  return (
    <g key={key} pointerEvents="none">
      <line
        x1={firstLineX}
        y1={y}
        x2={secondLineX}
        y2={y}
        stroke={displayColor}
        strokeWidth="1.5"
        strokeDasharray="4,3"
      />
      {[firstLineX, secondLineX].map((x, index) => (
        <line
          key={`${key}-tick-${index}`}
          x1={x}
          y1={y - 5}
          x2={x}
          y2={y + 5}
          stroke={displayColor}
          strokeWidth="1.5"
        />
      ))}
      <text
        x={textX}
        y={y - 6}
        fill={displayColor}
        fontSize="11"
        fontWeight="bold"
        textAnchor="middle"
        stroke="#000000"
        strokeWidth="1.5"
        paintOrder="stroke"
      >
        {label}: {value.toFixed(2)}mm
      </text>
    </g>
  );
}

export function renderHemipelvicWidthRatio(
  screenPoints: Point[],
  displayColor: string,
  _imageScale: number,
  context?: SpecialElementRenderContext
): JSX.Element | null {
  const imagePoints = context?.imagePoints ?? screenPoints;
  const geometry = calculateHemipelvicWidthRatioGeometry(imagePoints);
  if (!geometry) {
    return null;
  }

  const imageToScreen = context?.imageToScreen ?? ((point: Point) => point);
  const renderedLines = geometry.lines.map(line => ({
    ...line,
    screenAnchor: imageToScreen(line.anchor),
    screenTop: imageToScreen(line.top),
    screenBottom: imageToScreen(line.bottom),
  }));
  const calculationContext = context?.calculationContext;
  const dL = calculationContext
    ? calculateActualDistance(geometry.dLPixels, calculationContext)
    : geometry.dLPixels;
  const dR = calculationContext
    ? calculateActualDistance(geometry.dRPixels, calculationContext)
    : geometry.dRPixels;
  const leftMarkerY =
    Math.max(renderedLines[0].screenAnchor.y, renderedLines[1].screenAnchor.y) +
    20;
  const rightMarkerY =
    Math.max(renderedLines[2].screenAnchor.y, renderedLines[3].screenAnchor.y) +
    20;

  return (
    <g pointerEvents="none">
      {renderedLines.map(line => (
        <g key={`hemipelvic-line-${line.sourceIndex}`}>
          <line
            x1={line.screenTop.x}
            y1={line.screenTop.y}
            x2={line.screenBottom.x}
            y2={line.screenBottom.y}
            stroke={displayColor}
            strokeWidth="2"
          />
          <text
            x={line.screenTop.x}
            y={Math.min(line.screenTop.y, line.screenBottom.y) - 8}
            fill={displayColor}
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            stroke="#000000"
            strokeWidth="1.5"
            paintOrder="stroke"
          >
            {line.label}
          </text>
        </g>
      ))}
      {renderDistanceMarker(
        'hemipelvic-dl',
        'dL',
        renderedLines[0].screenAnchor.x,
        renderedLines[1].screenAnchor.x,
        leftMarkerY,
        displayColor,
        dL
      )}
      {renderDistanceMarker(
        'hemipelvic-dr',
        'dR',
        renderedLines[2].screenAnchor.x,
        renderedLines[3].screenAnchor.x,
        rightMarkerY,
        displayColor,
        dR
      )}
    </g>
  );
}
