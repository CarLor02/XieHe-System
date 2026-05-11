import { apiClient, extractData } from '@/lib/api';
import type { AiMeasurementData } from '@/app/imaging/features/image-viewer/public';
import { imageIdToNumericId } from './imageFileService';
import type {
  DetectKeypointsResponse,
  LateralDetectResponse,
} from './aiAnnotationService';

export interface PredictMeasurementsResponse {
  imageId: string;
  imageWidth: number;
  imageHeight: number;
  image_width?: number;
  image_height?: number;
  measurements: AiMeasurementData[];
}

export async function getAiMeasurementsResponse(
  imageId: string,
  examType?: string | null
): Promise<PredictMeasurementsResponse> {
  void examType;
  const numericId = imageIdToNumericId(imageId);
  const response = await apiClient.post(
    `/api/v1/image-files/${numericId}/ai/predict`
  );

  return extractData<PredictMeasurementsResponse>(response);
}

export async function getAiKeypointDetectionResponse(
  imageId: string
): Promise<DetectKeypointsResponse | LateralDetectResponse> {
  const numericId = imageIdToNumericId(imageId);
  const response = await apiClient.post(
    `/api/v1/image-files/${numericId}/ai/detect-keypoints`
  );

  return extractData<DetectKeypointsResponse | LateralDetectResponse>(response);
}
