import type { HttpApi } from '@stellarmesh/sdk';
import { toPaginatedResult } from '@xiehe/api-client/contracts';
import type {
  GenerateReportRequest,
  RequestGetReports,
  ReportCreate,
  RequestUpdateReport,
} from '@xiehe/api-contracts/generated';
import { createReportApi } from '../api/reportApi';

export function createReportClient(http: HttpApi) {
  const reportApi = createReportApi(http);
  return {
    get: (report_id: number) => reportApi.requestGetReport({ report_id }),
    create: (request: ReportCreate) => reportApi.requestCreateReport(request),
    update: (
      report_id: number,
      changes: Omit<RequestUpdateReport, 'report_id'>
    ) => reportApi.requestUpdateReport({ ...changes, report_id }),
    delete: (report_id: number) => reportApi.requestDeleteReport({ report_id }),
    list: async (query: Partial<RequestGetReports> = {}) =>
      toPaginatedResult(
        await reportApi.requestGetReports({ page: 1, page_size: 20, ...query })
      ),
    generate: (request: GenerateReportRequest) =>
      reportApi.requestGenerateReport(request),
  };
}
