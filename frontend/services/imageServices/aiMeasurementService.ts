import { authenticatedBlobFetch } from '@/lib/api';
import { requestJsonFromUrl } from '@/lib/api/client/externalJsonClient';
import { AiMeasurementData } from '@/app/imaging/viewer/image-viewer/types';
import { imageIdToNumericId } from './imageFileService';

export interface PredictMeasurementsResponse {
  imageId: string;
  imageWidth: number;
  imageHeight: number;
  measurements: AiMeasurementData[];
}

function getDefaultAiMeasurementUrl(): string {
  const url = process.env.NEXT_PUBLIC_AI_DETECT_URL || '';
  if (!url) {
    throw new Error(
      'AI测量接口未配置，请检查环境变量 NEXT_PUBLIC_AI_DETECT_URL'
    );
  }
  return url;
}

function getLateralAiMeasurementUrl(): string {
  const url = process.env.NEXT_PUBLIC_AI_DETECT_LATERAL_URL || '';
  if (!url) {
    throw new Error(
      '侧位X光片AI检测接口未配置，请检查环境变量 NEXT_PUBLIC_AI_DETECT_LATERAL_URL'
    );
  }
  return url;
}

function resolveAiMeasurementUrl(examType?: string | null): string {
  if (examType === '侧位X光片') {
    return getLateralAiMeasurementUrl();
  }
  return getDefaultAiMeasurementUrl();
}

export async function getAiMeasurementsResponse(
  imageId: string,
  examType?: string | null
): Promise<PredictMeasurementsResponse> {
  const numericId = imageIdToNumericId(imageId);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const imageBlob = await authenticatedBlobFetch(
    `${apiUrl}/api/v1/image-files/${numericId}/download`
  );

  const formData = new FormData();
  formData.append('file', imageBlob, 'image.png');
  formData.append('image_id', imageId);

  return requestJsonFromUrl<PredictMeasurementsResponse>(
    resolveAiMeasurementUrl(examType),
    {
      method: 'POST',
      body: formData,
    }
  );
}
