import type { PaginatedResult } from '@xiehe/api-client/contracts';
import type {
  ReportSummary as WireReportSummary,
  RequestGetReports,
} from '../../generated';

type SummaryFields =
  | 'id'
  | 'report_number'
  | 'patient_id'
  | 'report_title'
  | 'status'
  | 'priority'
  | 'created_at'
  | 'updated_at';
export type ReportSummary = Pick<WireReportSummary, SummaryFields> &
  Partial<Omit<WireReportSummary, SummaryFields>>;
export type ReportListQuery = Partial<RequestGetReports>;
export type ReportListResult = PaginatedResult<ReportSummary>;
