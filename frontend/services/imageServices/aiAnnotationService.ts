import { requestJsonFromUrl } from '@/lib/api/client/externalJsonClient';

export interface AiParsedConfidence {
  source: string;
  parsedValue: number;
}

export interface AiPoseKeypoint {
  x: number;
  y: number;
  confidence?: AiParsedConfidence | number | null;
}

export interface AiVertebraCorner {
  x: number;
  y: number;
  conf?: number;
}

export interface AiVertebraCorners {
  top_left: AiVertebraCorner;
  top_right: AiVertebraCorner;
  bottom_right: AiVertebraCorner;
  bottom_left: AiVertebraCorner;
  top_mid?: { x: number; y: number };
  bottom_mid?: { x: number; y: number };
  center?: { x: number; y: number };
}

export interface AiVertebraDetection {
  corners: AiVertebraCorners;
  confidence?: number;
  class_id?: number;
}

export interface DetectKeypointsResponse {
  imageId: string;
  imageWidth: number;
  imageHeight: number;
  pose_keypoints: Record<string, AiPoseKeypoint>;
  vertebrae: Record<string, AiVertebraDetection>;
}

export interface LateralAiVertebraDetection {
  label: string;
  confidence: number;
  keypoints: Array<{ x: number; y: number }>;
}

export interface LateralDetectResponse {
  vertebrae?: LateralAiVertebraDetection[];
  cfh?: {
    center: { x: number; y: number };
    confidence: number;
  };
  image_width?: number;
  image_height?: number;
}

function getFrontAiAnnotationUrl(): string {
  const url = process.env.NEXT_PUBLIC_AI_DETECT_KEYPOINTS_URL || '';
  if (!url) {
    throw new Error(
      'AI关键点检测接口未配置，请检查环境变量 NEXT_PUBLIC_AI_DETECT_KEYPOINTS_URL'
    );
  }
  return url;
}

function getLateralAiAnnotationUrl(): string {
  const url = process.env.NEXT_PUBLIC_AI_DETECT_LATERAL_DETECT_URL || '';
  if (!url) {
    throw new Error(
      '侧位X光片AI检测接口未配置，请检查环境变量 NEXT_PUBLIC_AI_DETECT_LATERAL_DETECT_URL'
    );
  }
  return url;
}

async function postAiFormData<T>(
  url: string,
  formData: FormData
): Promise<T> {
  return requestJsonFromUrl<T>(url, {
    method: 'POST',
    body: formData,
  });
}

export async function aiDetectKeyPoints(
  file: File | Blob,
  filename = 'image.png'
): Promise<DetectKeypointsResponse> {
  const formData = new FormData();
  formData.append('file', file, filename);
  return postAiFormData<DetectKeypointsResponse>(
    getFrontAiAnnotationUrl(),
    formData
  );
}

export async function aiDetectLateralKeyPoints(
  file: File | Blob,
  filename = 'image.png'
): Promise<LateralDetectResponse> {
  const formData = new FormData();
  formData.append('file', file, filename);
  return postAiFormData<LateralDetectResponse>(
    getLateralAiAnnotationUrl(),
    formData
  );
}
