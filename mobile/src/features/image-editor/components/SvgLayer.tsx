import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import type { TransformContext } from '@xiehe/imaging-core/canvas';
import type { Viewport } from './interaction/canvasGestureModel';
import { cacheMargin } from './interaction/viewportCache';
import type { DrawingBounds } from './annotationLayers';

export function SvgLayer({
  children,
  context,
  viewport,
  bounds,
}: {
  children?: ReactNode;
  context: TransformContext;
  viewport: SharedValue<Viewport>;
  bounds?: DrawingBounds;
}) {
  const liveTransform = useAnimatedStyle(() => {
    const live = viewport.get();
    return {
      transform: [
        { translateX: live.imagePosition.x },
        { translateY: live.imagePosition.y },
        { scale: live.imageScale },
      ],
    };
  });
  if (!context.containerSize) return null;
  const margin = cacheMargin(context.containerSize);
  const { x, y, width, height } = bounds ?? {
    x: -margin,
    y: -margin,
    width: context.containerSize.width + 2 * margin,
    height: context.containerSize.height + 2 * margin,
  };
  const { imagePosition, imageScale } = context;
  return (
    <Animated.View
      collapsable={false}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, liveTransform]}
    >
      {/* 两层共用画布中心。逆变换和 SVG 的新坐标在同一 React 提交中生效；
          外层始终只读实时视口，不需要在交接时异步重置矩阵。 */}
      <View
        collapsable={false}
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              { translateX: -imagePosition.x / imageScale },
              { translateY: -imagePosition.y / imageScale },
              { scale: 1 / imageScale },
            ],
          },
        ]}
      >
        <Svg
          style={{ position: 'absolute', left: x, top: y }}
          width={width}
          height={height}
          viewBox={`${x} ${y} ${width} ${height}`}
          preserveAspectRatio="none"
        >
          {children}
        </Svg>
      </View>
    </Animated.View>
  );
}
