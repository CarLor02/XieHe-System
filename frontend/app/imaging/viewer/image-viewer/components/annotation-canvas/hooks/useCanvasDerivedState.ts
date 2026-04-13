import { getEffectivePointsNeeded } from '../../../domain/annotation-inheritance';
import { MeasurementData, Tool } from '../../../types';
import { HoverState } from '../types';

interface UseCanvasDerivedStateOptions {
  selectedTool: string;
  tools: Tool[];
  measurements: MeasurementData[];
  hideAllAnnotations: boolean;
  hiddenAnnotationIds: Set<string>;
  hoverState: HoverState;
}

/**
 * 入口组件的轻量派生状态。
 * 这里只做 view model 拼装，不承载副作用。
 */
export function useCanvasDerivedState({
  selectedTool,
  tools,
  measurements,
  hideAllAnnotations,
  hiddenAnnotationIds,
  hoverState,
}: UseCanvasDerivedStateOptions) {
  const currentTool = tools.find(tool => tool.id === selectedTool) ?? null;
  const pointsNeeded = currentTool
    ? getEffectivePointsNeeded(
        currentTool.id,
        currentTool.pointsNeeded,
        measurements
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
