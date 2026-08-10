import type {
  CfhAnnotation,
  ImageSize,
  MeasurementData,
  Point,
  VertebraAnnotation,
} from '../../shared/domain/contracts';

export interface AiPoint {
  x: number;
  y: number;
}

export interface AiLateralVertebraDetection {
  label: string;
  confidence: number;
  keypoints: AiPoint[];
}

export interface AiLateralKeypointResponse {
  vertebrae?: AiLateralVertebraDetection[];
  cfh?: {
    center: AiPoint;
    confidence?: number;
  };
  image_width?: number;
  image_height?: number;
}

export interface AiFrontalPoseKeypoint extends AiPoint {
  confidence?: number | { parsedValue?: number } | null;
}

export interface AiFrontalVertebraDetection {
  corners?: {
    top_left?: AiPoint;
    topLeft?: AiPoint;
    top_right?: AiPoint;
    topRight?: AiPoint;
    bottom_left?: AiPoint;
    bottomLeft?: AiPoint;
    bottom_right?: AiPoint;
    bottomRight?: AiPoint;
  };
  confidence?: number;
}

export interface AiFrontalKeypointResponse {
  pose_keypoints?: Record<string, AiFrontalPoseKeypoint>;
  vertebrae?: Record<string, AiFrontalVertebraDetection>;
}

export interface NormalizedAiKeypointDetection {
  vertebrae: VertebraAnnotation[];
  cfh: CfhAnnotation | null;
  vertebraCount: number;
  pointCount: number;
}

export interface AiMeasurementInput {
  type: string;
  points: AiPoint[];
  value?: string | null;
  upper_vertebra?: string | null;
  lower_vertebra?: string | null;
  apex_vertebra?: string | null;
}

export interface AiMeasurementResponse extends Partial<ImageSize> {
  imageId?: string;
  imageWidth?: number;
  imageHeight?: number;
  image_width?: number;
  image_height?: number;
  measurements?: AiMeasurementInput[];
  vertebrae?: VertebraAnnotation[];
  cfh?: CfhAnnotation | null;
}

export interface AiToolCapability {
  id: string;
  category: 'measurement' | 'keypoint' | 'support';
  pointsNeeded: number;
}

export interface NormalizeAiMeasurementsOptions {
  response: AiMeasurementResponse;
  examType: string;
  actualImageSize: ImageSize | null;
  resolveTool: (type: string) => AiToolCapability | null;
  calculateValue: (type: string, points: Point[]) => string;
  describeType: (type: string) => string;
  createId: (measurement: AiMeasurementInput, index: number) => string;
}

export interface NormalizedAiMeasurements {
  measurements: MeasurementData[];
  sourceImageSize: ImageSize | null;
  scale: { x: number; y: number };
}
