import { memo, useSyncExternalStore } from 'react';
import { G, Rect, Text as SvgText } from 'react-native-svg';
import type { SharedValue } from 'react-native-reanimated';
import {
  imageToScreen,
  type TransformContext,
} from '@xiehe/imaging-core/canvas';
import {
  getAnnotationDisplayName,
  getColorForType,
  getLabelPositionForType,
} from '@xiehe/imaging-catalog/annotations';
import type { EditorReadoutStore } from '@/features/image-editor/application/EditorReadoutStore';
import type { EditorSelection } from '@/features/image-editor/application/dragAnnotation';
import type { Viewport } from './interaction/canvasGestureModel';
import { SvgLayer } from './SvgLayer';

/** 标签订阅低频读数；高频几何更新不进入文字绘制层。 */
export const AnnotationLabels = memo(function AnnotationLabels({
  readouts,
  context,
  viewport,
  selection,
  showKeypoints,
}: {
  readouts: EditorReadoutStore;
  context: TransformContext;
  viewport: SharedValue<Viewport>;
  selection: EditorSelection | null;
  showKeypoints: boolean;
}) {
  const state = useSyncExternalStore(
    readouts.subscribe,
    readouts.getState,
    readouts.getState
  );
  const snapshot = state.history?.present;
  if (!snapshot) return null;
  return (
    <SvgLayer context={context} viewport={viewport}>
      {snapshot.measurements.map(measurement => {
        if (!measurement.points.length) return null;
        const selected =
          selection &&
          'measurementId' in selection &&
          selection.measurementId === measurement.id;
        const color = selected ? '#FBBF24' : getColorForType(measurement.type);
        const point = imageToScreen(
          getLabelPositionForType(
            measurement.type,
            measurement.points,
            context.imageScale
          ),
          context
        );
        const label = `${getAnnotationDisplayName(measurement.type)}${measurement.value ? `  ${measurement.value}` : ''}`;
        const width = Math.min(210, label.length * 7 + 16);
        const x = Math.max(
          8,
          Math.min(
            (context.containerSize?.width ?? 300) - width - 68,
            point.x + 12
          )
        );
        const y = Math.max(
          24,
          Math.min((context.containerSize?.height ?? 300) - 8, point.y - 10)
        );
        return (
          <G key={measurement.id}>
            <Rect
              x={x}
              y={y - 16}
              width={width}
              height={23}
              rx={4}
              fill="#111827E8"
              stroke={color}
              strokeWidth={0.7}
            />
            <SvgText
              x={x + 7}
              y={y}
              fill={color}
              fontSize={11}
              fontWeight="500"
            >
              {label}
            </SvgText>
          </G>
        );
      })}
      {showKeypoints &&
        snapshot.keypoints.map(keypoint => {
          if (
            selection?.kind === 'keypoint' &&
            selection.keypointId === keypoint.id
          )
            return null;
          const point = imageToScreen(keypoint.point, context);
          return (
            <SvgText
              key={keypoint.id}
              x={point.x + 8}
              y={point.y - 7}
              fill="#6EE7B7"
              fontSize={10}
            >
              {keypoint.id}
            </SvgText>
          );
        })}
      {snapshot.standardDistancePoints.length === 2 &&
        (() => {
          const [a, b] = snapshot.standardDistancePoints.map(point =>
            imageToScreen(point, context)
          );
          return (
            <SvgText
              x={(a.x + b.x) / 2 + 7}
              y={(a.y + b.y) / 2 - 8}
              fill="#FBBF24"
              fontSize={11}
            >
              {snapshot.standardDistance} mm
            </SvgText>
          );
        })()}
    </SvgLayer>
  );
});
