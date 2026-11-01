import { memo, useSyncExternalStore } from 'react';
import { Text as SvgText } from 'react-native-svg';
import type { SharedValue } from 'react-native-reanimated';
import {
  imageToScreen,
  getBilateralPelvicGeometryOwnerId,
  type TransformContext,
} from '@xiehe/imaging-core/canvas';
import {
  getAnnotationDisplayName,
  getAnnotationTypeId,
  getColorForType,
  getLabelPositionForType,
} from '@xiehe/imaging-catalog/annotations';
import type { EditorReadoutStore } from '@/features/image-editor/application/EditorReadoutStore';
import type { EditorSelection } from '@/features/image-editor/application/dragAnnotation';
import type { Viewport } from './interaction/canvasGestureModel';
import { getAvtLabelPosition } from '@xiehe/imaging-core/measurements/ap';
import { measurementGeometry } from './measurementGeometry';
import { DrawingPrimitives } from './DrawingPrimitives';
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
  const pelvicOwnerId = getBilateralPelvicGeometryOwnerId(
    snapshot.measurements,
    () => false
  );
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
          getAnnotationTypeId(measurement.type) === 'avt'
            ? getAvtLabelPosition(measurement)
            : getLabelPositionForType(
                measurement.type,
                measurement.points,
                context.imageScale
              ),
          context
        );
        const label = `${getAnnotationDisplayName(measurement.type)}${measurement.value ? `  ${measurement.value}` : ''}`;
        return (
          <SvgText
            key={measurement.id}
            // 标签跟随标注锚点；超出画布由 SVG 裁剪，不因视口边缘或文字长度重新定位。
            x={point.x + 19}
            y={point.y - 10}
            fill={color}
            fontSize={11}
            fontWeight="500"
          >
            {label}
          </SvgText>
        );
      })}
      {snapshot.measurements
        .filter(
          measurement =>
            getAnnotationTypeId(measurement.type) ===
              'hemipelvic-width-ratio' || measurement.id === pelvicOwnerId
        )
        .map(measurement => (
          <DrawingPrimitives
            key={`details:${measurement.id}`}
            textOnly
            color={getColorForType(measurement.type)}
            primitives={measurementGeometry(measurement, context, {
              renderPelvicSharedGeometry: measurement.id === pelvicOwnerId,
              calculationContext: {
                standardDistance: snapshot.standardDistance,
                standardDistancePoints: snapshot.standardDistancePoints,
                imageNaturalSize: context.imageNaturalSize,
              },
            })}
          />
        ))}
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
