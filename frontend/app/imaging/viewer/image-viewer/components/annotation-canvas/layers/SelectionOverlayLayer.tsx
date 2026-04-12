import { Measurement, Point } from '../../../types';
import { SelectionState } from '../types';

interface SelectionOverlayLayerProps {
  selectionState: SelectionState;
  measurements: Measurement[];
  clickedPoints: Point[];
  imageToScreen: (point: Point) => Point;
}

/**
 * 选中对象的覆盖层。
 * 负责边界框等 selection overlay 渲染，入口组件不再直接计算 SVG 选择框。
 */
export default function SelectionOverlayLayer({
  selectionState,
  measurements,
  clickedPoints,
  imageToScreen,
}: SelectionOverlayLayerProps) {
  let selectedPoints: Point[] = [];
  let selectedMeasurement: Measurement | null = null;

  if (selectionState.measurementId) {
    const measurement =
      measurements.find(item => item.id === selectionState.measurementId) ??
      null;
    if (measurement) {
      selectedMeasurement = measurement;
      if (
        selectionState.type === 'point' &&
        selectionState.pointIndex !== null
      ) {
        selectedPoints = [measurement.points[selectionState.pointIndex]];
      } else {
        selectedPoints = measurement.points;
      }
    }
  } else if (
    selectionState.pointIndex !== null &&
    clickedPoints[selectionState.pointIndex]
  ) {
    selectedPoints = [clickedPoints[selectionState.pointIndex]];
  }

  if (selectedPoints.length === 0) return null;

  let minX: number;
  let maxX: number;
  let minY: number;
  let maxY: number;

  if (selectedMeasurement && selectionState.type === 'whole') {
    if (
      selectedMeasurement.type === '圆形标注' &&
      selectedMeasurement.points.length >= 2
    ) {
      const center = selectedMeasurement.points[0];
      const edge = selectedMeasurement.points[1];
      const screenCenter = imageToScreen(center);
      const screenEdge = imageToScreen(edge);
      const screenRadius = Math.hypot(
        screenEdge.x - screenCenter.x,
        screenEdge.y - screenCenter.y
      );

      minX = screenCenter.x - screenRadius - 15;
      maxX = screenCenter.x + screenRadius + 15;
      minY = screenCenter.y - screenRadius - 15;
      maxY = screenCenter.y + screenRadius + 15;
    } else if (
      selectedMeasurement.type === '椭圆标注' &&
      selectedMeasurement.points.length >= 2
    ) {
      const center = selectedMeasurement.points[0];
      const edge = selectedMeasurement.points[1];
      const screenCenter = imageToScreen(center);
      const screenEdge = imageToScreen(edge);
      const screenRadiusX = Math.abs(screenEdge.x - screenCenter.x);
      const screenRadiusY = Math.abs(screenEdge.y - screenCenter.y);

      minX = screenCenter.x - screenRadiusX - 15;
      maxX = screenCenter.x + screenRadiusX + 15;
      minY = screenCenter.y - screenRadiusY - 15;
      maxY = screenCenter.y + screenRadiusY + 15;
    } else if (
      (selectedMeasurement.type === '矩形标注' ||
        selectedMeasurement.type === '箭头标注') &&
      selectedMeasurement.points.length >= 2
    ) {
      const startScreen = imageToScreen(selectedMeasurement.points[0]);
      const endScreen = imageToScreen(selectedMeasurement.points[1]);

      minX = Math.min(startScreen.x, endScreen.x) - 15;
      maxX = Math.max(startScreen.x, endScreen.x) + 15;
      minY = Math.min(startScreen.y, endScreen.y) - 15;
      maxY = Math.max(startScreen.y, endScreen.y) + 15;
    } else {
      const screenPoints = selectedPoints.map(point => imageToScreen(point));
      const xs = screenPoints.map(point => point.x);
      const ys = screenPoints.map(point => point.y);
      minX = Math.min(...xs) - 15;
      maxX = Math.max(...xs) + 15;
      minY = Math.min(...ys) - 15;
      maxY = Math.max(...ys) + 15;
    }
  } else {
    const screenPoints = selectedPoints.map(point => imageToScreen(point));
    const xs = screenPoints.map(point => point.x);
    const ys = screenPoints.map(point => point.y);
    minX = Math.min(...xs) - 15;
    maxX = Math.max(...xs) + 15;
    minY = Math.min(...ys) - 15;
    maxY = Math.max(...ys) + 15;
  }

  return (
    <g>
      <rect
        x={minX}
        y={minY}
        width={maxX - minX}
        height={maxY - minY}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeDasharray="5,5"
        opacity="0.8"
      />
    </g>
  );
}
