import {
  imageToScreen,
  type DrawingPrimitive,
  type TransformContext,
} from '@xiehe/imaging-core/canvas';
import {
  getColorForType,
  getInteractivePointsCount,
} from '@xiehe/imaging-catalog/annotations';
import type { MeasurementData, Point } from '@xiehe/imaging-core/contracts';
import type { EditorSelection } from '@/features/image-editor/application/dragAnnotation';
import type { AnnotationLayer } from './annotationLayers';

export type GeometryDrawing = {
  key: string;
  color: string;
  primitives: DrawingPrimitive[];
  ordinals?: { point: Point; text: string }[];
};

/** 两种绘制后端共用颜色、编号和选中态；测量值及几何内的说明文字由读数层绘制。 */
export function measurementDrawing(
  measurement: MeasurementData,
  geometry: DrawingPrimitive[],
  context: TransformContext,
  selected: boolean,
  pointLabels?: readonly (string | undefined)[]
): GeometryDrawing {
  const key = `measurement:${measurement.id}`;
  if (selected) return { key, color: '#FBBF24', primitives: geometry };
  const primitives = [...geometry];
  const ordinals: NonNullable<GeometryDrawing['ordinals']> = [];
  const count =
    getInteractivePointsCount(measurement.type) ?? measurement.points.length;
  measurement.points.slice(0, count).forEach((point, i) => {
    const center = imageToScreen(point, context);
    primitives.push({
      kind: 'circle',
      center,
      radius: 3,
      fill: '#111827',
      strokeWidth: 1.5,
    });
    const text = pointLabels?.[i];
    if (text)
      ordinals.push({ point: { x: center.x + 8, y: center.y - 8 }, text });
  });
  return {
    key,
    color: getColorForType(measurement.type),
    primitives,
    ordinals,
  };
}

export function landmarkDrawings(
  layer: AnnotationLayer,
  context: TransformContext,
  selection: EditorSelection | null,
  showKeypoints: boolean
): GeometryDrawing[] {
  const result: GeometryDrawing[] = [];
  if (showKeypoints && layer.keypoints.length) {
    const primitives: DrawingPrimitive[] = [];
    for (const keypoint of layer.keypoints) {
      if (
        selection?.kind === 'keypoint' &&
        selection.keypointId === keypoint.id
      )
        continue;
      primitives.push({
        kind: 'circle',
        center: imageToScreen(keypoint.point, context),
        radius: 4,
        fill: '#111827',
        strokeWidth: 1.5,
      });
    }
    result.push({ key: 'keypoints', color: '#34D399', primitives });
  }
  if (layer.calibration.length === 2) {
    const [start, end] = layer.calibration.map(p => imageToScreen(p, context));
    const primitives: DrawingPrimitive[] = [
      { kind: 'line', start, end, dash: '4 3' },
    ];
    [start, end].forEach((center, i) => {
      if (selection?.kind !== 'calibration' || selection.pointIndex !== i)
        primitives.push({
          kind: 'circle',
          center,
          radius: 5,
          strokeWidth: 1,
          fill: '#111827',
        });
    });
    result.push({ key: 'calibration', color: '#FBBF24', primitives });
  }
  return result;
}
