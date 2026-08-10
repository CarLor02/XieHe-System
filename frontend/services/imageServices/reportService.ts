import { apiClient } from '@/infrastructure/http';

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
  return apiClient.post<GenerateReportResponse, GenerateReportRequest>(
    '/api/v1/report-generation/generate',
    payload
  );
}
