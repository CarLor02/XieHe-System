import { apiClient } from '@/lib/api';
import { extractData } from '@/lib/api/types';

export interface ReportMeasurementItem {
  type: string;
  value: string;
  description?: string | null;
}

export interface GenerateReportRequest {
  imageId: string;
  examType: string;
  measurements: ReportMeasurementItem[];
}

export interface GenerateReportResponse {
  report: string;
}

export async function generateMeasurementReport(
  payload: GenerateReportRequest
): Promise<GenerateReportResponse> {
  const response = await apiClient.post('/api/v1/report-generation/generate', payload);
  return extractData<GenerateReportResponse>(response);
}
