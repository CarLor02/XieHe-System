import { apiSdk } from '@/infrastructure/http';
import { imageIdToNumericId } from './imageFileService';
import type {
  DetectKeypointsResponse,
  LateralDetectResponse,
} from './aiAnnotationService';
import type { PredictMeasurementsResponse } from '@xiehe/api-contracts';

export type { PredictMeasurementsResponse } from '@xiehe/api-contracts';

export async function getAiMeasurementsResponse(
  imageId: string,
  examType?: string | null
): Promise<PredictMeasurementsResponse> {
  void examType;
  const numericId = imageIdToNumericId(imageId);
  return apiSdk.imaging.predict(numericId);
}

export async function getAiKeypointDetectionResponse(
  imageId: string
): Promise<DetectKeypointsResponse | LateralDetectResponse> {
  const numericId = imageIdToNumericId(imageId);
  return apiSdk.imaging.detectKeypoints(numericId);
}
