import { apiSdk } from '@/infrastructure/http';
import type {
  GenerateReportRequest,
  GenerateReportResponse,
} from '@xiehe/api-contracts';

export type {
  GenerateReportRequest,
  GenerateReportResponse,
  ReportMeasurementItem,
} from '@xiehe/api-contracts';

export async function generateMeasurementReport(
  payload: GenerateReportRequest
): Promise<GenerateReportResponse> {
  return apiSdk.reports.generate(payload);
}
