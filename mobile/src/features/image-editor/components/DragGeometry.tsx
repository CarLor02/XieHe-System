import type { ComponentType } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { TransformContext } from '@xiehe/imaging-core/canvas';
import type { GeometryDrawing } from './geometryDrawing';
import type { DrawingBounds } from './annotationLayers';
import type { Viewport } from './interaction/canvasGestureModel';

export interface DragGeometryProps {
  drawings: GeometryDrawing[];
  bounds: DrawingBounds | null;
  context: TransformContext;
  viewport: SharedValue<Viewport>;
}

// 浏览器沿用已有的 SVG，避免为移动端 Web 预览加载 CanvasKit。
export const DragGeometry: ComponentType<DragGeometryProps> | null = null;
