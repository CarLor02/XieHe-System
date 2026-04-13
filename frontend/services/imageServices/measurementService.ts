import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';
import {
  MeasurementData,
} from "@/app/imaging/viewer/image-viewer/types";

/*
* 这个只给 api/v1/measurements/{image_id} 这个接口用
* */
export interface MeasurementRecord {
  measurements: MeasurementData[];
  reportText?: string | null;
  savedAt: string;
}

export interface SaveMeasurementRecordRequest {
  imageId: string;
  patientId: number;
  examType: string;
  measurements: MeasurementData[];
  reportText?: string | null;
  savedAt: string;
}

export async function getMeasurementRecord(
  imageFileId: number
): Promise<MeasurementRecord | null> {
  try {
    const response = await apiClient.get(`/api/v1/measurements/${imageFileId}`);
    return extractData<MeasurementRecord>(response);
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function saveMeasurementRecord(
  imageFileId: number,
  payload: SaveMeasurementRecordRequest
): Promise<MeasurementRecord> {
  const response = await apiClient.post(`/api/v1/measurements/${imageFileId}`, payload);
  return extractData<MeasurementRecord>(response);
}
