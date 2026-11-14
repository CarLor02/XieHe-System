import type { ReactNode } from 'react';
import { G, Text } from 'react-native-svg';
import { DrawingPrimitives } from './DrawingPrimitives';
import { SvgLayer } from './SvgLayer';
import type { SharedValue } from 'react-native-reanimated';
import type { TransformContext } from '@xiehe/imaging-core/canvas';
import type { GeometryDrawing } from './geometryDrawing';
import type { DrawingBounds } from './annotationLayers';
import type { Viewport } from './interaction/canvasGestureModel';

export interface GeometrySceneProps {
  context: TransformContext;
  viewport: SharedValue<Viewport>;
  children: ReactNode;
}

export interface GeometryPictureProps {
  drawings: GeometryDrawing[];
  bounds: DrawingBounds;
  context: TransformContext;
  viewport: SharedValue<Viewport>;
}

// Web 每份图元使用独立 SVG，避免为浏览器预览加载 CanvasKit。
export function GeometryScene({ children }: GeometrySceneProps) {
  return <>{children}</>;
}

export function GeometryPicture({
  drawings,
  bounds,
  context: projection,
  viewport,
}: GeometryPictureProps) {
  return (
    <SvgLayer context={projection} viewport={viewport} bounds={bounds}>
      {drawings.map(({ key, color, primitives, ordinals }) => (
        <G key={key}>
          <DrawingPrimitives primitives={primitives} color={color} />
          {ordinals?.map(({ point, text }, j) => (
            <Text
              key={j}
              x={point.x}
              y={point.y}
              fill={color}
              fontSize={12}
              fontWeight="bold"
            >
              {text}
            </Text>
          ))}
        </G>
      ))}
    </SvgLayer>
  );
}
