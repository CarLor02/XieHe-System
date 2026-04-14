import { apiClient } from '@/lib/api';
import { extractPaginatedData } from '@/lib/api/types';
import { ReportListFilters, ReportListResult, ReportSummary } from './types';

export async function getReports(
  filters: ReportListFilters = {}
): Promise<ReportListResult> {
  const params = new URLSearchParams();
  params.set('page', String(filters.page || 1));
  params.set('page_size', String(filters.page_size || 20));

  if (filters.patient_id) params.set('patient_id', String(filters.patient_id));
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.search) params.set('search', filters.search);

  const response = await apiClient.get(`/api/v1/reports/?${params.toString()}`);
  return extractPaginatedData<ReportSummary>(response);
}
