import type {
  CfhAnnotation,
  Point,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/public';

const LABELME_VERSION = '2025.7.4.0';
const SAME_POINT_EPSILON = 0.001;

interface ImageSize {
  width: number;
  height: number;
}

type LabelMeShapeType = 'polygon' | 'line' | 'point';
type LabelMePoint = [number, number];

interface LabelMeShape {
  label: string;
  points: LabelMePoint[];
  group_id: null;
  description: string;
  shape_type: LabelMeShapeType;
  flags: Record<string, never>;
  mask: null;
}

export interface LabelMePayload {
  version: string;
  flags: Record<string, never>;
  shapes: LabelMeShape[];
  imagePath: string;
  imageData: null;
  imageHeight: number;
  imageWidth: number;
}

function scalePoint(point: Point, sourceSize: ImageSize, targetSize: ImageSize): LabelMePoint {
  const scaleX = sourceSize.width > 0 ? targetSize.width / sourceSize.width : 1;
  const scaleY = sourceSize.height > 0 ? targetSize.height / sourceSize.height : 1;
  return [point.x * scaleX, point.y * scaleY];
}

function createShape(
  label: string,
  shapeType: LabelMeShapeType,
  points: LabelMePoint[]
): LabelMeShape {
  return {
    label,
    points,
    group_id: null,
    description: '',
    shape_type: shapeType,
    flags: {},
    mask: null,
  };
}

function isSamePoint(left: Point, right: Point): boolean {
  return (
    Math.abs(left.x - right.x) <= SAME_POINT_EPSILON &&
    Math.abs(left.y - right.y) <= SAME_POINT_EPSILON
  );
}

function isSinglePointAnnotation(annotation: VertebraAnnotation): boolean {
  const [first, ...rest] = annotation.corners;
  return rest.every(point => isSamePoint(first, point));
}

function getS1PointIndex(label: string): number | null {
  const match = /^S1-(1|2)$/.exec(label);
  return match ? Number(match[1]) : null;
}

export function buildLabelMeAnnotationPayload({
  imagePath,
  vertebraeLayer,
  cfhAnnotation,
  sourceSize,
  targetSize,
}: {
  imagePath: string;
  vertebraeLayer: VertebraAnnotation[];
  cfhAnnotation?: CfhAnnotation | null;
  sourceSize: ImageSize;
  targetSize: ImageSize;
}): LabelMePayload {
  const shapes: LabelMeShape[] = [];
  const s1Points = new Map<number, LabelMePoint>();
  let hasCfhShape = false;

  vertebraeLayer.forEach(annotation => {
    const s1PointIndex = getS1PointIndex(annotation.label);
    if (s1PointIndex !== null) {
      s1Points.set(
        s1PointIndex,
        scalePoint(annotation.corners[0], sourceSize, targetSize)
      );
      return;
    }

    if (annotation.label === 'CFH') {
      hasCfhShape = true;
      shapes.push(
        createShape(
          'CFH',
          'point',
          [scalePoint(annotation.corners[0], sourceSize, targetSize)]
        )
      );
      return;
    }

    if (isSinglePointAnnotation(annotation)) {
      shapes.push(
        createShape(
          annotation.label,
          'point',
          [scalePoint(annotation.corners[0], sourceSize, targetSize)]
        )
      );
      return;
    }

    const [topLeft, topRight, bottomLeft, bottomRight] = annotation.corners;
    shapes.push(
      createShape(annotation.label, 'polygon', [
        scalePoint(topLeft, sourceSize, targetSize),
        scalePoint(topRight, sourceSize, targetSize),
        scalePoint(bottomRight, sourceSize, targetSize),
        scalePoint(bottomLeft, sourceSize, targetSize),
      ])
    );
  });

  const s1LinePoints = [s1Points.get(1), s1Points.get(2)].filter(
    (point): point is LabelMePoint => Boolean(point)
  );
  if (s1LinePoints.length > 0) {
    shapes.push(
      createShape('S1', s1LinePoints.length >= 2 ? 'line' : 'point', s1LinePoints)
    );
  }

  if (cfhAnnotation && !hasCfhShape) {
    shapes.push(
      createShape('CFH', 'point', [
        scalePoint(cfhAnnotation.center, sourceSize, targetSize),
      ])
    );
  }

  return {
    version: LABELME_VERSION,
    flags: {},
    shapes,
    imagePath,
    imageData: null,
    imageHeight: targetSize.height,
    imageWidth: targetSize.width,
  };
}

export function buildLabelMeAnnotationBlob(
  payload: LabelMePayload
): Blob {
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
}
