import type { JSX } from 'react';
import { Point } from '@/app/imaging/features/image-viewer/shared/types';
import {
  getManualMeasurementInheritedPointMap,
  getManualMeasurementInheritedPoints,
} from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/application/usecases/manualMeasurementKeypointInheritanceUseCase';
import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import { HEMIPELVIC_WIDTH_RATIO_TOOL_ID } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap/hemipelvic-width-ratio';
import { renderSpecialAnnotationElements } from '@/app/imaging/features/image-viewer/features/annotation-canvas/presentation/renderers/special-annotation-renderer-registry';

interface RenderPreviewProps {
  selectedTool: string;
  currentTool: { id: string; name: string; pointsNeeded: number } | null;
  clickedPoints: Point[];
  keypoints: KeypointAnnotation[];
  imageScale: number;
  imageToScreen: (point: Point) => Point;
}

/**
 * 当前工具的临时预览 renderer。
 * PreviewLayer 只负责放置和组合，具体预览分发在这里完成。
 */
export default function renderPreview({
  selectedTool,
  currentTool,
  clickedPoints,
  keypoints,
  imageScale,
  imageToScreen,
}: RenderPreviewProps): JSX.Element | null {
  if (selectedTool === HEMIPELVIC_WIDTH_RATIO_TOOL_ID) {
    return null;
  }

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
    ? getManualMeasurementInheritedPoints(
        currentToolId,
        currentTool?.pointsNeeded ?? 0,
        keypoints
      )
    : { count: 0 };

  if (!isPelvicIncidenceTool && clickedPoints.length < 2) {
    return null;
  }
  if (
    isPelvicIncidenceTool &&
    clickedPoints.length + inheritedPreviewCount < 2
  ) {
    return null;
  }

  let previewPoints = clickedPoints;
  if (isPelvicIncidenceTool) {
    const inheritedMap = getManualMeasurementInheritedPointMap(
      currentToolId,
      currentTool?.pointsNeeded ?? 0,
      keypoints
    );

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

  if (selectedTool === 'ts' && screenPoints.length >= 2) {
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
      selectedTool === 'po' ||
      selectedTool === 'css') &&
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
    return renderSpecialAnnotationElements(currentTool?.id || selectedTool, {
      screenPoints,
      displayColor: '#ef4444',
      imageScale,
      context: {
        imagePoints: previewPoints,
        screenPoints,
        imageToScreen,
      },
    });
  }

  if (selectedTool === 'ts') {
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
