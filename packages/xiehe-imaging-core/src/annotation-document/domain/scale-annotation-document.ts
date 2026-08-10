import type { ImageSize, Point } from '../../shared/domain/contracts';
import type { AnnotationDocument } from './annotation-document';
import { createAnnotationDocument } from './annotation-document-codec';

function scalePoint(point: Point, scaleX: number, scaleY: number): Point {
  return { x: point.x * scaleX, y: point.y * scaleY };
}

/**
 * 将完整标注快照从保存时的原图坐标系迁移到目标原图坐标系。
 * 没有可靠来源尺寸时返回等值副本，不猜测屏幕缩放比例。
 */
export function scaleAnnotationDocument(
  snapshot: AnnotationDocument,
  targetSize: ImageSize
): AnnotationDocument {
  const sourceWidth = snapshot.imageWidth;
  const sourceHeight = snapshot.imageHeight;
  const canScale =
    sourceWidth !== undefined &&
    sourceHeight !== undefined &&
    sourceWidth > 0 &&
    sourceHeight > 0;
  const scaleX = canScale ? targetSize.width / sourceWidth : 1;
  const scaleY = canScale ? targetSize.height / sourceHeight : 1;

  return createAnnotationDocument({
    ...snapshot,
    imageWidth: targetSize.width,
    imageHeight: targetSize.height,
    measurements: snapshot.measurements.map(measurement => ({
      ...measurement,
      points: measurement.points.map(point =>
        scalePoint(point, scaleX, scaleY)
      ),
    })),
    standardDistancePoints:
      snapshot.standardDistancePoints?.map(point =>
        scalePoint(point, scaleX, scaleY)
      ) ?? null,
    vertebraeLayer: snapshot.vertebraeLayer?.map(annotation => ({
      ...annotation,
      corners: annotation.corners.map(point =>
        scalePoint(point, scaleX, scaleY)
      ) as typeof annotation.corners,
    })),
    cfhAnnotation: snapshot.cfhAnnotation
      ? {
          ...snapshot.cfhAnnotation,
          center: scalePoint(snapshot.cfhAnnotation.center, scaleX, scaleY),
        }
      : snapshot.cfhAnnotation,
  });
}
