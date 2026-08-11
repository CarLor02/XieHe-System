export type {
  DashboardActivity,
  DashboardOverview,
  DashboardStats,
  DashboardSystemMetrics,
  DashboardTask,
} from '@xiehe/api-contracts';

/** 由患者和影像列表在 Web application 层组合出的待办视图。 */
export interface DashboardPendingTask {
  id: number;
  patient_name: string;
  patient_id: string;
  study_type: string;
  created_at: string;
  priority: 'high' | 'normal';
  status: string;
}
