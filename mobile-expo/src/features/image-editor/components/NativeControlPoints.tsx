import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import {
  imageToScreen,
  type TransformContext,
} from '@xiehe/imaging-core/canvas';
import { getInteractivePointsCount } from '@xiehe/imaging-catalog/annotations';
import type { AnnotationEditorSnapshot } from '@xiehe/imaging-core/editor';
import type { MeasurementData, Point } from '@xiehe/imaging-core/contracts';
import { getBilateralPelvicGeometryForMeasurement } from '@xiehe/imaging-core/measurements/lateral';
import type { EditorSelection } from '../application/dragAnnotation';
import {
  controlPointKey,
  projectControlPoint,
  type DragPreview,
  type Viewport,
} from './interaction/canvasGestureModel';

type Handle = {
  key: string;
  point: Point;
  radius: number;
  label?: string;
  hollow?: boolean;
  draft?: boolean;
};

const NativeHandle = memo(
  function NativeHandle({
    handle,
    context,
    viewport,
    preview,
  }: {
    handle: Handle;
    context: TransformContext;
    viewport: SharedValue<Viewport>;
    preview: SharedValue<DragPreview>;
  }) {
    const fit = { ...context, imageScale: 1, imagePosition: { x: 0, y: 0 } };
    const origin = imageToScreen({ x: 0, y: 0 }, fit);
    const unit = imageToScreen({ x: 1, y: 0 }, fit).x - origin.x;
    const center = {
      x: (context.containerSize?.width ?? 0) / 2,
      y: (context.containerSize?.height ?? 0) / 2,
    };
    const key = handle.key,
      point = handle.point;
    const style = useAnimatedStyle(() => {
      const active = preview.get();
      const target =
        active && controlPointKey(active.selection) === key
          ? active.point
          : point;
      const screen = projectControlPoint(
        target,
        origin,
        unit,
        viewport.get(),
        center
      );
      return {
        transform: [
          { translateX: screen.x - 14 },
          { translateY: screen.y - 14 },
        ],
      };
    });
    const color = handle.draft ? '#BFDBFE' : '#FBBF24';
    return (
      <Animated.View pointerEvents="none" style={[styles.handle, style]}>
        {!handle.hollow && !handle.draft && <View style={styles.halo} />}
        <View
          style={{
            position: 'absolute',
            left: 14 - handle.radius,
            top: 14 - handle.radius,
            width: handle.radius * 2,
            height: handle.radius * 2,
            borderRadius: handle.radius,
            borderWidth: 1.5,
            borderColor: color,
            backgroundColor: handle.hollow
              ? '#111827'
              : handle.draft
                ? '#2563EB'
                : color,
          }}
        />
        {!!handle.label && (
          <Text pointerEvents="none" style={[styles.label, { color }]}>
            {handle.label}
          </Text>
        )}
      </Animated.View>
    );
  },
  (a, b) =>
    a.context === b.context &&
    a.viewport === b.viewport &&
    a.preview === b.preview &&
    a.handle.key === b.handle.key &&
    a.handle.point.x === b.handle.point.x &&
    a.handle.point.y === b.handle.point.y &&
    a.handle.radius === b.handle.radius &&
    a.handle.label === b.handle.label &&
    a.handle.hollow === b.handle.hollow &&
    a.handle.draft === b.handle.draft
);

/** 控制点是小型原生视图，移动 transform 不再使 SVG 位图失效。 */
export function NativeControlPoints({
  snapshot,
  selection,
  context,
  viewport,
  preview,
  showKeypoints,
  draftPoints,
  drawingPreview,
}: {
  snapshot: AnnotationEditorSnapshot;
  selection: EditorSelection | null;
  context: TransformContext;
  viewport: SharedValue<Viewport>;
  preview: SharedValue<DragPreview>;
  showKeypoints: boolean;
  draftPoints: Point[];
  drawingPreview: MeasurementData | null;
}) {
  const handles: Handle[] = [];
  const selected =
    selection && 'measurementId' in selection
      ? snapshot.measurements.find(item => item.id === selection.measurementId)
      : null;
  for (const measurement of [selected, drawingPreview]) {
    if (!measurement) continue;
    measurement.points
      .slice(
        0,
        getInteractivePointsCount(measurement.type) ?? measurement.points.length
      )
      .forEach((point, index) =>
        handles.push({
          key: `point:${measurement.id}:${index}`,
          point,
          radius: 5,
          label: String(index + 1),
        })
      );
    const cfh =
      getBilateralPelvicGeometryForMeasurement(measurement)?.femoralHeadCenter;
    if (cfh)
      handles.push({
        key: `cfh:${measurement.id}`,
        point: cfh,
        radius: 6,
        hollow: true,
      });
  }
  if (selection?.kind === 'keypoint' && showKeypoints) {
    const keypoint = snapshot.keypoints.find(
      item => item.id === selection.keypointId
    );
    if (keypoint)
      handles.push({
        key: `keypoint:${keypoint.id}`,
        point: keypoint.point,
        radius: 7,
        label: keypoint.id,
        hollow: true,
      });
  }
  if (selection?.kind === 'calibration') {
    const point = snapshot.standardDistancePoints[selection.pointIndex];
    if (point)
      handles.push({
        key: `calibration:${selection.pointIndex}`,
        point,
        radius: 5,
        hollow: true,
      });
  }
  draftPoints.forEach((point, index) =>
    handles.push({
      key: `draft:${index}`,
      point,
      radius: 6,
      label: String(index + 1),
      draft: true,
    })
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {handles.map(handle => (
        <NativeHandle
          key={handle.key}
          handle={handle}
          context={context}
          viewport={viewport}
          preview={preview}
        />
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  handle: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 28,
    height: 28,
    overflow: 'visible',
  },
  halo: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FBBF241A',
  },
  label: {
    position: 'absolute',
    left: 22,
    top: -5,
    width: 90,
    fontSize: 10,
    lineHeight: 14,
  },
});
