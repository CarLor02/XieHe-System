import { PaginatedResult } from '@/lib/api/types';

export interface ReportSummary {
  id: number;
  report_number: string;
  patient_id: number;
  patient_name?: string;
  study_id?: number;
  report_title: string;
  status: string;
  priority: string;
  primary_diagnosis?: string;
  reporting_physician?: string;
  report_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportListFilters {
  page?: number;
  page_size?: number;
  patient_id?: number;
  status?: string;
  priority?: string;
  search?: string;
}

export type ReportListResult = PaginatedResult<ReportSummary>;
