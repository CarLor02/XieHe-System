import type { HttpApi } from '@stellarmesh/sdk';
import type {
  ClearedErrorsResult,
  ErrorReport,
  ErrorReportResponse,
  ErrorStats,
  RequestErrorStats,
} from '@xiehe/api-contracts/generated';

export function createErrorApi(http: HttpApi) {
  return {
    requestClearErrorLogs: http.post<void, ClearedErrorsResult>(
      '/api/v1/errors/clear'
    ),
    requestReportError: http.post<ErrorReport, ErrorReportResponse>(
      '/api/v1/errors/report'
    ),
    requestGetErrorStats: http.post<RequestErrorStats, ErrorStats>(
      '/api/v1/errors/stats'
    ),
  };
}
