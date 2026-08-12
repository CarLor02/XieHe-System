export interface DashboardStats {
  total_patients: number;
  new_patients_today: number;
  new_patients_week: number;
  active_patients: number;
  total_images: number;
  images_today: number;
  images_week: number;
  pending_images: number;
  processed_images: number;
  completion_rate: number;
  generated_at?: string;
}

export interface DashboardOverview {
  stats: DashboardStats;
  recent_activities?: DashboardActivity[];
}

export interface DashboardActivity {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  type?: string;
}
