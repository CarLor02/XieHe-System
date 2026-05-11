import { requestJsonFromUrl } from '@/lib/api/client/externalJsonClient';
import type { AiMeasurementData } from '@/app/imaging/features/image-viewer/public';
import { downloadImageFile, imageIdToNumericId } from './imageFileService';

export interface PredictMeasurementsResponse {
  imageId: string;
  imageWidth: number;
  imageHeight: number;
  image_width?: number;
  image_height?: number;
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

function resolveAiUploadMimeType(blob: Blob): 'image/png' | 'image/jpeg' {
  const mimeType = blob.type.toLowerCase().split(';')[0].trim();
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return 'image/jpeg';
  }
  return 'image/png';
}

export function createAiImageUploadFile(blob: Blob): File {
  const mimeType = resolveAiUploadMimeType(blob);
  const filename = mimeType === 'image/jpeg' ? 'image.jpg' : 'image.png';
  return new File([blob], filename, { type: mimeType });
}

export async function getAiMeasurementsResponse(
  imageId: string,
  examType?: string | null
): Promise<PredictMeasurementsResponse> {
  const numericId = imageIdToNumericId(imageId);
  const imageBlob = await downloadImageFile(Number(numericId));
  const imageFile = createAiImageUploadFile(imageBlob);

  const formData = new FormData();
  formData.append('file', imageFile, imageFile.name);
  formData.append('image_id', imageId);

  return requestJsonFromUrl<PredictMeasurementsResponse>(
    resolveAiMeasurementUrl(examType),
    {
      method: 'POST',
      body: formData,
    }
  );
}
