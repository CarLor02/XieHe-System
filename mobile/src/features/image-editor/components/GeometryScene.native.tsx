import { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import {
  Canvas,
  Group,
  Picture,
  Skia,
  createPicture,
  matchFont,
  PaintStyle,
  type SkCanvas,
  type SkFont,
  type SkPaint,
  type Transforms3d,
} from '@shopify/react-native-skia';
import {
  angleArcPath,
  type DrawingPrimitive,
} from '@xiehe/imaging-core/canvas';
import type { GeometryPictureProps, GeometrySceneProps } from './GeometryScene';

function drawPrimitive(
  canvas: SkCanvas,
  p: DrawingPrimitive,
  color: string,
  paint: SkPaint
) {
  if (p.kind === 'vertebra') {
    p.children.forEach(child => drawPrimitive(canvas, child, color, paint));
    return;
  }
  if (p.kind === 'text') return;
  const path = pathFor(p);
  if (!path) return;
  paint.reset();
  paint.setAntiAlias(true);
  const draw = (value: string, style: PaintStyle) => {
    paint.setColor(Skia.Color(value === 'currentColor' ? color : value));
    if (p.opacity !== undefined) paint.setAlphaf(paint.getAlphaf() * p.opacity);
    paint.setStyle(style);
    canvas.drawPath(path, paint);
  };
  if (p.fill && p.fill !== 'none') draw(p.fill, PaintStyle.Fill);
  if (p.stroke !== 'none') {
    paint.setStrokeWidth(p.strokeWidth ?? 2);
    if (p.dash)
      paint.setPathEffect(
        Skia.PathEffect.MakeDash(p.dash.split(/[,\s]+/).map(Number))
      );
    draw(p.stroke ?? color, PaintStyle.Stroke);
  }
  path.dispose();
}

function pathFor(p: Exclude<DrawingPrimitive, { kind: 'text' | 'vertebra' }>) {
  switch (p.kind) {
    case 'line':
      return Skia.Path.Line(p.start, p.end);
    case 'circle':
      return Skia.Path.Circle(p.center.x, p.center.y, p.radius);
    case 'ellipse':
      return Skia.Path.Oval({
        x: p.center.x - p.rx,
        y: p.center.y - p.ry,
        width: 2 * p.rx,
        height: 2 * p.ry,
      });
    case 'polygon':
      return Skia.Path.Polygon(p.points, true);
    case 'arc':
      return Skia.Path.MakeFromSVGString(angleArcPath(p));
  }
}

function drawOrdinals(
  canvas: SkCanvas,
  drawing: GeometryPictureProps['drawings'][number],
  font: SkFont,
  paint: SkPaint
) {
  if (!drawing.ordinals?.length) return;
  paint.reset();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(drawing.color));
  for (const { point, text } of drawing.ordinals)
    canvas.drawText(text, point.x, point.y, paint, font);
}

export function GeometryPicture({ drawings, bounds }: GeometryPictureProps) {
  const font = useMemo(
    () =>
      matchFont({
        // Skia 只在 Apple 平台解析 System 别名，Android 使用系统注册的无衬线字体。
        fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
        fontSize: 12,
        fontWeight: Platform.OS === 'android' ? 'normal' : 'bold',
      }),
    []
  );
  // 图元在零平移的投影坐标中。录制范围包含画布外的负坐标，平移后仍可显示它们。
  const picture = useMemo(
    () =>
      createPicture(canvas => {
        const paint = Skia.Paint();
        for (const drawing of drawings) {
          for (const p of drawing.primitives)
            drawPrimitive(canvas, p, drawing.color, paint);
          drawOrdinals(canvas, drawing, font, paint);
        }
        paint.dispose();
      }, bounds),
    [drawings, bounds, font]
  );
  return <Picture picture={picture} />;
}

/** 所有几何只占一个原生表面，起拖时移动的是绘制指令，不再重画整张静态 SVG 位图。 */
export function GeometryScene({
  context,
  viewport,
  children,
}: GeometrySceneProps) {
  const { imageScale, containerSize } = context;
  const width = containerSize?.width ?? 0,
    height = containerSize?.height ?? 0;
  const transform = useDerivedValue<Transforms3d>(() => {
    const live = viewport.get();
    const ratio = live.imageScale / imageScale;
    return [
      { translateX: live.imagePosition.x + ((1 - ratio) * width) / 2 },
      { translateY: live.imagePosition.y + ((1 - ratio) * height) / 2 },
      { scale: ratio },
    ];
  });
  return (
    <Canvas
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      colorSpace="srgb"
    >
      <Group transform={transform}>{children}</Group>
    </Canvas>
  );
}
