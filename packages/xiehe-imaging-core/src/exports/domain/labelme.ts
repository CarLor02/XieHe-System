import type {
  CfhAnnotation,
  Point,
  VertebraAnnotation,
} from '../../shared/domain/contracts';

const LABELME_VERSION = '2025.7.4.0';
const SAME_POINT_EPSILON = 0.001;

interface LabelMeImageSize {
  width: number;
  height: number;
}

export type LabelMeShapeType = 'polygon' | 'line' | 'point';
export type LabelMePoint = [number, number];

export interface LabelMeShape {
  label: string;
  points: LabelMePoint[];
  group_id: null;
  description: string;
  shape_type: LabelMeShapeType;
  flags: Record<string, never>;
  mask: null;
}

type CornerIndex = 1 | 2 | 3 | 4;

export interface LabelMePayload {
  version: string;
  flags: Record<string, never>;
  shapes: LabelMeShape[];
  imagePath: string;
  imageData: null;
  imageHeight: number;
  imageWidth: number;
}

function scalePoint(
  point: Point,
  sourceSize: LabelMeImageSize,
  targetSize: LabelMeImageSize
): LabelMePoint {
  return [
    point.x * (sourceSize.width > 0 ? targetSize.width / sourceSize.width : 1),
    point.y *
      (sourceSize.height > 0 ? targetSize.height / sourceSize.height : 1),
  ];
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

function getCornerRef(label: string) {
  const match = /^([A-Z][A-Z]?\d+)-(1|2|3|4)$/.exec(label);
  if (!match || match[1] === 'S1') return null;
  return {
    groupLabel: match[1],
    cornerIndex: Number(match[2]) as CornerIndex,
  };
}

function createGroupedVertebra(
  label: string,
  group: Record<CornerIndex, VertebraAnnotation>
): VertebraAnnotation {
  const ordered = [group[1], group[2], group[3], group[4]];
  return {
    label,
    corners: ordered.map(item => item.corners[0]) as [
      Point,
      Point,
      Point,
      Point,
    ],
    confidence:
      ordered.reduce((sum, item) => sum + item.confidence, 0) / ordered.length,
    source: ordered[0].source,
  };
}

/** 兼容历史单角点记录与当前完整椎体记录，导出前统一归组。 */
export function normalizeVertebraeLayerForLabelMe(
  vertebraeLayer: VertebraAnnotation[]
): VertebraAnnotation[] {
  const fullLabels = new Set<string>();
  const groups = new Map<
    string,
    Partial<Record<CornerIndex, VertebraAnnotation>>
  >();
  const emitted = new Set<string>();

  for (const annotation of vertebraeLayer) {
    const ref = getCornerRef(annotation.label);
    if (ref) {
      const group = groups.get(ref.groupLabel) ?? {};
      group[ref.cornerIndex] = annotation;
      groups.set(ref.groupLabel, group);
    } else if (!isSinglePointAnnotation(annotation)) {
      fullLabels.add(annotation.label);
    }
  }

  return vertebraeLayer.flatMap(annotation => {
    const ref = getCornerRef(annotation.label);
    if (!ref) return [annotation];
    if (fullLabels.has(ref.groupLabel)) return [];
    const group = groups.get(ref.groupLabel);
    if (!group?.[1] || !group[2] || !group[3] || !group[4]) {
      return [annotation];
    }
    if (emitted.has(ref.groupLabel)) return [];
    emitted.add(ref.groupLabel);
    return [
      createGroupedVertebra(
        ref.groupLabel,
        group as Record<CornerIndex, VertebraAnnotation>
      ),
    ];
  });
}

export function buildLabelMeAnnotationPayload(input: {
  imagePath: string;
  vertebraeLayer: VertebraAnnotation[];
  cfhAnnotation?: CfhAnnotation | null;
  sourceSize: LabelMeImageSize;
  targetSize: LabelMeImageSize;
}): LabelMePayload {
  const shapes: LabelMeShape[] = [];
  const s1Points = new Map<number, LabelMePoint>();
  let hasCfhShape = false;

  for (const annotation of normalizeVertebraeLayerForLabelMe(
    input.vertebraeLayer
  )) {
    const s1Index = getS1PointIndex(annotation.label);
    if (s1Index !== null) {
      s1Points.set(
        s1Index,
        scalePoint(annotation.corners[0], input.sourceSize, input.targetSize)
      );
      continue;
    }
    if (annotation.label === 'CFH') hasCfhShape = true;
    if (isSinglePointAnnotation(annotation)) {
      shapes.push(
        createShape(annotation.label, 'point', [
          scalePoint(annotation.corners[0], input.sourceSize, input.targetSize),
        ])
      );
      continue;
    }
    const [topLeft, topRight, bottomLeft, bottomRight] = annotation.corners;
    shapes.push(
      createShape(annotation.label, 'polygon', [
        scalePoint(topLeft, input.sourceSize, input.targetSize),
        scalePoint(topRight, input.sourceSize, input.targetSize),
        scalePoint(bottomRight, input.sourceSize, input.targetSize),
        scalePoint(bottomLeft, input.sourceSize, input.targetSize),
      ])
    );
  }

  const s1Line = [s1Points.get(1), s1Points.get(2)].filter(
    (point): point is LabelMePoint => Boolean(point)
  );
  if (s1Line.length > 0) {
    shapes.push(
      createShape('S1', s1Line.length >= 2 ? 'line' : 'point', s1Line)
    );
  }
  if (input.cfhAnnotation && !hasCfhShape) {
    shapes.push(
      createShape('CFH', 'point', [
        scalePoint(
          input.cfhAnnotation.center,
          input.sourceSize,
          input.targetSize
        ),
      ])
    );
  }
  return {
    version: LABELME_VERSION,
    flags: {},
    shapes,
    imagePath: input.imagePath,
    imageData: null,
    imageHeight: input.targetSize.height,
    imageWidth: input.targetSize.width,
  };
}
