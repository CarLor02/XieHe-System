import type { MeasurementData, Point } from '@xiehe/imaging-core/contracts';
import { getVertebraCenterGeometry } from '@xiehe/imaging-core/geometry';
import { getAnnotationTypeId } from '@xiehe/imaging-core/measurements';
import {
  getAvtGeometry,
  getHemipelvicVerticalLines,
  resolveTtsMeasurement,
} from '@xiehe/imaging-core/measurements/ap';
import {
  getPelvicMeasurementGeometry,
  getTpaGeometry,
  resolvePelvicMeasurement,
} from '@xiehe/imaging-core/measurements/lateral';

export interface MeasurementGeometry {
  lines: { start: Point; end: Point; dashed?: boolean }[];
  polygons: Point[][];
  circles: { center: Point; radiusHandle: Point }[];
}

/** 仅把共享领域几何适配为原生 SVG 图元；不在渲染时改写点位或计算测量值。 */
export function measurementGeometry(
  measurement: MeasurementData,
  imageHeight: number
): MeasurementGeometry {
  const result: MeasurementGeometry = { lines: [], polygons: [], circles: [] };
  const p = measurement.points;
  const type = getAnnotationTypeId(measurement.type);
  if (type === 'rectangle' || type === 'ellipse') return result;
  const line = (
    start: Point | undefined,
    end: Point | undefined,
    dashed = false
  ) => {
    if (start && end) result.lines.push({ start, end, dashed });
  };
  const vertical = (point: Point) =>
    line({ x: point.x, y: 0 }, { x: point.x, y: imageHeight }, true);
  const box = (points: Point[]) => {
    if (points.length < 4) return null;
    const geometry = getVertebraCenterGeometry([
      points[0],
      points[1],
      points[2],
      points[3],
    ]);
    result.polygons.push([...geometry.perimeter]);
    line(...geometry.topBottomMidline, true);
    line(...geometry.leftRightMidline, true);
    return geometry.center;
  };
  if (type === 'circle' && p.length === 2)
    result.circles.push({ center: p[0], radiusHandle: p[1] });
  else if (type === 'polygon') result.polygons.push(p);
  else if (type === 'vertebra-center') box(p);
  else if (type === 'avt') {
    const geometry = getAvtGeometry(measurement);
    if (geometry) {
      if (geometry.targetPoints.length === 4) box(geometry.targetPoints);
      else line(geometry.targetPoints[0], geometry.targetPoints[1]);
      if (geometry.referencePoints.length === 4) box(geometry.referencePoints);
      else line(geometry.referencePoints[0], geometry.referencePoints[1]);
      vertical(geometry.referenceCenter);
      line(geometry.targetCenter, {
        x: geometry.referenceCenter.x,
        y: geometry.targetCenter.y,
      });
    }
  } else if (type === 'ts' || type === 'sva') {
    const center = p.length >= 4 ? box(p) : p[0];
    const reference =
      type === 'ts' && p.length >= 6
        ? { x: (p[4].x + p[5].x) / 2, y: (p[4].y + p[5].y) / 2 }
        : type === 'sva'
          ? p[4]
          : p[1];
    if (type === 'ts' && p.length >= 6) line(p[4], p[5]);
    if (center && reference) {
      vertical(center);
      vertical(reference);
      line(center, { x: reference.x, y: center.y });
    }
  } else if (type === 'tts') {
    const geometry = resolveTtsMeasurement(measurement);
    if (geometry) {
      line(...geometry.trunkPoints);
      line(...geometry.sacralPoints);
      vertical(geometry.trunkCenter);
      vertical(geometry.sacralCenter);
      const y = (geometry.trunkCenter.y + geometry.sacralCenter.y) / 2;
      line({ x: geometry.trunkCenter.x, y }, { x: geometry.sacralCenter.x, y });
    }
  } else if (type === 'hemipelvic-width-ratio') {
    getHemipelvicVerticalLines(p).forEach(l => line(l.top, l.bottom));
  } else if (['pi', 'pt', 'tpa'].includes(type)) {
    const resolved = resolvePelvicMeasurement(measurement);
    const tpa = type === 'tpa' ? getTpaGeometry(p) : null;
    const geometry = resolved?.geometry ?? getPelvicMeasurementGeometry(p);
    if (geometry) {
      result.circles.push(...geometry.femoralHeadCircles);
      line(geometry.sacralLeft, geometry.sacralRight);
      if (geometry.femoralHeadCenter) {
        line(geometry.femoralHeadCenter, geometry.sacralMidpoint);
        if (type === 'pt') vertical(geometry.femoralHeadCenter);
        if (type === 'pi') {
          const span = imageHeight * 0.1;
          line(
            {
              x: geometry.sacralMidpoint.x - geometry.sacralNormal.x * span,
              y: geometry.sacralMidpoint.y - geometry.sacralNormal.y * span,
            },
            {
              x: geometry.sacralMidpoint.x + geometry.sacralNormal.x * span,
              y: geometry.sacralMidpoint.y + geometry.sacralNormal.y * span,
            },
            true
          );
        }
        if (tpa) {
          box(p);
          line(tpa.femoralHeadCenter, tpa.t1Center);
        }
      }
    }
  } else if (type === 'lld') {
    p.slice(0, 2).forEach(point =>
      line(
        { x: point.x - 100, y: point.y },
        { x: point.x + 100, y: point.y },
        true
      )
    );
  } else if (p.length === 4) {
    line(p[0], p[1]);
    line(p[2], p[3]);
  } else if (p.length === 3) {
    line(p[0], p[1]);
    line(p[1], p[2]);
  } else line(p[0], p[1]);
  if (
    ['t1-tilt', 't1-slope', 'ca', 'po', 'css', 'ss'].includes(type) &&
    p.length >= 2
  )
    line({ x: p[0].x - 100, y: p[0].y }, { x: p[0].x + 100, y: p[0].y }, true);
  return result;
}
