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
const baseViewport: Viewport = {
  imageScale: 1,
  imagePosition: { x: 0, y: 0 },
};

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
  // 原生 G 的 React 重绘从 transform 重建矩阵，必须与本次投影匹配，不能冻结为挂载初值。
  const renderedMatrix = viewportMatrix(rendered, baseViewport, center);
  const projectionInverse = viewportMatrix(baseViewport, rendered, center);
  const props = useAnimatedProps<{ matrix?: number[]; transform?: string }>(
    () => {
      // 动画始终相对固定基准，React 提交新投影时无需异步归零旧的视口差值。
      const matrix = viewportMatrix(viewport.get(), baseViewport, center);
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
      <AnimatedGroup
        transform={`matrix(${renderedMatrix.join(' ')})`}
        animatedProps={props}
      >
        {/* 逆投影与子节点坐标同次提交，避免新坐标再次叠加上一帧的平移/缩放。 */}
        <G transform={`matrix(${projectionInverse.join(' ')})`}>{children}</G>
      </AnimatedGroup>
    </Svg>
  );
}
