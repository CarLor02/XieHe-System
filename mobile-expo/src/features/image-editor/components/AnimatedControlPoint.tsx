import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import { G } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import {
  imageToScreen,
  type TransformContext,
} from '@xiehe/imaging-core/canvas';
import type { Point } from '@xiehe/imaging-core/contracts';
import type { DragPreview } from './interaction/canvasGestureModel';
import type { EditorSelection } from '../application/dragAnnotation';
export const AnimatedSvgGroup = Animated.createAnimatedComponent(G);
const isWeb = Platform.OS === 'web';
export function svgMatrixProps(matrix: number[]): {
  transform?: string;
  matrix?: number[];
} {
  'worklet';

  // 原生 SVG 的 Fabric 属性为 matrix；Web SVG 使用标准 transform 属性。
  return isWeb
    ? {
        transform: `matrix(${matrix.join(' ')})`,
      }
    : {
        matrix,
        transform: undefined,
      };
}
export function selectionKey(selection: EditorSelection): string {
  'worklet';

  if (selection.kind === 'point')
    return `point:${selection.measurementId}:${selection.pointIndex}`;
  if (selection.kind === 'keypoint') return `keypoint:${selection.keypointId}`;
  if (selection.kind === 'calibration')
    return `calibration:${selection.pointIndex}`;
  if (selection.kind === 'effective-cfh')
    return `cfh:${selection.measurementId}`;
  return '';
}

/** 只驱动正在抓取的控制点。测量几何、值和关联点仍使用应用层的逐帧结果。 */
export function AnimatedControlPoint({
  pointKey,
  point,
  context,
  preview,
  children,
}: {
  pointKey: string;
  point: Point;
  context: TransformContext;
  preview: SharedValue<DragPreview>;
  children: ReactNode;
}) {
  const origin = imageToScreen(
    {
      x: 0,
      y: 0,
    },
    context
  );
  const unit =
    imageToScreen(
      {
        x: 1,
        y: 0,
      },
      context
    ).x - origin.x;
  const props = useAnimatedProps(() => {
    const active = preview.get();
    const matching = active && selectionKey(active.selection) === pointKey;
    const x = matching ? origin.x + active.point.x * unit - point.x : 0;
    const y = matching ? origin.y + active.point.y * unit - point.y : 0;
    return svgMatrixProps([1, 0, 0, 1, x, y]);
  });
  return <AnimatedSvgGroup animatedProps={props}>{children}</AnimatedSvgGroup>;
}
export function ControlPoint({
  enabled,
  ...props
}: Parameters<typeof AnimatedControlPoint>[0] & {
  enabled: boolean;
}) {
  return enabled ? (
    <AnimatedControlPoint {...props} />
  ) : (
    <G>{props.children}</G>
  );
}
