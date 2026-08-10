import { isLateralExamType } from '../../shared/domain/anatomy';
import {
  AnnotationSource,
  type CfhAnnotation,
  type Point,
  type VertebraAnnotation,
} from '../../shared/domain/contracts';
import { sortCornersGeometrically } from '../../measurement-keypoint-sync/domain/point-normalization';
import type {
  AiFrontalKeypointResponse,
  AiLateralKeypointResponse,
  NormalizedAiKeypointDetection,
} from './contracts';

/**
 * 正位姿态点模型的左右语义与产品领域标签相反。交换只发生在 AI
 * 边界，进入领域层后 `_L` 始终表示屏幕左侧。
 */
const FRONTAL_POSE_LABEL_ALIASES: Readonly<Record<string, string>> = {
  CR: 'CL',
  CL: 'CR',
  IR: 'IL',
  IL: 'IR',
  SR: 'SL',
  SL: 'SR',
};

function confidenceValue(
  value: number | { parsedValue?: number } | null | undefined
): number {
  if (typeof value === 'number') return value;
  if (typeof value?.parsedValue === 'number') return value.parsedValue;
  return 1;
}

function normalizeLateral(
  response: AiLateralKeypointResponse,
  includeCfhVertebraAnnotation: boolean
): NormalizedAiKeypointDetection {
  const imageWidth = response.image_width ?? 1;
  const imageHeight = response.image_height ?? 1;
  const vertebrae: VertebraAnnotation[] = [];
  const highestConfidenceByLabel = new Map<
    string,
    NonNullable<AiLateralKeypointResponse['vertebrae']>[number]
  >();

  for (const detection of response.vertebrae ?? []) {
    if (detection.confidence < 0.1) continue;
    const current = highestConfidenceByLabel.get(detection.label);
    if (!current || detection.confidence > current.confidence) {
      highestConfidenceByLabel.set(detection.label, detection);
    }
  }

  let vertebraCount = 0;
  let pointCount = 0;
  for (const detection of highestConfidenceByLabel.values()) {
    if (detection.label === 'S1' && detection.keypoints.length >= 2) {
      const sacralPoints = detection.keypoints
        .slice(0, 2)
        .map(point => ({
          x: point.x * imageWidth,
          y: point.y * imageHeight,
        }))
        .sort((left, right) => left.x - right.x);
      sacralPoints.forEach((point, index) => {
        vertebrae.push({
          label: `S1-${index + 1}`,
          corners: [point, point, point, point],
          confidence: detection.confidence,
          source: AnnotationSource.AI,
        });
      });
      pointCount += 2;
      continue;
    }
    if (detection.keypoints.length !== 4) continue;
    const points = detection.keypoints.map(point => ({
      x: point.x * imageWidth,
      y: point.y * imageHeight,
    }));
    const [topLeft, topRight, bottomLeft, bottomRight] =
      sortCornersGeometrically(points);
    vertebrae.push({
      label: detection.label,
      corners: [topLeft, topRight, bottomLeft, bottomRight],
      confidence: detection.confidence,
      source: AnnotationSource.AI,
    });
    vertebraCount += 1;
    pointCount += 4;
  }

  let cfh: CfhAnnotation | null = null;
  if (response.cfh?.center) {
    const center = {
      x: response.cfh.center.x * imageWidth,
      y: response.cfh.center.y * imageHeight,
    };
    cfh = {
      center,
      confidence: response.cfh.confidence ?? 1,
      source: AnnotationSource.AI,
    };
    if (includeCfhVertebraAnnotation) {
      vertebrae.push({
        label: 'CFH',
        corners: [center, center, center, center],
        confidence: cfh.confidence,
        source: AnnotationSource.AI,
      });
    }
    pointCount += 1;
  }

  return { vertebrae, cfh, vertebraCount, pointCount };
}

function normalizeFrontal(
  response: AiFrontalKeypointResponse
): NormalizedAiKeypointDetection {
  const vertebrae: VertebraAnnotation[] = [];
  let vertebraCount = 0;
  let pointCount = 0;

  for (const [rawLabel, keypoint] of Object.entries(
    response.pose_keypoints ?? {}
  )) {
    if (!Number.isFinite(keypoint.x) || !Number.isFinite(keypoint.y)) continue;
    const point: Point = { x: keypoint.x, y: keypoint.y };
    vertebrae.push({
      label: FRONTAL_POSE_LABEL_ALIASES[rawLabel] ?? rawLabel,
      corners: [point, point, point, point],
      confidence: confidenceValue(keypoint.confidence),
      source: AnnotationSource.AI,
    });
    pointCount += 1;
  }

  for (const [label, detection] of Object.entries(response.vertebrae ?? {})) {
    const corners = detection.corners;
    const topLeft = corners?.top_left ?? corners?.topLeft;
    const topRight = corners?.top_right ?? corners?.topRight;
    const bottomLeft = corners?.bottom_left ?? corners?.bottomLeft;
    const bottomRight = corners?.bottom_right ?? corners?.bottomRight;
    if (!topLeft || !topRight || !bottomLeft || !bottomRight) continue;
    const [sortedTopLeft, sortedTopRight, sortedBottomLeft, sortedBottomRight] =
      sortCornersGeometrically([topLeft, topRight, bottomLeft, bottomRight]);
    vertebrae.push({
      label,
      corners: [
        sortedTopLeft,
        sortedTopRight,
        sortedBottomLeft,
        sortedBottomRight,
      ],
      confidence: detection.confidence ?? 1,
      source: AnnotationSource.AI,
    });
    vertebraCount += 1;
    pointCount += 4;
  }

  return { vertebrae, cfh: null, vertebraCount, pointCount };
}

export function normalizeAiKeypointDetection(
  response: AiLateralKeypointResponse | AiFrontalKeypointResponse,
  examType: string,
  options: { includeCfhVertebraAnnotation?: boolean } = {}
): NormalizedAiKeypointDetection {
  return isLateralExamType(examType)
    ? normalizeLateral(
        response as AiLateralKeypointResponse,
        options.includeCfhVertebraAnnotation ?? false
      )
    : normalizeFrontal(response as AiFrontalKeypointResponse);
}
