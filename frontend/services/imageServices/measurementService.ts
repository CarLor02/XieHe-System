import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';

export interface MeasurementPoint {
  x: number;
  y: number;
}

export interface MeasurementData {
  id: string;
  type: string;
  value: string;
  points: MeasurementPoint[];
  description?: string | null;
}

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
