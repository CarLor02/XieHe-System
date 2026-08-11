import { apiSdk } from '@/infrastructure/http';
import type { ReportListFilters, ReportListResult } from './types';

export function getReports(
  filters: ReportListFilters = {}
): Promise<ReportListResult> {
  return apiSdk.reports.list(filters);
}
