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

type CornerIndex = 1 | 2 | 3 | 4;

interface VertebraCornerRef {
  groupLabel: string;
  cornerIndex: CornerIndex;
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

function getVertebraCornerRef(label: string): VertebraCornerRef | null {
  const match = /^([A-Z][A-Z]?\d+)-(1|2|3|4)$/.exec(label);
  if (!match || match[1] === 'S1') {
    return null;
  }
  return {
    groupLabel: match[1],
    cornerIndex: Number(match[2]) as CornerIndex,
  };
}

function getAverageConfidence(annotations: VertebraAnnotation[]): number {
  if (annotations.length === 0) {
    return 1;
  }
  return (
    annotations.reduce((sum, annotation) => sum + annotation.confidence, 0) /
    annotations.length
  );
}

function createGroupedVertebra(
  label: string,
  annotations: Record<CornerIndex, VertebraAnnotation>
): VertebraAnnotation {
  const ordered = [1, 2, 3, 4].map(
    index => annotations[index as CornerIndex]
  ) as [
    VertebraAnnotation,
    VertebraAnnotation,
    VertebraAnnotation,
    VertebraAnnotation,
  ];

  return {
    label,
    corners: ordered.map(annotation => annotation.corners[0]) as [
      Point,
      Point,
      Point,
      Point,
    ],
    confidence: getAverageConfidence(ordered),
    source: ordered[0].source,
  };
}

export function normalizeVertebraeLayerForLabelMe(
  vertebraeLayer: VertebraAnnotation[]
): VertebraAnnotation[] {
  const fullVertebraLabels = new Set<string>();
  const cornerGroups = new Map<
    string,
    Partial<Record<CornerIndex, VertebraAnnotation>>
  >();
  const emittedGroups = new Set<string>();

  vertebraeLayer.forEach(annotation => {
    const cornerRef = getVertebraCornerRef(annotation.label);
    if (cornerRef) {
      const group = cornerGroups.get(cornerRef.groupLabel) ?? {};
      group[cornerRef.cornerIndex] = annotation;
      cornerGroups.set(cornerRef.groupLabel, group);
      return;
    }

    if (!isSinglePointAnnotation(annotation)) {
      fullVertebraLabels.add(annotation.label);
    }
  });

  return vertebraeLayer.flatMap(annotation => {
    const cornerRef = getVertebraCornerRef(annotation.label);
    if (!cornerRef) {
      return [annotation];
    }

    if (fullVertebraLabels.has(cornerRef.groupLabel)) {
      return [];
    }

    const group = cornerGroups.get(cornerRef.groupLabel);
    const isComplete =
      Boolean(group?.[1]) &&
      Boolean(group?.[2]) &&
      Boolean(group?.[3]) &&
      Boolean(group?.[4]);
    if (!isComplete) {
      return [annotation];
    }

    if (emittedGroups.has(cornerRef.groupLabel)) {
      return [];
    }

    emittedGroups.add(cornerRef.groupLabel);
    return [
      createGroupedVertebra(
        cornerRef.groupLabel,
        group as Record<CornerIndex, VertebraAnnotation>
      ),
    ];
  });
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
  const normalizedVertebraeLayer =
    normalizeVertebraeLayerForLabelMe(vertebraeLayer);

  normalizedVertebraeLayer.forEach(annotation => {
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
