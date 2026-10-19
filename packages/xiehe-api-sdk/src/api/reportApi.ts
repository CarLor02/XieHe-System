import type { HttpApi } from '@stellarmesh/sdk';
import type {
  GenerateReportRequest,
  GeneratedReportResult,
  PaginatedData_ReportSummary_,
  ReportCreate,
  ReportResponse,
  RequestDeleteReport,
  RequestGetReport,
  RequestGetReports,
  RequestUpdateReport,
} from '@xiehe/api-contracts/generated';

export function createReportApi(http: HttpApi) {
  return {
    requestGenerateReport: http.post<
      GenerateReportRequest,
      GeneratedReportResult
    >('/api/v1/report-generation/generate'),
    requestCreateReport: http.post<ReportCreate, ReportResponse>(
      '/api/v1/reports/create'
    ),
    requestDeleteReport: http.post<RequestDeleteReport, null>(
      '/api/v1/reports/delete'
    ),
    requestGetReport: http.post<RequestGetReport, ReportResponse>(
      '/api/v1/reports/get'
    ),
    requestGetReports: http.post<
      RequestGetReports,
      PaginatedData_ReportSummary_
    >('/api/v1/reports/list'),
    requestUpdateReport: http.post<RequestUpdateReport, ReportResponse>(
      '/api/v1/reports/update'
    ),
  };
}
