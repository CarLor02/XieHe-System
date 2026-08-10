import { createExternalHttpClient } from '@/infrastructure/http';
import type {
  AiFrontalKeypointResponse,
  AiLateralKeypointResponse,
} from '@xiehe/imaging-core/ai';

const aiServiceClient = createExternalHttpClient();

export interface DetectKeypointsResponse extends AiFrontalKeypointResponse {
  imageId: string;
  imageWidth: number;
  imageHeight: number;
}

export type LateralDetectResponse = AiLateralKeypointResponse;

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

async function postAiFormData<T>(url: string, formData: FormData): Promise<T> {
  return aiServiceClient.post<T, FormData>(url, formData, {
    responseMode: 'envelope',
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
