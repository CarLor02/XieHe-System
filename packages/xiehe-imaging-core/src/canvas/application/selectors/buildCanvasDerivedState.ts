import { getEffectiveManualMeasurementPointsNeeded } from '../../../measurement-keypoint-sync/domain';
import type { KeypointAnnotation } from '../../../keypoints/domain';
import type { MeasurementData } from '../../../shared/domain/contracts';
import type { HoverState } from '../../domain';

/** 画布派生状态只依赖工具的稳定交互字段，不依赖平台图标或展示文案。 */
export interface CanvasToolDescriptor {
  id: string;
  pointsNeeded: number;
}

interface BuildCanvasDerivedStateOptions<TTool extends CanvasToolDescriptor> {
  selectedTool: string;
  tools: readonly TTool[];
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
export function buildCanvasDerivedState<TTool extends CanvasToolDescriptor>({
  selectedTool,
  tools,
  measurements,
  keypoints,
  hideAllAnnotations,
  hiddenAnnotationIds,
  hoverState,
}: BuildCanvasDerivedStateOptions<TTool>) {
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
