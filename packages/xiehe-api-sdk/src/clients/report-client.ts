import type { HttpClient } from '@xiehe/api-client';
import { normalizeLegacyPagination } from '@xiehe/api-client/contracts';
import type {
  GenerateReportRequest,
  GenerateReportResponse,
  ReportListQuery,
  ReportSummary,
} from '@xiehe/api-contracts';
import { compactQuery } from '../shared/query';

export function createReportClient(client: HttpClient) {
  return {
    async list(query: ReportListQuery = {}) {
      return normalizeLegacyPagination<ReportSummary>(
        await client.get<unknown>('/api/v1/reports/', {
          params: compactQuery({ page: 1, page_size: 20, ...query }),
        })
      );
    },
    generate: (request: GenerateReportRequest) =>
      client.post<GenerateReportResponse, GenerateReportRequest>(
        '/api/v1/report-generation/generate',
        request
      ),
  };
}
