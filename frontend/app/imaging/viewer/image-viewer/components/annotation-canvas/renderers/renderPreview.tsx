import type { JSX } from 'react';
import { Point, MeasurementData } from '../../../types';
import {
  POINT_INHERITANCE_RULES,
  SHARED_ANATOMICAL_POINT_GROUPS,
} from '../../../domain/annotation-inheritance';
import { renderSpecialSVGElements } from '../../../domain/annotation-metadata';

interface RenderPreviewProps {
  selectedTool: string;
  currentTool: { id: string; name: string; pointsNeeded: number } | null;
  clickedPoints: Point[];
  measurements: MeasurementData[];
  imageScale: number;
  imageToScreen: (point: Point) => Point;
  getInheritedPoints: (
    toolId: string,
    measurements: { type: string; points: Point[] }[]
  ) => { points: Point[]; count: number };
}

/**
 * 当前工具的临时预览 renderer。
 * PreviewLayer 只负责放置和组合，具体预览分发在这里完成。
 */
export default function renderPreview({
  selectedTool,
  currentTool,
  clickedPoints,
  measurements,
  imageScale,
  imageToScreen,
  getInheritedPoints,
}: RenderPreviewProps): JSX.Element | null {
  if (
    selectedTool === 'circle' ||
    selectedTool === 'ellipse' ||
    selectedTool === 'rectangle' ||
    selectedTool === 'arrow' ||
    selectedTool === 'polygon' ||
    selectedTool === 'vertebra-center' ||
    selectedTool === 'aux-length' ||
    selectedTool === 'aux-angle' ||
    selectedTool === 'aux-horizontal-line' ||
    selectedTool === 'aux-vertical-line'
  ) {
    return null;
  }

  const isPelvicIncidenceTool =
    selectedTool.includes('pi') || selectedTool.includes('pt');
  const currentToolId = currentTool?.id || selectedTool;
  const { count: inheritedPreviewCount } = isPelvicIncidenceTool
    ? getInheritedPoints(currentToolId, measurements)
    : { count: 0 };

  if (!isPelvicIncidenceTool && clickedPoints.length < 2) {
    return null;
  }
  if (isPelvicIncidenceTool && clickedPoints.length + inheritedPreviewCount < 2) {
    return null;
  }

  let previewPoints = clickedPoints;
  if (isPelvicIncidenceTool) {
    const inheritedMap = new Map<number, Point>();

    const asymRules = POINT_INHERITANCE_RULES[currentToolId] || [];
    for (const rule of asymRules) {
      const source = measurements.find(measurement => measurement.type === rule.fromType);
      if (!source) continue;

      for (let index = 0; index < rule.sourcePointIndices.length; index += 1) {
        const srcIdx = rule.sourcePointIndices[index];
        const dstIdx = rule.destinationPointIndices[index];
        if (srcIdx < source.points.length) {
          inheritedMap.set(dstIdx, source.points[srcIdx]);
        }
      }
    }

    for (const group of SHARED_ANATOMICAL_POINT_GROUPS) {
      const mine = group.participants.find(
        participant => participant.toolId === currentToolId
      );
      if (!mine || inheritedMap.has(mine.pointIndex)) continue;

      for (const participant of group.participants) {
        if (participant.toolId === currentToolId) continue;
        const source = measurements.find(
          measurement => measurement.type === participant.typeName
        );
        if (source && participant.pointIndex < source.points.length) {
          inheritedMap.set(mine.pointIndex, source.points[participant.pointIndex]);
          break;
        }
      }
    }

    const sacralLeft = inheritedMap.get(1);
    const sacralRight = inheritedMap.get(2);
    if (sacralLeft && sacralRight) {
      previewPoints =
        clickedPoints.length > 0
          ? [clickedPoints[0], sacralLeft, sacralRight]
          : [sacralLeft, sacralRight];
    }
  }

  const screenPoints = previewPoints.map(point => imageToScreen(point));

  if (selectedTool.includes('ts') && screenPoints.length >= 2) {
    return (
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke="#ef4444"
        strokeWidth="2"
        strokeDasharray="2,2"
      />
    );
  }

  if (currentTool?.pointsNeeded === 4 && screenPoints.length >= 2) {
    return screenPoints.length < 4 ? (
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke="#ef4444"
        strokeWidth="2"
        strokeDasharray="2,6"
      />
    ) : null;
  }

  if (
    currentTool?.pointsNeeded === 3 &&
    screenPoints.length >= 2 &&
    !selectedTool.includes('pi') &&
    !selectedTool.includes('pt')
  ) {
    return (
      <>
        {screenPoints.slice(0, -1).map((point, index) => (
          <line
            key={`preview-line-${index}`}
            x1={point.x}
            y1={point.y}
            x2={screenPoints[index + 1].x}
            y2={screenPoints[index + 1].y}
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="2,2"
          />
        ))}
      </>
    );
  }

  if (
    (selectedTool.includes('t1-tilt') ||
      selectedTool.includes('t1-slope') ||
      selectedTool.includes('ca') ||
      selectedTool.includes('pelvic') ||
      selectedTool.includes('sacral')) &&
    screenPoints.length === 2
  ) {
    return (
      <line
        x1={screenPoints[0].x}
        y1={screenPoints[0].y}
        x2={screenPoints[1].x}
        y2={screenPoints[1].y}
        stroke="#ef4444"
        strokeWidth="2"
        strokeDasharray="2,2"
      />
    );
  }

  if (isPelvicIncidenceTool) {
    return renderSpecialSVGElements(
      currentTool?.name || selectedTool,
      screenPoints,
      '#ef4444',
      imageScale
    );
  }

  if (selectedTool.includes('c7-offset')) {
    return null;
  }

  return (
    <line
      x1={screenPoints[0].x}
      y1={screenPoints[0].y}
      x2={screenPoints[screenPoints.length - 1].x}
      y2={screenPoints[screenPoints.length - 1].y}
      stroke="#ef4444"
      strokeWidth="2"
      strokeDasharray="2,2"
    />
  );
}
