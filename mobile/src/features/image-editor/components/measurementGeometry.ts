import type { MeasurementData, Point } from '@xiehe/imaging-core/contracts';
import {
  getAnnotationConfig,
  getAnnotationTypeId,
} from '@xiehe/imaging-catalog/annotations';
import { getVertebraCenterGeometry } from '@xiehe/imaging-core/geometry';
import { resolvePelvicMeasurement } from '@xiehe/imaging-core/measurements/lateral';
import {
  buildMeasurementDrawing,
  buildAvtDrawing,
  imageToScreen,
  type DrawingPrimitive,
  type TransformContext,
  type DrawingContext,
} from '@xiehe/imaging-core/canvas';

/** 医学工具使用共享绘制规则，平台只适配坐标和原生图元。 */
export function measurementGeometry(
  measurement: MeasurementData,
  context: TransformContext,
  options: Omit<DrawingContext, 'project' | 'resolvedMeasurement'> = {}
): DrawingPrimitive[] {
  const project = (point: Point) => imageToScreen(point, context);
  const drawingContext: DrawingContext = {
    ...options,
    project,
    resolvedMeasurement: resolvePelvicMeasurement(measurement) ?? undefined,
  };
  const type = getAnnotationTypeId(measurement.type);
  if (type === 'avt') return buildAvtDrawing(measurement, drawingContext);
  const renderer = getAnnotationConfig(measurement.type)?.rendererId;
  if (renderer)
    return buildMeasurementDrawing(
      renderer,
      measurement.points,
      drawingContext
    );
  const p = measurement.points.map(project);
  if (!p.length) return [];
  if (type === 'polygon') return [{ kind: 'polygon', points: p }];
  if (type === 'vertebra-center' && p.length === 4) {
    const geometry = getVertebraCenterGeometry([p[0], p[1], p[2], p[3]]);
    return [
      { kind: 'polygon', points: [...geometry.perimeter], dash: '5,5' },
      ...[geometry.topBottomMidline, geometry.leftRightMidline].map(
        ([start, end]): DrawingPrimitive => ({
          kind: 'line',
          start,
          end,
          dash: '5,5',
        })
      ),
      {
        kind: 'circle',
        center: geometry.center,
        radius: 3,
        fill: 'currentColor',
      },
    ];
  }
  if (p.length < 2) return [];
  if (type === 'circle')
    return [
      {
        kind: 'circle',
        center: p[0],
        radius: Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y),
      },
    ];
  // 椭圆第一个点是圆心，第二个点定义半轴，不能按矩形对角点解释。
  if (type === 'ellipse')
    return [
      {
        kind: 'ellipse',
        center: p[0],
        rx: Math.abs(p[1].x - p[0].x),
        ry: Math.abs(p[1].y - p[0].y),
      },
    ];
  if (type === 'rectangle')
    return [
      {
        kind: 'polygon',
        points: [
          p[0],
          { x: p[1].x, y: p[0].y },
          p[1],
          { x: p[0].x, y: p[1].y },
        ],
      },
    ];
  const result: DrawingPrimitive[] = [{ kind: 'line', start: p[0], end: p[1] }];
  if (type === 'arrow') {
    const angle = Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x);
    result.push({
      kind: 'polygon',
      fill: 'currentColor',
      stroke: 'none',
      points: [
        p[1],
        {
          x: p[1].x - 10 * Math.cos(angle - 0.45),
          y: p[1].y - 10 * Math.sin(angle - 0.45),
        },
        {
          x: p[1].x - 10 * Math.cos(angle + 0.45),
          y: p[1].y - 10 * Math.sin(angle + 0.45),
        },
      ],
    });
  } else if (p.length === 3)
    result.push({ kind: 'line', start: p[1], end: p[2] });
  else if (p.length === 4)
    result.push({ kind: 'line', start: p[2], end: p[3] });
  return result;
}
