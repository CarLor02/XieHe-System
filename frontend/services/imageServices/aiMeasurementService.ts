import { apiClient } from '@/infrastructure/http';
import type {
  AiMeasurementInput,
  AiMeasurementResponse,
} from '@xiehe/imaging-core/ai';
import { imageIdToNumericId } from './imageFileService';
import type {
  DetectKeypointsResponse,
  LateralDetectResponse,
} from './aiAnnotationService';
import type {
  CfhAnnotation,
  VertebraAnnotation,
} from '@xiehe/imaging-core/contracts';

export interface PredictMeasurementsResponse extends AiMeasurementResponse {
  imageId: string;
  imageWidth: number;
  imageHeight: number;
  image_width?: number;
  image_height?: number;
  measurements: AiMeasurementInput[];
  vertebrae?: VertebraAnnotation[];
  cfh?: CfhAnnotation | null;
  raw_keypoints?: unknown;
}

export async function getAiMeasurementsResponse(
  imageId: string,
  examType?: string | null
): Promise<PredictMeasurementsResponse> {
  void examType;
  const numericId = imageIdToNumericId(imageId);
  return apiClient.post<PredictMeasurementsResponse>(
    `/api/v1/image-files/${numericId}/ai/predict`
  );
}

export async function getAiKeypointDetectionResponse(
  imageId: string
): Promise<DetectKeypointsResponse | LateralDetectResponse> {
  const numericId = imageIdToNumericId(imageId);
  return apiClient.post<DetectKeypointsResponse | LateralDetectResponse>(
    `/api/v1/image-files/${numericId}/ai/detect-keypoints`
  );
}
