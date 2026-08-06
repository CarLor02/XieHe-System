import { getEffectiveManualMeasurementPointsNeeded } from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/application/usecases/manualMeasurementKeypointInheritanceUseCase';
import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import {
  MeasurementData,
  Tool,
} from '@/app/imaging/features/image-viewer/shared/types';
import { HoverState } from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/model/canvas-state';

interface BuildCanvasDerivedStateOptions {
  selectedTool: string;
  tools: Tool[];
  measurements: MeasurementData[];
  keypoints: KeypointAnnotation[];
  hideAllAnnotations: boolean;
  hiddenAnnotationIds: Set<string>;
  hoverState: HoverState;
}

/**
 * 入口组件的轻量派生状态。
 * 这里只做 view model 拼装，不承载副作用。
 */
export function buildCanvasDerivedState({
  selectedTool,
  tools,
  measurements,
  keypoints,
  hideAllAnnotations,
  hiddenAnnotationIds,
  hoverState,
}: BuildCanvasDerivedStateOptions) {
  const currentTool = tools.find(tool => tool.id === selectedTool) ?? null;
  const pointsNeeded = currentTool
    ? getEffectiveManualMeasurementPointsNeeded(
        currentTool.id,
        currentTool.pointsNeeded,
        keypoints
      )
    : 2;
  const visibleMeasurements = measurements.filter(
    measurement =>
      !hideAllAnnotations && !hiddenAnnotationIds.has(measurement.id)
  );
  const orderedVisibleMeasurements = [
    ...visibleMeasurements.filter(
      measurement =>
        !(
          hoverState.measurementId === measurement.id &&
          hoverState.elementType === 'whole'
        )
    ),
    ...visibleMeasurements.filter(
      measurement =>
        hoverState.measurementId === measurement.id &&
        hoverState.elementType === 'whole'
    ),
  ];
  const workingPointHoverIndex =
    !hoverState.measurementId && hoverState.elementType === 'point'
      ? hoverState.pointIndex
      : null;

  return {
    currentTool,
    pointsNeeded,
    visibleMeasurements,
    orderedVisibleMeasurements,
    workingPointHoverIndex,
  };
}
