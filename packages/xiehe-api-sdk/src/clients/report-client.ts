import type { HttpApi } from '@stellarmesh/sdk';
import { toPaginatedResult } from '@xiehe/api-client/contracts';
import type {
  GenerateReportRequest,
  RequestGetReports,
} from '@xiehe/api-contracts/generated';
import { createReportApi } from '../api/reportApi';

export function createReportClient(http: HttpApi) {
  const reportApi = createReportApi(http);
  return {
    list: async (query: Partial<RequestGetReports> = {}) =>
      toPaginatedResult(
        await reportApi.requestGetReports({ page: 1, page_size: 20, ...query })
      ),
    generate: (request: GenerateReportRequest) =>
      reportApi.requestGenerateReport(request),
  };
}
