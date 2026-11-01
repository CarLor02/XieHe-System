import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import Svg, { G } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import type { TransformContext } from '@xiehe/imaging-core/canvas';
import {
  viewportMatrix,
  type Viewport,
} from './interaction/canvasGestureModel';
import type { DrawingBounds } from './annotationLayers';

const AnimatedGroup = Animated.createAnimatedComponent(G);
const isWeb = Platform.OS === 'web';

export function SvgLayer({
  children,
  context,
  viewport,
  bounds,
}: {
  children: ReactNode;
  context: TransformContext;
  viewport: SharedValue<Viewport>;
  bounds?: DrawingBounds;
}) {
  const rendered = {
    imageScale: context.imageScale,
    imagePosition: context.imagePosition,
  };
  const center = {
    x: (context.containerSize?.width ?? 0) / 2,
    y: (context.containerSize?.height ?? 0) / 2,
  };
  const x = bounds?.x ?? 0,
    y = bounds?.y ?? 0;
  const width = bounds?.width ?? context.containerSize?.width ?? 0,
    height = bounds?.height ?? context.containerSize?.height ?? 0;
  const props = useAnimatedProps<{ matrix?: number[]; transform?: string }>(
    () => {
      const matrix = viewportMatrix(viewport.get(), rendered, center);
      return isWeb ? { transform: `matrix(${matrix.join(' ')})` } : { matrix };
    }
  );
  return (
    <Svg
      pointerEvents="none"
      style={{ position: 'absolute', left: x, top: y }}
      width={width}
      height={height}
      // 裁剪原点随 SVG 布局一起提交；放进动画矩阵会在挂载或换格时短暂显示错位副本。
      viewBox={bounds ? `${x} ${y} ${width} ${height}` : undefined}
      preserveAspectRatio="none"
    >
      <AnimatedGroup animatedProps={props}>{children}</AnimatedGroup>
    </Svg>
  );
}
