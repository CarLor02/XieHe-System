export interface SystemStats {
  total_patients: number;
  total_studies: number;
  total_reports: number;
  active_users: number;
  system_uptime: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
}

export interface ClientErrorReportRequest {
  message: string;
  stack?: string | null;
  componentStack?: string | null;
  timestamp: string;
  url: string;
  userAgent: string;
  errorId?: string | null;
  context?: Record<string, unknown>;
}
